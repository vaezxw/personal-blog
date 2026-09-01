# 墨痕 · 个人博客

Vue 3 前端 + Express 后端的个人博客。支持 Markdown 文章、列表/详情页、Token 鉴权管理后台。

## 本地开发

### 1. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

默认 API：`http://localhost:3001`  
默认管理令牌：见 `.env` 里的 `ADMIN_TOKEN`（示例为 `dev-admin-token`）

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开：`http://localhost:5173`  
开发环境通过 Vite 代理把 `/api` 转到后端。

## 线上部署（外网可访问）

### 方案 A：仅 Vercel（最快上线）

`frontend/api` 内含 Serverless API，和静态前端一起部署到 Vercel 即可外网访问。

1. 将仓库推送到 GitHub（或本机直接 `npx vercel`）
2. Root Directory 选 `frontend`
3. 环境变量（可选）：`ADMIN_TOKEN=你的密钥`
4. 得到 `https://xxx.vercel.app`

> Serverless 内存会随冷启动重置，适合演示；长期写文请用方案 B。

本机一键：

```bash
cd frontend
npx vercel --prod
```

当前已部署示例地址：

- Cloudflare（国内一般可直连）：https://mohhen-blog.pages.dev
- Vercel（国内常需代理）：https://mohhen-blog.vercel.app
- https://frontend-tau-ten-irvfp6w6t4.vercel.app

管理页 `/admin`，令牌默认可用 `dev-admin-token`（上线后请在平台环境变量改成 `ADMIN_TOKEN`）。

### 方案 A2：Cloudflare Pages（国内更易访问）

`frontend/functions` 为 Cloudflare Pages Functions，与静态前端一起部署：

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=mohhen-blog
```

生产地址：`https://mohhen-blog.pages.dev`

### 方案 B：前端 Vercel + 后端 Render（持久化）

1. 前端：Vercel，Root = `frontend`，设置 `VITE_API_BASE=https://your-api.onrender.com`
2. 后端：[Render](https://render.com) Web Service，Root = `backend`
   - Build: `npm install` / Start: `npm start`
   - `ADMIN_TOKEN`、`CORS_ORIGIN=https://你的前端域名`

> 后端文章存 JSON。Render 免费实例重启可能丢数据；正式环境建议换数据库。

### 自定义域名（可选）

见 [DEPLOY.md](./DEPLOY.md)。

## 管理后台

访问 `/admin`，填入与后端 `ADMIN_TOKEN` 相同的令牌，即可发布/编辑/删除文章。
