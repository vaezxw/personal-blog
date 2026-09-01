import { requireUser } from '../../_lib/auth.js'
import { getFollowCounts, isFollowing, isMutualFollow } from '../../_lib/follows.js'
import { createNotification } from '../../_lib/notifications.js'
import { empty, json } from '../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const username = decodeURIComponent(params.username || '').trim()
  if (!username) return json(400, { error: 'username required' })

  const target = await env.DB.prepare(
    `SELECT id, username FROM users WHERE username = ? COLLATE NOCASE`,
  )
    .bind(username)
    .first()

  if (!target) return json(404, { error: 'User not found' })
  if (target.id === user.id) return json(400, { error: 'Cannot follow yourself' })

  const already = await isFollowing(env.DB, user.id, target.id)
  const now = new Date().toISOString()

  if (already) {
    await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(user.id, target.id)
      .run()
  } else {
    await env.DB.prepare(
      `INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)`,
    )
      .bind(user.id, target.id, now)
      .run()
    await createNotification(env.DB, {
      userId: target.id,
      actorId: user.id,
      type: 'follow',
      postId: null,
    })
  }

  const counts = await getFollowCounts(env.DB, target.id)
  const following = !already
  const mutual = following ? await isMutualFollow(env.DB, user.id, target.id) : false

  return json(200, {
    following,
    mutual,
    ...counts,
  })
}
