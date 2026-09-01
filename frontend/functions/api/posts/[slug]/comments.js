import { newId } from '../../_lib/crypto.js'
import { mapComment } from '../../_lib/comments.js'
import { createNotification } from '../../_lib/notifications.js'
import { optionalUser, requireUser } from '../../_lib/auth.js'
import { empty, json, readJson } from '../../_lib/response.js'
import { canViewPost, visibilityDeniedPayload } from '../../_lib/visibility.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)

  const slug = decodeURIComponent(params.slug || '')
  const post = await env.DB.prepare(
    'SELECT id, author_id, published, visibility FROM posts WHERE slug = ? AND published = 1',
  )
    .bind(slug)
    .first()
  if (!post) return json(404, { error: 'Post not found' })

  const viewer = await optionalUser(context)
  if (!(await canViewPost(env.DB, viewer, post))) {
    if (!viewer) return json(401, { ...visibilityDeniedPayload(post), error: 'Login required' })
    return json(403, visibilityDeniedPayload(post))
  }

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
    )
      .bind(post.id)
      .all()
    return json(200, (results || []).map(mapComment))
  }

  if (request.method === 'POST') {
    const auth = await requireUser(context)
    if (auth.error) return auth.error

    try {
      const body = await readJson(request)
      const content = String(body.content || '').trim()
      if (!content) return json(400, { error: 'content is required' })
      if (content.length > 2000) return json(400, { error: 'content too long' })

      const id = newId('c')
      const createdAt = new Date().toISOString()
      await env.DB.prepare(
        `INSERT INTO comments (id, post_id, user_id, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(id, post.id, auth.user.id, content, createdAt)
        .run()

      await createNotification(env.DB, {
        userId: post.author_id,
        actorId: auth.user.id,
        type: 'comment',
        postId: post.id,
        commentId: id,
      })

      const row = await env.DB.prepare(
        `SELECT c.*, u.username, u.avatar_url
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
      )
        .bind(id)
        .first()

      return json(201, mapComment(row))
    } catch (err) {
      return json(400, { error: err.message || 'Invalid JSON body' })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
