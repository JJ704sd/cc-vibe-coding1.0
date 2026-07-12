# trace-scope 历史遗留 bug 综合报告 (2026-07-06)

> **审计日期**:2026-07-06
> **审计范围**:`D:\VS vibe coding files\trace-scope-platform`(主仓,只读)
> **审计方式**:4 个并行 track(backend / frontend / db-deploy / docs-config)静态代码审计 + Vitest 全量测试基线
> **基线状态**:`apps/api` 13 文件 / 89 用例全过 / `tsc` 干净;`apps/web` 34 文件 / 145 用例全过 / `vite build` 通过(1 条 circular-chunk warning)
> **本报告**:综合 4 份 track 报告,去重 + 跨 track 交叉验证

---

## 执行摘要

| 项目 | 数量 |
|------|------|
| **总 bug 数** | **52**(去重后) |
| 原始 4 份报告合并 | 14 + 12 + 15 + 13 = **54** |
| 跨 track 重复已合并 | -2(`localFileStorage` 路径遍历 ×2 / `deleteUpload` FK ×2 / migrations.ts vs .sql ×2) |

### 按严重度分布

| 严重度 | 数量 | 占比 |
|--------|------|------|
| **P0**(必修,生产已坏或安全洞) | **16** | 30.8% |
| **P1**(应修,高风险/性能/UX) | **13** | 25.0% |
| **P2**(建议修,边界/死代码/部署健壮性) | **13** | 25.0% |
| **P3**(低优,代码异味/风格) | **10** | 19.2% |

### 按类别分布

| 类别 | 数量 | 备注 |
|------|------|------|
| 错误处理 / 异步错误捕获 | 9 | 跨 backend + frontend,Promise.all/.catch/FK violation |
| 安全 / 部署配置 | 8 | 路径遍历 / 默认配置 / 时序攻击 / MIME 校验 |
| 资源泄漏(R3F / Three.js / Map / Memory) | 6 | GPU 纹理 + skyMesh + mapInstance + loginAttemptsByIp |
| 部署运维 / 脚本 | 7 | PowerShell 语法 + UTF-8 BOM + 反代路径 + Caddy headers |
| 文档配置 / 跨文档一致性 | 8 | .env.example 自相矛盾 + CLAUDE.md 架构过时 + README 表述 |
| 数据库 / Schema / 索引 | 5 | migrations.ts vs .sql / 无 schema_migrations / 缺索引 / N+1 |
| 状态管理 / Stale closure | 3 | useState 锁定 / 不重置 data / 非空断言 |
| CLAUDE.md 约束违反 | 1 | 路由页面含业务逻辑 |
| 代码异味 / 风格 | 5 | last_seen_at / TOCTOU / 字段校验 / SQL 模板字符串 |

### 跨 track 共性问题 Top 3

1. **异步错误捕获不严**(跨 backend + frontend):9 个 bug 属于"async boundary 没有 error sink"。前端 `Promise.all` 链 5 处无 `.catch()`;后端 `try/await` 路径 `input.id ?? ''` 返回 `undefined` 而不抛错;`getReadableFile` 用 4 次顺序查询而非事务。多为"快乐路径顺写,失败路径静默退化为空状态",owner 看不出问题已发生。

2. **R3F / Three.js / MapLibre 资源清理缺失**(frontend 集中):3 个 P0 + 1 个 P1 都属于"组件 unmount 时 GPU/MapLibre 资源未 dispose"。根因统一 — 团队不熟悉 R3F cleanup pattern,代码 review 时缺少 dispose checklist。GPU 内存随 `/` ↔ `/projects` 切换线性增长,3D 场景尤其严重。

3. **部署链路脆弱,文档与代码不同步**(db-deploy + docs-config):Caddyfile `/uploads/*` matcher 与 README 矛盾、`.env.example` 注释与 config.ts fallback 矛盾、PowerShell 脚本没经过 PSScriptAnalyzer、CLAUDE.md 架构树落后于实际目录 9-7-8 = 22 个条目、运维 SOP 引用已废弃 URL。根因:部署代码与文档没有 CI 校验,owner 改完代码忘改文档。

---

## P0 bug 详情(完整卡片,16 条)

### [BUG-001] INSERT 后 SELECT 回读用未初始化 id,新建图片返回 undefined

- **严重度**:P0
- **类别**:错误处理 / 数据返回不一致
- **位置**:`apps/api/src/modules/media-images/repository.ts:88-110`
- **一句话描述**:新生成的 id 写入局部常量但没回写到 `input.id`,SELECT 回查时 `input.id ?? ''` 永远等于 `''`,`rows[0]` = `undefined`,客户端拿到不存在的对象
- **原始报告**:backend-bug-audit #01
- **证据片段**:
  ```ts
  } else {
    // Insert new
    const id = input.id ?? crypto.randomUUID();
    await pool.execute(
      `INSERT INTO media_image (id, media_set_id, ...) VALUES (?, ?, ...)`,
      [id, input.media_set_id, ...]
    );
  }
  const rows = await pool.query<MediaImageRow>(`SELECT * FROM media_image WHERE id = ?`, [input.id ?? '']);
  return rows[0];
  ```
- **复现步骤**:`POST /api/media-images` 携带有效 `media_set_id` + `upload_file_id`,响应 HTTP 200 但 body 缺 `id`(或 `undefined`)
- **建议修复**:
  ```ts
  const id = input.id ?? crypto.randomUUID();
  await pool.execute(`INSERT ...`, [id, ...]);
  const rows = await pool.query<MediaImageRow>(`SELECT * WHERE id = ?`, [id]);  // 用生成的 id
  return rows[0];
  ```

---

### [BUG-002] localFileStorage 路径遍历:可控 storage_key → 任意文件读取/删除

- **严重度**:P0
- **类别**:安全 — 路径穿越
- **位置**:`apps/api/src/infrastructure/storage/localFileStorage.ts:69-90`(getFile)、`92-101`(deleteFile)
- **一句话描述**:`join(rootDir, storageKey)` 无 `resolve + startsWith(rootDir)` 边界检查,攻击者通过 DB 写入 `storage_key='../../etc/passwd'` 即可读/删 host 任意文件
- **原始报告**:backend-bug-audit #02(主)、db-deploy-audit #10(辅助,标 P1 latent)
- **取最严重评级**:P0(backend 已给出完整 exploit chain:upload_file.storage_key 可控 → isFileReachableFromPublishedContent 通过 → GET /api/public/uploads/X → 读任意文件)
- **证据片段**:
  ```ts
  getFile: async (storageKey: string) => {
    const absolutePath = join(rootDir, storageKey);  // 完全没有 resolve + containment
    try {
      const fileBuffer = await readFile(absolutePath);
      ...
      const stream = createReadStream(absolutePath);
      return { stream, mimeType };
    } catch {
      return null;
    }
  }
  ```
- **复现步骤**:
  1. 假设攻击者拿到 DB 写权限,`INSERT upload_file(id='X', storage_key='../../etc/passwd', ...)`
  2. 让 X 被某个已发布实体引用(例如 `project.cover_upload_file_id='X'`)→ 通过发布门控
  3. `GET /api/public/uploads/X` → `join(rootDir, '../../etc/passwd')` → 解析到 rootDir 之外 → 任意文件读取
- **建议修复**:
  ```ts
  const absolutePath = path.resolve(rootDir, storageKey);
  if (!absolutePath.startsWith(rootDir + path.sep) && absolutePath !== rootDir) {
    throw new Error('storage_key escapes storage root');
  }
  ```
  或更严格:白名单正则 `^original/\d{4}/\d{2}/\d{2}/[0-9a-f]{2}/[0-9a-f]{2}/[0-9a-f]{32}(\.[a-z0-9]+)?$`(saveBuffer 已保证此格式)

---

### [BUG-003] 生产部署加载错 env 文件 — `dotenv/config` 简写不读 `DOTENV_CONFIG_PATH`

- **严重度**:P0
- **类别**:部署运维 / 安全
- **位置**:`apps/api/src/main.ts:1` + `ecosystem.config.cjs:13-16`
- **一句话描述**:PM2 设了 `DOTENV_CONFIG_PATH=.env.production`,但 `main.ts` 用 `import 'dotenv/config'`(裸 dotenv 简写),不识别该 env var;生产 API 拿到 `.env` fallback 失败,落到 config.ts 硬编码默认值
- **原始报告**:db-deploy-audit #1
- **证据片段**(`apps/api/src/main.ts:1`):
  ```ts
  import 'dotenv/config';   // 只读 .env,不读 DOTENV_CONFIG_PATH
  ```
  (`ecosystem.config.cjs:13-16`):
  ```js
  env: {
    NODE_ENV: 'production',
    DOTENV_CONFIG_PATH: '.env.production',   // 被 dotenv/config 忽略
    ...
  }
  ```
- **复现步骤**:
  ```powershell
  Set-Location 'D:\VS vibe coding files\trace-scope-platform\apps\api'
  Remove-Item .\.env -ErrorAction SilentlyContinue
  Remove-Item .\.env.production -ErrorAction SilentlyContinue
  pm2 start ..\..\ecosystem.config.cjs --only trace-scope-api --env production
  pm2 logs trace-scope-api | Select-Object -First 30
  # 观察: SESSION_SECRET 是否被设成 'dev-secret-change-in-production'
  ```
- **实际后果**:`SESSION_SECRET='dev-secret-change-in-production'` + `ADMIN_BOOTSTRAP_PASSWORD='admin123'` + `COOKIE_SECURE=false`,全网可伪造 session
- **建议修复**:`main.ts` 改为
  ```ts
  import dotenv from 'dotenv';
  import { join } from 'node:path';
  import { existsSync } from 'node:fs';

  const envFile = process.env.DOTENV_CONFIG_PATH ?? '.env';
  if (existsSync(join(process.cwd(), envFile))) {
    dotenv.config({ path: envFile });
  }
  ```

---

### [BUG-004] SQL 迁移路径分叉 — initDb 与 migrate 走两套 schema

