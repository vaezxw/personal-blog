import { mapPost, requireUser } from './_lib/auth.js'
import { newId } from './_lib/crypto.js'
import { empty, json, readJson } from './_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)

  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('all') === '1'

    if (!includeDrafts) {
      const { results } = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.published = 1
         ORDER BY p.created_at DESC`,
      ).all()
      return json(200, (results || []).map(mapPost))
    }

    const auth = await requireUser(context)
    if (auth.error) return auth.error
    const { user } = auth

    let stmt
    if (user.role === 'admin') {
      stmt = env.DB.prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         JOIN users u ON u.id = p.author_id
         ORDER BY p.created_at DESC`,
      )
    } else {
      stmt = env.DB.prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.author_id = ?
         ORDER BY p.created_at DESC`,
      ).bind(user.id)
    }
    const { results } = await stmt.all()
    return json(200, (results || []).map(mapPost))
  }

  if (request.method === 'POST') {
    const auth = await requireUser(context)
    if (auth.error) return auth.error
    const { user } = auth

    try {
      const body = await readJson(request)
      if (!body.title || !body.slug) {
        return json(400, { error: 'title and slug are required' })
      }

      const slug = String(body.slug).trim()
      const existing = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first()
      if (existing) return json(409, { error: 'Slug already exists' })

      const now = new Date().toISOString()
      const id = newId('p')
      const title = String(body.title).trim()
      const excerpt = String(body.excerpt || '').trim()
      const content = body.content || ''
      const published = body.published ? 1 : 0

      await env.DB.prepare(
        `INSERT INTO posts (id, title, slug, excerpt, content, published, author_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, title, slug, excerpt, content, published, user.id, now, now)
        .run()

      const row = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.id = ?`,
      )
        .bind(id)
        .first()

      return json(201, mapPost(row))
    } catch (err) {
      return json(400, { error: err.message || 'Invalid JSON body' })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
