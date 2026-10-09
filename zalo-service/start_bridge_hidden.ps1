$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortDir = $fso.GetFolder($scriptDir).ShortPath

$portListening = $false
try {
    $conn = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue
    if ($conn) { $portListening = $true }
} catch {}

if (-not $portListening) {
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $shortDir -WindowStyle Hidden
}
