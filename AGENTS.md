# Repository Guidelines

## 项目结构与模块组织

本仓库是按运行端拆分的 TypeScript 项目。`apps/web` 是 React/Vite 前端，源码在 `apps/web/src`：路由在 `app/routes`，复用组件在 `components`，业务逻辑在 `features`，API 客户端在 `services`，共享类型在 `types`，样式在 `styles`。`apps/api` 是 Fastify/MySQL 后端，源码在 `apps/api/src`：服务启动与装配在 `app`，业务模块在 `modules`，数据库、存储和安全适配在 `infrastructure`。文档在 `docs`，部署材料在 `deploy`，运维脚本在 `scripts`。

## 构建、测试与本地开发命令

- `npm --prefix apps/web run dev`：启动前端开发服务器。
- `npm --prefix apps/web test`：运行前端 Vitest 测试。
- `npm --prefix apps/web run build`：执行前端类型检查并构建。
- `npm --prefix apps/api run dev`：用 `tsx watch` 启动后端开发服务。
- `npm --prefix apps/api test`：运行后端 Vitest 测试。
- `npm --prefix apps/api run build`：编译后端 TypeScript。
- `npm --prefix apps/api run migrate`：执行数据库迁移。

默认从仓库根目录运行命令，除非任务明确要求进入子目录。

## 代码风格与命名约定

全仓库使用 TypeScript 和 ES modules。保持现有风格：JSON 使用两个空格缩进，React 组件用 PascalCase，函数和变量用 camelCase，文件名沿用所在目录的既有模式。新增逻辑应靠近对应 route、feature 或 backend module；优先复用现有 helper，不为一次性需求新增抽象。

## 测试规范

测试框架是 Vitest。前端组件测试通常使用 Testing Library 和 `*.test.tsx`，纯逻辑测试使用 `*.test.ts`。后端测试与被测模块放在相近位置，例如 `buildServer.test.ts`、`routes.test.ts`。修改 API 鉴权、上传访问、公开数据映射、路线事务等风险区域时，必须补针对性回归测试。

## 提交与 Pull Request 规范

历史提交采用简短 Conventional Commit 风格，例如 `feat: flatten gallery map layout`、`fix: protect admin api routes`、`docs: update review and roadmap status`。提交应保持单一目的，不要顺手暂存无关本地文件。PR 需要说明改了什么、为什么改、验证命令；涉及前端界面变化时附截图或录屏。

## 安全与配置注意事项

不要提交 `.env`、日志、生成的上传文件或本地照片。后台 CRUD 和上传 API 必须保留服务端 admin session 鉴权。公开文件应通过 `/api/public/uploads/:fileId` 输出，不要重新开放 `/uploads/*` 静态目录。
