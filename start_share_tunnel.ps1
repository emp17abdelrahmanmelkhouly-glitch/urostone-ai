# start_share_tunnel.ps1
$ErrorActionPreference = "SilentlyContinue"

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "              UroStone AI: Worldwide Public Sharing (Cloudflare)              " -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ensure local server is running on port 8080
$testPort = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $testPort) {
    Write-Host "[1/3] Starting local clinical engine on port 8080..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\mobile_server.ps1`" -NoBrowser" -WindowStyle Hidden
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/3] Local clinical engine is active on port 8080." -ForegroundColor Green
}

# 2. Start Cloudflare Tunnel
$cfPath = Join-Path $PSScriptRoot "cloudflared.exe"
$logPath = Join-Path $PSScriptRoot "cf_live.log"
if (Test-Path $logPath) { Remove-Item $logPath -Force -ErrorAction SilentlyContinue }

Write-Host "[2/3] Connecting to Cloudflare global secure network..." -ForegroundColor Yellow

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cfPath
$psi.Arguments = "tunnel --url http://localhost:8080 --logfile `"$logPath`""
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$cfProcess = [System.Diagnostics.Process]::Start($psi)

# 3. Poll log for trycloudflare.com URL
$tunnelUrl = $null
$maxRetries = 25
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Milliseconds 800
    if (Test-Path $logPath) {
        $content = Get-Content $logPath -Raw -ErrorAction SilentlyContinue
        if ($content -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') {
            $tunnelUrl = $Matches[1]
            break
        }
    }
}

if ($tunnelUrl) {
    # Copy directly to Windows clipboard
    Set-Clipboard -Value $tunnelUrl

    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! YOUR WORLDWIDE PUBLIC LINK IS READY:                                " -ForegroundColor Green
    Write-Host ""
    Write-Host "  $tunnelUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  *** LINK HAS BEEN COPIED TO YOUR CLIPBOARD! (Just press Ctrl+V) ***        " -ForegroundColor Yellow
    Write-Host "===============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "INSTRUCTIONS:" -ForegroundColor White
    Write-Host "1. Paste (Ctrl + V) the link into WhatsApp, Email, or SMS for your professor."
    Write-Host "2. Your professor can open it immediately from home on any PC, Mac, or phone."
    Write-Host "3. KEEP THIS WINDOW OPEN while your professor is reviewing."
    Write-Host ""
    Write-Host "Press Ctrl + C or close this window when done to stop sharing." -ForegroundColor Gray

    # Open in browser for verification
    Start-Process $tunnelUrl

    # Keep alive
    try {
        while (-not $cfProcess.HasExited) {
            Start-Sleep -Seconds 2
        }
    } finally {
        if (-not $cfProcess.HasExited) {
            $cfProcess.Kill()
        }
        Remove-Item $logPath -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "Failed to establish Cloudflare tunnel within timeout. Please check your internet connection." -ForegroundColor Red
    if (-not $cfProcess.HasExited) { $cfProcess.Kill() }
    pause
}
