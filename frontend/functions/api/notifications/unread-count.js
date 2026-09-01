import { requireUser } from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`,
  )
    .bind(auth.user.id)
    .first()

  return json(200, { count: Number(row?.c || 0) })
}
