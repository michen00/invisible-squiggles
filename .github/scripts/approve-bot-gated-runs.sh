#!/usr/bin/env bash
# Approval predicate and helpers for bot-gated pull_request runs.
# pr-catchup.yml sources this file. Run directly, with APPROVE_BOT_GATED_MAIN=1,
# CAUSED_SHA and REPO set (PR_NUMBER optional) and a token that can approve runs,
# it approves the held runs of one commit and prints the errors pr-catchup would.
set -euo pipefail

approvable() {
  # A run qualifies only as the product of the commit this caller just pushed:
  # the same head SHA, a head in this repository so a fork's code can never be
  # admitted, the bot-attributed pull_request event, and still held at the gate.
  # Empty operands are rejected so a failed lookup cannot widen this into
  # "approve anything".
  local run_sha="$1" caused_sha="$2" run_repo="$3" this_repo="$4"
  local run_event="$5" run_actor="$6" run_gate="$7"
  [ -n "$run_sha" ] && [ -n "$caused_sha" ] && [ "$run_sha" = "$caused_sha" ] || return 1
  [ -n "$run_repo" ] && [ -n "$this_repo" ] && [ "$run_repo" = "$this_repo" ] || return 1
  [ "$run_event" = "pull_request" ] || return 1
  [ "$run_actor" = "github-actions[bot]" ] || return 1
  [ "$run_gate" = "action_required" ] || return 1
}

gated_runs() {
  # A held run reports status "completed" with conclusion "action_required",
  # never status "action_required", even though that is the filter which selects
  # it. Both fields are normalized into one gate value because reading .status
  # alone would reject every real run and fail this job instead of approving.
  #
  # Do not reach for the timestamps to identify a held run. While a run is held,
  # created_at and run_started_at are identical, because it never executed. The
  # gap between them opens only after approval, and measures how long the run
  # sat waiting — so a gap is evidence a run was gated and then released, and its
  # absence says nothing either way. The pair above is the tell.
  gh api "repos/$REPO/actions/runs?head_sha=$1&status=action_required" \
    --jq '.workflow_runs[]
          | [ .id, .head_sha, .head_repository.full_name, .event, .actor.login,
              (if .status == "action_required" or .conclusion == "action_required"
               then "action_required" else "other" end) ]
          | @tsv'
}

gated_count() {
  gh api "repos/$REPO/actions/runs?head_sha=$1&status=action_required" --jq .total_count
}

head_runs_count() {
  # Only pull_request runs carry the required checks. Code-scanning runs are
  # created at the same commit under the dynamic event and are never gated, so
  # counting every event would read a head with no required-check runs at all as
  # healthy — which is the state this step must not pass over.
  gh api "repos/$REPO/actions/runs?head_sha=$1&event=pull_request" --jq .total_count
}

