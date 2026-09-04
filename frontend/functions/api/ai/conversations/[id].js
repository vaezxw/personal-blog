import { requireUser } from '../../_lib/auth.js'
import { mapConversation } from '../../_lib/ai.js'
import { empty, json, readJson } from '../../_lib/response.js'

function getId(params) {
  return decodeURIComponent(String(params?.id || '')).trim()
}

async function loadConversation(db, userId, id) {
  return db
    .prepare(
      `SELECT c.id, c.title, c.connection_id, c.created_at, c.updated_at,
              ac.model, acs.provider,
              (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM ai_conversations c
       LEFT JOIN ai_connections ac ON ac.id = c.connection_id
       LEFT JOIN ai_conversation_sources acs ON acs.conversation_id = c.id
       WHERE c.id = ? AND c.user_id = ?`,
    )
    .bind(id, userId)
    .first()
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const id = getId(params)
  if (!id) return json(400, { error: 'Conversation id is required' })
  const existing = await loadConversation(env.DB, auth.user.id, id)
  if (!existing) return json(404, { error: 'AI conversation not found' })

  if (request.method === 'GET') return json(200, { conversation: mapConversation(existing) })

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').bind(id).run()
    await env.DB.prepare('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?')
      .bind(id, auth.user.id)
      .run()
    return json(200, { ok: true })
  }

  if (request.method !== 'PATCH') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }
  const title = String(body?.title || '').trim().slice(0, 120)
  if (!title) return json(400, { error: 'Title is required' })
  await env.DB.prepare(
    'UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  )
    .bind(title, new Date().toISOString(), id, auth.user.id)
    .run()
  const row = await loadConversation(env.DB, auth.user.id, id)
  return json(200, { conversation: mapConversation(row) })
}
