# Sprint 2 收尾计划 - 2026-06-23

> 两个 subagent 已完成代码改动但未 commit/push。本文件按 subagent 分类整理已完成项 + 待 owner 决策项 + 收尾步骤。

## 现状快照

- 工作树: **16 modified + 8 untracked,未 commit**
- 测试: API **13/72** + Web **39/152** 全过(基线 37/140 + 新增 2 文件 12 用例)
- build: 通过(`~6s`)
- 起点 commit: `4233b060`(上次 feature 报告更新)
- 终点目标: 主干干净 + push 到 origin

## Agent-1 (基础设施层) 收尾

### 已完成 6 项

| # | 项 | 关键文件 | 验证 |
|---|---|---|---|
| 1 | favicon + OG meta | `apps/web/index.html`, `apps/web/public/favicon.svg` | ✅ dist/index.html 含 favicon/OG/twitter/description/theme-color meta |
| 2 | vendor-maplibre 动态 import | `apps/web/src/lib/constants/map.ts` (`loadTiandituRasterStyle`), `apps/web/src/components/map/MapBase3DView.tsx` | ✅ 首屏 chunk 不含 vendor-maplibre.js/.css |
| 3 | CSS 拆 critical + lazy | `apps/web/src/styles/index.css` 头部注释,新建 `apps/web/src/styles/non-critical.css`, `apps/web/src/main.tsx` 异步加载 | ✅ 首屏 index.css 12.53kB(non-critical.css 76.26kB 拆出去) |
| 4 | 图片懒加载 util | `apps/web/src/lib/lazyImage.tsx` 新建 `<LazyImage>` + `buildSrcSet` | ✅ util 已就绪(供 Agent-2 后续接入) |
| 5 | Glass tokens + prefers-reduced-motion | `apps/web/src/styles/index.css` :root 块(早就存在,Agent-1 增量加了 `--shadow-1/2/3` `--radius-pill` `--transition-fast/med` + prefers-reduced-motion 块) | ⚠️ 见下方决策 1,2 |
| 6 | vendor chunk 现状核对 | `apps/web/vite.config.ts` manualChunks | ✅ 现状记录,无改动 |

### 待 owner 决策

#### 决策 1: `--radius-sm/md/lg` 覆盖

**事实**:
- 契约值: `--radius-sm: 6px` / `--radius-md: 12px` / `--radius-lg: 20px`
- 改动前: `--radius-sm: 12px` / `--radius-md: 16px` / `--radius-lg: 24px`
- **影响面**: `.panel` `.card` `.badge` `.list-item` `.stat-card` `.skeleton` 等用 `var(--radius-md/lg/sm)` 的全部组件视觉圆角会变小(更现代、更紧凑)

**owner 决策**: 3 选 1
- **A. 接受契约值**(6/12/20)— 视觉更现代紧凑,但会改变所有现有圆角观感
- **B. 回滚到原值**(12/16/24)— 维持现有观感,但失去契约一致性
- **C. 重新命名**(改用 `--glass-radius-sm/md/lg` 命名,旧 `--radius-*` 维持原值)— 最安全但增加 token 数量

**owner 倾向**: **A**(契约明确写了值,改动是 deliberate 的设计升级,跟 V1-V6 视觉细节同步)

#### 决策 2: `global.css` glass token 冲突

**事实**:
- `global.css` L19-21 已有 3 个 glass token,加载顺序在 `index.css` 之后,会覆盖 `index.css` 的同名 token
- 冲突范围:
  - `--glass-bg`: `index.css` 0.12 vs `global.css` 0.03(global.css 赢,值更小)
  - `--glass-border`: `index.css` 0.25 vs `global.css` 0.12(global.css 赢,值更小)
  - `--glass-blur`: `index.css` `blur(14px) saturate(140%)` vs `global.css` `blur(18px) saturate(1.3) brightness(0.85)`(global.css 赢,更复杂)
- 不冲突:`--glass-bg-strong` / `--shadow-1/2/3` / `--transition-fast/med` 等只在 `index.css` 定义

