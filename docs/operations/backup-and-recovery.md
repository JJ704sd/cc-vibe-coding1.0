# Trace Scope Backup and Recovery

## Backup Commands

### MySQL

```powershell
$env:MYSQLDUMP_EXE='D:\Mysql community\server\bin\mysqldump.exe'
powershell -ExecutionPolicy Bypass -File scripts\ops\backup-mysql.ps1
```

### Uploads

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\backup-uploads.ps1
```

## Restore Commands

### MySQL

```powershell
$env:MYSQL_EXE='D:\Mysql community\server\bin\mysql.exe'
powershell -ExecutionPolicy Bypass -File scripts\ops\restore-mysql.ps1 -DumpFile .\backups\mysql\trace_scope_platform-20260409-120000.sql
```

### Uploads

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\restore-uploads.ps1 -ArchiveFile .\backups\uploads\uploads-20260409-120000.zip
```

## Recommended Schedule

- MySQL dump: once every day
- Upload archive: once every day after the MySQL dump
- Keep at least 7 daily backups locally
- Copy the `backups/` directory to a second disk or second machine before deleting old archives

## Post-Recovery Checks

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\check-api-health.ps1 -BaseUrl http://127.0.0.1:4000
```

Verify all four items:

- health checks return `ok`
- admin login still works
- at least one public project page opens
- at least one uploaded image still resolves through `/uploads/:fileId`
