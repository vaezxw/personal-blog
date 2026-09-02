import { requireUser } from '../_lib/auth.js'
import { newId } from '../_lib/crypto.js'
import {
  MESSAGE_MAX_LEN,
  findOrCreateConversation,
  mapMessage,
  maybeNotifyMessage,
  previewText,
} from '../_lib/messages.js'
import { empty, json, readJson } from '../_lib/response.js'

async function loadPeer(db, username) {
  return db
    .prepare(
      `SELECT id, username, avatar_url, role, created_at
       FROM users WHERE username = ? COLLATE NOCASE`,
    )
    .bind(username)
    .first()
}

async function markRead(db, conversationId, viewerId) {
  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE messages
       SET read_at = ?
       WHERE conversation_id = ?
         AND sender_id != ?
         AND read_at IS NULL`,
    )
    .bind(now, conversationId, viewerId)
    .run()

  // Clear pending message notifications from this peer when opening the thread
  const conv = await db
    .prepare(`SELECT user_low_id, user_high_id FROM conversations WHERE id = ?`)
    .bind(conversationId)
    .first()
  if (!conv) return
  const peerId = conv.user_low_id === viewerId ? conv.user_high_id : conv.user_low_id
  await db
    .prepare(
      `UPDATE notifications
       SET read_at = ?
       WHERE user_id = ?
         AND actor_id = ?
         AND type = 'message'
         AND read_at IS NULL`,
    )
    .bind(now, viewerId, peerId)
    .run()
}

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const username = decodeURIComponent(params.username || '').trim()
  if (!username) return json(400, { error: 'username required' })

  const peer = await loadPeer(env.DB, username)
  if (!peer) return json(404, { error: 'User not found' })
  if (peer.id === user.id) return json(400, { error: 'Cannot message yourself' })

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const after = (url.searchParams.get('after') || '').trim()
    const conversation = await findOrCreateConversation(env.DB, user.id, peer.id)

    let results
    if (after) {
      const afterRow = await env.DB.prepare(
        `SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?`,
      )
        .bind(after, conversation.id)
        .first()
      if (!afterRow) {
        results = []
      } else {
        const q = await env.DB.prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ?
             AND created_at > ?
           ORDER BY created_at ASC
           LIMIT 200`,
        )
          .bind(conversation.id, afterRow.created_at)
          .all()
        results = q.results || []
      }
    } else {
      const q = await env.DB.prepare(
        `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC
         LIMIT 200`,
      )
        .bind(conversation.id)
        .all()
      results = q.results || []
    }

    if (!after) {
      await markRead(env.DB, conversation.id, user.id)
    } else if (results.length) {
      await markRead(env.DB, conversation.id, user.id)
    }

    return json(200, {
      conversationId: conversation.id,
      peer: {
        id: peer.id,
        username: peer.username,
        avatarUrl: peer.avatar_url || null,
      },
      messages: results.map((row) => mapMessage(row, user.id)),
    })
  }

  if (request.method === 'POST') {
    let body
    try {
      body = await readJson(request)
    } catch {
      return json(400, { error: 'Invalid JSON' })
    }

    const text = String(body?.body || '').trim()
    if (!text) return json(400, { error: 'Message required' })
    if (text.length > MESSAGE_MAX_LEN) {
      return json(400, { error: `Message too long (max ${MESSAGE_MAX_LEN})` })
    }

    const conversation = await findOrCreateConversation(env.DB, user.id, peer.id)
    const id = newId('m')
    const createdAt = new Date().toISOString()

    await env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, body, created_at, read_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
    )
      .bind(id, conversation.id, user.id, text, createdAt)
      .run()

    await env.DB.prepare(
      `UPDATE conversations
       SET last_message_at = ?, last_message_preview = ?
       WHERE id = ?`,
    )
      .bind(createdAt, previewText(text), conversation.id)
      .run()

    await maybeNotifyMessage(env.DB, {
      userId: peer.id,
      actorId: user.id,
    })

    return json(201, mapMessage({
      id,
      conversation_id: conversation.id,
      sender_id: user.id,
      body: text,
      created_at: createdAt,
      read_at: null,
    }, user.id))
  }

  return json(405, { error: 'Method not allowed' })
}
