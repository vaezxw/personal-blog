const {
  getStore,
  send,
  readBody,
  requireAdmin,
} = require('./_store.js')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return send(res, 204, '')
  }

  const posts = getStore(req)

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost')
    const includeDrafts = url.searchParams.get('all') === '1'
    if (includeDrafts && !requireAdmin(req, res)) return
    const list = (includeDrafts ? posts : posts.filter((p) => p.published)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    return send(res, 200, list)
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readBody(req)
      if (!body.title || !body.slug) {
        return send(res, 400, { error: 'title and slug are required' })
      }
      if (posts.some((p) => p.slug === body.slug)) {
        return send(res, 409, { error: 'Slug already exists' })
      }
      const now = new Date().toISOString()
      const post = {
        id: `p_${Date.now()}`,
        title: String(body.title).trim(),
        slug: String(body.slug).trim(),
        excerpt: String(body.excerpt || '').trim(),
        content: body.content || '',
        published: Boolean(body.published),
        createdAt: now,
        updatedAt: now,
      }
      posts.push(post)
      return send(res, 201, post)
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' })
    }
  }

  return send(res, 405, { error: 'Method not allowed' })
}
