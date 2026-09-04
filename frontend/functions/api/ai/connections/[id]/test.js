import { requireUser } from '../../../_lib/auth.js'
import {
  extractAssistantText,
  getConnection,
  requestProvider,
  upstreamError,
} from '../../../_lib/ai.js'
import { empty, json } from '../../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const id = decodeURIComponent(String(params?.id || '')).trim()
  const connection = await getConnection(env.DB, auth.user.id, id)
  if (!connection) return json(404, { error: 'AI connection not found' })

  try {
    const response = await requestProvider(
      env,
      connection,
      {
        model: connection.model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        stream: false,
        max_tokens: 8,
      },
    )
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw upstreamError(response.status, payload)
    }
    const payload = await response.json().catch(() => ({}))
    const preview = extractAssistantText(payload).trim().slice(0, 80)
    const now = new Date().toISOString()
    await env.DB.prepare(
      `UPDATE ai_connections
       SET last_test_at = ?, last_test_status = 'success', last_test_error = NULL, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(now, now, id, auth.user.id)
      .run()
    return json(200, { ok: true, model: connection.model, preview })
  } catch (error) {
    const message = String(error?.message || error || 'Connection test failed')
    const safeMessage = /AI_CONFIG_ENCRYPTION_KEY/i.test(message)
      ? 'AI connection encryption is not configured on the server'
      : message
    await env.DB.prepare(
      `UPDATE ai_connections
       SET last_test_at = ?, last_test_status = 'error', last_test_error = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(new Date().toISOString(), safeMessage.slice(0, 300), new Date().toISOString(), id, auth.user.id)
      .run()
    return json(error?.status || 502, { error: safeMessage, code: error?.code || 'AI_TEST_FAILED' })
  }
}

