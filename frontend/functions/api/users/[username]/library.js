import { mapPost, optionalUser } from '../../_lib/auth.js'
import { mapPublicUser } from '../../_lib/follows.js'
import { enrichPosts } from '../../_lib/stats.js'
import { empty, json } from '../../_lib/response.js'
import { publishedVisibilitySql } from '../../_lib/visibility.js'

async function loadSavedPosts(db, { userId, table, viewerId, isSelf }) {
  const vis = isSelf
    ? { sql: 'p.published = 1', binds: [] }
    : publishedVisibilitySql(viewerId || null)

  const { results } = await db
    .prepare(
      `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar_url,
              s.created_at AS saved_at
       FROM ${table} s
       JOIN posts p ON p.id = s.post_id
       JOIN users u ON u.id = p.author_id
       WHERE s.user_id = ? AND ${vis.sql}
       ORDER BY s.created_at DESC
       LIMIT 100`,
    )
    .bind(userId, ...vis.binds)
    .all()

  const posts = await enrichPosts(db, (results || []).map(mapPost), { userId: viewerId || null })
  return posts.map((p, i) => ({
    ...p,
    savedAt: results[i]?.saved_at || null,
  }))
}

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
  const isSelf = viewer?.id === row.id
  const tab = String(new URL(request.url).searchParams.get('tab') || 'all').toLowerCase()

  const likes =
    tab === 'favorites'
      ? []
      : await loadSavedPosts(env.DB, {
          userId: row.id,
          table: 'post_likes',
          viewerId: viewer?.id || null,
          isSelf,
        })

  const favorites =
    tab === 'likes'
      ? []
      : await loadSavedPosts(env.DB, {
          userId: row.id,
          table: 'post_favorites',
          viewerId: viewer?.id || null,
          isSelf,
        })

  return json(200, {
    user: mapPublicUser(row, { isSelf }),
    likes,
    favorites,
    counts: {
      likes: likes.length,
      favorites: favorites.length,
    },
  })
}
