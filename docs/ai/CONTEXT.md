# CONTEXT (Single Source of Truth)

## Production Access
- Domain: https://oa.donaldzhu.com
- Nginx: reverse proxy
- JeecgBoot base path: /jeecg-boot/
- Health endpoint: /jeecg-boot/sys/randomImage/123 (expect 200)

## Server
- OS: Ubuntu 24.04
- Public IPv4: 172.104.180.96
- Public IPv6: 2400:8901::2000:f6ff:fe15:8c77

## Ports / Services
- Nginx: 80/443
- Backend: 127.0.0.1:8080
- MySQL container: tritium-mysql (host port 13306)
- Redis container: tritium-redis

## Database (important)
- Schema: tritium
- Quartz prefix: QRTZ_ (uppercase)
- lower_case_table_names=0 (case-sensitive)

## Forbidden (never commit)
- *.key/*.crt/.env/application-prod*.yml
- Any real secrets/passwords/tokens

## Required Process (for AI or human)
- Before changes: run ops/preflight.sh and it must pass
- After changes: run ops/verify.sh and it must pass
- Record changes in docs/ai/CHANGELOG.md

# AI 改动 Gate Checklist（强制）

> 目标：任何 UI/路由/构建/资源路径/后端静态资源相关改动，必须先通过 Gate，再允许提交。
> 适用：Vue/React SPA、Knife4j-Vue、Spring Boot 静态资源(webjars)、以及“同窗/同布局”这类改动。

---

## 0. 提交前硬规则（Hard Rules）
- **不允许**在 Gate 未通过的情况下提交（commit / push / PR）。
- Gate 失败：必须修复到通过；如果需要降级方案，必须先给出“最小可回滚 patch”。
- 任何“看起来像能跑”的改动都不算完成：以 Gate 结果为准。

---

## 1. Gate（必须全部通过）
### 1.1 前端 Gate（命令按项目实际选一种）
- 依赖安装：`pnpm i` / `npm ci` / `yarn install --frozen-lockfile`
- Lint：`pnpm lint` / `npm run lint`
- Typecheck（如有）：`pnpm typecheck` / `npm run typecheck`
- Unit test（如有）：`pnpm test` / `npm test`
- Build：`pnpm build` / `npm run build`

### 1.2 后端 Gate（Spring Boot/Java 项目选一种）
- `mvn -q -DskipTests=false test` + `mvn -q package`
或
- `./gradlew test` + `./gradlew build`

### 1.3 E2E / 回归 Gate（必须覆盖关键路径）
- “应用列表页”必须能正常渲染出表头、分页、筛选（如有）。
- “新增记录”必须可点击、可提交、提交后列表刷新可见。
- “在同一窗口运行/保持 UI 布局一致”的相关路径必须覆盖（至少 1 次完整流程）。

---

## 2. Knife4j-Vue / SPA 资源路径 Gate（重点：避免空白页）
> 任何出现 `<div id="app"></div>` 且页面空白的情况，优先检查这块。

### 2.1 浏览器网络检查（必须做）
- 打开 DevTools → Network → 勾选 Disable cache → 刷新
- 下面资源必须 **HTTP 200**（或等价主 bundle）：
  - `.../webjars/js/chunk-vendors.*.js`
  - `.../webjars/js/app.*.js`
- **严禁**出现 404/500/blocked/mime-type 错误（出现即 Gate 失败）。

### 2.2 相对路径陷阱（必须规避）
- 如果入口页里资源是相对路径（例如 `webjars/js/app.*.js` 没有以 `/` 开头），当页面在子路径访问时会拼错 URL → 404 → 白屏。
- 解决策略（至少选一种并验证）：
  1) 前端设置正确 `publicPath/base`，确保部署在子路径下资源仍正确；
  2) 后端统一以绝对路径提供静态资源；
  3) 反向代理/网关保证访问路径与前端 base 一致。

### 2.3 后端静态资源映射（Spring Boot）
- 确认 webjars 静态资源可被访问（例如 `/webjars/**` 能命中资源）。
- 若引入了网关路径前缀（如 `/api`、`/x`），必须验证资源路径是否需要同步前缀。

---

## 3. 变更安全网（防止“改布局把列表搞坏”）
- 每次改 UI 布局/路由/容器（iframe、同窗、多标签变单页）：
  - 必须保留一个“可回滚点”（tag/branch/commit）；
  - 必须写明：改动点、影响面、回归点（列表/新增/编辑/删除/权限）。

---

## 4. 输出要求（给人看的结论）
提交信息/PR 描述必须包含：
- Gate 通过截图或日志片段（至少：build + test）
- 回归点执行结果（列表 + 新增）
- 若涉及 Knife4j-Vue：Network 关键资源 200 的证明（URL + Status）

---

## 5. 失败处理（固定流程）
- Gate 失败：先定位失败类别（Lint / Test / Build / 资源 404 / 运行时异常）。
- 优先最小修复；如果超出范围，直接回滚到最后通过 Gate 的提交，再逐步引入改动。