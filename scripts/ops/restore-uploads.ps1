[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$ArchiveFile,
  [string]$UploadRoot = $env:UPLOAD_ROOT
)

if (-not (Test-Path $ArchiveFile)) { throw "Archive file not found: $ArchiveFile" }
if (-not $UploadRoot) { throw 'UPLOAD_ROOT is required.' }

$parentDir = Split-Path -Parent $UploadRoot
$leafName = Split-Path -Leaf $UploadRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stagingRoot = Join-Path $parentDir "restore-$leafName-$timestamp"
$previousRoot = "$UploadRoot.pre-restore-$timestamp"

if ($PSCmdlet.ShouldProcess($UploadRoot, "Restore uploads from $ArchiveFile")) {
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
  Expand-Archive -LiteralPath $ArchiveFile -DestinationPath $stagingRoot -Force

  if (Test-Path $UploadRoot) {
    Move-Item -LiteralPath $UploadRoot -Destination $previousRoot
  }

  Move-Item -LiteralPath (Join-Path $stagingRoot $leafName) -Destination $UploadRoot
}

Write-Host "Upload restore source: $ArchiveFile"
