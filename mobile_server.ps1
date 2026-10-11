# UroStone AI - Zero-Dependency Local Network HTTP Server for Mobile Devices
# Uses .NET TcpListener (Zero Administrator Privileges Required)

param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
Set-Location $scriptDir

# 1. Detect All Local Network IPv4 Addresses
$allNetIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and 
    $_.AddressState -eq "Preferred"
}

# Prioritize Wi-Fi/Wireless first, then Ethernet, then others
$sortedIps = $allNetIps | Sort-Object -Property @{
    Expression = {
        if ($_.InterfaceAlias -match "Wi-Fi|Wireless|WLAN") { 1 }
        elseif ($_.InterfaceAlias -match "Ethernet|Local Area") { 2 }
        else { 3 }
    }
}

$availableIps = @()
foreach ($addr in $sortedIps) {
    if ($addr.IPAddress) {
        $availableIps += [PSCustomObject]@{
            ip = $addr.IPAddress
            alias = $addr.InterfaceAlias
        }
    }
}

$localIp = if ($availableIps.Count -gt 0) { $availableIps[0].ip } else { "127.0.0.1" }

# 2. Bind TCP Listener
$listener = $null
$boundPort = $Port
for ($tryPort = $Port; $tryPort -le ($Port + 10); $tryPort++) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $tryPort)
        $listener.Start()
        $boundPort = $tryPort
        break
    } catch {
        # try next port
    }
}

if (-not $listener) {
    Write-Error "Could not bind to any port between $Port and $($Port + 10)."
    exit 1
}

$networkUrl = "http://${localIp}:${boundPort}"
$localUrl = "http://localhost:${boundPort}"

# Save config for client app
$configObj = @{
    ip = $localIp
    port = $boundPort
    url = $networkUrl
    availableIps = $availableIps
    timestamp = [DateTime]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 3
Set-Content -Path (Join-Path $scriptDir "network-config.json") -Value $configObj -Encoding UTF8

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   UROSTONE AI - MOBILE NETWORK ACCESS SERVER (EAU CLINICAL PROTOCOL)" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [+] Server Status:   ONLINE & READY FOR PHONE CONNECTIONS" -ForegroundColor Green
Write-Host "  [+] Local PC URL:    $localUrl" -ForegroundColor White
Write-Host "  [+] Phone LAN URL:   $networkUrl" -ForegroundColor Cyan
Write-Host "  [+] Bound Port:      $boundPort (Listening on all interfaces)" -ForegroundColor Gray
if ($availableIps.Count -gt 1) {
    Write-Host "  [+] Other Detected Interfaces:" -ForegroundColor DarkGray
    foreach ($item in $availableIps) {
        Write-Host "       - $($item.alias): http://$($item.ip):$boundPort" -ForegroundColor DarkGray
    }
}
Write-Host ""
Write-Host "  ----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  HOW TO OPEN ON YOUR SMARTPHONE (iPhone / Android):" -ForegroundColor Yellow
Write-Host "   1. Ensure your phone is connected to the same Wi-Fi network."
Write-Host "   2. Open your phone camera or web browser (Safari / Chrome)."
Write-Host "   3. Point your camera at the QR code on screen, or type: $networkUrl"
Write-Host "   4. In Safari / Chrome, tap 'Add to Home Screen' for fullscreen PWA app!"
Write-Host "  ----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C at any time in this window to stop the server." -ForegroundColor DarkGray
Write-Host ""

# Open desktop browser to local URL (if enabled)
if (-not $NoBrowser) {
    Start-Process $localUrl
}

# MIME Types Dictionary
$mimeTypes = @{
    ".html"        = "text/html; charset=utf-8"
    ".htm"         = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg"         = "image/svg+xml"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".ico"         = "image/x-icon"
    ".txt"         = "text/plain; charset=utf-8"
    ".woff2"       = "font/woff2"
    ".woff"        = "font/woff"
    ".ttf"         = "font/ttf"
    ".map"         = "application/json"
}

# Main Request Handling Loop
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 1500
            $stream.WriteTimeout = 1500

            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            while (-not $stream.DataAvailable -and $sw.ElapsedMilliseconds -lt 1000) {
                Start-Sleep -Milliseconds 10
            }

            if (-not $stream.DataAvailable) {
                try { $client.Close() } catch {}
                continue
            }

            $buffer = New-Object byte[] 16384
            $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -gt 0) {
                $requestText = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
                $firstLine = $requestText.Split("`n")[0].Trim()
                if (-not [string]::IsNullOrWhiteSpace($firstLine)) {
                    # Handle CORS preflight OPTIONS
                    if ($firstLine.StartsWith("OPTIONS")) {
                        $corsHeaders = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: *`r`nConnection: close`r`n`r`n"
                        $chb = [System.Text.Encoding]::ASCII.GetBytes($corsHeaders)
                        $stream.Write($chb, 0, $chb.Length)
                        $stream.Flush()
                        continue
                    }

                    $parts = $firstLine.Split(" ")
                    $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
                    $reqPath = $rawPath.Split("?")[0]
                    $reqPath = [System.Uri]::UnescapeDataString($reqPath)

                    if ($reqPath -eq "/" -or [string]::IsNullOrWhiteSpace($reqPath)) {
                        $reqPath = "/index.html"
                    }

                    if ($reqPath -eq "/api/network-info") {
                        $apiObj = @{
                            ip = $localIp
                            port = $boundPort
                            url = $networkUrl
                            status = "online"
                            availableIps = $availableIps
                            timestamp = [DateTime]::UtcNow.ToString("o")
                        }
                        $apiJson = $apiObj | ConvertTo-Json -Depth 3
                        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($apiJson)
                        $headers = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: *`r`nConnection: close`r`n`r`n"
                        $hb = [System.Text.Encoding]::ASCII.GetBytes($headers)
                        $stream.Write($hb, 0, $hb.Length)
                        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                        $stream.Flush()
                    } else {
                        $relPath = $reqPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
                        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $relPath))

                        if ($fullPath.StartsWith($scriptDir, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $fullPath -PathType Leaf)) {
                            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                            $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
                            $headers = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nCache-Control: public, max-age=3600`r`nConnection: close`r`n`r`n"
                            $hb = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hb, 0, $hb.Length)
                            $stream.Write($fileBytes, 0, $fileBytes.Length)
                            $stream.Flush()
                        } else {
                            $notFoundBody = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                            $headers = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($notFoundBody.Length)`r`nConnection: close`r`n`r`n"
                            $hb = [System.Text.Encoding]::ASCII.GetBytes($headers)
                            $stream.Write($hb, 0, $hb.Length)
                            $stream.Write($notFoundBody, 0, $notFoundBody.Length)
                            $stream.Flush()
                        }
                    }
                }
            }
        } catch {
            # Client socket closed or network error
        } finally {
            try { $client.Close() } catch {}
        }
    }
} finally {
    if ($listener) { $listener.Stop() }
}
