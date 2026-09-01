import {
  getStore,
  json,
  empty,
  readJson,
  requireAdmin,
} from './_store.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return empty(204)
  }

  const posts = getStore()
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('all') === '1'
    if (includeDrafts && !requireAdmin(request, env)) {
      return json(401, { error: 'Unauthorized' })
    }
    const list = (includeDrafts ? posts : posts.filter((p) => p.published)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    return json(200, list)
  }

  if (request.method === 'POST') {
    if (!requireAdmin(request, env)) {
      return json(401, { error: 'Unauthorized' })
    }
    try {
      const body = await readJson(request)
      if (!body.title || !body.slug) {
        return json(400, { error: 'title and slug are required' })
      }
      if (posts.some((p) => p.slug === body.slug)) {
        return json(409, { error: 'Slug already exists' })
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
      return json(201, post)
    } catch {
      return json(400, { error: 'Invalid JSON body' })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
