[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$UploadRoot = $(if ($env:STORAGE_DIR) { $env:STORAGE_DIR } elseif ($env:UPLOAD_ROOT) { $env:UPLOAD_ROOT } else { '' }),
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\uploads')
)

if (-not $UploadRoot) { throw 'STORAGE_DIR (or legacy UPLOAD_ROOT) is required.' }
if (-not (Test-Path $UploadRoot)) { throw "Upload root not found: $UploadRoot" }

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetFile = Join-Path $BackupRoot "uploads-$timestamp.zip"

if ($PSCmdlet.ShouldProcess($targetFile, 'Create upload archive')) {
  Compress-Archive -LiteralPath $UploadRoot -DestinationPath $targetFile -Force
}

Write-Host "Upload backup target: $targetFile"