- **严重度**:P0
- **类别**:数据库 / 部署一致性
- **位置**:
  - `apps/api/src/infrastructure/db/db.ts:31-39`(启动时加载 `migrations.ts`)
  - `apps/api/src/infrastructure/db/sql/migrations.ts`(硬编码 JS 字符串)
  - `apps/api/src/infrastructure/db/migrate.ts:13-27`(读 `001/002 .sql` 文件)
  - `apps/api/src/infrastructure/db/sql/001_initial_schema.sql`、`002_content_and_uploads.sql`
- **一句话描述**:`initDb()`(main.ts 启动)调 `migrations.ts` 字符串,`npm run migrate` 读 .sql 文件,**6 处字段类型/约束不一致**(TINYINT vs INTEGER, VARCHAR(80) vs VARCHAR(100), 缺 ON UPDATE, 缺 sha256 CHECK...),两种启动方式得到不同 schema
- **原始报告**:db-deploy-audit #2(主)、backend-bug-audit #05-B(辅助,标 P1)
- **取最严重评级**:P0(db-deploy 给出完整 6 字段对照表与生产后果)
- **证据片段**(`db.ts:31-39`):
  ```ts
  const migrationSql = migrations.default as string;
  const statements = migrationSql
    .split(';')                                  // split(';') 对含 ; 的字符串字面量 / procedure 错位
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await connection.execute(statement);          // 永远全跑,无法应用 ALTER/新增索引
  }
  ```
- **具体差异**(实测):

  | 字段/约束 | `.sql` 文件(migrate 路径) | `migrations.ts` 字符串(initDb 路径) |
  |-----------|----------------------------|--------------------------------------|
  | `admin_user.id` 类型 | `CHAR(36)` | `VARCHAR(36)` |
  | `admin_user.username` 长度 | `VARCHAR(80)` | `VARCHAR(100)` |
  | `admin_user.role` 默认值 | 无 | `DEFAULT 'admin'` |
  | `admin_user.is_active` 类型 | `TINYINT(1)` | `INTEGER` |
  | `admin_user.updated_at` ON UPDATE | 无 | `ON UPDATE CURRENT_TIMESTAMP` |
  | `upload_file.sha256_hash` CHECK | `REGEXP '^[0-9a-f]{64}$'` | 无 |

- **实际后果**:实例 A(走 initDb)与实例 B(走 migrate)不能混部,90 字符 username 在 B 实例写入失败;`updated_at` 在 A 实例永远 stale;`sha256` 在 A 实例可写非法值
- **建议修复**:**删掉 `sql/migrations.ts`,只保留 `migrate.ts` 读取 .sql 文件路径**;`initDb` 改为 `if (await migrationsTableIsEmpty()) await runMigrations();` 幂等执行 .sql 列表

---

### [BUG-005] `backup-uploads.ps1` 第 4-5 行 PowerShell 语法错误,脚本根本不能跑

- **严重度**:P0
- **类别**:部署运维 / 脚本
- **位置**:`scripts/ops/backup-uploads.ps1:4-5`
- **一句话描述**:`Resolve-Path` 拿到两个位置参数(`.Path` 表达式 + `'backups\uploads'`),parser 报 `MissingEndParenthesisInFunctionParameterList`,脚本连 `param()` 都解析不过
- **原始报告**:db-deploy-audit #3
- **证据片段**(`backup-uploads.ps1:4-5`):
  ```powershell
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..').Path 'backups\uploads')
  )
  ```
  **AST 实测**(`[System.Management.Automation.Language.Parser]::ParseInput`):
  ```
  Command: Join-Path
    Arg[1] ParenExpressionAst
      inner-cmd: Resolve-Path
        arg: '(Join-Path $PSScriptRoot '..\..').Path' [MemberExpressionAst]
        arg: ''backups\uploads'' [StringConstantExpressionAst]    ← 多了一个位置参数
  ```
- **对照 `backup-mysql.ps1:9` 的正确写法**:
  ```powershell
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\mysql')
  #                                                                                       ↑ 多了这个 )
  ```
- **复现命令**(PowerShell 5.1):
  ```powershell
  $tokens = $null; $errors = $null
  [System.Management.Automation.Language.Parser]::ParseInput(
    (Get-Content -LiteralPath 'D:\VS vibe coding files\trace-scope-platform\scripts\ops\backup-uploads.ps1' -Raw),
    [ref]$tokens, [ref]$errors) | Out-Null
  $errors | ForEach-Object { "Line $($_.Extent.StartLineNumber) Col $($_.Extent.StartColumnNumber): $($_.Message)" }
  # 输出: Line 5 Col 2: 在参数列表中缺少")"
  ```
- **建议修复**:把第 4 行末尾改成 `(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\uploads'`,即在 `..\..'` 后加一个 `)`

---

### [BUG-006] `backup-mysql.ps1` 写出 UTF-8 BOM,`restore-mysql.ps1` 还原必失败

- **严重度**:P0
- **类别**:部署运维 / 脚本 / 备份链路
- **位置**:`scripts/ops/backup-mysql.ps1:24`
- **一句话描述**:`Set-Content -Encoding utf8` 在 PowerShell 5.1 写带 BOM(`EF BB BF`)的 UTF-8,`mysql` CLI 读取后第一个 statement 报 `ERROR 1064` 失败,**整条备份→还原链路断**
- **原始报告**:db-deploy-audit #4
- **证据片段**(`backup-mysql.ps1:24`):
  ```powershell
  & $MysqlDumpExe ... | Set-Content -LiteralPath $targetFile -Encoding utf8
  ```
  dump 文件头 3 字节:
  - 期望:`2D 2D 20`(`-- MySQL dump ...`)
  - 实际:`EF BB BF 2D 2D ...`(PowerShell 5.1 强加 BOM)
- **复现命令**:
  ```powershell
  $dumpFile = (Get-ChildItem -Path 'D:\VS vibe coding files\trace-scope-platform\backups\mysql\*.sql' | Select-Object -First 1).FullName
  $firstBytes = Get-Content -LiteralPath $dumpFile -TotalCount 1 -Encoding Byte
  "First 3 bytes: $($firstBytes[0..2] | ForEach-Object { '{0:X2}' -f $_ })"
  # 实际: EF BB BF
  ```
- **建议修复**(推荐 A):
  ```powershell
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($targetFile, ($outputString), $utf8NoBom)
  ```

---

### [BUG-007] `deleteUpload` 顺序错误 + FK violation → orphan DB row 指向不存在文件

- **严重度**:P0
- **类别**:错误处理 / 级联策略
- **位置**:`apps/api/src/modules/uploads/service.ts:82-88` + `db/sql/002_content_and_uploads.sql:22, 68, 86`
- **一句话描述**:先 `storage.deleteFile(storage_key)` 删盘上文件,后 `repository.deleteUploadFile(id)` 删 DB 行;`upload_file` 被 `project.cover_upload_file_id` / `media_set.cover_upload_file_id` / `media_image.upload_file_id` 三处 FK 引用,**默认 RESTRICT**,一旦有引用 DB 删除失败,但盘上文件已删,留下 orphan DB row
- **原始报告**:backend-bug-audit #04(主)、db-deploy-audit #5(辅助,同样位置)
- **取最严重评级**:P0(backend 已识别,db-deploy 给出完整复现 SQL)
- **证据片段**(`uploads/service.ts:82-88`):
  ```ts
  async deleteUpload(id: string): Promise<void> {
    const file = await this.repository.findById(id);
    if (file) {
      await this.storage.deleteFile(file.storage_key);   // ← 先删盘
    }
    await this.repository.deleteUploadFile(id);          // ← 再删 DB,FK 拒绝 → 失败
  }
  ```
  Schema (`002_content_and_uploads.sql:86`):
  ```sql
  CONSTRAINT fk_media_image_upload_file FOREIGN KEY (upload_file_id) REFERENCES upload_file(id),
  ```
  没有 `ON DELETE` 子句 → 默认 RESTRICT
- **复现**(db-deploy SQL):
  ```sql
  INSERT INTO project (id, title, slug, summary, description, status, created_at, updated_at)
  VALUES ('11111111-1111-1111-1111-111111111111', 'Test', 'test', '', '', 'draft', NOW(), NOW());
  UPDATE project SET cover_upload_file_id = '<existing-upload-id>' WHERE id = '...';
  -- 然后 DELETE /api/uploads/<existing-upload-id>
  ```
  实际:MySQL 抛 `ERROR 1451 (23000)`,盘上文件已删,DB 行还在;`/api/public/uploads/<id>` 抛 500
- **建议修复**:
  ```ts
  async deleteUpload(id: string): Promise<void> {
    const file = await this.repository.findById(id);
    if (!file) return;
    const refs = await this.repository.countReferences(id);   // UNION 三张表 COUNT
    if (refs > 0) {
      throw new AppError(`Cannot delete upload: referenced by ${refs} row(s)`, 409);
    }
    await this.repository.deleteUploadFile(id);              // 先删 DB
    await this.storage.deleteFile(file.storage_key);         // 再删盘
  }
  ```

---

### [BUG-008] GalleryHome `Promise.all(...).then(...).finally(...)` 无 `.catch()` — unhandled rejection

- **严重度**:P0
- **类别**:错误处理 / 未处理异步错误
- **位置**:`apps/web/src/app/routes/gallery/GalleryHome.tsx:87-110`
- **一句话描述**:网络或任何 media-set 500 时,`Promise.all` 拒绝,`.finally` 清除 `bootstrappingGallery`,但拒绝没有 `.catch` → unhandled promise rejection,UI 无错误提示,gallery 显示无图
- **原始报告**:frontend-bug-audit #01
- **证据片段**:
  ```ts
  void Promise.all(
    missingNodes.map(async (node) => ({
      id: node.id,
      images: await fetchLocationImages(node.id, relationshipData.nodes),
    })),
  )
    .then((results) => { /* setLocationImages */ })
    .finally(() => { if (!cancelled) setBootstrappingGallery(false); });
  // ← 没有 .catch,rejection 浮到全局
  ```
