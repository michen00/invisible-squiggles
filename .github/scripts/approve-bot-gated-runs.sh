#!/usr/bin/env bash
# Approves the held pull_request runs that a github-actions[bot] push caused.
# pr-catchup.yml sources it; to run it directly, set APPROVE_BOT_GATED_MAIN=1,
# CAUSED_SHA, REPO and optionally PR_NUMBER.
set -euo pipefail

approvable() {
  # The -n checks stop a failed lookup from matching everything; the repository
  # check keeps out forks.
  local run_sha="$1" caused_sha="$2" run_repo="$3" this_repo="$4"
  local run_event="$5" run_actor="$6" run_gate="$7"
  [ -n "$run_sha" ] && [ -n "$caused_sha" ] && [ "$run_sha" = "$caused_sha" ] || return 1
  [ -n "$run_repo" ] && [ -n "$this_repo" ] && [ "$run_repo" = "$this_repo" ] || return 1
  [ "$run_event" = "pull_request" ] || return 1
  [ "$run_actor" = "github-actions[bot]" ] || return 1
  [ "$run_gate" = "action_required" ] || return 1
}

gated_runs() {
  # A held run has status completed and conclusion action_required, though the
  # status=action_required filter is what selects it. Its created_at and
  # run_started_at differ only after approval, so they cannot identify it.
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
  # pull_request only: never-gated code-scanning runs (event dynamic) at the
  # same commit would make a head with no check runs look healthy.
  gh api "repos/$REPO/actions/runs?head_sha=$1&event=pull_request" --jq .total_count
}

approve_bot_gated_runs_for_sha() {
  # Usage: approve_bot_gated_runs_for_sha SHA [PR_NUMBER]
  # Writes the ids still held to $APPROVE_BOT_GATED_OUT. Returns 0 when none are
  # held, 1 when some are, and 2 when no pull_request run appeared.
  local caused_sha="$1"
  local pr_label="${2:-}"
  local out_file="${APPROVE_BOT_GATED_OUT:-/tmp/approve-bot-gated.txt}"
  local seen=0
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

  # Sweep on every poll: another workflow's held run can appear after a sweep.
  local settled=0
  local seen_file="$out_file.seen"
  : > "$seen_file"
  remaining=1
  for _ in $(seq 1 10); do
    gated_runs "$caused_sha" |
      while IFS=$'\t' read -r id run_sha run_repo run_event run_actor run_gate; do
        # The listing lags an approval, so skip ids already handled.
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
    # Two zero counts in a row: the count can dip to zero between one workflow's
    # run clearing and another's appearing.
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
