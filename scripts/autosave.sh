#!/usr/bin/env bash
set -euo pipefail

message="${1:-autosave: app checkpoint}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "autosave: this folder is not a git repository yet" >&2
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "autosave: no changes to commit"
  exit 0
fi

git commit -m "$message"

if git remote get-url origin >/dev/null 2>&1; then
  current_branch="$(git branch --show-current)"
  git push -u origin "$current_branch"
else
  echo "autosave: committed locally; no origin remote configured yet"
fi
