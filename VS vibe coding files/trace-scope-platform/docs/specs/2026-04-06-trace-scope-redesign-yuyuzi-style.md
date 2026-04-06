# Trace Scope Platform — yuyuzi.art 风格全站改造设计

## 1. 概述

将 Trace Scope Platform 前台全站改造为 yuyuzi.art 的沉浸式 3D 玻璃拟态风格。

**改造范围**：所有前台页面（HomePage, ProjectsPage, ProjectDetailPage, MapPage, SpinViewPage, GalleryViewPage）及其公共框架（PublicLayout, SiteHeader）

**不改动**：后台页面、核心数据模型、路由结构、业务逻辑

**核心风格要素**：
- 全屏沉浸式背景（动态渐变 + 星空/云层 CSS 动画）
- 毛玻璃卡片（`backdrop-filter: blur()` + 边框光泽流动）
- 优雅字体层级（衬线标题 + 无衬线正文）
- 缓慢呼吸动画 + 悬浮交互反馈

---

## 2. 设计系统

### 2.1 色彩体系

```css
/* === 日间模式（默认）=== */
--sky-gradient-day: linear-gradient(180deg, #87CEEB 0%, #B0D4E8 40%, #F5E6D3 100%);
--glass-bg: rgba(255, 255, 255, 0.12);
--glass-border: rgba(255, 255, 255, 0.25);
--glass-border-shine: rgba(255, 255, 255, 0.5);
--glass-shadow: rgba(0, 0, 0, 0.1);
--text-primary: #1a1a2e;
--text-secondary: #4a4a6a;
--text-muted: #8888aa;
--accent: #5B8DEE;
--accent-warm: #E8A87C;
--page-bg: transparent; /* 背景由父级渐变层提供 */

/* === 夜间模式（class="night-mode"）=== */
.night-mode {
  --sky-gradient-night: linear-gradient(180deg, #0f1629 0%, #1a2245 50%, #22295b 100%);
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-shine: rgba(200, 220, 255, 0.3);
  --text-primary: #e8e8f0;
  --text-secondary: #a0a0c0;
  --text-muted: #6868a0;
  --accent: #7BA7FF;
  --accent-warm: #FF9B6A;
}
```

### 2.2 字体

- **标题**：Playfair Display（衬线，优雅艺术感）
- **导航/UI 标签**：Inter（无衬线，现代清晰）
- **正文**：Noto Sans SC（中文支持）
- **来源**：Google Fonts CDN

### 2.3 玻璃组件基类

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: 0 8px 32px var(--glass-shadow);
  position: relative;
  overflow: hidden;
}

/* 边框光泽流动效果 */
.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    transparent 0%,
    var(--glass-border-shine) 40%,
    transparent 60%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: borderShine 6s ease-in-out infinite;
}

@keyframes borderShine {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
```

### 2.4 背景层

```css
.sky-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--sky-gradient-day, linear-gradient(180deg, #87CEEB 0%, #B0D4E8 40%, #F5E6D3 100%);
  transition: background 1s ease;
}

/* 星星层（夜间可见） */
.sky-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.8) 0%, transparent 100%),
    radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.6) 0%, transparent 100%),
    /* ... 更多星星点，可生成 50+ 个随机位置 ... */;
  opacity: 0;
  transition: opacity 1s ease;
}

.night-mode ~ .sky-background::after {
  opacity: 1;
}
```

### 2.5 按钮

```css
.btn-glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 12px 24px;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(91, 141, 238, 0.25);
}

