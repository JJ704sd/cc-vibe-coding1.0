[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile,
  [string]$MysqlExe = $env:MYSQL_EXE,
  [string]$MysqlHost = $env:MYSQL_HOST,
  [int]$MysqlPort = 3306,
  [string]$MysqlUser = $env:MYSQL_USER,
  [string]$MysqlPassword = $env:MYSQL_PASSWORD,
  [string]$MysqlDatabase = $env:MYSQL_DATABASE
)

if (-not (Test-Path $DumpFile)) { throw "Dump file not found: $DumpFile" }
if (-not $MysqlExe) { throw 'MYSQL_EXE is required.' }
if (-not $MysqlHost) { throw 'MYSQL_HOST is required.' }
if (-not $MysqlUser) { throw 'MYSQL_USER is required.' }
if (-not $MysqlPassword) { throw 'MYSQL_PASSWORD is required.' }
if (-not $MysqlDatabase) { throw 'MYSQL_DATABASE is required.' }
if ($env:MYSQL_PORT) { $MysqlPort = [int]$env:MYSQL_PORT }

if ($PSCmdlet.ShouldProcess($MysqlDatabase, "Restore MySQL dump from $DumpFile")) {
  $process = Start-Process -FilePath $MysqlExe -ArgumentList @("--host=$MysqlHost", "--port=$MysqlPort", "--user=$MysqlUser", "--password=$MysqlPassword", $MysqlDatabase) -RedirectStandardInput $DumpFile -NoNewWindow -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw 'mysql restore failed.' }
}

Write-Host "Restore source: $DumpFile"
