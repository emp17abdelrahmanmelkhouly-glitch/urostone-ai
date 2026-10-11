# build_zip.ps1
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = $PSScriptRoot
$distDir = Join-Path $baseDir "website-to-upload"
$zipPath = Join-Path $baseDir "UroStone_AI_Standalone.zip"

# Re-run prepare_dist first
& (Join-Path $baseDir "prepare_dist.ps1")

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

$files = Get-ChildItem -Path $distDir -Recurse -File
foreach ($file in $files) {
    $relPath = $file.FullName.Substring($distDir.Length).TrimStart('\', '/')
    $entryName = $relPath.Replace('\', '/')
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $entry.Open()
    $fileBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $entryStream.Write($fileBytes, 0, $fileBytes.Length)
    $entryStream.Close()
}

$archive.Dispose()
$zipStream.Dispose()

$zipSize = (Get-Item $zipPath).Length
Write-Host "UroStone_AI_Standalone.zip created cleanly! Size: $([Math]::Round($zipSize / 1KB, 1)) KB"
