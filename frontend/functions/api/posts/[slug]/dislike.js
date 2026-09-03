import { mapPost, requireUser } from '../../_lib/auth.js'
import { enrichPosts } from '../../_lib/stats.js'
import { empty, json } from '../../_lib/response.js'
import { canViewPost, visibilityDeniedPayload } from '../../_lib/visibility.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const slug = decodeURIComponent(params.slug || '')
  const post = await env.DB.prepare(
    'SELECT id, author_id, published, visibility, like_count, dislike_count FROM posts WHERE slug = ?',
  )
    .bind(slug)
    .first()

  if (!post || !post.published) return json(404, { error: 'Post not found' })
  if (!(await canViewPost(env.DB, user, post))) {
    return json(403, visibilityDeniedPayload(post))
  }

  const existing = await env.DB.prepare(
    'SELECT user_id FROM post_dislikes WHERE user_id = ? AND post_id = ?',
  )
    .bind(user.id, post.id)
    .first()

  const now = new Date().toISOString()
  let disliked = false

  if (existing) {
    await env.DB.prepare('DELETE FROM post_dislikes WHERE user_id = ? AND post_id = ?')
      .bind(user.id, post.id)
      .run()
    await env.DB.prepare(
      'UPDATE posts SET dislike_count = CASE WHEN dislike_count > 0 THEN dislike_count - 1 ELSE 0 END WHERE id = ?',
    )
      .bind(post.id)
      .run()
    disliked = false
  } else {
    // Mutual exclusion: remove like if present
    const liked = await env.DB.prepare(
      'SELECT user_id FROM post_likes WHERE user_id = ? AND post_id = ?',
    )
      .bind(user.id, post.id)
      .first()
    if (liked) {
      await env.DB.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?')
        .bind(user.id, post.id)
        .run()
      await env.DB.prepare(
        'UPDATE posts SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ?',
      )
        .bind(post.id)
        .run()
    }

    await env.DB.prepare(
      'INSERT INTO post_dislikes (user_id, post_id, created_at) VALUES (?, ?, ?)',
    )
      .bind(user.id, post.id, now)
      .run()
    await env.DB.prepare(
      'UPDATE posts SET dislike_count = COALESCE(dislike_count, 0) + 1 WHERE id = ?',
    )
      .bind(post.id)
      .run()
    disliked = true
  }

  const row = await env.DB.prepare(
    `SELECT p.*, u.username AS author_username,
    u.avatar_url AS author_avatar_url
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.id = ?`,
  )
    .bind(post.id)
    .first()

  const [enriched] = await enrichPosts(env.DB, [mapPost(row)], { userId: user.id })
  return json(200, {
    disliked,
    dislikeCount: enriched.dislikeCount,
    likeCount: enriched.likeCount,
    likedByMe: enriched.likedByMe,
    dislikedByMe: enriched.dislikedByMe,
    viewCount: enriched.viewCount,
    clickCount: enriched.clickCount,
    commentCount: enriched.commentCount,
    heat: enriched.heat,
  })
}
