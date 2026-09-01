import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const dataFile = path.join(dataDir, 'posts.json')

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(dataFile)) {
    const seed = [
      {
        id: uuid(),
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
        id: uuid(),
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
    fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), 'utf8')
  }
}

function readPosts() {
  ensureStore()
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
}

function writePosts(posts) {
  ensureStore()
  fs.writeFileSync(dataFile, JSON.stringify(posts, null, 2), 'utf8')
}

export function listPosts({ includeDrafts = false } = {}) {
  const posts = readPosts()
  const filtered = includeDrafts ? posts : posts.filter((p) => p.published)
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getPostBySlug(slug, { includeDrafts = false } = {}) {
  return listPosts({ includeDrafts }).find((p) => p.slug === slug) || null
}

export function createPost(input) {
  const posts = readPosts()
  const now = new Date().toISOString()
  const post = {
    id: uuid(),
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: (input.excerpt || '').trim(),
    content: input.content || '',
    published: Boolean(input.published),
    createdAt: now,
    updatedAt: now,
  }
  if (posts.some((p) => p.slug === post.slug)) {
    const err = new Error('Slug already exists')
    err.status = 409
    throw err
  }
  posts.push(post)
  writePosts(posts)
  return post
}

export function updatePost(id, input) {
  const posts = readPosts()
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) {
    const err = new Error('Post not found')
    err.status = 404
    throw err
  }
  if (input.slug && posts.some((p) => p.slug === input.slug && p.id !== id)) {
    const err = new Error('Slug already exists')
    err.status = 409
    throw err
  }
  const current = posts[index]
  posts[index] = {
    ...current,
    title: input.title?.trim() ?? current.title,
    slug: input.slug?.trim() ?? current.slug,
    excerpt: input.excerpt !== undefined ? String(input.excerpt).trim() : current.excerpt,
    content: input.content !== undefined ? input.content : current.content,
    published: input.published !== undefined ? Boolean(input.published) : current.published,
    updatedAt: new Date().toISOString(),
  }
  writePosts(posts)
  return posts[index]
}

export function deletePost(id) {
  const posts = readPosts()
  const next = posts.filter((p) => p.id !== id)
  if (next.length === posts.length) {
    const err = new Error('Post not found')
    err.status = 404
    throw err
  }
  writePosts(next)
}
