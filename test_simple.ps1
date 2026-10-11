$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8899)
$listener.Start()

$job = Start-ThreadJob {
    param($l)
    $client = $l.AcceptTcpClient()
    $stream = $client.GetStream()
    $buf = New-Object byte[] 4096
    $read = $stream.Read($buf, 0, $buf.Length)
    $body = [System.Text.Encoding]::UTF8.GetBytes("HELLO WORLD")
    $headers = "HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    $hBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $stream.Write($hBytes, 0, $hBytes.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
    $client.Close()
} -ArgumentList $listener -ErrorAction SilentlyContinue

Start-Sleep -Milliseconds 500
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8899" -TimeoutSec 2
    Write-Output "RESULT: $res"
} catch {
    Write-Output "ERR: $($_.Exception.Message)"
} finally {
    $listener.Stop()
}
