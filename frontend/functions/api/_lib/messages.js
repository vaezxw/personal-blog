import { newId } from './crypto.js'
import { createNotification } from './notifications.js'

export const MESSAGE_MAX_LEN = 2000

export function pairUserIds(a, b) {
  return a < b ? [a, b] : [b, a]
}

export function mapMessage(row, viewerId) {
  if (!row) return null
  return {
    id: row.id,
    conversationId: row.conversation_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at || null,
    senderId: row.sender_id,
    mine: row.sender_id === viewerId,
  }
}

export function mapConversation(row) {
  if (!row) return null
  return {
    id: row.id,
    peer: {
      id: row.peer_id,
      username: row.peer_username,
      avatarUrl: row.peer_avatar_url || null,
    },
    lastMessageAt: row.last_message_at || null,
    lastMessagePreview: row.last_message_preview || null,
    unreadCount: Number(row.unread_count || 0),
  }
}

export async function findOrCreateConversation(db, userId, peerId) {
  const [low, high] = pairUserIds(userId, peerId)
  const existing = await db
    .prepare(
      `SELECT id, user_low_id, user_high_id, last_message_at, last_message_preview, created_at
       FROM conversations
       WHERE user_low_id = ? AND user_high_id = ?`,
    )
    .bind(low, high)
    .first()

  if (existing) return existing

  const id = newId('c')
  const createdAt = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO conversations
         (id, user_low_id, user_high_id, last_message_at, last_message_preview, created_at)
       VALUES (?, ?, ?, NULL, NULL, ?)`,
    )
    .bind(id, low, high, createdAt)
    .run()

  return {
    id,
    user_low_id: low,
    user_high_id: high,
    last_message_at: null,
    last_message_preview: null,
    created_at: createdAt,
  }
}

export function previewText(body, max = 80) {
  const text = String(body || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

/** Avoid flooding activity feed: one unread message-notify per actor. */
export async function maybeNotifyMessage(db, { userId, actorId }) {
  if (!userId || !actorId || userId === actorId) return null
  const existing = await db
    .prepare(
      `SELECT id FROM notifications
       WHERE user_id = ? AND actor_id = ? AND type = 'message' AND read_at IS NULL
       LIMIT 1`,
    )
    .bind(userId, actorId)
    .first()
  if (existing) return null

  return createNotification(db, {
    userId,
    actorId,
    type: 'message',
    postId: null,
    commentId: null,
  })
}
