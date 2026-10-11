# prepare_dist.ps1
$baseDir = $PSScriptRoot
$distDir = Join-Path $baseDir "website-to-upload"

if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
}

New-Item -ItemType Directory -Path $distDir | Out-Null

$files = @("index.html", "manifest.webmanifest", "sw.js")
foreach ($f in $files) {
    $src = Join-Path $baseDir $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $distDir -Force
    }
}

$dirs = @("styles", "js", "icons")
foreach ($d in $dirs) {
    $src = Join-Path $baseDir $d
    if (Test-Path $src) {
        Copy-Item $src -Destination $distDir -Recurse -Force
    }
}

$totalSize = (Get-ChildItem -Path $distDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Host "Created website-to-upload successfully! Total size: $([Math]::Round($totalSize / 1KB, 1)) KB"
