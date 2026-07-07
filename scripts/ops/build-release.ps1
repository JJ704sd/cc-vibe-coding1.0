[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$apiDir = Join-Path $RepoRoot 'apps\api'
$webDir = Join-Path $RepoRoot 'apps\web'
$originalDir = (Get-Location).Path

# BUG-033: every Push-Location needs a paired Pop-Location in a finally
# block so that a build failure (throw) doesn't leave the shell wedged
# in apps/api or apps/web for the rest of the session.
try {
  Write-Host "Building API from $apiDir"
  Push-Location $apiDir
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'API build failed.' }
  } finally {
    Pop-Location
  }

  Write-Host "Building web app from $webDir"
  Push-Location $webDir
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
  } finally {
    Pop-Location
  }
} finally {
  # Belt-and-braces: even if a re-thrown exception from inside one of
  # the inner finally blocks aborts the script, snap back to the
  # directory the operator started from.
  if ((Get-Location).Path -ne $originalDir) {
    Set-Location $originalDir
  }
}

Write-Host 'Release build completed.'