- **复现步骤**:停 API server 或 block `/api/public/media-sets/*` → 打开 `/` → DevTools console 报 `Uncaught (in promise) HTTP 504`,gallery 显示无图无 toast
- **建议修复**:在 `.finally` 前加 `.catch((err) => { toast.error('媒体加载失败'); })`,或在 mapper 内 `try/catch` 保证外层链永不 reject

---

### [BUG-009] AdminDashboardPage `Promise.all` 无 `.catch()` — 仪表盘 0 of everything 无提示

- **严重度**:P0
- **类别**:错误处理 / 未处理异步错误 / Admin UX
- **位置**:`apps/web/src/app/routes/admin/dashboard/AdminDashboardPage.tsx:9-17`
- **一句话描述**:4 个并发 API(projects/locations/mediaSets/routes)中任一 reject → `loading` 翻 `false`,`stats` 留 `{projects:0, ...}`,admin 看到 4 个 0 计数无错误提示
- **原始报告**:frontend-bug-audit #02
- **证据片段**:
  ```ts
  useEffect(() => {
    Promise.all([projectsApi.list(), locationsApi.list(), mediaSetsApi.list(), routesApi.list()])
      .then(([p, l, m, r]) => { setStats({ projects: p.length, ... }); })
      .finally(() => setLoading(false));
    // ← 没有 .catch,没有 setError
  }, []);
  ```
- **复现步骤**:登录 `/admin`,DevTools block `/api/projects` → 刷新 → 4 stat cards 全 0,console 报 `Uncaught (in promise) HTTP 401`
- **建议修复**:加 `.catch((err) => { setError(err); toast.error('仪表盘加载失败'); })`

---

### [BUG-010] AdminMediaPage `loadData` 无 try/catch — 媒体列表空 + unhandled rejection

- **严重度**:P0
- **类别**:错误处理 / 未处理异步错误 / Admin UX
- **位置**:`apps/web/src/app/routes/admin/media/AdminMediaPage.tsx:66-82`
- **一句话描述**:`loadData` 的 `Promise.all` 无 try/catch,API 失败时 `loading` 翻 `false`(via finally),但 `mediaSets/mediaImages/projects/locations` 全空,UI 显示"暂无媒体组"无 toast
- **原始报告**:frontend-bug-audit #03
- **证据片段**:
  ```ts
  const loadData = useCallback(async () => {
    const [sets, imgs, projs, locs] = await Promise.all([
      mediaSetsApi.list(), mediaImagesApi.list(),
      projectsApi.list(), locationsApi.list(),
    ]);
    setMediaSets(sets); setMediaImages(imgs); setProjects(projs); setLocations(locs);
  }, []);                                       // ← no try/catch

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));   // ← finally runs but error never surfaced
  }, [loadData]);
  ```
- **对照**:`AdminProjectsPage.loadProjects`(line 71-73)、`AdminLocationsPage.loadData`(line 39-49)都有 try/catch + toast,AdminMediaPage 是孤儿
- **建议修复**:wrap `Promise.all` body in try/catch and call `toast.error('加载失败')`,与其它 admin 页面统一

---

### [BUG-011] GalleryExperience / GalleryScene dispose renderer/controls/map 但 **从未 dispose `skyMesh` material & geometry**

- **严重度**:P0
- **类别**:资源泄漏 / R3F / Three.js
- **位置**:
  - `apps/web/src/components/gallery/GalleryExperience.tsx:275-276, 411-427`
  - `apps/web/src/components/gallery/GalleryScene.tsx:191-192, 295-303`
- **一句话描述**:`createSkyBackground()` 创建 `SphereGeometry(8000,32,32)` + `ShaderMaterial`(复杂 fragment shader,29-260 行),cleanup 时 `scene.remove + geometry.dispose + material.dispose` 全缺失 → WebGL shader programs + uniforms 累积
- **原始报告**:frontend-bug-audit #04
- **证据片段**(`GalleryExperience.tsx` cleanup):
  ```ts
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    mapGeo.dispose(); mapMat.dispose(); mapTex.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
    // ← MISSING: scene.remove(skyMesh); skyMesh.geometry.dispose(); skyMesh.material.dispose();
  };
  ```
- **CLAUDE.md 违规**:违反 R3F 资源清理约束(团队约定)
- **复现**:Chrome DevTools → Performance Monitor → `/` ↔ `/projects` 切换 10 次,GPU memory 持续上涨
- **建议修复**:
  ```ts
  scene.remove(skyMesh);
  skyMesh.geometry.dispose();
  (skyMesh.material as THREE.ShaderMaterial).dispose();
  ```

---

### [BUG-012] `TextureLoader.load()` 创建的纹理从未 dispose — GPU 纹理泄漏

- **严重度**:P0
- **类别**:资源泄漏 / R3F / Three.js
- **位置**:
  - `apps/web/src/components/gallery/GalleryExperience.tsx:88-115, 165-179`
  - `apps/web/src/components/gallery/GalleryScene.tsx:325-413`
  - `apps/web/src/components/gallery/GeoMediaLayer.tsx:60-77, 100, 153`
- **一句话描述**:`MeshStandardMaterial.dispose()` 不会 dispose `.map` 纹理;Loader 还把 texture 引用留在 cache;`backTex`(CanvasTexture,139-141)创建后未 dispose
- **原始报告**:frontend-bug-audit #05
- **证据片段**(`GalleryExperience.tsx` cleanup):
  ```ts
  obj.geometry?.dispose();
  if (obj.material instanceof THREE.Material) obj.material.dispose();   // ← texture NOT disposed
  ```
  (`GalleryScene.tsx` card rebuild):
  ```ts
  cardDataRef.current.forEach((data) => {
    data.imgMat.dispose();   // ← material disposed, but texture NOT
    data.backMat.dispose();
  });
  ```
- **复现**:同 BUG-011;30+ images + view-mode toggle 时 GPU 内存线性增长
- **建议修复**:
  ```ts
  if (imgMat.map) imgMat.map.dispose();
  if (backMat.map) backMat.map.dispose();
  imgMat.dispose();
  backMat.dispose();
  ```

---

### [BUG-013] 每个 `/admin/*` 路由独立挂 `AuthProvider` → N× `/api/admin/session` 调用 + state 碎片化

- **严重度**:P0
- **类别**:状态管理架构 / Auth Context 误用
- **位置**:`apps/web/src/app/router.tsx:48-117`
- **一句话描述**:router 把 `<AuthProvider><RequireAuth>...</RequireAuth></AuthProvider>` 包装复制到 5 个 admin 路由,每次导航卸载并重新挂载 `AuthProvider`,触发 `GET /api/admin/session` + React state 丢失
- **原始报告**:frontend-bug-audit #06
- **证据片段**(`router.tsx:48-117`):
  ```ts
  { path: '/admin',        element: <AuthProvider><RequireAuth>...<AdminDashboardPage />...</RequireAuth></AuthProvider> }
  { path: '/admin/projects',  element: <AuthProvider><RequireAuth>...<AdminProjectsPage />...</RequireAuth></AuthProvider> }
  { path: '/admin/locations', element: <AuthProvider><RequireAuth>...<AdminLocationsPage />...</RequireAuth></AuthProvider> }
  { path: '/admin/media',     element: <AuthProvider><RequireAuth>...<AdminMediaPage />...</RequireAuth></AuthProvider> }
  { path: '/admin/routes',    element: <AuthProvider><RequireAuth>...<AdminRoutesPage />...</RequireAuth></AuthProvider> }
  ```
- **复现**:登录后 Network tab,点击 `/admin/projects` ↔ `/admin/locations` → 每次导航触发 1+ `/api/admin/session` 请求;有 brief login flash
- **建议修复**:
  ```tsx
  const AdminShell = ({ children }) => <AuthProvider><RequireAuth>{children}</RequireAuth></AuthProvider>;
  { path: '/admin', element: <AdminShell><AdminDashboardPage /></AdminShell>, children: [
    { path: 'projects',  element: <AdminProjectsPage /> },
    { path: 'locations', element: <AdminLocationsPage /> },
    ...
  ]}
  ```
  或嵌套单一 layout route(public section 已用)

---

### [BUG-014] 路由页面含大量业务逻辑 — CLAUDE.md 核心约束严重违规

- **严重度**:P0
- **类别**:CLAUDE.md 约束违反 / 架构
- **位置**:
  - `apps/web/src/app/routes/gallery/GalleryHome.tsx`(367 行)
  - `apps/web/src/app/routes/public/map/MapPage.tsx`(159 行)
  - `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`(553 行)
  - `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`(291 行)
- **一句话描述**:CLAUDE.md 明确"不要把地图逻辑直接写进页面路由组件,路由页面只负责页面组合",但 GalleryHome 11 个 useState + night-mode setInterval + location-image preload effect + fetcher memo + 直接 composition MapBase3DView/MapProjectionOverlay/MediaClusterLayer
- **原始报告**:frontend-bug-audit #07
- **证据片段**(CLAUDE.md 引述):
  > 不要把地图逻辑直接写进页面路由组件,路由页面只负责页面组合
- **详细违反**:
  - `GalleryHome.tsx`:11 useState(viewMode, activeLocationId, selectedImage, showGalleryPanel, locationImages, loadingImages, bootstrappingGallery, showLoadingScreen, nightMode, searchQuery, showSearch, mapInstance),1 night-mode setInterval(line 43-50),1 location-image preload effect(line 78-115),1 fetcher memo(line 58-71),inline style blocks
  - `MapPage.tsx`:`useState<MaplibreMap | null>` for map instance,3 `useMemo` blocks deriving anchors/clusters
  - `AdminMediaPage.tsx`:22 useState + 6 async handlers + cascade dialog orchestration
