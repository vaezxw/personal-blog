import { requireUser } from '../_lib/auth.js'
import { empty, json, readJson } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const now = new Date().toISOString()
  let ids = null
  try {
    const body = await readJson(request)
    if (Array.isArray(body.ids) && body.ids.length) {
      ids = body.ids.map((id) => String(id))
    }
  } catch {
    /* mark all */
  }

  if (ids?.length) {
    const placeholders = ids.map(() => '?').join(',')
    await env.DB.prepare(
      `UPDATE notifications
       SET read_at = ?
       WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
    )
      .bind(now, user.id, ...ids)
      .run()
  } else {
    await env.DB.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
    )
      .bind(now, user.id)
      .run()
  }

  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL`,
  )
    .bind(user.id)
    .first()

  return json(200, { ok: true, count: Number(row?.c || 0) })
}
