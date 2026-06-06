# Next Round Roadmap - 2026-06-06

> 把刚刚完成的工作当成上一轮的"收工"——本文件列下一轮可走的方向。
> 跟 `docs/plans/2026-05-24-next-stage-design-roadmap.md` 的 1-10 项全部完成后的"候选推荐"是对应关系。

## 上下文

**当前主干**: `main` @ `390bb2db`（已 push 到 `origin/main`）

**5-24 计划 1-10 项**已全部交付 + 文档对齐 + env 模板同步：

- 阶段一 1+2: 后台写接口鉴权（PR #7）、上传公开访问收敛（PR #8）
- 阶段一 3+4: 生产配置传递（`ed394f75`）、`STORAGE_DIR` 语义统一（`1ded5e8d`）
- 阶段二 1+2+3: 封面 URL 语义（`1d22a52d`）、路线地点事务（`1ca4f9c6`）、后台发布就绪度（`ba1e6206`）
- 阶段三 1+2+3: 画廊细节（`cfff03b8`）、公开页互跳（`1c1c0695`）、加载/空/失败状态（`36b81293`）
- 文档: contributor guide 修正（`47041c90`）、5-24 计划复选框 + code review 状态同步（`6c696bfd`）、`.env.production.example` 同步 STORAGE_DIR（`76d2c481`）、`.gitignore` 加 `apps/web/.env`（`390bb2db`）

**测试 / 构建终态**: API 8 文件 52 测试、 Web 37 文件 131 测试， 全过；`tsc` + `vite build` 通过。

**已对齐文档**:
- `docs/plans/2026-05-24-next-stage-design-roadmap.md` 复选框 1-10 全 ✓
- `docs/2026-05-24-code-review.md` 4 个 High/Medium 风险加"当前状态：已解决"段
- `apps/api/.env.example` / `apps/api/.env.production.example` 一致：`STORAGE_DIR` 优先、`UPLOAD_ROOT` 兼容回退
- `apps/web/.env` 加进 `.gitignore`

## 候选方向

| ID | 方向 | 价值 | 风险 | 估计工时 | 我的看法 |
|---|---|---|---|---|---|
| **A** | 移动端布局专项 | 高 | 低 | 1-2 天 | **推荐** |
| **B + C** | E2E 测试（Playwright）+ GitHub Actions CI | 中-高 | 低-中 | 1 天 setup + 2-3 天 e2e | **推荐组合** |
| D | 性能优化（`vendor-maplibre` 1.05MB 延迟加载、CSS 拆 critical/lazy） | 中 | 中 | 1-2 天 | 等需要再做 |
| E | 重构 `GalleryHome`（759 行单文件 + 90% 内联样式 → 拆组件 + CSS class） | 长期高 | 低（不破坏功能） | 1-2 天 | 跟 A 顺手做最划算 |
| F | 4-07 plan 实际执行（gallery 沉浸式重设计） | 视觉向 | 跟 5-24 路线冲突 | — | **不推荐** |
| G | 收工不开新工作 | — | — | 0 | 合理选择 |

### A · 移动端布局专项

5-24 阶段三验收里写"移动端不出现文字和控件重叠"，本轮 3-1 / 3-2 / 3-3 没专门做。`GalleryHome.tsx` 现在是 759 行的"超长"页面，90% 是 `position: fixed` + `max(16px, calc(env(safe-area-inset-top) + 8px))` 这种硬编码内联样式，移动端体验明显不如桌面。

