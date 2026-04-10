[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$MysqlDumpExe = $env:MYSQLDUMP_EXE,
  [string]$MysqlHost = $env:MYSQL_HOST,
  [int]$MysqlPort = 3306,
  [string]$MysqlUser = $env:MYSQL_USER,
  [string]$MysqlPassword = $env:MYSQL_PASSWORD,
  [string]$MysqlDatabase = $env:MYSQL_DATABASE,
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\mysql')
)

if (-not $MysqlDumpExe) { throw 'MYSQLDUMP_EXE is required.' }
if (-not $MysqlHost) { throw 'MYSQL_HOST is required.' }
if (-not $MysqlUser) { throw 'MYSQL_USER is required.' }
if (-not $MysqlPassword) { throw 'MYSQL_PASSWORD is required.' }
if (-not $MysqlDatabase) { throw 'MYSQL_DATABASE is required.' }
if ($env:MYSQL_PORT) { $MysqlPort = [int]$env:MYSQL_PORT }

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetFile = Join-Path $BackupRoot "$MysqlDatabase-$timestamp.sql"

if ($PSCmdlet.ShouldProcess($targetFile, 'Create MySQL dump')) {
  & $MysqlDumpExe "--host=$MysqlHost" "--port=$MysqlPort" "--user=$MysqlUser" "--password=$MysqlPassword" "--default-character-set=utf8mb4" "--single-transaction" "--quick" $MysqlDatabase | Set-Content -LiteralPath $targetFile -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed.' }
}

Write-Host "MySQL backup target: $targetFile"
