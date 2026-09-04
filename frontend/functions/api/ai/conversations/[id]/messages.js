import { requireUser } from '../../../_lib/auth.js'
import { mapMessage } from '../../../_lib/ai.js'
import { empty, json } from '../../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const id = decodeURIComponent(String(params?.id || '')).trim()
  const conversation = await env.DB.prepare(
    'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
  )
    .bind(id, auth.user.id)
    .first()
  if (!conversation) return json(404, { error: 'AI conversation not found' })

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