- **影响**:未来合并工作被阻塞;同一业务逻辑无法在多页面复用;测试必须 mock 完整 route
- **建议修复**:extract `useGalleryHomeController()` hook 到 `features/gallery/`;split `MapGalleryView`/`CurvedGalleryView` components;admin form state 移入 `features/admin/forms/*` controllers

---

### [BUG-015] Caddyfile matcher 含 API 不响应的死路径 `/uploads/*` — 生产图片 404

- **严重度**:P0
- **类别**:部署配置 / 反代
- **位置**:`deploy/caddy/Caddyfile:4`
- **一句话描述**:Caddyfile `@api path /api/* /health /health/* /uploads/*` 把 `/uploads/*` 反代到 API,但 API 没有该路径(只有 `/api/public/uploads/:fileId` 和 admin `/api/uploads/*`);`try_files {path} /index.html` 兜底返回前端 `index.html`(HTML 而非图片)
- **原始报告**:docs-config-audit #01
- **证据片段**(`Caddyfile:4`):
  ```caddy
  @api path /api/* /health /health/* /uploads/*     ← /uploads/* 是死路径
  handle @api {
    reverse_proxy 127.0.0.1:{$TRACE_SCOPE_API_PORT}
  }
  ```
- **代码现状**:
  - 公开读取:`/api/public/uploads/:fileId`(`modules/public/routes.ts:31-45`)
  - 后台管理:`/api/uploads`、`/api/uploads/:id`(`modules/uploads/routes.ts`)
  - `apps/api/src/app/buildServer.test.ts:124` 自带断言 "does not serve uploaded storage files through the static /uploads path"
  - `README.md:230` 明确写"后端已关闭 /uploads/* 直接静态挂载"
  - `docs/agents/pitfalls.md:93` 也写"已关闭 /uploads/* 直接静态挂载"
- **实际后果**:生产环境所有 `/uploads/*` 形式的图片 URL 在反代后看不到真实图(拿到的是 index.html)
- **建议修复**:`@api path /api/* /api/public/uploads/* /health /health/*`,删 `/uploads/*`

---

### [BUG-016] 运维 SOP 引用已废弃路径 `/uploads/:fileId` — 恢复后校验找不到 URL

- **严重度**:P0
- **类别**:文档 / 部署 SOP
- **位置**:`docs/operations/backup-and-recovery.md:49-51`
- **一句话描述**:SOP 第 51 行写 "at least one uploaded image still resolves through `/uploads/:fileId`",但该路径已被 README / pitfalls / buildServer test 三处确认废弃,运维同学按 SOP 校验会得到 404
- **原始报告**:docs-config-audit #02
- **证据片段**(`backup-and-recovery.md:49-51`):
  ```
  - health checks return `ok`
  - admin login still works
  - at least one public project page opens
  - at least one uploaded image still resolves through `/uploads/:fileId`   ← 错
  ```
- **建议修复**:L51 改为 `at least one uploaded image still resolves through \`/api/public/uploads/:fileId\``

---

## P1 bug 详情(完整卡片,13 条)

### [BUG-017] `SESSION_SECRET` / `cookieSecure` 静默默认值 — 生产危险配置静默退化

- **严重度**:P1
- **类别**:安全 — 默认配置 / 启动期校验
- **位置**:`apps/api/src/app/config.ts:75-78`
- **一句话描述**:`requireEnv(env, 'SESSION_SECRET', 'dev-secret-change-in-production')` 与 `readBoolean(env.COOKIE_SECURE, false)` 均有静默默认值,生产忘配即上线 = 已知密钥 + cookie 通过明文 HTTP 传输
- **原始报告**:backend-bug-audit #03
- **证据片段**(`config.ts:73-80`):
  ```ts
  sessionSecret: requireEnv(env, 'SESSION_SECRET', 'dev-secret-change-in-production'),
  cookieSecure: readBoolean(env.COOKIE_SECURE, false),
  adminBootstrapUsername: optionalEnv(env, 'ADMIN_BOOTSTRAP_USERNAME', 'admin'),
  adminBootstrapPassword: optionalEnv(env, 'ADMIN_BOOTSTRAP_PASSWORD', 'admin123'),
  ```
- **复现**:`unset SESSION_SECRET; unset COOKIE_SECURE; cd apps/api && npm run dev` → 服务器照常启动,日志无警告;任何观察过开源代码的攻击者都已知密钥
- **建议修复**:
  ```ts
  function requireSecret(env: EnvSource, name: string, allowDev: boolean): string {
    const value = env[name];
    if (value) return value;
    if (allowDev && env.NODE_ENV !== 'production') {
      return 'dev-secret-change-in-production';
    }
    throw new Error(`Missing required env: ${name} (production requires explicit value)`);
  }
  ```
  cookieSecure 应在 `NODE_ENV=production` 且无 `COOKIE_SECURE=true` 时抛错
- **关联**:**与 BUG-003 (env 不加载) 联动放大风险** — 即使代码加严,env 未加载也会绕过

---

### [BUG-018] 登录时序泄露 username / isActive 状态 — 用户枚举

- **严重度**:P1
- **类别**:安全 — 时序攻击
- **位置**:`apps/api/src/modules/auth/service.ts:18`
- **一句话描述**:`if (!user || !user.isActive || !(await verifyPassword(...)))` 短路求值,用户不存在 / 禁用时直接返回,scrypt 不跑,响应时间差 ~80ms,批量扫描可区分
- **原始报告**:backend-bug-audit #05-A
- **证据片段**(`auth/service.ts:18`):
  ```ts
  if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
    throw Object.assign(new Error('Invalid username or password'), { code: 'INVALID_CREDENTIALS', statusCode: 401, details: null });
  }
  ```
- **复现**:`for i in 100; do time curl -X POST .../admin/login -d '{"username":"nonexistent","password":"x"}'; done` → ~5ms;`... "admin","WRONGGGG"` → ~80ms(scrypt work);差 ~16× 可稳定区分
- **建议修复**:即使 `user` 不存在,也跑一次 dummy scrypt 对预先计算的已知 salt 哈希,让失败路径耗时与成功路径一致

---

### [BUG-019] `project.status` 无索引 — 公开 API 全表扫描

- **严重度**:P1
- **类别**:数据库 / 性能
- **位置**:`apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql:19`(字段定义)、`apps/api/src/modules/public/repository.ts:19, 28, 35, 177`
- **一句话描述**:`project.status IN ('draft','published')` 公开 API 4 处查询,完全无索引覆盖;> 1000 行后每次公开 API 调用全表扫描
- **原始报告**:db-deploy-audit #6
- **复现**:
  ```bash
  mysql -h 127.0.0.1 -u root -p trace_scope -e "SHOW INDEX FROM project WHERE Column_name = 'status'"
  # 期望(有 bug):空结果集
  ```
- **建议修复 SQL**:
  ```sql
  ALTER TABLE project ADD INDEX idx_project_status_created_at (status, created_at);
  ```
  复合索引同时支撑 `WHERE status = ?` 和 `ORDER BY created_at DESC`

---

### [BUG-020] `admin_session.expires_at` 无索引 + 无过期清理 — 会话表无限增长

- **严重度**:P1
- **类别**:数据库 / 维护 / 性能
- **位置**:`apps/api/src/infrastructure/db/sql/001_initial_schema.sql:11-21`(表定义)、`apps/api/src/modules/auth/repository.ts`(无 DELETE 过期 session 方法)
- **一句话描述**:`admin_session.expires_at` 无索引;全代码库 grep `DELETE FROM admin_session WHERE expires_at` = **0 命中**;过期 session 永远留下
- **原始报告**:db-deploy-audit #7
- **复现**(长期运行):
  ```sql
  SELECT COUNT(*) AS total, SUM(expires_at < NOW()) AS expired FROM admin_session;
  -- 一个月后:total 数千,expired 占 90%+ — 全是垃圾
  ```
- **建议修复**:
  ```sql
  ALTER TABLE admin_session ADD INDEX idx_admin_session_expires_at (expires_at);
  ```
  ```ts
  // main.ts initDb 之后:
  await pool.execute('DELETE FROM admin_session WHERE expires_at < NOW()');
  ```

---

### [BUG-021] `UploadService.MAX_BYTES` 硬编码 10MB,忽略 `MAX_UPLOAD_BYTES` 环境变量

- **严重度**:P1
- **类别**:配置 — 硬编码
- **位置**:`apps/api/src/modules/uploads/service.ts:8`
- **一句话描述**:模块级 `const MAX_BYTES = 10 * 1024 * 1024`,不可配置;`config.ts` 已支持 `MAX_UPLOAD_BYTES`,运维设 50MB 想放开上传,完全没生效,超过 10MB 仍被 413
- **原始报告**:db-deploy-audit #8
- **证据片段**(`service.ts:8`):
  ```ts
  const MAX_BYTES = 10 * 1024 * 1024; // 10MB
  ```
- **复现**:`$env:MAX_UPLOAD_BYTES = '52428800'; npm run dev` → 上传 20MB 仍 413
- **建议修复**:
  ```ts
  export class UploadService {
    private readonly maxBytes: number;
    constructor(
      private readonly repository: UploadRepository,
      private readonly storage: LocalFileStorage,
      maxBytes = 10 * 1024 * 1024,
    ) {
      this.maxBytes = maxBytes;
    }
    // 替换 MAX_BYTES 为 this.maxBytes
  }
  ```
  `buildServer.ts` 注入 `config.maxUploadBytes`

---

### [BUG-022] `getReadableFile` 公开文件访问产生 4 次顺序 DB 查询(N+1)

- **严重度**:P1
- **类别**:性能 — N+1
- **位置**:`apps/api/src/modules/public/service.ts:430-450` + `repository.ts:257-287`
- **一句话描述**:`isFileReachableFromPublishedContent` 顺序查 3 表 + `findUploadFileById` 1 表 = 4 round trip 每次公开文件访问
- **原始报告**:db-deploy-audit #9
- **证据片段**(`service.ts:34-45`):
  ```ts
  async isFileReachableFromPublishedContent(fileId: string): Promise<boolean> {
    const projectCover = await this.repository.findPublishedProjectCover(fileId);  // 查询 1
    if (projectCover) return true;
    const mediaSetCover = await this.repository.findPublishedMediaSetCover(fileId);  // 查询 2
    if (mediaSetCover) return true;
    const mediaImage = await this.repository.findPublishedMediaImage(fileId);  // 查询 3
    return false;
  }
  ```
