import { requireUser } from '../../_lib/auth.js'
import {
  findOrCreateConversation,
  maybeNotifyMessage,
  previewText,
} from '../../_lib/messages.js'
import { isMutualFollow } from '../../_lib/follows.js'
import { newId } from '../../_lib/crypto.js'
import { empty, json, readJson } from '../../_lib/response.js'
import { canViewPost, visibilityDeniedPayload } from '../../_lib/visibility.js'

/** Share a post to mutual friends via private message */
export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const slug = decodeURIComponent(params.slug || '')
  const post = await env.DB.prepare(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.published, p.visibility, p.author_id,
            u.username AS author_username
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.slug = ?`,
  )
    .bind(slug)
    .first()

  if (!post || !post.published) return json(404, { error: 'Post not found' })
  if (!(await canViewPost(env.DB, user, post))) {
    return json(403, visibilityDeniedPayload(post))
  }

  try {
    const body = await readJson(request)
    const usernames = Array.isArray(body?.usernames)
      ? body.usernames.map((u) => String(u || '').trim()).filter(Boolean)
      : []
    if (!usernames.length) return json(400, { error: 'usernames required' })
    if (usernames.length > 20) return json(400, { error: 'too many recipients' })

    const origin = new URL(request.url).origin
    const postUrl = `${origin}/post/${encodeURIComponent(post.slug)}`
    const note = String(body?.note || '').trim().slice(0, 200)
    const shareBody = [
      '【分享文章】',
      `《${post.title}》`,
      post.author_username ? `作者：@${post.author_username}` : '',
      postUrl,
      note ? `留言：${note}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const sent = []
    const skipped = []
    const now = new Date().toISOString()

    for (const username of usernames) {
      const peer = await env.DB.prepare(
        'SELECT id, username FROM users WHERE username = ? COLLATE NOCASE',
      )
        .bind(username)
        .first()
      if (!peer || peer.id === user.id) {
        skipped.push(username)
        continue
      }
      const mutual = await isMutualFollow(env.DB, user.id, peer.id)
      if (!mutual) {
        skipped.push(username)
        continue
      }

      const conversation = await findOrCreateConversation(env.DB, user.id, peer.id)
      const messageId = newId('m')
      await env.DB.prepare(
        `INSERT INTO messages (id, conversation_id, sender_id, body, created_at, read_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      )
        .bind(messageId, conversation.id, user.id, shareBody, now)
        .run()
      await env.DB.prepare(
        `UPDATE conversations
         SET last_message_at = ?, last_message_preview = ?
         WHERE id = ?`,
      )
        .bind(now, previewText(shareBody), conversation.id)
        .run()
      await maybeNotifyMessage(env.DB, {
        userId: peer.id,
        actorId: user.id,
      })
      sent.push(peer.username)
    }

    return json(200, { sent, skipped })
  } catch (err) {
    return json(400, { error: err.message || 'Share failed' })
  }
}
