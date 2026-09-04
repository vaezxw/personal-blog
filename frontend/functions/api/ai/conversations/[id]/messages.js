import { requireUser } from '../../../_lib/auth.js'
import {
  AI_MAX_MESSAGE_CHARS,
  assertDailyLimit,
  insertMessage,
  mapMessage,
  recordUsage,
} from '../../../_lib/ai.js'
import { empty, json, readJson } from '../../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)
  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const id = decodeURIComponent(String(params?.id || '')).trim()
  const conversation = await env.DB.prepare(
    'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
  )
    .bind(id, auth.user.id)
    .first()
  if (!conversation) return json(404, { error: 'AI conversation not found' })

  if (request.method === 'POST') {
    let body
    try {
      body = await readJson(request)
    } catch {
      return json(400, { error: 'Invalid JSON' })
    }
    const role = String(body?.role || '').trim()
    const content = String(body?.content || '')
    const status = String(body?.status || 'complete').trim()
    const errorCode = String(body?.errorCode || '').trim().slice(0, 100) || null
    if (role !== 'user' && role !== 'assistant') return json(400, { error: 'Invalid message role' })
    if (!content.trim() && role === 'user') return json(400, { error: 'Message is required' })
    if (content.length > AI_MAX_MESSAGE_CHARS * 4) {
      return json(400, { error: 'Message too long' })
    }
    if (!['complete', 'partial', 'error'].includes(status)) {
      return json(400, { error: 'Invalid message status' })
    }
    if (role === 'user') await assertDailyLimit(env.DB, auth.user.id, env)

    const inserted = await insertMessage(env.DB, {
      conversationId: id,
      role,
      content,
      status,
      errorCode,
    })
    if (role === 'user') {
      await recordUsage(env.DB, auth.user.id, { inputChars: content.length })
    }
    await env.DB.prepare(
      'UPDATE ai_conversations SET updated_at = ? WHERE id = ? AND user_id = ?',
    )
      .bind(new Date().toISOString(), id, auth.user.id)
      .run()
    return json(201, {
      message: mapMessage({
        id: inserted.id,
        role,
        content,
        status,
        error_code: errorCode,
        sequence_no: inserted.sequence,
        created_at: inserted.createdAt,
      }),
    })
  }

  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const { results } = await env.DB.prepare(
    `SELECT id, role, content, status, error_code, sequence_no, created_at
     FROM ai_messages
     WHERE conversation_id = ?
     ORDER BY sequence_no ASC
     LIMIT 200`,
  )
    .bind(id)
    .all()
  return json(200, { messages: (results || []).map(mapMessage) })
}
