import { requireUser } from '../../_lib/auth.js'
import { getConnection, getDefaultConnection, mapConversation } from '../../_lib/ai.js'
import { newId } from '../../_lib/crypto.js'
import { empty, json, readJson } from '../../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT c.id, c.title, c.connection_id, c.created_at, c.updated_at,
              ac.model, acs.provider,
              (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM ai_conversations c
       LEFT JOIN ai_connections ac ON ac.id = c.connection_id
       LEFT JOIN ai_conversation_sources acs ON acs.conversation_id = c.id
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC
       LIMIT 100`,
    )
      .bind(user.id)
      .all()
    return json(200, { conversations: (results || []).map(mapConversation) })
  }

  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const isCursorAgent = body?.source === 'cursor-agent'
  const connection = isCursorAgent
    ? null
    : body?.connectionId
      ? await getConnection(env.DB, user.id, String(body.connectionId))
      : await getDefaultConnection(env.DB, user.id)
  if (!connection && !isCursorAgent) return json(400, { error: 'Configure an AI connection first' })

  const title = String(body?.title || 'New chat').trim().slice(0, 120) || 'New chat'
  const id = newId('aicv')
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO ai_conversations (id, user_id, connection_id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, user.id, connection?.id || null, title, now, now)
    .run()

  if (isCursorAgent) {
    await env.DB.prepare(
      `INSERT INTO ai_conversation_sources (conversation_id, provider, created_at)
       VALUES (?, 'cursor-agent', ?)`,
    )
      .bind(id, now)
      .run()
  }

  const row = await env.DB.prepare(
    `SELECT c.id, c.title, c.connection_id, c.created_at, c.updated_at,
            ac.model, acs.provider, 0 AS message_count
     FROM ai_conversations c
     LEFT JOIN ai_connections ac ON ac.id = c.connection_id
     LEFT JOIN ai_conversation_sources acs ON acs.conversation_id = c.id
     WHERE c.id = ? AND c.user_id = ?`,
  )
    .bind(id, user.id)
    .first()
  return json(201, { conversation: mapConversation(row) })
}
