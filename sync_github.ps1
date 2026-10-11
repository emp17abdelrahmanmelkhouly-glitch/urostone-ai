# sync_github.ps1 - Robust GitHub Sync & Push
$repoDir = $PSScriptRoot
Set-Location $repoDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "                    UroStone AI: Sync to GitHub Public Site                    " -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if git remote origin exists
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "[!] No GitHub repository is linked to this laptop yet." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please paste your GitHub repository link below." -ForegroundColor White
    Write-Host "Examples:" -ForegroundColor Gray
    Write-Host "   https://github.com/YourUsername/urostone-ai" -ForegroundColor DarkGray
    Write-Host "   https://github.com/YourUsername/urostone-ai.git" -ForegroundColor DarkGray
    Write-Host ""

    $inputUrl = Read-Host "GitHub Repository Link"
    $inputUrl = $inputUrl.Trim()

    if ([string]::IsNullOrWhiteSpace($inputUrl)) {
        Write-Host "`n[ERROR] No URL provided. Aborted." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    # If user pasted a github.io URL by mistake (e.g. https://username.github.io/reponame/)
    if ($inputUrl -match "https?:\/\/([^\.]+)\.github\.io\/([^\/]+)") {
        $user = $Matches[1]
        $repo = $Matches[2].TrimEnd('/')
        $inputUrl = "https://github.com/$user/$repo.git"
        Write-Host "Detected GitHub Pages link! Converted to repository: $inputUrl" -ForegroundColor Cyan
    }

    if (-not $inputUrl.EndsWith(".git") -and $inputUrl -match "github\.com") {
        $inputUrl = "$inputUrl.git"
    }

    git remote add origin $inputUrl
    git branch -M main
    $remote = $inputUrl
    Write-Host "`n[SUCCESS] Linked to: $remote" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Connected Repository: $remote" -ForegroundColor Gray
    Write-Host ""
}

# 2. Stage and commit all pending changes
Write-Host "Staging latest changes..." -ForegroundColor Cyan
git add -A

$hasDiff = git diff --cached --name-only
if ($hasDiff) {
    $timeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "Saving latest edits ($($hasDiff.Count) files)..." -ForegroundColor Yellow
    git commit -m "Update: $timeStr" | Out-Null
} else {
    Write-Host "Local files are up to date." -ForegroundColor Gray
}

# 3. Push to GitHub
Write-Host ""
Write-Host "Pushing updates to GitHub ($remote)..." -ForegroundColor Cyan
Write-Host "(If a GitHub sign-in window opens, click Authorize once)" -ForegroundColor DarkGray
Write-Host ""

$pushRes = git push -u origin main 2>&1
$success = ($LASTEXITCODE -eq 0)

# If rejected because remote has existing commits (e.g. created on github.com or previous manual upload)
if (-not $success -and ($pushRes -match "fetch first|non-fast-forward|Updates were rejected")) {
    Write-Host "[!] Remote contains earlier files. Synchronizing branches..." -ForegroundColor Yellow
    git pull origin main --rebase 2>$null
    $pushRes = git push -u origin main 2>&1
    $success = ($LASTEXITCODE -eq 0)
    
    if (-not $success) {
        Write-Host "[!] Overwriting remote with current local code..." -ForegroundColor Yellow
        $pushRes = git push -u origin main --force 2>&1
        $success = ($LASTEXITCODE -eq 0)
    }
}

Write-Host ""
if ($success) {
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! All latest updates have been pushed to GitHub!" -ForegroundColor Green
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT NOTES FOR GITHUB PAGES:" -ForegroundColor White
    Write-Host "  1. GitHub Pages takes ~30 to 60 seconds to build the new website." -ForegroundColor Gray
    Write-Host "  2. When you open your live site, press Ctrl + F5 (Hard Refresh) in your" -ForegroundColor Gray
    Write-Host "     browser to clear previous cached files." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "  PUSH FAILED! Details below:" -ForegroundColor Red
    Write-Host "===============================================================================" -ForegroundColor Red
    Write-Host "$pushRes" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Check that the URL is correct and you have permission to push." -ForegroundColor Gray
    Write-Host "  - To change the repository URL, run: git remote set-url origin <NEW_URL>" -ForegroundColor Gray
    Write-Host ""
}

Read-Host "Press Enter to exit"
