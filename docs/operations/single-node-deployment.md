# Trace Scope Single-Node Deployment

> **跨机器部署提示**：本指南示例路径用 `$RepoRoot` 占位符，部署时请把它替换成实际仓库根目录的绝对路径（例如 Linux 上可能是 `/opt/trace-scope-platform`，macOS 上可能是 `/Users/you/Projects/trace-scope-platform`）。脚本本身 (`scripts/ops/*.ps1` + `ecosystem.config.cjs`) 会自动从 `$PSScriptRoot` / `__dirname` 解析项目根，无需你硬编码路径。

## Runtime Shape

- Caddy serves the built frontend
- Caddy reverse-proxies `/api/*`, `/health*`, and `/uploads/*` to `trace-scope-api`
- PM2 runs one Node.js API process
- MySQL stays on the same host and is not exposed publicly

## 1. Install dependencies

```powershell
Set-Location "$RepoRoot\apps\api"
npm install
Set-Location "$RepoRoot\apps\web"
npm install
```

## 2. Prepare the production env file

```powershell
Copy-Item "$RepoRoot\apps\api\.env.production.example" "$RepoRoot\apps\api\.env.production"
```

Set these values before first start:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `STORAGE_DIR` (the API's upload storage directory; legacy `UPLOAD_ROOT` is also accepted as an alias)
- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `CORS_ORIGINS`

## 3. Build the release

```powershell
powershell -ExecutionPolicy Bypass -File "$RepoRoot\scripts\ops\build-release.ps1"
```

## 4. Start the API with PM2

```powershell
pm2 start "$RepoRoot\ecosystem.config.cjs" --only trace-scope-api --env production
pm2 save
```

## 5. Configure Caddy environment values

```powershell
$env:TRACE_SCOPE_DOMAIN='trace.example.com'
$env:TRACE_SCOPE_WEB_ROOT="$RepoRoot\apps\web\dist"
$env:TRACE_SCOPE_API_PORT='4000'
```

## 6. Validate and start Caddy

```powershell
caddy validate --config deploy\caddy\Caddyfile
caddy run --config deploy\caddy\Caddyfile
```

## 7. Smoke-check the deployment

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\check-api-health.ps1 -BaseUrl https://trace.example.com
```
