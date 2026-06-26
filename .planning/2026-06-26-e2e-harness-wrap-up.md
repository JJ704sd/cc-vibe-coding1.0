# E2E Harness 收尾记录 - 2026-06-26

> Playwright E2E 基础设施 Round 1: harness + 4 smoke cases + fixture seeder。Roadmap B 的本地端落地（roadmap C 的 CI 部分仍待做）。

## 现状快照

- 起点 commit：`c5a0068f`（Phase 1-4 + Sprint 1/2 + GalleryHome 重构 + bug fixes 全收尾）
- 起点工作树：**4 modified + 7 untracked**，全部是 E2E harness 相关文件
- 终点 commit：`8b47e2dc`（pushed 到 origin/main）
- 测试：E2E **4/4** + API vitest **89/89** + Web vitest **159/159** 全过
- build：API tsc OK + Web vite 4.73s OK

## 已完成项

| # | 项 | 关键文件 | 验证 |
|---|---|---|---|
| 1 | Playwright 配置 + 双 webServer | `apps/web/playwright.config.ts`（API 4000 + Vite 5173，globalSetup，hard-pin chromium-1181） | ✅ Vite 355ms ready |
| 2 | Fixture seeder 脚本 | `apps/api/src/infrastructure/db/seed-e2e.ts`（拒绝非 e2e 库运行，避免误删生产） | ✅ seed 产出 `.last-seed.json` |
| 3 | globalSetup 协调 | `apps/web/e2e/global-setup.ts`（跑 `npm run seed:e2e`，强制覆盖 `MYSQL_DATABASE=trace_scope_e2e`） | ✅ Playwright 启动前自动 seed |
| 4 | Round 1 smoke spec | `apps/web/e2e/smoke.spec.ts`（4 cases） | ✅ 4/4 passed in 15.8s |
| 5 | vitest 排除 e2e/ | `apps/web/vitest.config.ts`（`exclude: ['e2e/**']`，避免 Playwright spec 被 vitest 错误收集） | ✅ Web vitest 40/159 |
| 6 | e2e 产物 gitignore | `.gitignore` 加 `apps/api/storage-e2e/` `apps/web/playwright-report/` `apps/web/test-results/` | ✅ 不入仓 |
| 7 | npm scripts | `apps/api`: `seed:e2e`；`apps/web`: `test:e2e` `test:e2e:ui` + `@playwright/test` devDep | ✅ |

## Smoke spec 覆盖矩阵

| Test | 关注点 | 跑时 |
|---|---|---|
| `home page loads with the brand title` | SPA mount + Vite proxy + brand 元素 | ~7.5s |
| `projects page surfaces the e2e fixture project` | Skeleton→data 切换 + fixture 真实通路 | ~2.2s |
| `GET /api/public/projects returns the fixture project` | seed→DB→API→`{ items: [...] }` shape | ~30ms |
| `GET /health reports the API as live` | API liveness 端点直连（不走 Vite proxy） | ~15ms |

## 修复的 bug（commit 8b47e2dc 隐含在最终代码里）

| # | Bug | 修复 |
|---|---|---|
| 1 | 测试断言 `body` 是 array，实际 API 返回 `{ items: [...] }` | 改 `body.items.some(...)` |
| 2 | 测试打 `/api/health/live` 404，实际端点是 `/health`（`buildServer.ts:108`） | 改 `/health` |
| 3 | Vite proxy 只覆盖 `/api`，`/health` 走 baseURL（5173）被 SPA 拦下返回 HTML | 改用 `process.env.PLAYWRIGHT_API_URL` 直接打 API 端口 |
| 4 | vitest 默认 include 把 `e2e/smoke.spec.ts` 当 vitest spec 收集，phantom 失败 | `vitest.config.ts` 加 `exclude: ['e2e/**']` |

## 验证结果（独立跑两轮，第一轮调试后第二轮干净基线）

| 项 | 第一轮 | 第二轮（独立验证） |
|---|---|---|
| E2E | 4/4 passed in 15.8s | 4/4 passed in 21.5s |
| API vitest | 13 files / 89 tests passed, 1.73s | 13 files / 89 tests passed, 1.58s |
| Web vitest | 40 files / 159 tests passed, 8.17s | 40 files / 159 tests passed, 9.22s |
| API build | tsc OK | tsc OK |
| Web build | 4.73s | 7.48s |

