[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$ArchiveFile,
  [string]$UploadRoot = $(if ($env:STORAGE_DIR) { $env:STORAGE_DIR } elseif ($env:UPLOAD_ROOT) { $env:UPLOAD_ROOT } else { '' })
)

if (-not (Test-Path $ArchiveFile)) { throw "Archive file not found: $ArchiveFile" }
if (-not $UploadRoot) { throw 'STORAGE_DIR (or legacy UPLOAD_ROOT) is required.' }

$parentDir = Split-Path -Parent $UploadRoot
$leafName = Split-Path -Leaf $UploadRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stagingRoot = Join-Path $parentDir "restore-$leafName-$timestamp"
$previousRoot = "$UploadRoot.pre-restore-$timestamp"

# BUG-034: zip-slip defence. Expand-Archive resolves `..` segments, so
# an archive with `../../../etc/passwd` as an entry would extract
# outside the staging directory and potentially overwrite sensitive
# files once we move staging into place. Validate every entry's path
# stays inside the staging root BEFORE expanding.
if ($PSCmdlet.ShouldProcess($UploadRoot, "Restore uploads from $ArchiveFile")) {
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
  $stagingRootFull = (Resolve-Path $stagingRoot).Path
  $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $ArchiveFile).Path)
  try {
    foreach ($entry in $archive.Entries) {
      # Entry.FullName is the path inside the archive using '/' as
      # separator. Reject absolute paths (e.g. `/etc/passwd`) and any
      # path that resolves outside the staging root after we re-join
      # it on the local filesystem.
      if ($entry.FullName.StartsWith('/') -or $entry.FullName.StartsWith('\')) {
        throw "Refusing zip entry with absolute path: $($entry.FullName)"
      }
      $candidate = Join-Path $stagingRootFull ($entry.FullName -replace '/', [IO.Path]::DirectorySeparatorChar)
      $candidateFull = [System.IO.Path]::GetFullPath($candidate)
      if (-not $candidateFull.StartsWith($stagingRootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing zip entry that escapes staging root: $($entry.FullName) -> $candidateFull"
      }
    }
  } finally {
    $archive.Dispose()
  }

  Expand-Archive -LiteralPath $ArchiveFile -DestinationPath $stagingRoot -Force

  if (Test-Path $UploadRoot) {
    Move-Item -LiteralPath $UploadRoot -Destination $previousRoot
  }

  Move-Item -LiteralPath (Join-Path $stagingRoot $leafName) -Destination $UploadRoot
}

Write-Host "Upload restore source: $ArchiveFile"