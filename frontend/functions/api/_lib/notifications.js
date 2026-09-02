import { newId } from './crypto.js'

export function heatScore({ viewCount = 0, likeCount = 0, commentCount = 0, favoriteCount = 0 }) {
  return (
    Number(viewCount) +
    Number(likeCount) * 5 +
    Number(commentCount) * 3 +
    Number(favoriteCount) * 4
  )
}

export async function createNotification(db, { userId, actorId, type, postId = null, commentId = null }) {
  if (!userId || !actorId || userId === actorId) return null
  const id = newId('n')
  const createdAt = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, actor_id, type, post_id, comment_id, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    )
    .bind(id, userId, actorId, type, postId, commentId, createdAt)
    .run()
  return id
}

export function mapNotification(row) {
  if (!row) return null
  return {
    id: row.id,
    type: row.type,
    readAt: row.read_at || null,
    createdAt: row.created_at,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    postId: row.post_id || null,
    postTitle: row.post_title || null,
    postSlug: row.post_slug || null,
    commentId: row.comment_id || null,
    commentPreview: row.comment_preview || null,
  }
}
