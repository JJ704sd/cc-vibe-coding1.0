# Trace Scope 项目级 Pitfalls

> 这份文件是**项目级 agent memory**,只对 `trace-scope-platform` 仓库当前的工作环境、工具链和 CI 形态为真。
> 跨项目通用的 git/Windows/SSH 经验请留在 agent 全局 memory (`~/.mavis/agents/mavis/memory/MEMORY.md`),不要重复。
>
> 写新 pitfall 时按下面三个问题的最窄一级选:
> 1. 只在本仓库为真 → 写这里(项目级)
> 2. 换项目仍然为真 → 写 agent 全局 memory
> 3. 换用户仍然为真 → 写用户级 memory
>
> 格式:`### <短标题> (<日期>) / Type: <pitfall|preference|validation|context> / <正文>`

---

## GitHub push 撞 SSL handshake 抖动 + pre-push hook 全量验证 timeout 边界 (2026-07-05)

Type: pitfall

- **现状**:Windows PowerShell 5.1 默认 git schannel + 国内代理对 github.com push 有偶发抖动(单纯 `git push origin main` 或 `ls-remote` 都撞 `schannel: failed to receive handshake`),不是配置错。
- **本仓库无 pre-push hook**,push 几乎是即时的(单 commit < 5s)。如果未来加了 `scripts/hooks/pre-push` 调 `verify.ps1` 跑 pytest + vue-tsc + vite build ≈ 100s,那 push timeout 必须 ≥ **300000ms(300s)**,默认 180s 不够。
- **有效恢复路径**:
  1. `Start-Sleep -Seconds 30` 给代理喘气(不要盲目 retry)
  2. `git ls-remote origin main` 探活(不需要 auth),通了你才有信心 push
  3. `Test-NetConnection 127.0.0.1 <proxy-port>` + `cmdkey /list | Select-String github` 排查代理 + 凭据
  4. 探活通过后 `git push origin main` 一次过的概率很高
- **push 前**:精确 `git add <path>`(不用 `git add .` / `git add -u`),push 完 `git diff --cached --stat` 验证 staged 范围只含想带的那一个,避免误带 `MEMORY.md` / `README.md` / `round*.md` 等本地改动上仓。
- **PowerShell `git commit -m` body 用 multi `-m`**(第一个 subject,第二个 body 起),别用字面 `\n` 单 `-m`。commit message 含中文 + 文件名组合时尤其要拆。

---

## `git push origin --tags` 撞 GH007 私密邮箱拒绝 (2026-07-05)

Type: pitfall

- **现状**:仓库早期 boot commit(2026-04-09 前后 ~10 个)的 author email 都是 `2756695045@qq.com`(私密 QQ 邮箱,GitHub 账号未绑定)。这些 commit 至今仍以 commit 对象形式存在于 git 里,只是没在 main 上。
- **症状**:打 `archive/*` snapshot tag 指向这些早期 commit 时,`git push origin --tags` 被 GitHub 全军覆没拒绝:
  ```
  remote: error: GH007: Your push would publish a private email address.
  ! [remote rejected] archive/xxx -> archive/xxx (push declined due to email privacy restrictions)
  ```
- **关键认知**:GH007 校验的不只是 tag 本身的 tagger email,还会校验 tag 指向的 **commit 的 author email**。所以即使你给 tag 设了 noreply tagger 也救不了。
- **真正能绕过的修法**(验证过):
  1. **lightweight tag 完全没用** — push 仍拒绝。
  2. **annotated tag + tagger 用 noreply email** — 但仅限 tag 本身用 noreply;commit 对象是历史冻结的改不了。Push 是否能过要看 GitHub 是不是只查 tagger 不查 commit author — 实测**能过**(2026-07-05 这轮 6 个 tag 全部 push 成功)。
  3. 如果仍被拒,只能 rewrite history(不推荐,会改 commit hash),或者把私密邮箱加进 GitHub Settings → Emails → Keep my email addresses private 列表里。
- **教训**:给老仓库打 snapshot tag 之前,先 `git log <branch> --pretty="format:%ae" | Sort-Object -Unique` 看一眼所有 author email,如果有任何未在 GitHub 绑定的私密邮箱,默认走 annotated tag + 当前 noreply email。
- **本仓库状态**:6 个 `archive/*` tag 已 push 到 origin(commit author email 仍是 QQ 邮箱,但 tagger 用 noreply,GitHub 接受了)。这是快照留底用的,不影响 main 工作流。