**owner 决策**: 3 选 1
- **A. 删 global.css 这 3 行**(接受 index.css 的 glass 体系)— 简单,但 `global.css` 的 `brightness(0.85)` 效果会丢失
- **B. 迁移 global.css 的 3 行到 index.css**(完整合并)— 最干净,所有 token 在 :root 一处
- **C. 不动**(接受 global.css 覆盖)— 无风险,但 Agent-2 的 glass 引用实际拿到 global.css 的值

**owner 倾向**: **B**(完整合并,后续维护更简单,但需要把 `brightness(0.85)` 这种 `global.css` 独有的细节带到 `index.css`)

#### 决策 3: `mapStyles.test.ts` 间歇失败

**事实**:
- Agent-1 把 `.map-projection-overlay*` / `.map-star-layer__*` 移到了 `non-critical.css`
- `mapStyles.test.ts` 用 `expect(css).toContain(...)` 断言这些选择器在 `index.css` 里
- Agent-1 报告 "本次最终运行 39/152 全过(第一次运行时该测试间歇失败)"
- Owner 重跑:**39/152 全过** ✅

**owner 决策**: 1 选 1
- **A. 不动**(接受现状)— 测试这次过了,但下次 vite 时序变了可能又挂
- **B. 改 `mapStyles.test.ts` 让它读 `non-critical.css`** — 一劳永逸,owner 改测试

**owner 倾向**: **B**(预防性修复,3 行改动)

### Agent-1 owner 收尾动作

- [ ] 决策 `--radius-*`(选 A/B/C,默认 A)
- [ ] 决策 `global.css` glass token(选 A/B/C,默认 B)
- [ ] 改 `mapStyles.test.ts` 让它读 `non-critical.css`(选 A/B,默认 B)
- [ ] 重跑 `npm --prefix apps/web test` 确认 39/152 稳定绿

## Agent-2 (视觉细节层) 收尾

### 已完成 5 项

| # | 项 | 关键文件 | 验证 |
|---|---|---|---|
| V1 | Glass 设计系统应用 | `ProjectCard` / `MediaSetCard` / `LocationDetailPanel` 加 inline glass style | ✅ inline style 已加,但 `.panel` 全局 CSS 未升级(见决策 4) |
| V2 | Card hover 升级 | `ProjectCard.tsx:11-23`, `MediaSetCard.tsx:13-25`, `LocationDetailPanel.tsx:17-32` | ✅ hover translateY + scale + shadow + ::after 高光 |
| V3 | Skeleton + EmptyState + 错误状态 | 新建 `apps/web/src/components/common/Skeleton.tsx`, `EmptyState.tsx`,接入 5 个公开 page | ✅ `data-testid="projects-loading/empty/error"` 保留 |
| V4 | 页面切换过渡 | 新建 `apps/web/src/components/common/RouteTransition.tsx`,改 `router.tsx`,越界改 `PublicLayout.tsx`(见决策 5) | ✅ framer-motion AnimatePresence 包裹 Outlet |
| V6 | 空状态插画 | `EmptyState.tsx` 内置 4 variant(no-projects/no-media/no-routes/no-results),纯 inline SVG | ✅ 4 variant + 各公开 page 接入 |

### 待 owner 决策

#### 决策 4: `.panel` 全局升级缺失

**事实**:
- Agent-2 因为契约约束 `styles/index.css` 只读,没法改全局 `.panel` 样式
- 当前所有 `.panel` 用法(`admin` pages, `CascadeDeleteDialog`, `router.tsx` 等)仍是原 `rgba(18,18,28,0.95)`
- Agent-2 的 glass 升级只覆盖了 card 类组件,没碰 `.panel`

**owner 决策**: 2 选 1
- **A. owner 补 patch**(改 `.panel` 全局样式到 `--glass-bg-strong` + `--glass-blur` + `--shadow-2`)— 跟 V1 一致
- **B. 不动**(接受 `.panel` 跟其他 card 视觉不一致)— admin/CascadeDeleteDialog 看起来会跟 V1 不协调

**owner 倾向**: **A**(5 分钟改动,视觉一致性)

#### 决策 5: `PublicLayout.tsx` 越界

