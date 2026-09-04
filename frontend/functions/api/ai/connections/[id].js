import { requireUser } from '../../_lib/auth.js'
import {
  encryptApiKey,
  getConnection,
  mapConnection,
  maskApiKey,
  setDefaultConnection,
  validateConnectionInput,
} from '../../_lib/ai.js'
import { empty, json, readJson } from '../../_lib/response.js'

function getId(params) {
  return decodeURIComponent(String(params?.id || '')).trim()
}

function handleError(error) {
  const message = String(error?.message || error || '')
  if (/AI_CONFIG_ENCRYPTION_KEY/i.test(message)) {
    return json(503, { error: 'AI connection encryption is not configured on the server' })
  }
  return json(400, { error: message || 'Invalid connection' })
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth
  const id = getId(params)
  if (!id) return json(400, { error: 'Connection id is required' })

  const existing = await getConnection(env.DB, user.id, id)
  if (!existing) return json(404, { error: 'AI connection not found' })

  if (request.method === 'GET') return json(200, { connection: mapConnection(existing) })

  if (request.method === 'DELETE') {
    await env.DB.prepare('UPDATE ai_conversations SET connection_id = NULL WHERE connection_id = ? AND user_id = ?')
      .bind(id, user.id)
      .run()
    await env.DB.prepare('DELETE FROM ai_connections WHERE id = ? AND user_id = ?').bind(id, user.id).run()

    if (existing.is_default) {
      const next = await env.DB.prepare(
        `SELECT id FROM ai_connections WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
      )
        .bind(user.id)
        .first()
      if (next?.id) await setDefaultConnection(env.DB, user.id, next.id)
    }
    return json(200, { ok: true })
  }

  if (request.method !== 'PATCH') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  try {
    const input = validateConnectionInput(
      {
        name: body?.name ?? existing.name,
        baseUrl: body?.baseUrl ?? existing.base_url,
        model: body?.model ?? existing.model,
        apiKey: body?.apiKey || 'preserve-existing-key',
      },
      { apiKeyRequired: false },
    )
    const hasNewKey = Boolean(String(body?.apiKey || '').trim())
    const now = new Date().toISOString()
    let encrypted = null
    if (hasNewKey) encrypted = await encryptApiKey(env, String(body.apiKey).trim())

    await env.DB.prepare(
      `UPDATE ai_connections
       SET name = ?, base_url = ?, model = ?,
           api_key_ciphertext = COALESCE(?, api_key_ciphertext),
           api_key_iv = COALESCE(?, api_key_iv),
           api_key_masked = COALESCE(?, api_key_masked),
           key_version = COALESCE(?, key_version),
           last_test_at = NULL, last_test_status = NULL, last_test_error = NULL,
           updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(
        input.name,
        input.baseUrl,
        input.model,
        encrypted?.ciphertext || null,
        encrypted?.iv || null,
        hasNewKey ? maskApiKey(input.apiKey) : null,
        encrypted?.keyVersion || null,
        now,
        id,
        user.id,
      )
      .run()

    if (body?.isDefault === true) await setDefaultConnection(env.DB, user.id, id)

    const row = await getConnection(env.DB, user.id, id)
    return json(200, { connection: mapConnection(row) })
  } catch (error) {
    return handleError(error)
  }
}

