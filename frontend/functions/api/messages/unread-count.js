import { requireUser } from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.user_low_id = ? OR c.user_high_id = ?)
       AND m.sender_id != ?
       AND m.read_at IS NULL`,
  )
    .bind(user.id, user.id, user.id)
    .first()

  return json(200, { count: Number(row?.c || 0) })
}