- **建议修复**(合并为 1 个 SQL):
  ```sql
  SELECT
    (SELECT id FROM project WHERE cover_upload_file_id = ? AND status = 'published' LIMIT 1) AS project_ref,
    (SELECT ms.id FROM media_set ms JOIN project p ON ms.project_id = p.id WHERE ms.cover_upload_file_id = ? AND p.status = 'published' LIMIT 1) AS mediaset_ref,
    (SELECT mi.id FROM media_image mi JOIN media_set ms ON mi.media_set_id = ms.id JOIN project p ON ms.project_id = p.id WHERE mi.upload_file_id = ? AND p.status = 'published' LIMIT 1) AS image_ref;
  ```
  任一非空即可,减少 3 次 round trip

---

### [BUG-023] `usePublicMediaSet` 不重置 `data` / `error` when `mediaSetId` changes — stale state

- **严重度**:P1
- **类别**:状态管理 / Stale closure
- **位置**:`apps/web/src/features/media/api/usePublicMediaSet.ts:32-58`(同模式 `usePublicProjectDetail.ts:36-62`)
- **一句话描述**:hook 在 effect 起始清 `loading` + `error`,但 **从未清 `data`**;跨 mediaSetId 切换时旧数据闪现
- **原始报告**:frontend-bug-audit #08
- **证据片段**:
  ```ts
  const [data, setData] = useState<PublicMediaSet | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // ...
  fetcher(`/public/media-sets/${mediaSetId}`)
    .then((result) => { if (!cancelled) { setData(result); setLoading(false); } })
    .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))); setLoading(false); } });
  // ← 从不 setData(null)
  ```
- **复现**:导航 `/spin/valid-id-1` → `/spin/non-existent-id-2`,旧数据闪现
- **建议修复**:`setData(null)` 加在 effect 起始,before fetch

---

### [BUG-024] `MapBase3DView` 在异步 `loadTiandituRasterStyle` race 中泄漏 `mapInstance`

- **严重度**:P1
- **类别**:资源泄漏 / MapLibre dispose / async race
- **位置**:`apps/web/src/components/map/MapBase3DView.tsx:23-98`
- **一句话描述**:`mapInstance` 在 `maplibre.Map` 构造**之后**赋值;若用户在 await 窗口卸载(disposed 已 true),cleanup 时 `mapInstance === null`,构造中的 map 漏掉
- **原始报告**:frontend-bug-audit #09
- **证据片段**:
  ```ts
  async function bootstrap() {
    // ... await loadTiandituRasterStyle ...
    if (disposed || !containerRef.current) return;
    const map = new maplibre.Map({...});
    // ...
    mapInstance = map;   // ← only set after maplibre.Map constructed
  }
  ```
- **CLAUDE.md 违规**:违反 map dispose 约束
- **复现**:DevTools throttle "Slow 3G" → 点 `/map` 立即离开 → canvas / WebGL context 累积
- **建议修复**:
  ```ts
  mapInstance = map;          // 先赋值
  if (disposed) { map.remove(); return; }   // 后判 disposed
  ```

---

### [BUG-025] `SpinViewer` / `GalleryViewer` `useState(0)` + `useState(orderedImages[0]?.id)` 锁定初始 state

- **严重度**:P1
- **类别**:Stale closure / 状态管理
- **位置**:
  - `apps/web/src/components/media/SpinViewer.tsx:6` — `const [frameIndex, setFrameIndex] = useState(0);`
  - `apps/web/src/components/media/GalleryViewer.tsx:6` — `const [activeId, setActiveId] = useState(orderedImages[0]?.id ?? '');`
- **一句话描述**:跨 media set 切换时,React 复用组件实例(key 不含 mediaSet.id),`useState(0)` 保留旧 `frameIndex`,counter 越界(例如 set A 5 / set B 3 → "06 / 03" 闪烁)
- **原始报告**:frontend-bug-audit #10
- **复现**:打开 `/spin/set-A-with-12-frames` → next 5 次 → `/spin/set-B-with-3-frames` → 旧 frameIndex 5 越界
- **建议修复**(任一):
  - 父 route 加 `key={mediaSet.id}` 强制重挂
  - viewer 内部 `useEffect(() => { setFrameIndex(0); }, [orderedImages])`

---

### [BUG-026] `.env.example` 注释要求"用 STORAGE_DIR"但只配 `UPLOAD_ROOT` — 自相矛盾

- **严重度**:P1
- **类别**:文档 / 配置自相矛盾
- **位置**:`apps/api/.env.example:7-11`
- **一句话描述**:注释说"new setups should configure STORAGE_DIR instead",但实际只配 `UPLOAD_ROOT=./data/uploads`;新用户复制后得到 legacy 路径,行为与 prod (`STORAGE_DIR=D:/trace-scope-platform/data/uploads`) 不一致
- **原始报告**:docs-config-audit #03
- **证据片段**:
  ```
  UPLOAD_ROOT=./data/uploads
  # STORAGE_DIR is the canonical upload storage directory used by the API,
  # backup scripts, and deployment docs. UPLOAD_ROOT is a legacy alias kept
  # for backward compatibility with older deployments; new setups should
  # configure STORAGE_DIR instead.
  ```
- **代码现状**:`config.ts:69` 优先级 `env.STORAGE_DIR ?? env.UPLOAD_ROOT ?? './storage'` — 用户配置 UPLOAD_ROOT,实际生效 UPLOAD_ROOT;但 dev 没 STORAGE_DIR 行 → 用户意图与配置脱节
- **建议修复**:第 7 行后插入 `STORAGE_DIR=./data/storage`,与 prod 对齐

---

### [BUG-027] `.env.example` 漏掉 `MAX_UPLOAD_BYTES` 和 `HOST`

- **严重度**:P1
- **类别**:文档 / 配置缺失
- **位置**:`apps/api/.env.example` + `apps/api/.env.production.example`
- **一句话描述**:`config.ts:63-65` 实际读 `HOST`(默认 `0.0.0.0`)和 `MAX_UPLOAD_BYTES`(默认 10MB),两个 example 文件都没列出;用户无法通过复制 example 调整关键变量
- **原始报告**:docs-config-audit #04
- **代码现状**:
  ```ts
  host: optionalEnv(env, 'HOST', '0.0.0.0'),
  maxUploadBytes: Number(env.MAX_UPLOAD_BYTES ?? '10485760'),
  ```
- **建议修复**:两个 example 文件 `BODY_LIMIT_BYTES` 行附近补:
  ```
  HOST=0.0.0.0
  MAX_UPLOAD_BYTES=10485760
  ```

---

### [BUG-028] `.env.example` 多个值与 `config.ts` 默认值不一致

- **严重度**:P1
- **类别**:文档 / 配置占位值不一致
- **位置**:`apps/api/.env.example` vs `apps/api/src/app/config.ts`
- **一句话描述**:多个 env 字段的 example 占位值与 config.ts fallback 不一致;用户复制 example 后"以为配了 X",实际生效 Y
- **原始报告**:docs-config-audit #05
- **差异对照表**:

  | 变量 | `.env.example` 默认 | `config.ts` 默认 | 结果 |
  |------|---------------------|------------------|------|
  | `MYSQL_USER` | `trace_scope` | `root`(`config.ts:72`) | 用户配 `trace_scope`,config fallback `root` |
  | `MYSQL_PASSWORD` | `replace-me` | `''`(`config.ts:73`) | 占位文本无意义 |
  | `MYSQL_DATABASE` | `trace_scope` | `trace-scope-platform`(`config.ts:74`) | dev 默认库名跟 prod 的 `trace_scope_platform` 不一致 |
  | `TRUST_PROXY` | `false` | `true`(`config.ts:80`) | 反向代理后端一般 `true`,本地 dev 一般 `false`,现状反过来了 |
  | `SESSION_SECRET` | `replace-me`(占位) | `'dev-secret-change-in-production'`(`config.ts:75`) | 双 fallback 语义混乱 |
  | `ADMIN_BOOTSTRAP_PASSWORD` | `change-me-now` | `'admin123'`(`config.ts:78`) | dev 默认密码与 prod example 不一致 |

- **建议修复**:把 `.env.example` 改写为单一清单,每个变量一行 = 当前生效值,并显式标注 `# production-only` / `# dev-only`

---

### [BUG-029] `CLAUDE.md` 架构树漏 `media-images` 模块 + components/features 列举不全

- **严重度**:P1
- **类别**:文档 / 架构过时
- **位置**:`CLAUDE.md:48-64`
- **一句话描述**:CLAUDE.md 列了 8 个后端模块(实际 9,漏 `media-images`),components 列 3(实际 7),features 列 4(实际 8);新接手 agent 按文档找目录找不到
- **原始报告**:docs-config-audit #06
- **代码现状**:
  - 后端模块:`auth`、`locations`、`media-images`、`media-sets`、`projects`、`public`、`routes`、`system`、`uploads`(9 个)
  - 前端 components:`admin`、`common`、`gallery`、`map`、`media`、`project`、`site`(7 个)
  - 前端 features:`admin`、`auth`、`gallery`、`locations`、`map`、`media`、`projects`、`routes`(8 个)
- **建议修复**:后端模块补 `media-images`;components 列全 7 个;features 列全 8 个;或加 "实际目录结构以 `ls` 为准" 注脚

---

## P2 bug 列表(简表,13 条)

