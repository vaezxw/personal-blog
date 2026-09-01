import { requireUser } from '../_lib/auth.js'
import { getUserStats } from '../_lib/stats.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const stats = await getUserStats(env.DB, auth.user.id)
  return json(200, stats)
}
