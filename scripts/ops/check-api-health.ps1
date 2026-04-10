[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$liveUrl = "$BaseUrl/health/live"
$readyUrl = "$BaseUrl/health/ready"

try {
  $live = Invoke-RestMethod -Uri $liveUrl -Method Get
} catch {
  throw "Live check failed for $liveUrl. $($_.Exception.Message)"
}

try {
  $ready = Invoke-RestMethod -Uri $readyUrl -Method Get
} catch {
  throw "Readiness check failed for $readyUrl. $($_.Exception.Message)"
}

if ($live.status -ne 'ok') {
  throw "Live check returned unexpected payload from $liveUrl"
}

if ($ready.status -ne 'ok') {
  throw "Readiness check returned unexpected payload from $readyUrl"
}

Write-Host "Live: $($live.status)"
Write-Host "Ready: $($ready.status)"