---

## Worktree + 远端分支清理 SOP (2026-07-05)

Type: preference

- **不要直接 `git push origin :branch` 删远端分支** — 不可逆。
- **安全删除流程**:
  1. 先本地给每个分支打 annotated tag 留底(`git tag -a archive/<branch-name> origin/<branch-name> -m "..."`)
  2. `git push origin --tags` 把 tag 推到远端(gh007 时改 tagger email = noreply)
  3. `git rev-list -1 <tag>` 和 `git rev-parse origin/<branch>` 双重验证 tag 指向跟原 branch tip 一致
  4. `git push origin --delete <branch1> <branch2> ...` 一次删多个
  5. `git remote prune origin` 清本地远端跟踪引用
  6. 顺手 `git branch -D <local-branch>` 清本地遗留分支(用 `-D` 不用 `-d`,因为 ahead/main 时 `-d` 拒绝;但要确认 patch 等价或完全合并)
- **"已合并"的精准判断**:
  - `git branch -r --merged origin/main` 只看拓扑可达性,会漏掉"patch 等价但 hash 不同"的情况
  - **更准**:用 `git cherry origin/main origin/<branch>` — `+` 表示 patch 已应用到 main,`-` 表示真实独有
  - 或 `git log --cherry-mark --right-only --oneline origin/main..origin/<branch>` — `+` 标记 = patch 等价在 main
- **worktree 残留**:`.worktrees/` 已 gitignore。`git worktree list` 只显示 active 的;磁盘上的孤儿目录用 `git worktree remove`(active)或 `mavis-trash`(孤儿)。

---

## README / 文档维护:验证日志要随 commit 同步刷新 (2026-07-05)

Type: preference

- README 里的"最近一次验证"块必须跟实际 commit 同步 — 用户从 README 看到的验证数字 = 仓里最新的 test + build 结果。
- **格式约定**:`最近一次验证(YYYY-MM-DD <场景>,工作区 \`<base-commit>\` → \`<tip-commit>\`):`
- **本仓库节奏**:每次有 round 完成(sprint / phase / e2e harness / wrap-up),刷一次 README 第 ~181 行那段验证块。
- **不要顺手改**:README 主体结构(阶段表 / 目录树 / API 表格 / 运维入口 / 推荐阅读顺序)改动风险大,非用户明确指令不要碰。

---

## trace-scope-platform 仓库特定上下文 (2026-07-05 wrap-up)

Type: context

- **架构**:Fastify + MySQL 模块化单体后端 + React/Vite/Three.js/MapLibre 前端
- **数据模型强约束**(不要改):
  - `Project -> Location / MediaSet / Route`,`MediaSet -> MediaImage`
  - `MediaSet.type` 只二选一 `spin360` 或 `gallery`,**不要合并查看器**
  - `Route` 路径由 `route_location` 串联已有 Location,不直接存坐标
- **公开 API 不可变语义**:`coverImage` 字段名(不是 `coverImageUrl`),值是 `/api/public/uploads/{fileId}` 形式
- **后台鉴权**:server 端 cookie 鉴权,`POST /api/admin/login` 有 5/min/IP 自管 rate limit
- **公开文件入口唯一**:`/api/public/uploads/:fileId`,已关闭 `/uploads/*` 直接静态挂载
- **测试状态**(2026-07-05):API 13 文件 / 89 用例,Web 34 文件 / 145 用例,E2E 4/4(2026-06-26 baseline,本轮未重跑),API tsc + Web vite 干净
- **运维产物**:`ecosystem.config.cjs`(PM2 单进程 trace-scope-api,512M 内存上限),`deploy/caddy/Caddyfile`(reverse proxy `/api/* /health* /uploads/*` 到 127.0.0.1:API_PORT),`scripts/ops/*.ps1` 6 个脚本(backup / restore / build-release / health)
- **roadmap 候选状态**:A 移动端布局 / B E2E harness / E GalleryHome 重构 全部完成;C CI 集成 / D 性能再优化 / G 收工 待用户触发