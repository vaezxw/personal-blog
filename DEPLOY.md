# 自定义域名与 HTTPS

前端部署在 Vercel 后，默认已有 HTTPS 的 `*.vercel.app` 地址，外网可直接访问。

## 绑定自己的域名

1. 在域名注册商（阿里云 / Cloudflare / Namecheap 等）进入 DNS 管理
2. 打开 Vercel 项目 → **Settings** → **Domains** → 添加域名（如 `blog.example.com`）
3. 按 Vercel 提示添加 DNS 记录，常见两种：
   - 子域名：`CNAME` → `cname.vercel-dns.com`
   - 根域名：按控制台提示添加 `A` 记录
4. 等待 DNS 生效（通常几分钟到几小时），Vercel 会自动签发 HTTPS 证书

## 后端域名（可选）

若后端在 Render：

1. Render 服务 → **Settings** → **Custom Domains**
2. 添加如 `api.example.com`
3. 按提示配置 `CNAME`
4. 更新前端环境变量 `VITE_API_BASE=https://api.example.com` 并重新部署前端
5. 同时更新后端 `CORS_ORIGIN` 为前端正式域名

## 检查清单

- [ ] 前端 HTTPS 可打开
- [ ] `/api/health`（后端）返回 `{ "ok": true }`
- [ ] 浏览器打开博客首页能拉到文章列表
- [ ] `/admin` 使用 `ADMIN_TOKEN` 可登录发布
