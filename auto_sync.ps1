# auto_sync.ps1 - Automated Real-time Git Sync Watcher
param(
    [int]$DebounceSeconds = 5
)

$repoDir = $PSScriptRoot
Set-Location $repoDir

# Verify git remote
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "[!] No Git remote origin configured yet." -ForegroundColor Yellow
    Write-Host "    Please run Sync_To_GitHub.bat once to connect your GitHub repository link first." -ForegroundColor Cyan
    exit 1
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       UroStone AI: Automatic Live GitHub Auto-Sync Watcher      " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Watching folder: $repoDir" -ForegroundColor Gray
Write-Host "Remote link:     $remoteUrl" -ForegroundColor Gray
Write-Host "Status: Active! Any saved file edits will auto-push in $DebounceSeconds seconds." -ForegroundColor Green
Write-Host "Press Ctrl+C at any time to stop auto-sync.`n" -ForegroundColor DarkGray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoDir
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite'

$lastChange = [DateTime]::MinValue
$pendingPush = $false

$action = {
    param($source, $eventArgs)
    $path = $eventArgs.FullPath
    # Ignore git internal files, logs, and temp artifacts
    if ($path -match '\\.git\\' -or $path -match '\\.desktop-data\\' -or $path -match '\\website-to-upload\\' -or $path -match '\.log$') {
        return
    }
    $script:lastChange = [DateTime]::Now
    $script:pendingPush = $true
}

Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Deleted' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Renamed' -Action $action | Out-Null

while ($true) {
    Start-Sleep -Seconds 1
    if ($script:pendingPush) {
        $elapsed = ([DateTime]::Now - $script:lastChange).TotalSeconds
        if ($elapsed -ge $DebounceSeconds) {
            $script:pendingPush = $false
            
            # Check git status
            git add .
            $diff = git diff --cached --name-only
            if ($diff) {
                $timeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                Write-Host "[$timeStr] Detected file changes: ($($diff.Count) files)" -ForegroundColor Cyan
                git commit -m "Auto-sync update: $timeStr" | Out-Null
                Write-Host "[$timeStr] Pushing to GitHub..." -ForegroundColor Yellow
                $pushOutput = git push origin main 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[$timeStr] ✅ Successfully updated on GitHub!" -ForegroundColor Green
                } else {
                    Write-Host "[$timeStr] ❌ Push failed: $pushOutput" -ForegroundColor Red
                }
            }
        }
    }
}
