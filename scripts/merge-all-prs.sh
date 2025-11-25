#!/usr/bin/env bash
set -euo pipefail

# Merge all open PRs that are mergeable using GitHub CLI (gh).
# Usage: scripts/merge-all-prs.sh [--dry-run] [--delete-branch] [--method merge|squash|rebase] [--confirm]

DRY_RUN=0
DELETE_BRANCH=0
METHOD="merge"
CONFIRM=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    --delete-branch) DELETE_BRANCH=1; shift;;
    --method) METHOD="$2"; shift 2;;
    --confirm) CONFIRM=1; shift;;
    -h|--help) echo "Usage: $0 [--dry-run] [--delete-branch] [--method merge|squash|rebase] [--confirm]"; exit 0;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

if ! command -v gh &> /dev/null; then
  echo "gh CLI is required. Install from https://cli.github.com/ and run gh auth login."
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "jq is required. Install via apt/brew."
  exit 1
fi

echo "Fetching open PRs..."
PRS_JSON=$(gh pr list --state open --json number,title,mergeable,mergeableState,headRefName,baseRefName,labels,author)
COUNT=$(echo "$PRS_JSON" | jq 'length')

if [ "$COUNT" -eq 0 ]; then
  echo "No open PRs found.";
  exit 0;
fi

echo "Found $COUNT open PR(s)."

echo "$PRS_JSON" | jq -c '.[]' | while read -r pr; do
  NUM=$(echo "$pr" | jq -r '.number')
  TITLE=$(echo "$pr" | jq -r '.title')
  AUTHOR=$(echo "$pr" | jq -r '.author.login')
  MERGEABLE=$(echo "$pr" | jq -r '.mergeable')
  MERGEABLE_STATE=$(echo "$pr" | jq -r '.mergeableState')
  LABELS=$(echo "$pr" | jq -r '[.labels[].name] | join(", ")')

  echo "\nPR #$NUM - $TITLE by $AUTHOR"
  echo "  Mergeable: $MERGEABLE, State: $MERGEABLE_STATE, Labels: ${LABELS:-none}"

  # Skip marked no-merge
  if echo "$LABELS" | grep -Eq '(do-not-merge|wip|work-in-progress|draft)'; then
    echo "  Skipping (has do-not-merge/WIP label)."
    continue
  fi

  # Skip PRs that are not mergeable
  if [ "$MERGEABLE" != "true" ] || [ "$MERGEABLE_STATE" != "MERGEABLE" ]; then
    echo "  Skipping (not mergeable or has conflicts)."
    continue
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  Dry run: would merge PR #$NUM ($METHOD)."
    continue
  fi

  # Confirm if not auto-confirmed
  if [ "$CONFIRM" -eq 0 ]; then
    read -p "Merge PR #$NUM? (y/N): " yn
    if [ "$yn" != "y" ]; then
      echo "  Skipping PR #$NUM per user input."
      continue
    fi
  fi

  # attempt to sign in or refresh token if needed (gh handles auth)
  echo "  Merging PR #$NUM..."
  MERGE_CMD=(gh pr merge "$NUM" --"$METHOD" --body "Merged by scripts/merge-all-prs.sh" )
  if [ "$DELETE_BRANCH" -eq 1 ]; then
    MERGE_CMD+=(--delete-branch)
  fi

  if ! "${MERGE_CMD[@]}"; then
    echo "  Failed to merge PR #$NUM. Skipping.";
    continue
  fi

  echo "  Successfully merged PR #$NUM."
done

echo "\nDone merging PRs."
