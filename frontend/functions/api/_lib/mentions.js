import { createNotification } from './notifications.js'
import { newId } from './crypto.js'

const MENTION_RE = /@([A-Za-z0-9_\u4e00-\u9fff.-]{1,32})/g

/** Extract unique @usernames from text (without @). */
export function extractMentions(text) {
  const found = new Set()
  const src = String(text || '')
  let m
  MENTION_RE.lastIndex = 0
  while ((m = MENTION_RE.exec(src))) {
    const name = String(m[1] || '').trim()
    if (name) found.add(name)
  }
  return [...found]
}

/**
 * Notify mentioned users (in-site + email outbox).
 * Only notifies existing users; skips actor and duplicates in the same content.
 */
export async function notifyMentions(db, {
  actorId,
  text,
  postId = null,
  commentId = null,
}) {
  const names = extractMentions(text)
  if (!names.length || !actorId) return []

  const notified = []
  for (const username of names) {
    const user = await db
      .prepare('SELECT id, username FROM users WHERE username = ? COLLATE NOCASE')
      .bind(username)
      .first()
    if (!user || user.id === actorId) continue

    await createNotification(db, {
      userId: user.id,
      actorId,
      type: 'mention',
      postId,
      commentId,
    })

    const id = newId('me')
    const createdAt = new Date().toISOString()
    await db
      .prepare(
        `INSERT INTO mention_emails (id, user_id, actor_id, post_id, comment_id, created_at, email_notified_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      )
      .bind(id, user.id, actorId, postId, commentId, createdAt)
      .run()

    notified.push(user.username)
  }
  return notified
}
