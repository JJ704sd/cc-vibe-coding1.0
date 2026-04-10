# Trace Scope Single-Node Deployment

## Runtime Shape

- Caddy serves the built frontend
- Caddy reverse-proxies `/api/*`, `/health*`, and `/uploads/*` to `trace-scope-api`
- PM2 runs one Node.js API process
- MySQL stays on the same host and is not exposed publicly

## 1. Install dependencies

```powershell
Set-Location 'D:\VS vibe coding files\trace-scope-platform\apps\api'
npm install
Set-Location 'D:\VS vibe coding files\trace-scope-platform\apps\web'
npm install
```

## 2. Prepare the production env file

```powershell
Copy-Item apps\api\.env.production.example apps\api\.env.production
```

Set these values before first start:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `UPLOAD_ROOT`
- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `CORS_ORIGINS`

## 3. Build the release

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\build-release.ps1
```

## 4. Start the API with PM2

```powershell
pm2 start ecosystem.config.cjs --only trace-scope-api --env production
pm2 save
```

## 5. Configure Caddy environment values

```powershell
$env:TRACE_SCOPE_DOMAIN='trace.example.com'
$env:TRACE_SCOPE_WEB_ROOT='D:\VS vibe coding files\trace-scope-platform\apps\web\dist'
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
