# 墨痕 · 个人博客

Vue 3 前端 + Cloudflare Pages Functions API + **D1** 数据库。支持 Markdown 文章、多用户注册/登录、按作者权限管理。

生产地址（国内一般可直连）：https://mohhen-blog.pages.dev

## 功能概览

- 公开浏览已发布文章
- `/admin` 注册 / 登录（**httpOnly Cookie + 刷新令牌**）
- 文章详情页 **评论**（登录后可发，作者/管理员可删）
- **首位注册用户**为 `admin`，之后为 `author`
- `admin` 可管理全部文章；`author` 只能管理自己的文章
- 文章持久化在 Cloudflare D1（免费额度）

## 鉴权说明

- 登录后 `access_token`（15 分钟）与 `refresh_token`（30 天）写入 **httpOnly Cookie**
- 前端请求带 `credentials: 'include'`，401 时自动调用 `/api/auth/refresh`
- 退出调用 `/api/auth/logout` 并清除 Cookie

## 图片（可选 R2）

当前 **未启用 R2**。正文里可直接用 Markdown 外链：

```markdown
![说明](https://example.com/photo.jpg)
```

以后若要本地上传，再在 Cloudflare 启用 R2 并配置 `wrangler.toml` 中的 `[[r2_buckets]]`。

## 本地开发

线上以 **Cloudflare Pages + D1** 为准。本地也推荐用同样方式跑，才能测登录、发文章等完整功能。

### 方式 A：完整本地环境（推荐）

前端 + API + 本地 D1 数据库，与线上一致。

```powershell
cd frontend

# 1. 安装依赖
npm install

# 2. 首次：初始化本地 D1（只需执行一次）
npx wrangler d1 execute mohhen-blog-db --local --file=./migrations/0001_init.sql

# 3. 构建前端
npm run build

# 4. 启动本地 Pages + Functions + D1
npx wrangler pages dev dist
```

终端会输出本地地址，一般为 **http://localhost:8788**：

- 首页：http://localhost:8788
- 管理页：http://localhost:8788/admin

**说明：**

- 本地库与线上 **不共用**；本地是空库，需先在 `/admin` **注册**（首位用户为 admin）
- 修改 `frontend/functions` 或前端代码后，需重新 `npm run build`，再重启 `pages dev`
- 未登录 Cloudflare 时先执行：`npx wrangler login`
- 本地 JWT 使用代码内默认值；线上需在 Pages 配置 `JWT_SECRET` 密钥

### 方式 B：仅前端热更新（改 UI 时用）

```powershell
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173

**注意：** Vite 当前把 `/api` 代理到 `localhost:3001`（旧 Express 后端），**不会**连到 D1 API。适合改样式/页面，**不能**测登录、发文章。完整功能请用方式 A。

### 查本地数据库

```powershell
cd frontend

# 查看用户
npx wrangler d1 execute mohhen-blog-db --local --command "SELECT id, email, username, role FROM users"

# 查看文章
npx wrangler d1 execute mohhen-blog-db --local --command "SELECT id, title, slug, published FROM posts"
```

也可在 Cloudflare 控制台查看 **线上** 库：Workers & Pages → **D1 SQL Database** → `mohhen-blog-db` → **Tables** / **Console**。

### AI 对话配置

站点内的 `/chat` 支持登录用户接入自己的 OpenAI 兼容模型 API。模型配置和聊天历史保存在 D1，API Key 使用 Pages Secret 加密后保存，前端不会回显明文 Key。

首次启用 AI 配置时，需要设置加密密钥（不要提交到仓库）：

```powershell
npx wrangler pages secret put AI_CONFIG_ENCRYPTION_KEY --project-name=mohhen-blog
```

可选地设置单用户每日请求上限：

```powershell
npx wrangler pages secret put AI_MAX_REQUESTS_PER_DAY --project-name=mohhen-blog
```

模型 API 必须是公网 HTTPS 的 OpenAI-compatible `/chat/completions` 接口。用户自己的 Ollama / LM Studio localhost 地址无法从 Cloudflare Pages Functions 访问。

### 旧版 Express 后端（可选，一般不用）

仓库保留 `backend/`，为 Token + JSON 文件方案，**线上已不用**。

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

另开终端运行 `frontend` 的 `npm run dev`，可体验旧版 API（默认 http://localhost:3001，管理令牌见 `.env` 的 `ADMIN_TOKEN`）。

## 部署到 Cloudflare Pages

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=mohhen-blog
```

配置：

1. D1：`mohhen-blog-db`（已在 `wrangler.toml` 绑定为 `DB`）
2. 迁移：`npx wrangler d1 execute mohhen-blog-db --remote --file=./migrations/0001_init.sql`
3. 密钥（务必改掉默认值）：

```bash
npx wrangler pages secret put JWT_SECRET --project-name=mohhen-blog
```

## 其它方案（可选）

### Vercel 演示

`frontend/api` 仍为内存 Serverless，**无账号、无持久化**，国内访问常需代理。Root Directory 选 `frontend`。

### Express + Render

见 [backend/](./backend/)，适合独立 Node 服务；本仓库线上以 Cloudflare 为准。

### 自定义域名

见 [DEPLOY.md](./DEPLOY.md)。

## 管理后台

访问 `/admin` → 注册或登录 → 发布 / 编辑 / 删除文章。