| ID | 位置 | 标题 | 类别 | 原始报告 |
|----|------|------|------|----------|
| BUG-030 | `apps/api/src/modules/auth/routes.ts:25-46` | `loginAttemptsByIp` 内存 Map 清理逻辑有缺陷 — 低流量缓慢泄漏 + 多实例限速失效 | 资源泄漏 / 分布式 | backend-bug-audit #06 |
| BUG-031 | `apps/api/src/modules/{projects,media-sets,locations,media-images}/service.ts:130/105/92/100` | 删除主实体后 `upload_file` 变孤儿(磁盘文件无人删,DB 行残留) | 级联策略 | backend-bug-audit #10 |
| BUG-032 | `deploy/caddy/Caddyfile:13-17` | Caddyfile 缺 HSTS / CSP / Permissions-Policy / `-Server` 安全响应头 | 部署配置 | db-deploy-audit #11 |
| BUG-033 | `scripts/ops/build-release.ps1:10-19` | `build-release.ps1` 缺 try/finally,`npm build` 抛错 working directory 卡死 | 部署运维 / 脚本 | db-deploy-audit #12 |
| BUG-034 | `scripts/ops/restore-uploads.ps1:14-25` | restore-uploads 不验证 zip 内容路径 — zip slip 风险 | 部署运维 / 安全 | db-deploy-audit #13 |
| BUG-035 | `apps/api/src/app/config.ts:81-84` | config.ts 无 schema 校验,LOG_LEVEL / corsOrigins / rateLimitMax 无白名单,设错 env → undefined behavior | 配置校验 | db-deploy-audit #14 |
| BUG-036 | `apps/api/src/infrastructure/db/migrate.ts:14-27` | migrate.ts 不记录已应用的迁移,任何新 ALTER 都会重复执行 | 部署一致性 | db-deploy-audit #15 |
| BUG-037 | `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx:189-193` | `confirmImageDelete` `imageDeleteTarget!.id` 非空断言脆弱 — state 已清空仍访问 | 状态管理 / 非空断言 | frontend-bug-audit #11 |
| BUG-038 | `apps/web/src/{app/routes/public/home/HomePage,components/gallery/{GalleryScene,GalleryMapBase},features/gallery/useCurvedMapProjection,services/storage/{adminEditorDrafts,adminValidation}}.*` | 6 个文件生产代码未引用,仅测试断言不存在 — 5 组件 × 100s LOC 膨胀 bundle | 死代码 | frontend-bug-audit #12 |
| BUG-039 | `README.md:187` + `apps/web/vite.config.ts:26-44` | README 称 build "干净,无 chunk size warning",实际有 circular chunk warning | 文档 / 构建状态 | docs-config-audit #07 |
| BUG-040 | `docs/2026-05-26-current-feature-introduction-report.md:798-807` | Feature report 测试数字停留在 Sprint 1 (13/72 + 37/140),实测 13/89 + 34/145 | 文档 / 数据过时 | docs-config-audit #08 |
| BUG-041 | `docs/operations/single-node-deployment.md:8-16` | 运维部署文档硬编码 `D:\VS vibe coding files\...`,跨机器部署失败 | 文档 / 路径硬编码 | docs-config-audit #09 |
| BUG-042 | `apps/web/playwright.config.ts:97-102` + `CLAUDE.md/AGENTS.md` | Chromium hard-pin 跨机器风险未显眼提示,仅 `pitfalls.md:75-80` 提及 | 文档 / 配置缺失 | docs-config-audit #10 |

---

## P3 bug 列表(简表,10 条)

| ID | 位置 | 标题 | 类别 | 原始报告 |
|----|------|------|------|----------|
| BUG-043 | `apps/api/src/modules/auth/repository.ts:45-46` | `last_seen_at` 字段从未被更新 — DB 写字段无作用 | 代码异味 | backend-bug-audit #07 |
| BUG-044 | `apps/api/src/modules/auth/requireAdminSession.ts:28-31` | `createRequireAdminSession` 失败路径无 `return reply`,隐式依赖 Fastify 行为 | 代码风格 | backend-bug-audit #08 |
| BUG-045 | `apps/api/src/modules/projects/service.ts:70-80` | slug 唯一性 TOCTOU 竞态,并发 POST /api/projects 可能都报 500 | 并发 / 错误恢复 | backend-bug-audit #09 |
| BUG-046 | `apps/api/src/modules/media-sets/service.ts:81-91` | 空字符串 `locationId` 走不到显式校验,落到 FK 500 | 字段校验 | backend-bug-audit #11 |
| BUG-047 | `apps/api/src/modules/locations/service.ts:71-76` | `Number(existing.latitude)` NaN 时绕过 `-90/90` 校验 | 边界条件 | backend-bug-audit #12 |
| BUG-048 | `apps/api/src/infrastructure/storage/localFileStorage.ts:73-84` | `getFile` mimeType 从扩展名推断,不验证文件实际内容 — `evil.exe` 改名 `evil.jpg` 绕过 mime 校验 | 上传安全 | backend-bug-audit #13 |
| BUG-049 | `apps/api/src/infrastructure/db/seed-e2e.ts:31-68` | 模板字符串拼接 `DELETE FROM ${table}`,当前用 `const` 字面量无注入风险但脆弱 | SQL 拼接 | backend-bug-audit #14 |
| BUG-050 | `CLAUDE.md:92` | CLAUDE.md 把 ops 脚本聚合名(`backup, restore, health check, build-release`),与实际 6 个脚本名不符 | 文档描述 | docs-config-audit #11 |
| BUG-051 | `CLAUDE.md:15-43` | CLAUDE.md 用 bash `cd ... &&`,Windows PowerShell 5.1 不直接兼容 | 文档 / 跨平台 | docs-config-audit #12 |
| BUG-052 | `CLAUDE.md:92 vs L240` | CLAUDE.md 内 scripts 描述用语不一致 — 聚合名 vs 细名 | 文档 / 内部不一致 | docs-config-audit #13 |

---

## 跨 track 共性问题

### 1. 异步错误捕获不严(9 个 bug 涉及,跨 backend + frontend)

- **前端**:`GalleryHome.tsx:87-110`、`AdminDashboardPage.tsx:9-17`、`AdminMediaPage.tsx:66-82` 三处 `Promise.all` 无 `.catch()`;`usePublicMediaSet.ts:32-58` 跨 id 切换不重置 data;`MapBase3DView.tsx:23-98` async race dispose 漏
- **后端**:`media-images/repository.ts:108` SELECT 回查用未初始化 id;`uploads/service.ts:82-88` 先删盘后删 DB;`auth/service.ts:18` 短路求值时序泄露
- **数据库层**:schema 分叉导致同一查询在不同启动路径走不同 schema
- **根因**:团队没统一"每个 async boundary 必须有 error sink"的约定;前端 ESLint 缺 `no-floating-promises`;后端 type system 缺 `Result<T,E>` 模式
- **建议**:
  1. ESLint 加 `@typescript-eslint/no-floating-promises` (error level)
  2. backend 显式 `AppError` + 全 catch wrapper
  3. PR review checklist 加 "every await has catch or check"

### 2. R3F / Three.js / MapLibre 资源清理缺失(4 个 frontend bug,2 P0 + 1 P1)

- `GalleryExperience.tsx:275-276` + `GalleryScene.tsx:191-192` — skyMesh material/geometry 未 dispose
- `GalleryExperience.tsx:88-115` + `GalleryScene.tsx:325-413` + `GeoMediaLayer.tsx:60-77` — TextureLoader texture 未 dispose
- `MapBase3DView.tsx:23-98` — async race 时 mapInstance 漏 dispose
- `GalleryExperience.tsx:248-254` — lights 不需要 dispose 但 `scene.children` 累积(同源)
- **根因**:团队不熟悉 R3F/Three.js dispose 协议;code review checklist 无 dispose 项
- **建议**:
  1. 写 `useR3FDispose()` 工具 hook 封装 `geometry.dispose / material.dispose / texture.dispose`
  2. PR review 必须 verify `useEffect cleanup` 包含所有可 dispose 资源
  3. e2e 加 "navigate away 100 times → GPU memory stable" 守门测试

### 3. 部署链路脆弱,文档与代码不同步(8 个 bug 涉及 db-deploy + docs-config)

- Caddyfile `/uploads/*` 与 README / pitfalls 矛盾 (BUG-015)
- `backup-and-recovery.md` 引用已废弃 `/uploads/:fileId` (BUG-016)
- `backup-uploads.ps1` 语法错误脚本根本不能跑 (BUG-005)
- `backup-mysql.ps1` 写出 UTF-8 BOM 还原必失败 (BUG-006)
- `.env.example` STORAGE_DIR / UPLOAD_ROOT 自相矛盾 (BUG-026)
- `.env.example` 漏 MAX_UPLOAD_BYTES / HOST (BUG-027)
- `.env.example` 占位值与 config.ts fallback 不一致 (BUG-028)
- `CLAUDE.md` 架构树漏 media-images 模块 + 22 个目录 (BUG-029)
- **根因**:部署代码 (PowerShell/Caddyfile) 缺乏 CI 验证(PowerShell 脚本未跑 PSScriptAnalyzer,Caddyfile 未跑 `caddy validate`);文档未与代码同步
- **建议**:
  1. CI 加 PSScriptAnalyzer 对 `scripts/ops/*.ps1` lint(到 `error` level)
  2. CI 加 `caddy validate --config deploy/caddy/Caddyfile`
  3. 加 docs-vs-code consistency check(脚本扫 README 引用的路径 / .env.example 字段对齐 config.ts 实际读取的字段)
  4. 文档变更必须在同 PR 内更新关联代码,反之亦然

### 4. 数据库 schema 多源,迁移无版本追踪(5 个 bug 涉及 backend + db-deploy)

