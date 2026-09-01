import {
  getStore,
  send,
  readBody,
  requireAdmin,
  simpleMarkdown,
} from '../_store.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return send(res, 204, '')
  }

  const url = new URL(req.url, 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const param = decodeURIComponent(parts[parts.length - 1] || '')
  const posts = getStore()

  if (req.method === 'GET') {
    const includeDrafts = url.searchParams.get('preview') === '1'
    if (includeDrafts && !requireAdmin(req, res)) return
    const post = posts.find((p) => p.slug === param && (includeDrafts || p.published))
    if (!post) {
      return send(res, 404, { error: 'Post not found' })
    }
    return send(res, 200, {
      ...post,
      html: simpleMarkdown(post.content),
    })
  }

  if (!requireAdmin(req, res)) return

  const index = posts.findIndex((p) => p.id === param)
  if (index === -1) {
    return send(res, 404, { error: 'Post not found' })
  }

  if (req.method === 'PUT') {
    try {
      const body = await readBody(req)
      if (body.slug && posts.some((p) => p.slug === body.slug && p.id !== param)) {
        return send(res, 409, { error: 'Slug already exists' })
      }
      const current = posts[index]
      posts[index] = {
        ...current,
        title: body.title !== undefined ? String(body.title).trim() : current.title,
        slug: body.slug !== undefined ? String(body.slug).trim() : current.slug,
        excerpt: body.excerpt !== undefined ? String(body.excerpt).trim() : current.excerpt,
        content: body.content !== undefined ? body.content : current.content,
        published: body.published !== undefined ? Boolean(body.published) : current.published,
        updatedAt: new Date().toISOString(),
      }
      return send(res, 200, posts[index])
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' })
    }
  }

  if (req.method === 'DELETE') {
    posts.splice(index, 1)
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.end()
  }

  return send(res, 405, { error: 'Method not allowed' })
}
