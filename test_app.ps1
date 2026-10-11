$htmlPath = (Resolve-Path ".\index.html").Path
$fileUrl = "file:///" + ($htmlPath -replace '\\', '/')
$profileDir = Join-Path $PSScriptRoot ".desktop-data"

Write-Output "URL: $fileUrl"

# Try Chrome first, then Edge
$browser = ""
if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    $browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
} elseif (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") {
    $browser = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

Write-Output "Browser: $browser"

$args = @(
    "--app=$fileUrl",
    "--window-size=1440,920",
    "--window-position=50,50",
    "--user-data-dir=$profileDir",
    "--no-first-run",
    "--disable-default-apps"
)

$proc = Start-Process -FilePath $browser -ArgumentList $args -PassThru
Start-Sleep -Seconds 2
Write-Output "Process Id: $($proc.Id) Running: $(!$proc.HasExited)"
