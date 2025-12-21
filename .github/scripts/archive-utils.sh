#!/bin/bash

# branch archival utilities

set -euo pipefail

archive_branch() {
  local branch="$1"
  local ref
  ref="refs/archive/$branch/$(date -u '+%Y%m%d-%s')"
  git update-ref "$ref" "refs/heads/$branch"
  git push origin "$ref"
  echo "Archived $branch to $ref"
  git branch -D "$branch"
}

restore_archive() {
  local input="$1"
  local ref
  local branch

  if [[ $input == refs/archive/* ]]; then
    ref="$input"
  else
    ref="refs/archive/$input"
  fi

  if [[ $ref =~ [0-9]{8}-[0-9]{10}$ ]]; then
    branch="$(basename "${ref%/*}")"
    git branch "$branch" "$ref"
    echo "Restored $branch from $ref"
  else
    branch="$(basename "$ref")"
    latest=$(git for-each-ref --sort=-committerdate --format="%(refname)" "$ref" | head -n1)
    if [[ -n $latest ]]; then
      git branch "$branch" "$latest"
      echo "Restored $branch from $latest"
    else
      echo "No archived ref found for $branch"
    fi
  fi
}

list_archived() {
  git for-each-ref --sort=-authordate --format='%(refname) %(objectname:short) %(contents:subject)' refs/archive/
}

pull_archived() {
  local before after counts new updated tmp_before tmp_after

  before="$(git for-each-ref --format='%(refname) %(objectname)' refs/archive/)"
  git fetch origin 'refs/archive/*:refs/archive/*' --verbose >&2
  after="$(git for-each-ref --format='%(refname) %(objectname)' refs/archive/)"

  tmp_before=$(mktemp)
  tmp_after=$(mktemp)
  trap 'rm -f "$tmp_before" "$tmp_after"' RETURN

  printf "%s\n" "$before" > "$tmp_before"
  printf "%s\n" "$after" > "$tmp_after"

  counts=$(awk 'FNR==NR { before[$1]=$2; next }
                {
                  name=$1; oid=$2;
                  if (!(name in before)) new++;
                  else if (before[name] != oid) updated++;
                }
                END { printf "%d %d\n", new+0, updated+0 }' \
    "$tmp_before" "$tmp_after")

  rm -f "$tmp_before" "$tmp_after"
  trap - RETURN

  set -- "$counts"
  new=${1:-0}
  updated=${2:-0}

  echo "Pulled archived refs from origin ($new new, $updated updated)"
}

delete_archive() {
  local input="$1"
  local ref
  if [[ $input == refs/archive/* ]]; then
    ref="$input"
  else
    ref="refs/archive/$input"
  fi
  git update-ref -d "$ref"
  echo "Deleted $ref"
}

purge_archive() {
  local input="$1"
  local ref
  if [[ $input == refs/archive/* ]]; then
    ref="$input"
  else
    ref="refs/archive/$input"
  fi
  git push origin --delete "$ref"
  git update-ref -d "$ref"
  echo "Purged $ref from origin and local"
}

# 🧠 Dispatcher
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

cmd="$1"
shift

case "$cmd" in
  archive_branch | list_archived | pull_archived | restore_archive | delete_archive | purge_archive)
    "$cmd" "$@"
    ;;
  *)
    echo "Unknown command: $cmd"
    exit 1
    ;;
esac
