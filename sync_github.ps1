# sync_github.ps1 - UroStone AI GitHub Sync
$repoDir = $PSScriptRoot
Set-Location $repoDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "                    UroStone AI: Sync to GitHub Public Site                    " -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    $remote = "https://github.com/emp17abdelrahmanmelkhouly-glitch/urostone-ai.git"
    git remote add origin $remote
    git branch -M main
}

Write-Host "Target Repository: $remote" -ForegroundColor Gray
Write-Host ""

# 1. Stage and commit latest changes if any
git add -A
$hasDiff = git diff --cached --name-only
if ($hasDiff) {
    $timeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "Saving latest edits ($($hasDiff.Count) files)..." -ForegroundColor Yellow
    git commit -m "Update: $timeStr" | Out-Null
} else {
    Write-Host "All local files are committed and ready." -ForegroundColor Gray
}

# 2. Push to GitHub
Write-Host ""
Write-Host "Pushing updates to GitHub..." -ForegroundColor Cyan
Write-Host "(NOTE: If a GitHub login window opens, click 'Sign in with your browser' to approve)" -ForegroundColor Yellow
Write-Host ""

$pushOutput = git push -u origin main 2>&1
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! All latest updates have been pushed to GitHub!" -ForegroundColor Green
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "YOUR LIVE WEBSITE:" -ForegroundColor White
    Write-Host "  https://emp17abdelrahmanmelkhouly-glitch.github.io/urostone-ai/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "  1. GitHub Pages takes ~30 to 60 seconds to deploy the new version." -ForegroundColor Gray
    Write-Host "  2. When you open the link above, press Ctrl + F5 (Hard Refresh) in your" -ForegroundColor Gray
    Write-Host "     browser to ensure old cached files are refreshed." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "  PUSH OUTPUT / ISSUE:" -ForegroundColor Red
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "$pushOutput" -ForegroundColor Red
    Write-Host ""
    Write-Host "If it says Authentication Failed / Sign In:" -ForegroundColor Yellow
    Write-Host "  - Make sure you approve the GitHub browser sign-in prompt when it appears." -ForegroundColor Gray
    Write-Host ""
}

Read-Host "Press Enter to exit"