- `db.ts:31-39` 走 `migrations.ts` 硬编码字符串 vs `migrate.ts` 走 `.sql` 文件 (BUG-004)
- `migrate.ts:14-27` 无 `schema_migrations` 表,任何新 ALTER 重复执行 (BUG-036)
- `project.status` 缺索引 (BUG-019)
- `admin_session.expires_at` 缺索引 + 无清理 (BUG-020)
- `getReadableFile` 4 次顺序查询 (BUG-022)
- **根因**:单一 source of truth 缺失;migration 机制无版本化
- **建议**:
  1. 删 `migrations.ts`,只保留 `.sql` 文件作为 source of truth
  2. 加 `schema_migrations(filename VARCHAR(255) PRIMARY KEY, applied_at DATETIME)` 表
  3. PR 模板要求"新增 .sql 必须配套 patch 测试"

### 5. CLAUDE.md / 文档落后于代码(7 个 docs-config bug + 1 个 frontend)

- BUG-014:CLAUDE.md 约束被严重违反
- BUG-029 / BUG-039 / BUG-040 / BUG-041 / BUG-042 / BUG-050 / BUG-051 / BUG-052:docs 整体落后
- **根因**:文档未跟随代码同步更新;CLAUDE.md 没有"文档必须随 PR 更新"的硬约束
- **建议**:
  1. 加 `docs/audit/` 目录 + 每次大型重构前跑"docs vs code 一致性"扫描
  2. PR template 加 "docs 同步" checklist
  3. CI 加 docs cross-link check(`grep` 所有 `.md` 引用的 `file:line` 是否存在)

---

## 后续修复优先级建议

按严重度 + 修复成本排序(每级内按修复成本从小到大):

### P0 — 必修,生产已坏或安全洞(16 条)

**第一梯队:成本 < 30 分钟,部署/运维脚本类(必修立即修)**
1. **BUG-005** `backup-uploads.ps1` 语法错误 — 1 个字符 `)`,无测试阻塞
2. **BUG-006** `backup-mysql.ps1` UTF-8 BOM — 改用 `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)`
3. **BUG-015** Caddyfile `/uploads/*` 死路径 — 改 matcher 一行
4. **BUG-016** `backup-and-recovery.md` L51 — 改 `/api/public/uploads/:fileId` 一行

**第二梯队:成本 30 分钟 - 2 小时,代码逻辑修复**
5. **BUG-001** `media-images/repository.ts:108` SELECT 回查用生成的 `id` — 5 行
6. **BUG-007** `deleteUpload` 顺序错误 — 加引用检查 + 调换顺序
7. **BUG-009** `AdminDashboardPage.tsx:9-17` 加 `.catch` — 1 行
8. **BUG-010** `AdminMediaPage.tsx:66-82` 加 try/catch — 5 行
9. **BUG-008** `GalleryHome.tsx:87-110` 加 `.catch` — 1 行
10. **BUG-003** `main.ts` env 加载 — 10 行

**第三梯队:成本 2-8 小时,架构/集成修复**
11. **BUG-013** `router.tsx` AuthProvider 单一包装 — 30 行 refactor
12. **BUG-011** `skyMesh` dispose — 3 行 × 2 个文件
13. **BUG-012** `TextureLoader texture` dispose — 5 行 × 3 个文件
14. **BUG-002** `localFileStorage` 路径 containment — 5 行
15. **BUG-004** 删 `migrations.ts` + 统一走 `.sql` — 多文件,需要 ALTER 修复已部署的实例

**第四梯队:成本 8+ 小时,大型重构**
16. **BUG-014** GalleryHome/MapPage/AdminMediaPage 抽 hook — 多文件,影响大

### P1 — 应修,高风险/性能/UX(13 条)

按修复成本从小到大:

1. **BUG-027** `.env.example` 加 MAX_UPLOAD_BYTES / HOST — 4 行
2. **BUG-029** `CLAUDE.md` 架构树列全 — 编辑 16 行
3. **BUG-026** `.env.example` 补 `STORAGE_DIR` — 1 行
4. **BUG-028** `.env.example` 各占位值对齐 config.ts — 多行
5. **BUG-021** `UploadService.MAX_BYTES` 改 instance field — 10 行
6. **BUG-019** `project.status` 加索引 — 1 条 SQL
7. **BUG-020** `admin_session.expires_at` 加索引 + 启动期清理 — 1 SQL + 3 行
8. **BUG-018** `auth/service.ts:18` 加 dummy scrypt — 10 行
9. **BUG-023** `usePublicMediaSet` 加 `setData(null)` — 1 行 × 2 文件
10. **BUG-025** `SpinViewer`/`GalleryViewer` 加 `useEffect` reset — 6 行 × 2 文件
11. **BUG-017** `config.ts` SESSION_SECRET 启动期校验 — 15 行
12. **BUG-024** `MapBase3DView` mapInstance 提前赋值 — 5 行
13. **BUG-022** `getReadableFile` 合并为单 SQL — 20 行

### P2 — 建议修,边界/死代码/部署健壮性(13 条)

按修复成本从小到大:

1. **BUG-049** `seed-e2e.ts` SQL 模板改显式 — 20 行
2. **BUG-046** `media-sets/service.ts` 空字符串校验 — 5 行
3. **BUG-047** `locations/service.ts` NaN 守卫 — 3 行
4. **BUG-048** `localFileStorage.getFile` magic byte 嗅探 — 10 行
5. **BUG-044** `requireAdminSession.ts` 显式 `return reply` — 1 行
6. **BUG-043** `last_seen_at` 要么删要么 UPDATE — 5 行
7. **BUG-045** `projects/service.ts` slug TOCTOU — 改用 INSERT ON DUPLICATE KEY UPDATE — 10 行
8. **BUG-030** `loginAttemptsByIp` cleanup — 10 行
9. **BUG-037** `AdminMediaPage.tsx:189-193` 捕获 id 到 local var — 3 行
10. **BUG-031** `deleteUpload` cascade cleanup — 多文件,需要 schema 调整
11. **BUG-033** `build-release.ps1` try/finally — 10 行
12. **BUG-034** `restore-uploads.ps1` zip 验证 — 15 行
13. **BUG-036** `migrate.ts` 加 `schema_migrations` 表 — 25 行
14. **BUG-032** Caddyfile 加 HSTS/CSP/Permissions-Policy — 5 行
15. **BUG-035** `config.ts` schema 校验 — 30 行
16. **BUG-038** 删 6 个 dead-code 文件 — 删文件
17. **BUG-039/040/041/042** docs 同步 — 编辑

### P3 — 低优,代码异味/风格(10 条)

多数为 PR 顺手清理;不阻塞任何功能。

---

## 修复状态追踪(2026-07-07)

| Round | 范围 | Bug IDs | Commit | 状态 |
|-------|------|---------|--------|------|
| **R1**(tier-1 ops) | 部署运维/脚本/反代/SOP | BUG-005 / 006 / 015 / 016 | `a143acde` | ✅ 已修复 |
| **R2**(tier-2 logic) | 代码逻辑/错误处理 | BUG-001 / 003 / 007 / 008 / 009 / 010 | `6cb65883` | ✅ 已修复 |
| **R3a**(tier-3 latent) | 安全:storage 路径遍历 | BUG-002 | `8efffd4c` | ✅ 已修复 |
| **R3b**(tier-3 R3F dispose) | R3F 资源泄漏:skyMesh + texture | BUG-011 / 012 | `b77ea4a3` | ✅ 已修复 |
| R3c | AuthProvider 单点重构 | BUG-013 | — | ⏳ 待开 |
| R4(tier-3 latent 续) | 抽 hook / SQL 分叉 / 会话过期 / RPS 暴力 | BUG-014 / 004 / 020 / 029 / 030 | — | ⏳ 待开 |

### R1(commit `a143acde`)— tier-1 ops 已修

| Bug | 修复位置 | 修复要点 |
|-----|---------|---------|
| BUG-005 | `scripts/ops/backup-uploads.ps1:4-5` | `Resolve-Path` 后加 `)`,PowerShell parser AST clean |
| BUG-006 | `scripts/ops/backup-mysql.ps1:24` | 改用 `[System.IO.File]::WriteAllText` + `UTF8Encoding($false)` 去掉 BOM |
| BUG-015 | `deploy/caddy/Caddyfile:4` | matcher 删 `/uploads/*`,加 `/api/public/uploads/*` |
| BUG-016 | `docs/operations/backup-and-recovery.md:51` | URL 改 `/api/public/uploads/:fileId` |

### R2(commit `6cb65883`)— tier-2 logic 已修

| Bug | 修复位置 | 修复要点 |
|-----|---------|---------|
| BUG-001 | `apps/api/src/modules/media-images/repository.ts:55+` | `upsertMediaImage` INSERT 路径 SELECT 回查复用刚生成的 `id`,UPDATE 路径独立 SELECT `input.id` |
| BUG-003 | `apps/api/src/main.ts:1` | 改用 `dotenv.config({ path })` + `DOTENV_CONFIG_PATH` 支持,绝对/相对路径兼容 |
| BUG-007 | `apps/api/src/modules/uploads/{repository,service}.ts` | repository 加 `countReferences` (3 张 FK 表 COUNT),service.deleteUpload 改为 **查引用 → 删 DB → 删盘**,引用 > 0 抛 409 AppError |
| BUG-008 | `apps/web/src/app/routes/gallery/GalleryHome.tsx:87+` | `Promise.all` gallery preload 链加 `.catch`(console.error),不再浮 unhandled rejection |
| BUG-009 | `apps/web/src/app/routes/admin/dashboard/AdminDashboardPage.tsx` | `Promise.all` stats 加 `.catch` toast.error;页面拆 `Inner` + default `ToastProvider` 包,与其他 admin 页面统一 |
| BUG-010 | `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx:67+` | `loadData` try/catch + `toast.error`;`toastRef` 模式避开 `[toast]` deps 触发 `useEffect` 重跑 setLoading 死循环 |

### R3a(commit `8efffd4c`)— tier-3 latent BUG-002 已修

