import { requireUser } from '../_lib/auth.js'
import { isMutualFollow, mapPublicUser } from '../_lib/follows.js'
import { empty, json } from '../_lib/response.js'

/** Mutual-follow friends of the current user */
export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const { results } = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.created_at, u.avatar_url
     FROM follows f1
     JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
     JOIN users u ON u.id = f1.following_id
     WHERE f1.follower_id = ?
     ORDER BY u.username COLLATE NOCASE ASC`,
  )
    .bind(user.id)
    .all()

  const friends = (results || []).map((row) => mapPublicUser(row, { isFriend: true }))
  // sanity: ensure mutual (already by join)
  void isMutualFollow
  return json(200, friends)
}
