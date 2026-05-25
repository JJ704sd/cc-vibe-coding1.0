# Trace Scope API

## Local development

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Create the MySQL database named in `MYSQL_DATABASE`
4. Run `npm run migrate`
5. Run `npm run dev`

## Production operations

- deployment guide: `../../docs/operations/single-node-deployment.md`
- backup and recovery guide: `../../docs/operations/backup-and-recovery.md`
- PM2 profile: `../../ecosystem.config.cjs`
- Caddy config: `../../deploy/caddy/Caddyfile`
