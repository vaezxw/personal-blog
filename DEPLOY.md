# 自定义域名与 HTTPS

推荐部署在 **Cloudflare Pages**（`mohhen-blog.pages.dev`），默认已有 HTTPS，国内一般可直连。

## 绑定自己的域名（Cloudflare Pages）

1. 打开 Cloudflare 控制台 → **Workers & Pages** → `mohhen-blog`
2. **Custom domains** → 添加域名（如 `blog.example.com`）
3. 若域名也在 Cloudflare，可一键接入；否则按提示添加 `CNAME`
4. 等待 DNS 生效后自动签发 HTTPS

## 绑定自己的域名（Vercel，可选）

1. 在域名注册商进入 DNS 管理
2. 打开 Vercel 项目 → **Settings** → **Domains** → 添加域名
3. 按提示添加 `CNAME` / `A` 记录
4. 等待生效与证书签发

## 检查清单

- [ ] https://mohhen-blog.pages.dev 可打开
- [ ] `/api/posts` 返回文章列表 JSON
- [ ] `/admin` 可注册/登录并发布文章
- [ ] 文章写入后刷新仍在（D1 持久化）
