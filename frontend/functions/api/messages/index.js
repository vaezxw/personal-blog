import { requireUser } from '../_lib/auth.js'
import { mapConversation } from '../_lib/messages.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const { results } = await env.DB.prepare(
    `SELECT c.id,
            c.last_message_at,
            c.last_message_preview,
            CASE WHEN c.user_low_id = ? THEN c.user_high_id ELSE c.user_low_id END AS peer_id,
            CASE WHEN c.user_low_id = ? THEN uh.username ELSE ul.username END AS peer_username,
            CASE WHEN c.user_low_id = ? THEN uh.avatar_url ELSE ul.avatar_url END AS peer_avatar_url,
            (
              SELECT COUNT(*) FROM messages m
              WHERE m.conversation_id = c.id
                AND m.sender_id != ?
                AND m.read_at IS NULL
            ) AS unread_count
     FROM conversations c
     JOIN users ul ON ul.id = c.user_low_id
     JOIN users uh ON uh.id = c.user_high_id
     WHERE (c.user_low_id = ? OR c.user_high_id = ?)
       AND c.last_message_at IS NOT NULL
     ORDER BY c.last_message_at DESC
     LIMIT 100`,
  )
    .bind(user.id, user.id, user.id, user.id, user.id, user.id)
    .all()

  return json(200, (results || []).map(mapConversation))
}
