#!/usr/bin/env bash
set -euo pipefail

# Cleanup script for open PRs using GitHub CLI (gh). Intended for maintainers.
# Requirements: gh CLI installed and authenticated (gh auth login)

AGE_DAYS=${1:-30}

echo "Listing open PRs older than ${AGE_DAYS} days..."

OPEN_PRS=$(gh pr list --state open --json number,title,updatedAt,headRefName,author --jq ".[] | select((now - (.updatedAt | fromdate)) > (${AGE_DAYS}*24*60*60)) | {number, title, headRefName, author: .author.login, updatedAt}")

if [ -z "${OPEN_PRS}" ]; then
  echo "No PRs older than ${AGE_DAYS} days found."
  exit 0
fi

echo "The following PRs are candidates for closure:\n"
echo "${OPEN_PRS}" | jq -r '"#\(.number) - \(.title) (branch: \(.headRefName)) - updated: \(.updatedAt) by \(.author)"'

echo "\nProceed? (y/N): " && read -r proceed
if [ "${proceed}" != "y" ]; then
  echo "Aborting." && exit 0
fi

echo "Processing PRs..."

echo "${OPEN_PRS}" | jq -c '.' | while read -r pr; do
  PR_NUM=$(echo "$pr" | jq -r '.number')
  BRANCH=$(echo "$pr" | jq -r '.headRefName')
  TITLE=$(echo "$pr" | jq -r '.title')
  AUTHOR=$(echo "$pr" | jq -r '.author')

  echo "\nClosing PR #$PR_NUM: $TITLE (branch: $BRANCH)"
  gh pr close "$PR_NUM" --delete-branch -c "Closing stale PR (older than ${AGE_DAYS} days). If you'd like to re-open, please comment or create a new PR."
done

echo "Done."
