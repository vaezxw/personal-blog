import { requireUser } from '../_lib/auth.js'
import { mapNotification } from '../_lib/notifications.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT n.*,
              a.username AS actor_username,
              p.title AS post_title,
              p.slug AS post_slug,
              c.content AS comment_preview
       FROM notifications n
       JOIN users a ON a.id = n.actor_id
       LEFT JOIN posts p ON p.id = n.post_id
       LEFT JOIN comments c ON c.id = n.comment_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
    )
      .bind(user.id)
      .all()

    return json(200, (results || []).map(mapNotification))
  }

  return json(405, { error: 'Method not allowed' })
}
