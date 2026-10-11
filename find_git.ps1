$candidates = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "C:\Users\zero one tech\AppData\Local\Programs\Git\cmd\git.exe",
    "C:\Users\zero one tech\AppData\Local\GitHubDesktop\GitHubDesktop.exe"
)

foreach ($c in $candidates) {
    if (Test-Path $c) {
        Write-Host "FOUND: $c"
    }
}
Write-Host "Check complete."
