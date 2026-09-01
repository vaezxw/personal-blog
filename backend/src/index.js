import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { marked } from 'marked'
import {
  listPosts,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
} from './store.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-admin-token'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
  }),
)
app.use(express.json({ limit: '1mb' }))

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/posts', (req, res) => {
  const includeDrafts = req.query.all === '1'
  if (includeDrafts) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
  res.json(listPosts({ includeDrafts }))
})

app.get('/api/posts/:slug', (req, res) => {
  const includeDrafts = req.query.preview === '1'
  if (includeDrafts) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
  const post = getPostBySlug(req.params.slug, { includeDrafts })
  if (!post) {
    return res.status(404).json({ error: 'Post not found' })
  }
  res.json({
    ...post,
    html: marked.parse(post.content || ''),
  })
})

app.post('/api/posts', requireAdmin, (req, res) => {
  try {
    const { title, slug, excerpt, content, published } = req.body || {}
    if (!title || !slug) {
      return res.status(400).json({ error: 'title and slug are required' })
    }
    const post = createPost({ title, slug, excerpt, content, published })
    res.status(201).json(post)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Server error' })
  }
})

app.put('/api/posts/:id', requireAdmin, (req, res) => {
  try {
    const post = updatePost(req.params.id, req.body || {})
    res.json(post)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Server error' })
  }
})

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  try {
    deletePost(req.params.id)
    res.status(204).end()
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Server error' })
  }
})

app.listen(PORT, () => {
  console.log(`Blog API listening on http://localhost:${PORT}`)
})