## 冗余审视（按 user_profile 规则）

| 文件 | 判定 | 理由 |
|---|---|---|
| `playwright.config.ts` | 保留 | 必需 |
| `e2e/global-setup.ts` | 保留 | 必需 |
| `e2e/smoke.spec.ts` | 保留（4 cases 全保留）| 4 case 分别测 brand mount / fixture projection / API shape / API liveness，不冗余 |
| `seed-e2e.ts` | 保留 | 必需 |
| `vitest.config.ts` 修改 | 保留 | 必要修复 |
| `apps/api/package.json` + `apps/web/package.json` | 保留 | 必需 |

**结论：不删任何文件 / 不 prune 任何测试。**

## 提交信息

- **`8b47e2dc` test(e2e): add Playwright harness with Round 1 smoke + fixture seeder**
  - 9 files / 1266+ / 41-（按 `git show --stat` 逐条核对，无漏 stage）
  - Author：`JJ704SD <JJ704sd@users.noreply.github.com>`（GH007 私密邮箱 → 改 noreply amend）
  - 远端 main HEAD 同步

## 已知问题 / 后续

### 1. chromium 路径 hard-pin（必须解决才能跨机器跑）
- 当前：`playwright.config.ts` 写死 `C:\Users\lenovo\AppData\Local\ms-playwright\chromium_headless_shell-1181\...`
- 原因：playwright 1.61 期望 1228，但本机只有 1181 cache，且 `playwright.azureedge.net` 在国内环境被墙
- 后续：
  - 本地：删 hard-pin 行 + `npx playwright install`，或设 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env
  - CI（roadmap C）：用 GitHub-hosted runner 自带 chromium，不需要 pin

### 2. trace_scope_e2e 库需手工初始化
- 当前：seed-e2e **不会** `CREATE DATABASE`，只 DELETE FROM 现有表
- 操作：第一次跑前要手工建库：
  ```sql
  CREATE DATABASE trace_scope_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- 后续：可以加 `npm run e2e:setup` 脚本包 create + migrate + seed

### 3. API 测试未覆盖 admin 流程
- 当前：4 case 全是 public 端
- 后续：Round 2 可加 admin login + CRUD + 上传 e2e（需要先有 admin auth e2e 工具方法）

### 4. CI 集成（roadmap C）
- 当前：本地 `npm run test:e2e` 通过，无 CI
- 后续：GitHub Actions workflow（`.github/workflows/e2e.yml`）+ MySQL service container

## 不做的事

- ❌ Round 2 完整 ~25 场景矩阵（user 没勾，留作后续）
- ❌ GitHub Actions CI（roadmap C，user 没勾）
- ❌ 升级 playwright 1.61 → 1.62+（不必要，1.61 已 stable）
- ❌ Playwright trace viewer UI 集成（保留 `trace.zip` 即可）
- ❌ Visual regression 测试（Phase 5 候选）

## 后续 round 候选

`.planning/2026-06-06-next-round-roadmap.md` 列的 5 个候选（A-E）状态更新：

| 候选 | 状态 | 备注 |
|---|---|---|
| A 移动端布局 | ✅ 完成 | sprint 2 收尾 |
| B E2E harness | ✅ **完成（基础）** | 本轮 |
| C CI 集成 | ⏳ 待做 | B 完成后再做 |
| D 性能再优化 | ⏳ 待做 | vendor-maplibre 已动态 import，剩余空间小 |
| E GalleryHome 重构 | ✅ 完成 | sprint 2 收尾 |
| F 4-07 hero 重设计 | ❌ 不建议 | |
| G 收工 | ⏳ 候选 | 等用户新需求 |

## 相关文件

- `apps/web/playwright.config.ts`
- `apps/web/e2e/global-setup.ts`
- `apps/web/e2e/smoke.spec.ts`
- `apps/web/vitest.config.ts`
- `apps/api/src/infrastructure/db/seed-e2e.ts`
- `apps/api/package.json`（`seed:e2e` script）
- `apps/web/package.json`（`test:e2e` scripts + `@playwright/test`）
- `.gitignore`（e2e 产物）
