import { newId } from './crypto.js'
import { normalizeVisibility } from './visibility.js'

const BATCH_SIZE = 80

/**
 * Fan out in-site + email-outbox notifications to followers when a post becomes published.
 * Runs once per post (idempotent via existing type='post' notifications).
 * private → no one; friends → mutual follows only; public → all followers.
 */
export async function notifyFollowersOfNewPost(db, post) {
  if (!db || !post) return { notified: 0 }
  const postId = post.id
  const authorId = post.author_id || post.authorId
  const published = Number(post.published) === 1
  const visibility = normalizeVisibility(post.visibility)

  if (!postId || !authorId || !published) return { notified: 0 }
  if (visibility === 'private') return { notified: 0 }

  const already = await db
    .prepare(`SELECT 1 AS ok FROM notifications WHERE type = 'post' AND post_id = ? LIMIT 1`)
    .bind(postId)
    .first()
  if (already) return { notified: 0 }

  let followerRows
  if (visibility === 'friends') {
    const { results } = await db
      .prepare(
        `SELECT f.follower_id AS user_id
         FROM follows f
         WHERE f.following_id = ?
           AND EXISTS (
             SELECT 1 FROM follows f2
             WHERE f2.follower_id = ?
               AND f2.following_id = f.follower_id
           )`,
      )
      .bind(authorId, authorId)
      .all()
    followerRows = results || []
  } else {
    const { results } = await db
      .prepare(`SELECT follower_id AS user_id FROM follows WHERE following_id = ?`)
      .bind(authorId)
      .all()
    followerRows = results || []
  }

  const followers = followerRows.map((r) => r.user_id).filter((id) => id && id !== authorId)
  if (!followers.length) return { notified: 0 }

  const now = new Date().toISOString()
  const stmts = []
  for (const userId of followers) {
    const nid = newId('n')
    const eid = newId('pfe')
    stmts.push(
      db
        .prepare(
          `INSERT INTO notifications (id, user_id, actor_id, type, post_id, comment_id, read_at, created_at)
           VALUES (?, ?, ?, 'post', ?, NULL, NULL, ?)`,
        )
        .bind(nid, userId, authorId, postId, now),
      db
        .prepare(
          `INSERT OR IGNORE INTO post_follow_emails (id, user_id, post_id, author_id, created_at, email_notified_at)
           VALUES (?, ?, ?, ?, ?, NULL)`,
        )
        .bind(eid, userId, postId, authorId, now),
    )
  }

  for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
    await db.batch(stmts.slice(i, i + BATCH_SIZE))
  }

  return { notified: followers.length }
}