**关键文件**:
- `apps/web/src/app/routes/gallery/GalleryHome.tsx`（主战场）
- `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- `apps/web/src/app/routes/public/map/MapPage.tsx`
- `apps/web/src/styles/index.css`

**验收标准**:
- 360px / 768px 视口下不出现控件重叠、文本截断、按不到的小按钮
- MediaClusterLayer / 关系面板在窄屏改为底部抽屉或全屏 modal
- 加 1-2 个 mobile viewport 的渲染快照测试

### B + C · E2E + CI

**B (Playwright)**: 装 `@playwright/test`，加 `apps/web/e2e/` 目录，覆盖：
- 公开页：`/`、`/projects`、`/projects/:id`、`/map`、`/gallery/:id`、`/spin/:id` 加载和导航
- 后台：`/admin/login` → `/admin/projects` 编辑 → 保存 → 列表显示就绪度
- 公开 API 失败时 `ProjectsPage` 显示错误卡片（`data-testid="projects-error"`）

**C (GitHub Actions)**: 加 `.github/workflows/ci.yml`：
- `push` / `pull_request` 触发
- jobs: `api-test`（`npm --prefix apps/api test`）、`web-test`（`npm --prefix apps/web test`）、`api-build`（`tsc`）、`web-build`（`vite build`）
- MySQL 依赖：用 `services:` 起 MySQL 8 容器跑 API 测试

**价值**: 装上之后，未来任何 UI 改动都不容易破回归；CI 是公共 PR 流程的最低门槛。

**风险**: MySQL 容器 + Playwright 浏览器二进制在 CI 启动慢，**首次 setup 大约需要 5 分钟调试**。

### D · 性能优化

- `apps/web/src/lib/constants/map.ts` 的 `buildTiandituRasterStyle` 当前被 `MapBase3DView` 静态 import；改成 dynamic import 后非地图页不下载 maplibre + style
- `apps/web/src/styles/index.css` 拆 critical（首屏 glass atoms）+ lazy（modal、animations）
- Web `dist/assets/vendor-maplibre-CZADgZlY.js` 当前 1.05MB 是最大 chunk，dynamic import 后非地图页首屏不付这成本

**价值**: 中等——首屏加载从 ~1.4MB vendor 降到 ~400KB。但项目目前没性能问题症状，是"未雨绸缪"。

### E · 重构 `GalleryHome`

`apps/web/src/app/routes/gallery/GalleryHome.tsx` 现在 759 行 + 90% 内联样式 + 大量 `useEffect` 互相依赖。拆成：
- `<GalleryTopBar />`：右上角 search / view toggle / night toggle / nav 链接
- `<GalleryMediaRail />`：底部 media strip
- `<GalleryRelationshipPanel />`：右侧 relationship panel
- `<GalleryImageModal />`：点击图片的全屏 modal
- 业务逻辑留在 `GalleryHome.tsx` 但只做 orchestration，文件应该砍到 ~300 行

**价值**: 长期——所有未来体验深化工作都在这个文件上做；A 必做的话，E 顺手做掉最划算。

**风险**: 低。纯重构，不改行为，加测试覆盖即可。

### F · 4-07 plan（已删）

`docs/superpowers/plans/2026-04-07-gallery-reference-homepage.md`（已 trash）描述的"gallery 沉浸式重设计"，包含新的 `GalleryArtwork` / `GalleryAboutProfile` 视图模型、`<GalleryOverlay />`、`<AboutModal />` 等等。

**不推荐**。`docs/plans/2026-05-24-next-stage-design-roadmap.md` 阶段三明确说"暂缓视觉扩张，先收口安全和内容链路"——本轮完成 5-24 后视觉方向已经定调（curved map + star points），做 4-07 等于推翻阶段三的方向。

### G · 收工

完全合理。5-24 + 4 个 bug 修复 + 文档/env 同步全部做完，下一阶段开不开都一样。再次开新工作的合理触发是**用户报新需求**或**实际生产部署时**。

## 推荐组合

我推荐**两个互斥的组合**——选一个做完就行，不要混着做：

### 组合 1：A + E（产品打磨向）

适合想"让用户感知到变化"的方向：

1. **拆 GalleryHome 组件**（E，0.5 天，先做，为 A 铺路）
2. **移动端布局调整**（A，1-2 天，复用 E 拆出的组件）
3. **加 1-2 个 mobile viewport 快照测试**
4. 跑全量验证 + commit + push

预期 commit 数: 2-3 个，e.g. `refactor(gallery): extract top bar / media rail / image modal components`、`feat(gallery): mobile-first layout pass`

### 组合 2：B + C（防御性投资向）

适合想"让以后改东西更安全"的方向：

1. **GitHub Actions CI**（C，0.5-1 天，先做，给 e2e 跑提供 runner）
2. **Playwright E2E**（B，2-3 天，搭在 CI 上）
3. 跑全量验证 + commit + push

预期 commit 数: 4-5 个，含 `.github/workflows/ci.yml`、`apps/web/playwright.config.ts`、`apps/web/e2e/*.spec.ts`

### 组合 3：G

不动。

## 决策建议

- **如果产品方/用户在用，移动端体验是真痛点** → 选 1
- **如果接下来要扩团队/接 PR/做 release** → 选 2
- **如果既没用户压力也没团队扩张** → 选 3

我个人倾向 1，因为：
- A 是真痛点（5-24 阶段三自己写的验收没做）
- E 是为 A 铺路，单独做也划算
- 1 不引入新依赖（B+C 会加 Playwright 几百 MB、二进制 + MySQL 容器）
- 1 改的都是项目内文件，merge/review 简单

但 2 在中长期更值钱（"少踩坑"），看团队节奏。

## 推荐执行顺序（如果选 1）

1. **E 拆组件** — 把 GalleryHome 里的 top bar / media rail / image modal 抽到独立文件，纯重构，零行为变化
2. **A 移动端** — 在拆出的组件里改 `position: fixed` + 内联样式 → CSS class + 媒体查询
3. **快照测试** — 加 1-2 个 mobile viewport 的 render 验证
4. **E2E 回归** — 启服务跑一遍，确认桌面/移动两条路径不破

每步独立 commit，commit message 用 `refactor(gallery): ...` / `feat(gallery): ...` 区分纯重构 vs 行为变化。

## 相关文件索引

| 用途 | 路径 |
|---|---|
| 上一轮规划（已完成） | `docs/plans/2026-05-24-next-stage-design-roadmap.md` |
| 上一轮 review（已同步） | `docs/2026-05-24-code-review.md` |
| 当前功能报告 | `docs/2026-05-26-current-feature-introduction-report.md` |
| 贡献者导引 | `CLAUDE.md` |
| 已废弃 plan（4-08） | `docs/superpowers/plans/2026-04-08-map-true-projection-overlay.md`（已 trash，工作已落地） |
| 已废弃 plan（4-07） | `docs/superpowers/plans/2026-04-07-gallery-reference-homepage.md`（已 trash，与 5-24 路线冲突） |
