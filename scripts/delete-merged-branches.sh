#!/usr/bin/env bash
set -euo pipefail

# Delete remote branches that are already merged into main and are not protected.
# Requires Git remote named origin and main branch name 'main'.

echo "Fetching latest remotes..."
git fetch --all --prune

BASE_BRANCH=${1:-main}

echo "Listing remote branches merged into ${BASE_BRANCH}..."
BRANCHES=$(git branch -r --merged origin/${BASE_BRANCH} | sed 's/ *origin\///g' | grep -v "${BASE_BRANCH}" | grep -v "HEAD" || true)

if [ -z "${BRANCHES}" ]; then
  echo "No merged remote branches found."
  exit 0
fi

echo "The following branches are merged and candidates for deletion:\n${BRANCHES}"
echo "\nProceed to delete these remote branches? (y/N): " && read -r proceed
if [ "${proceed}" != "y" ]; then
  echo "Aborting." && exit 0
fi

for br in ${BRANCHES}; do
  echo "Deleting remote branch: ${br}";
  git push origin --delete "${br}" || echo "Failed to delete ${br}; it may be protected or already removed.";
done

echo "Done."