approve_bot_gated_runs_for_sha() {
  # Approve gated pull_request runs caused by caused_sha. Optional second argument
  # is a PR number for operator messages. Writes still-gated run ids to
  # APPROVE_BOT_GATED_OUT (one id per line) when any remain after approval.
  # Returns 0 when runs exist and none stay gated; 1 when some stay gated; 2 when
  # no pull_request run appeared at the SHA after the bounded wait.
  local caused_sha="$1"
  local pr_label="${2:-}"
  local out_file="${APPROVE_BOT_GATED_OUT:-/tmp/approve-bot-gated.txt}"
  local seen=0
  # Declared here rather than at its assignment below: `local x="$(cmd)"`
  # returns local's own status, which would swallow a failing gated_count and
  # defeat the set -e this file opens with.
  local remaining

  : > "$out_file"

  for _ in $(seq 1 10); do
    if [ "$(head_runs_count "$caused_sha")" != "0" ]; then
      seen=1
      break
    fi
    sleep 3
  done

  if [ "$seen" = "0" ]; then
    if [ "${APPROVE_BOT_GATED_MAIN:-}" = "1" ]; then
      if [ -n "$pr_label" ]; then
        echo "::error::no pull_request run appeared for PR #$pr_label at $caused_sha, so its required checks cannot report at the rewritten head"
      else
        echo "::error::no pull_request run appeared at $caused_sha, so required checks cannot report there"
      fi
      echo "  see what does exist at that commit:"
      echo "    gh api repos/$REPO/actions/runs?head_sha=$caused_sha"
      echo "  approve anything listed as action_required, or push to the branch to"
      echo "  create fresh runs. The PR's newest check results still belong to the"
      echo "  pre-rewrite head until something reports here."
    fi
    return 2
  fi

  # Sweep on every poll rather than once. More than one workflow can answer
  # the synchronize event a catch-up produces, so a second gated run can
  # appear after the first sweep already ran; polling only the count would
  # then wait for a run nothing ever approved. A run already reported is not
  # repeated on a later pass, since it would otherwise print again on every
  # poll until it clears.
  local settled=0
  local seen_file="$out_file.seen"
  : > "$seen_file"
  remaining=1
  for _ in $(seq 1 10); do
    gated_runs "$caused_sha" |
      while IFS=$'\t' read -r id run_sha run_repo run_event run_actor run_gate; do
        # A run just approved can still read action_required for a poll or two
        # after the approve call succeeds. Skip anything already recorded
        # before touching it again, so a lagging listing cannot approve the
        # same id twice or print its line twice.
        if grep -qxF "$id" "$seen_file"; then
          continue
        fi
        if approvable "$run_sha" "$caused_sha" "$run_repo" "$REPO" "$run_event" "$run_actor" "$run_gate"; then
          if gh api --method POST "repos/$REPO/actions/runs/$id/approve" > /dev/null 2>&1; then
            echo "$id" >> "$seen_file"
            if [ -n "$pr_label" ]; then
              echo "approved run $id for #$pr_label"
            else
              echo "approved run $id for $caused_sha"
            fi
            continue
          fi
          note="::warning::could not approve run $id; GITHUB_TOKEN may not be permitted to approve runs here"
        else
          note="out of scope, left for a human: run $id ($run_repo $run_event $run_actor $run_gate)"
        fi
        echo "$id" >> "$seen_file"
        echo "$note"
      done

    remaining="$(gated_count "$caused_sha")"
    # Two consecutive zero counts, not one: the count can read zero between a
    # run clearing and a second workflow's run being created for the same
    # commit, and stopping on the first zero would call that gap "clear".
    if [ "$remaining" = "0" ] && [ "$settled" = "1" ]; then break; fi
    if [ "$remaining" = "0" ]; then settled=1; else settled=0; fi
    sleep 3
  done

  if [ "$remaining" != "0" ]; then
    gated_runs "$caused_sha" | cut -f1 | while read -r id; do
      echo "$id" >> "$out_file"
      if [ "${APPROVE_BOT_GATED_MAIN:-}" = "1" ]; then
        if [ -n "$pr_label" ]; then
          echo "::error::run $id for PR #$pr_label is still awaiting approval at $caused_sha, so the PR's required checks cannot report at the rewritten head"
        else
          echo "::error::run $id is still awaiting approval at $caused_sha"
        fi
        echo "  approve it now from the PR's checks tab, or run:"
        echo "    gh api --method POST repos/$REPO/actions/runs/$id/approve"
      fi
    done
    if [ "${APPROVE_BOT_GATED_MAIN:-}" = "1" ] && [ -n "$pr_label" ]; then
      echo "Until those runs are approved, the PR's last check results belong to the"
      echo "pre-rewrite head and must not be read as evidence for the rewritten one."
    fi
    return 1
  fi

  return 0
}

if [ "${APPROVE_BOT_GATED_MAIN:-}" = "1" ]; then
  approve_bot_gated_runs_for_sha "${CAUSED_SHA:?}" "${PR_NUMBER:-}" || exit $?
fi
