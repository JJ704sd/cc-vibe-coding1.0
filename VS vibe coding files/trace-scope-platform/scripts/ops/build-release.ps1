[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$apiDir = Join-Path $RepoRoot 'apps\api'
$webDir = Join-Path $RepoRoot 'apps\web'

Write-Host "Building API from $apiDir"
Push-Location $apiDir
npm run build
if ($LASTEXITCODE -ne 0) { throw 'API build failed.' }
Pop-Location

Write-Host "Building web app from $webDir"
Push-Location $webDir
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
Pop-Location

Write-Host 'Release build completed.'