| Bug | 修复位置 | 修复要点 |
|-----|---------|---------|
| BUG-002 | `apps/api/src/infrastructure/storage/localFileStorage.ts:36-54,89-115,117-131` | `getFile`/`deleteFile` 改走 `resolveSafePath(rootDir, storageKey)` 替换裸 `join(rootDir, storageKey)`。**双层防御**:①白名单正则 `^original/\d{4}/\d{2}/\d{2}/[0-9a-f]{2}/[0-9a-f]{2}/[0-9a-f]{32}(?:\.[a-zA-Z0-9]+)?$` 严格匹配 `saveBuffer` 生成的格式;② `resolve` + `startsWith(rootDir+sep)` containment 兜底,防 `saveBuffer` 未来改格式后白名单漏过。返回 null/false(不抛错)— 上游 `getReadableFile` 已 try/catch,统一 fail 模式 |

### R3b(commit `b77ea4a3`)— tier-3 R3F dispose 已修

| Bug | 修复位置 | 修复要点 |
|-----|---------|---------|
| BUG-011 | `apps/web/src/lib/utils/threeDispose.ts`(新增)+ `GalleryExperience.tsx:442` + `GalleryScene.tsx:311` | 新增 `disposeSkyDome(mesh, scene)` helper(remove from scene + dispose geometry + dispose ShaderMaterial);两个组件的 `useEffect` cleanup 都调用它,`SphereGeometry(8000, 32, 32)` + 230 行 fragment shader 的 ShaderMaterial 终于随组件卸载释放,WebGL shader program 不再累积 |
| BUG-012 | `apps/web/src/lib/utils/threeDispose.ts`(新增 `disposeMaterialDeep`)+ 3 个组件的 cleanup | `Material.dispose()` 不释放 `.map`/`.normalMap`/`.emissiveMap` 等 texture 槽位;helper 遍历 material 自身 keys + duck-type `isTexture` 检测递归释放。GalleryExperience 的 `buildCards` cleanup 加 `texturesToDispose` 列表跟踪 loader.load 返回的 initial instance(即使 onLoad 后被 replaced 也要释放);GalleryScene 的 cardDataRef 两处 cleanup 改用 helper;GeoMediaLayer 同。**GalleryExperience 加 `disposed` flag guard** 防止异步 onLoad 在 cleanup 后把已 dispose 的 texture 挂回 material.map(WebGL error) |
| `disposeMesh` 设计权衡 | 同上 | 用 `typeof dispose === 'function'` 替代 `instanceof BufferGeometry`,兼容 `vi.mock('three')` 的 component 测试(mock 模块不导出 BufferGeometry,instanceof 会 fail) |

### 验证基线(R1 + R2 完成后)

| 项 | 状态 |
|----|------|
| `apps/api` Vitest | ✅ 13 file / **103 passed** |
| `apps/web` Vitest | ✅ 35 file / **157 passed**(R3b +12:`threeDispose.test.ts` 12 个 case) |
| `apps/api` `tsc -p tsconfig.json` | ✅ clean |
| `apps/web` `vite build` | ✅ clean (1 known circular chunk warning,与本 round 无关) |
| 新增测试文件 | R3b:1 个 (`apps/web/src/lib/utils/threeDispose.test.ts`) — 测核心 dispose helper,非冗余 |
| 冗余测试清理 | 0 需清 |

### 已知遗留观察(非 bug,但记下供后续 round 参考)

- `useToast()` 每次 render 返回新对象 → `useCallback([toast])` 让 `loadData` 引用每次 render 变。R2 中 `AdminMediaPage` 触发 setLoading 死循环(用 `waitFor` 严格 timeout 被逮),`AdminProjectsPage` / `AdminLocationsPage` / `AdminRoutesPage` / `AdminDashboardPage` 用同样模式但**未实测 fail**。**未在 R3 扩展防御性重构**(等最小复现验证 root cause 再批量改),后续若出现类似症状按 toastRef pattern 修。

### R3b 顺手发现(不在 BUG-011/012 范围,留待后续 round)

1. **`GeoMediaLayer` fallback effect 无 cleanup**:`apps/web/src/components/gallery/GeoMediaLayer.tsx:140-193` 的 fallback `useEffect` 没有 return cleanup,fallback 变化时旧 cards 累积不删;同时 `anchored` rebuild cleanup(line 72-77)清的是**整个 cardsRef**(包括 fallback cards),导致 fallback cards 在 anchored 变化时被误删。这是个**结构性 bug**(fallback 累积 + anchored 误删 fallback),比 BUG-012 描述的 leak 更严重 — 用户会看到 cards 消失/重复。R3b 严格保持"最小修改"未触及,建议独立 round 修。
2. **`GeoMediaLayer` shared `darkMaterial` useMemo 永不 dispose**:`apps/web/src/components/gallery/GeoMediaLayer.tsx:45-53` 的 darkMaterial 是 `useMemo([])` 共享,组件 unmount 时 React 销毁引用但 Three.js material 不自动 dispose → shader program 泄漏。R3b 范围内只修 texture,不动这个;unmount cleanup 时建议加 `darkMaterial.dispose()`。
3. **`GalleryExperience` `mapTex` CanvasTexture + `mapMat` MeshStandardMaterial 重复 dispose**:`apps/web/src/components/gallery/GalleryExperience.tsx:280,418` 现有 cleanup 顺序 `mapMat.dispose(); mapTex.dispose()` 是 OK 的(都是独立 dispose,顺序无关),仅记一下供未来重构参考。

---

## 附录:受影响文件清单(去重后)

| 文件 | Bug ID |
|------|--------|
| `apps/api/src/main.ts` | BUG-003 |
| `apps/api/src/app/config.ts` | BUG-017, BUG-035 |
| `apps/api/src/infrastructure/db/db.ts` | BUG-004 |
| `apps/api/src/infrastructure/db/migrate.ts` | BUG-036 |
| `apps/api/src/infrastructure/db/sql/migrations.ts` | BUG-004 |
| `apps/api/src/infrastructure/db/sql/001_initial_schema.sql` | BUG-020 |
| `apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql` | BUG-007, BUG-019 |
| `apps/api/src/infrastructure/db/seed-e2e.ts` | BUG-049 |
| `apps/api/src/infrastructure/storage/localFileStorage.ts` | BUG-002, BUG-048 |
| `apps/api/src/modules/auth/service.ts` | BUG-018 |
| `apps/api/src/modules/auth/routes.ts` | BUG-030 |
| `apps/api/src/modules/auth/repository.ts` | BUG-043 |
| `apps/api/src/modules/auth/requireAdminSession.ts` | BUG-044 |
| `apps/api/src/modules/uploads/service.ts` | BUG-007, BUG-021, BUG-031 |
| `apps/api/src/modules/media-images/repository.ts` | BUG-001 |
| `apps/api/src/modules/media-images/service.ts` | BUG-031 |
| `apps/api/src/modules/media-sets/service.ts` | BUG-031, BUG-046 |
| `apps/api/src/modules/projects/service.ts` | BUG-031, BUG-045 |
| `apps/api/src/modules/locations/service.ts` | BUG-031, BUG-047 |
| `apps/api/src/modules/public/service.ts` | BUG-022 |
| `apps/web/src/app/router.tsx` | BUG-013 |
| `apps/web/src/app/routes/gallery/GalleryHome.tsx` | BUG-008, BUG-014 |
| `apps/web/src/app/routes/public/map/MapPage.tsx` | BUG-014 |
| `apps/web/src/app/routes/admin/dashboard/AdminDashboardPage.tsx` | BUG-009 |
| `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx` | BUG-010, BUG-014, BUG-037 |
| `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx` | BUG-014 |
| `apps/web/src/components/gallery/GalleryExperience.tsx` | BUG-011, BUG-012 |
| `apps/web/src/components/gallery/GalleryScene.tsx` | BUG-011, BUG-012 |
| `apps/web/src/components/gallery/GeoMediaLayer.tsx` | BUG-012 |
| `apps/web/src/components/map/MapBase3DView.tsx` | BUG-024 |
| `apps/web/src/components/media/SpinViewer.tsx` | BUG-025 |
| `apps/web/src/components/media/GalleryViewer.tsx` | BUG-025 |
| `apps/web/src/features/media/api/usePublicMediaSet.ts` | BUG-023 |
| `apps/web/src/app/routes/public/home/HomePage.tsx` | BUG-038 |
| `apps/web/src/components/gallery/GalleryMapBase.tsx` | BUG-038 |
| `apps/web/src/features/gallery/useCurvedMapProjection.ts` | BUG-038 |
| `apps/web/src/services/storage/adminEditorDrafts.ts` | BUG-038 |
| `apps/web/src/services/storage/adminValidation.ts` | BUG-038 |
| `apps/web/playwright.config.ts` | BUG-042 |
| `apps/web/vite.config.ts` | BUG-039 |
| `deploy/caddy/Caddyfile` | BUG-015, BUG-032 |
| `scripts/ops/backup-uploads.ps1` | BUG-005 |
| `scripts/ops/backup-mysql.ps1` | BUG-006 |
| `scripts/ops/build-release.ps1` | BUG-033 |
| `scripts/ops/restore-uploads.ps1` | BUG-034 |
| `apps/api/.env.example` | BUG-026, BUG-027, BUG-028 |
| `apps/api/.env.production.example` | BUG-027 |
| `ecosystem.config.cjs` | BUG-003 |
| `CLAUDE.md` | BUG-014, BUG-029, BUG-042, BUG-050, BUG-051, BUG-052 |
| `README.md` | BUG-039 |
| `docs/operations/backup-and-recovery.md` | BUG-016 |
| `docs/operations/single-node-deployment.md` | BUG-041 |
| `docs/2026-05-26-current-feature-introduction-report.md` | BUG-040 |

---

**报告完**。共 **52 条 bug**(P0=16 / P1=13 / P2=13 / P3=10),4 份 track 报告去重合并后。

> **审计方式**:静态代码审计 + Vitest 测试基线确认 + PowerShell 5.1 实测。所有 SQL / Caddyfile / PowerShell 修复建议均给出可直接粘贴运行的片段。
> **未对项目做修改**。本报告由 `bug-report-gate` 任务基于 4 份 track audit 报告综合生成,供后续修复优先级决策使用。
