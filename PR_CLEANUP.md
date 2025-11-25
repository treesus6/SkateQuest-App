# PR Cleanup Guide

This guide helps maintainers clean up stale or merged PRs and branches from the repository.

## Quick summary
- Close stale PRs and optionally delete their source branches.
- Delete merged branches to keep the branch list tidy.
- Use GitHub Actions to auto-mark and close stale PRs.

## Scripts included
1. `scripts/cleanup-prs.sh`: Uses the GitHub CLI (`gh`) to list PRs older than X days, then closes them and deletes their branch.
   - Usage: `scripts/cleanup-prs.sh 30` to clean PRs older than 30 days.

2. `scripts/delete-merged-branches.sh`: Deletes remote branches that are merged into `main` to keep the repo tidy.
   - Usage: `scripts/delete-merged-branches.sh main` (main is default if omitted).

## Using the GitHub CLI

Install: https://cli.github.com

```bash
gh auth login
``` 

## Merge multiple PRs automatically

If you want to merge all PRs that are already mergeable and in a green state, use the `merge-all-prs.sh` script. You must be authenticated and have permission to merge.

```bash
# Merges mergeable PRs, prompt before each one
bash scripts/merge-all-prs.sh --confirm

# Dry-run to see what would be merged
bash scripts/merge-all-prs.sh --dry-run

# Merge and delete source branches automatically (use with caution)
bash scripts/merge-all-prs.sh --confirm --delete-branch --method squash
```

## Auto-merge workflow
- The repository includes a separate GitHub Actions workflow `auto-merge-on-label.yml` (if enabled) that allows automatic merge when a PR receives `auto-merge` label and all checks pass.

## Quick dry-run and checklist

1. Dry run to list PRs and see mergeable state:

```bash
gh pr list --state open --json number,title,mergeable,mergeableState,headRefName,baseRefName,labels,author | jq -r '.[] | "#\(.number) - \(.title) (\(.headRefName)) Mergeable: \(.mergeable) State: \(.mergeableState) Labels: \(.labels | map(.name) | join(", "))"'
```

2. Do a dry-run merge:
```bash
bash scripts/merge-all-prs.sh --dry-run
```

3. Merge all mergeable PRs after confirming:
```bash
bash scripts/merge-all-prs.sh --confirm --delete-branch --method squash
```

4. Delete merged remote branches (double-check first):
```bash
bash scripts/delete-merged-branches.sh main
```

5. Optionally close stale PRs instead of merging (if you do not want to merge outstanding PRs):
```bash
bash scripts/cleanup-prs.sh 30
```

## Automated weekly PR cleanup with GitHub Actions
- The `auto-close-stale-prs.yml` workflow automatically marks PRs as stale after 30 days of inactivity and closes them after 14 more days unless labeled `keep` or `do-not-close`.

## Recommended workflow
1. Run `scripts/cleanup-prs.sh` in your CI machine or locally to review stale PRs and close them (it will prompt before closing).
2. Use `scripts/delete-merged-branches.sh` weekly to delete merged branches.
3. Configure branch protection rules for main branches to prevent accidental deletion of active branches.

## Notes
- The scripts may require `jq` installed (`sudo apt install jq` / `brew install jq`).
- Always review PRs before closing them. The scripts prompt for confirmation.
- If you prefer auto-closure for certain labels (e.g., `wip`), add them to the exemption list in the GitHub actions file.