.btn-accent {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
```

---

## 3. 组件改造清单

### 3.1 SiteHeader

- 去掉深色 panel 背景
- 改为玻璃悬浮条：`glass` 类 + 固定顶部
- 导航文字改为深色（白天模式），hover 时accent色
- 品牌名使用 Playfair Display 字体

### 3.2 PublicLayout

- 去掉 `background: radial-gradient(...)` 的深色背景
- body 改为透明，背景由 `.sky-background` 固定层提供
- `main` 区域内容去掉 `page-shell` 的深色面板感，改为空白透明

### 3.3 HeroEntryPanel

- 外层 panel → `glass` 类
- 标题使用 Playfair Display，字号放大
- 双核心展示区（轨迹层/媒体层）改为玻璃卡片+渐变背景
- 背景从深色改为浅色渐变

### 3.4 ProjectCard

- 外层 → `glass` + `glass-interactive`
- 图片区域保留，但整体有玻璃框
- hover 时整体上浮 + 边框光泽加强
- 标签改为圆角玻璃胶囊

### 3.5 LocationDetailPanel

- 直接使用 `glass` 类
- 去掉深色 `panel-bg` 变量依赖

### 3.6 MediaSetCard

- 使用 `glass` + `glass-interactive`
- hover 效果统一为玻璃卡片上浮+光泽

### 3.7 SpinViewer

- 外层容器使用 `glass`
- 图片展示区：去掉深色背景，改为透明容器
- 按钮改为 `btn-glass` 风格
- 帧计数器使用玻璃徽章

### 3.8 GalleryViewer

- 同 SpinViewer 改造逻辑
- 缩略图使用小玻璃框，选中时边框变为accent色

### 3.9 MapPage / MapView

- 地图容器使用 `glass` 边框包裹
- 地图背景保持正常（地图提供商提供）
- 侧边信息面板改为玻璃风格

### 3.10 空状态

- 保留空状态结构，容器改为 `glass`
- 图标使用 emoji

---

## 4. 页面结构改造

### 4.1 整体结构调整

```
body
├── .sky-background (固定背景层)
├── SiteHeader (固定顶部玻璃条)
└── main
    └── [各页面内容]

// page-shell 从深色容器改为空白透明
.page-shell {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  // 去掉所有背景/边框，纯粹控制宽度
}
```

### 4.2 首页（HomePage）

```
.hero-section → glass 大卡片，Playfair Display 标题
.project-grid → 玻璃卡片网格
```

### 4.3 项目列表（ProjectsPage）

```
.page-header → 玻璃标题区
.projects-grid → glass 卡片网格
```

### 4.4 项目详情（ProjectDetailPage）

```
.project-header → glass 大标题卡
.split-view → [MapView glass框] + [LocationDetailPanel glass框]
.location-list → 玻璃胶囊按钮组
.media-grid → 玻璃卡片网格
```

### 4.5 地图页（MapPage）

```
.page-header → 玻璃标题
.map-container → glass 包裹 MapView
.info-panels → 两个 glass 小卡
```

### 4.6 媒体查看页（SpinViewPage / GalleryViewPage）

```
.media-header → glass 标题区
.viewer-container → glass 主查看器
```

---

## 5. 动效规范

| 动效 | 实现方式 | 参数 |
|------|---------|------|
| 页面进入 | `fadeInUp` 0.4s ease | stagger 80ms |
| 卡片悬浮 | `translateY(-4px)` + 边框增亮 | 0.3s ease |
| 边框光泽 | CSS `::before` 动画 | 6s ease-in-out infinite |
| 背景渐变 | CSS transition | 1s ease |
| 夜间切換 | class toggle | 1s ease |
| 页面切换 | View Transitions API | 0.3s |

---

## 6. 实现顺序

### Step 1 — 设计系统核心
- [ ] `index.css` 变量重写
- [ ] Google Fonts 引入（Playfair Display, Inter, Noto Sans SC）
- [ ] `.glass` 基类 + `.glass-interactive` + `.btn-glass` + `.btn-accent`
- [ ] `.sky-background` 背景层组件
- [ ] `.night-mode` 切换逻辑（可通过 checkbox 或自动时间）

### Step 2 — 公共框架
- [ ] SiteHeader 玻璃化
- [ ] PublicLayout 背景透明化
- [ ] 空状态组件玻璃化

### Step 3 — 首页与项目页
- [ ] HeroEntryPanel
- [ ] ProjectCard
- [ ] HomePage
- [ ] ProjectsPage

### Step 4 — 详情与地图
- [ ] ProjectDetailPage
- [ ] LocationDetailPanel
- [ ] MediaSetCard
- [ ] MapPage + MapView 玻璃边框

### Step 5 — 媒体查看页
- [ ] SpinViewer 玻璃化
- [ ] GalleryViewer 玻璃化
- [ ] SpinViewPage
- [ ] GalleryViewPage

### Step 6 — 氛围与动效
- [ ] 页面切换动画
- [ ] 卡片悬浮光效增强
- [ ] 日间/夜间自动切换（基于当地时间）
- [ ] 整体微调与兼容处理

---

## 7. 技术约束

- 不引入 Three.js / Babylon.js 等 3D 引擎，背景纯 CSS/HTML 实现
- 不改变现有路由结构
- 不改变核心 domain.ts 类型定义
- 不改动后台页面样式
- `backdrop-filter` 需要给 Safari 加 `-webkit-` 前缀
- 动画使用 CSS `@keyframes`，不引入额外动画库
- 字体使用 Google Fonts CDN 加载