**事实**:
- Agent-2 改了 `apps/web/src/components/site/PublicLayout.tsx`(契约未列 site/ 范围)
- 原因是 V4 页面过渡必须包住 PublicLayout 内的 Outlet,否则切换时 fade 不生效
- 这是 V4 的必要依赖,不是无目的越界

**owner 决策**: 2 选 1
- **A. 接受**(V4 必要)— 改动合理,影响有限
- **B. 回滚 + 用其他方案**(比如在 router.tsx 层包)— 工程量更大,V4 效果打折

**owner 倾向**: **A**(必要依赖,影响可接受)

### Agent-2 owner 收尾动作

- [ ] 决策 `.panel` 全局升级(选 A/B,默认 A)— 改 `styles/index.css` 的 `.panel` 块
- [ ] 决策 `PublicLayout.tsx` 越界(选 A/B,默认 A)— 接受

## 审视测试

| 文件 | 用例数 | 决策 | 理由 |
|---|---|---|---|
| `Skeleton.test.tsx` | 5 | ✅ 保留 | 测 3 variant + SkeletonStack,核心 visual 组件,RTL 测试有意义 |
| `EmptyState.test.tsx` | 7 | ✅ 保留 | 测 4 variant + ErrorState + CTA + role,契约明确要求 |
| 现有 `ProjectsPage.test.tsx` | 5(不变) | ✅ 保留 | Agent-2 保留 `data-testid` 不破坏现有断言 |

**结论**: 不删任何测试。新增的 2 个测试文件是契约要求的、非冗余。

## commit + push 方案

**建议 3 个 commit**:

1. `perf(web): favicon/OG + vendor-maplibre 动态 import + CSS critical/lazy + lazyImage util`
   - 范围: `apps/web/index.html`, `apps/web/public/favicon.svg`, `apps/web/src/lib/constants/map.ts`, `apps/web/src/components/map/MapBase3DView.tsx`, `apps/web/src/styles/index.css` (CSS 拆分 + glass tokens), `apps/web/src/styles/non-critical.css`, `apps/web/src/main.tsx`, `apps/web/src/lib/lazyImage.tsx`
   - ~8 files

2. `feat(web): Glass tokens + Card hover + Skeleton + 页面过渡 + 空状态插画`
   - 范围: `apps/web/src/app/router.tsx`, `apps/web/src/app/routes/public/**`, `apps/web/src/components/{project,site}/**`, `apps/web/src/components/common/{Skeleton,EmptyState,RouteTransition,useToast?}.tsx`, 2 个新 test
   - ~10 files

3. `chore(web): align --radius-* with contract, fix global.css glass conflict, .panel global upgrade`
   - 范围: owner 收尾决策的 patch
   - ~3 files

**或者合并 1 个 commit**: `feat(web): perf 基础 + 视觉细节升级 (sprint 2)`,取决于 commit message 颗粒度偏好。

## 总计

- 改动文件: **16M + 8 untracked → 计划 commit 21-22 files**
- 测试新增: 12 用例
- build 时间: ~6s
- owner 收尾预计: 15-30 分钟(改 3-5 个文件 + 重跑 test)

## 收尾执行顺序(预计 30 分钟)

1. 写 `mapStyles.test.ts` 让它读 `non-critical.css`(1 行改动)
2. 合并 `global.css` 的 3 个 glass token 到 `index.css`(删 global.css 的 3 行)
3. owner 决定 `--radius-*` 处理(按决定改或回滚)
4. 改 `styles/index.css` 的 `.panel` 块到 glass 体系
5. 重跑 `npm --prefix apps/web test` 确认 39/152 稳定
6. 跑 `npm --prefix apps/web run build` 确认 OK
7. 跑 `npm --prefix apps/api test` 确认 13/72 稳定
8. git add + git commit(2-3 个 commit)
9. git push origin main
10. 验证 origin/main 同步

## 不做的事

- ❌ 重启 4-07 plan hero 重设计(roadmap F 不推荐)
- ❌ 合并 spin360 和 gallery(5-24 路线)
- ❌ 新增顶层实体
- ❌ V5 3D 材质升级(用户没勾)
- ❌ V7 暗色模式(用户没勾,已经是大改动)
- ❌ CI / E2E(roadmap B+C,用户没勾)