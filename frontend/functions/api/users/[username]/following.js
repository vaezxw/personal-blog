import { optionalUser } from '../../_lib/auth.js'
import { isFollowing, mapPublicUser } from '../../_lib/follows.js'
import { empty, json } from '../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const username = decodeURIComponent(params.username || '').trim()
  const target = await env.DB.prepare(
    `SELECT id FROM users WHERE username = ? COLLATE NOCASE`,
  )
    .bind(username)
    .first()
  if (!target) return json(404, { error: 'User not found' })

  const viewer = await optionalUser(context)
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.created_at, u.avatar_url, f.created_at AS followed_at
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC
     LIMIT 100`,
  )
    .bind(target.id)
    .all()

  const users = []
  for (const row of results || []) {
    const following = viewer?.id ? await isFollowing(env.DB, viewer.id, row.id) : false
    users.push(
      mapPublicUser(row, {
        followedAt: row.followed_at,
        following,
        isSelf: viewer?.id === row.id,
      }),
    )
  }

  return json(200, users)
}
