# Resolve conflicts by taking 'ours' for each conflicted file, continue rebase, and push
Set-StrictMode -Version Latest

#!/usr/bin/env pwsh
# Resolve conflicts by taking 'ours' for each conflicted file, continue rebase, and push
Set-StrictMode -Version Latest

# Find the repository top-level directory and switch there
$repoRoot = (& git rev-parse --show-toplevel) 2>$null
if (-not $repoRoot) {
    Write-Error "Unable to find git repository root. Run this script from inside a git repo."
    exit 2
}
Set-Location $repoRoot
Write-Output "Repo root: $(Get-Location)"

$files = @(git diff --name-only --diff-filter=U)
if ($files.Count -eq 0) {
    Write-Output 'No conflicts to resolve'
    exit 0
}

Write-Output "Conflicted files:`n$($files -join "`n")"
foreach ($f in $files) {
    Write-Output "Resolving (ours): $f"
    # Use git checkout --ours and then add; suppress individual errors but capture overall
    git checkout --ours -- "$f" 2>$null
    git add -- "$f"
}

Write-Output 'Staged files:'
git status --porcelain

Write-Output 'Running git rebase --continue'
git rebase --continue
if ($LASTEXITCODE -ne 0) {
    Write-Error "rebase --continue failed with exit code $LASTEXITCODE. Run 'git status' to inspect and resolve remaining conflicts."
    exit $LASTEXITCODE
}

Write-Output 'Rebase complete — pushing to origin/main'
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Output 'Done.'
