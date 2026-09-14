$ErrorActionPreference = 'Stop'
$houseDirectory = $PSScriptRoot
$houseUrl = 'http://127.0.0.1:4173'
$houseAvailable = $false
try { $houseResponse = Invoke-WebRequest -Uri $houseUrl -UseBasicParsing -TimeoutSec 2; $houseAvailable = $houseResponse.Content.Contains('Shankaranarayana, Udupi') } catch {}
if (-not $houseAvailable) {
    $houseNode = Get-Command node -ErrorAction SilentlyContinue
    if (-not $houseNode) { throw 'Node.js is needed to run this local copy. Install Node.js, then open start.cmd again.' }
    Start-Process -FilePath $houseNode.Source -ArgumentList 'server.mjs' -WorkingDirectory $houseDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $houseDirectory 'server.log') -RedirectStandardError (Join-Path $houseDirectory 'server-error.log') | Out-Null
    for ($houseAttempt = 0; $houseAttempt -lt 25; $houseAttempt++) {
        Start-Sleep -Milliseconds 200
        try { $houseResponse = Invoke-WebRequest -Uri $houseUrl -UseBasicParsing -TimeoutSec 1; if ($houseResponse.Content.Contains('Shankaranarayana, Udupi')) { $houseAvailable = $true; break } } catch {}
    }
}
if (-not $houseAvailable) { throw 'The walkthrough could not start. Check server-error.log in this folder.' }
Start-Process $houseUrl
