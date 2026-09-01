const seed = () => [
  {
    id: 'seed-welcome',
    title: '欢迎来到我的博客',
    slug: 'welcome',
    excerpt: '这是第一篇文章：记录想法、项目与日常学习。',
    content: `## 你好

这是我的个人博客。这里会写：

- 技术笔记与踩坑记录
- 项目复盘
- 偶尔的生活随笔

内容支持 **Markdown**。你也可以在管理页发布新文章。
`,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-vue3',
    title: '用 Vue 3 搭一个可读的博客',
    slug: 'vue3-blog-notes',
    excerpt: '前端用 Vue 3 + Vite，后端用 Express，部署到公网并不难。',
    content: `## 技术选型

前端采用 **Vue 3** 与 **Vite**，路由用 Vue Router。

后端是轻量 **Express** API，文章存在本地 JSON（可后续换成数据库）。

### 本地启动

\`\`\`bash
# 后端
cd backend && npm run dev

# 前端
cd frontend && npm run dev
\`\`\`

部署后，前端走 HTTPS 静态托管，后端单独放到可常驻进程的平台即可。
`,
    published: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

export function getStore() {
  const g = globalThis
  if (!g.__blogPosts) {
    g.__blogPosts = seed()
  }
  return g.__blogPosts
}

export function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

export function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function getToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export function requireAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || 'dev-admin-token'
  if (getToken(req) !== expected) {
    send(res, 401, { error: 'Unauthorized' })
    return false
  }
  return true
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function simpleMarkdown(md) {
  const escaped = escapeHtml(md || '')
  const withCode = escaped.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
  const lines = withCode.split(/\n/)
  const html = []
  let inList = false

  for (const line of lines) {
    if (/^### /.test(line)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h3>${line.slice(4)}</h3>`)
      continue
    }
    if (/^## /.test(line)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h2>${line.slice(3)}</h2>`)
      continue
    }
    if (/^- /.test(line)) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`)
      continue
    }
    if (inList) {
      html.push('</ul>')
      inList = false
    }
    if (!line.trim()) continue
    if (line.startsWith('<pre>')) {
      html.push(line)
      continue
    }
    html.push(`<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
  }
  if (inList) html.push('</ul>')
  return html.join('\n')
}
