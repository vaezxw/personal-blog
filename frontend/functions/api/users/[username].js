import { mapPost, optionalUser } from '../_lib/auth.js'
import {
  getFollowCounts,
  isFollowing,
  isMutualFollow,
  mapPublicUser,
} from '../_lib/follows.js'
import { enrichPosts } from '../_lib/stats.js'
import { empty, json } from '../_lib/response.js'
import { publishedVisibilitySql } from '../_lib/visibility.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const username = decodeURIComponent(params.username || '').trim()
  if (!username) return json(400, { error: 'username required' })

  const row = await env.DB.prepare(
    `SELECT id, username, role, created_at, avatar_url FROM users WHERE username = ? COLLATE NOCASE`,
  )
    .bind(username)
    .first()

  if (!row) return json(404, { error: 'User not found' })

  const viewer = await optionalUser(context)
  const counts = await getFollowCounts(env.DB, row.id)
  const following = viewer?.id ? await isFollowing(env.DB, viewer.id, row.id) : false
  const mutual = viewer?.id ? await isMutualFollow(env.DB, viewer.id, row.id) : false
  const isSelf = viewer?.id === row.id

  let posts = []
  let postCount = 0

  if (isSelf) {
    const postCountRow = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM posts WHERE author_id = ? AND published = 1`,
    )
      .bind(row.id)
      .first()
    postCount = Number(postCountRow?.c || 0)

    const { results } = await env.DB.prepare(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? AND p.published = 1
       ORDER BY p.created_at DESC
       LIMIT 50`,
    )
      .bind(row.id)
      .all()
    posts = await enrichPosts(env.DB, (results || []).map(mapPost), {
      userId: viewer.id,
    })
  } else {
    const vis = publishedVisibilitySql(viewer?.id || null)
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS c
       FROM posts p
       WHERE p.author_id = ? AND ${vis.sql}`,
    )
      .bind(row.id, ...vis.binds)
      .first()
    postCount = Number(countRow?.c || 0)

    const { results } = await env.DB.prepare(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? AND ${vis.sql}
       ORDER BY p.created_at DESC
       LIMIT 50`,
    )
      .bind(row.id, ...vis.binds)
      .all()
    posts = await enrichPosts(env.DB, (results || []).map(mapPost), {
      userId: viewer?.id || null,
    })
  }

  return json(200, {
    user: mapPublicUser(row, {
      ...counts,
      following,
      mutual,
      isSelf,
      postCount,
    }),
    posts,
  })
}
