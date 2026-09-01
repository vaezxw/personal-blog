import { canManagePost, mapPost, requireUser, simpleMarkdown } from '../_lib/auth.js'
import { corsHeaders, empty, json, readJson } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)

  const param = decodeURIComponent(params.slug || '')
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('preview') === '1'
    let user = null
    if (includeDrafts) {
      const auth = await requireUser(context)
      if (auth.error) return auth.error
      user = auth.user
    }

    const row = await env.DB.prepare(
      `SELECT p.*, u.username AS author_username
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.slug = ?`,
    )
      .bind(param)
      .first()

    if (!row) return json(404, { error: 'Post not found' })
    if (!row.published) {
      if (!user || !canManagePost(user, row)) {
        return json(404, { error: 'Post not found' })
      }
    }

    const post = mapPost(row)
    return json(200, {
      ...post,
      html: simpleMarkdown(post.content),
    })
  }

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(param).first()
  if (!row) return json(404, { error: 'Post not found' })
  if (!canManagePost(user, row)) return json(403, { error: 'Forbidden' })

  if (request.method === 'PUT') {
    try {
      const body = await readJson(request)
      if (body.slug) {
        const conflict = await env.DB.prepare(
          'SELECT id FROM posts WHERE slug = ? AND id != ?',
        )
          .bind(String(body.slug).trim(), param)
          .first()
        if (conflict) return json(409, { error: 'Slug already exists' })
      }

      const title = body.title !== undefined ? String(body.title).trim() : row.title
      const slug = body.slug !== undefined ? String(body.slug).trim() : row.slug
      const excerpt = body.excerpt !== undefined ? String(body.excerpt).trim() : row.excerpt
      const content = body.content !== undefined ? body.content : row.content
      const published =
        body.published !== undefined ? (body.published ? 1 : 0) : row.published
      const updatedAt = new Date().toISOString()

      await env.DB.prepare(
        `UPDATE posts
         SET title = ?, slug = ?, excerpt = ?, content = ?, published = ?, updated_at = ?
         WHERE id = ?`,
      )
        .bind(title, slug, excerpt, content, published, updatedAt, param)
        .run()

      const updated = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.id = ?`,
      )
        .bind(param)
        .first()

      return json(200, mapPost(updated))
    } catch (err) {
      return json(400, { error: err.message || 'Invalid JSON body' })
    }
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(param).run()
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  return json(405, { error: 'Method not allowed' })
}
