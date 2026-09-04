import { requireUser } from '../../_lib/auth.js'
import {
  AI_PROTOCOL,
  encryptApiKey,
  mapConnection,
  maskApiKey,
  setDefaultConnection,
  validateConnectionInput,
} from '../../_lib/ai.js'
import { empty, json, readJson } from '../../_lib/response.js'

function handleError(error) {
  const message = String(error?.message || error || '')
  if (/unique/i.test(message)) return json(409, { error: 'A connection with this value already exists' })
  if (/AI_CONFIG_ENCRYPTION_KEY/i.test(message)) {
    return json(503, { error: 'AI connection encryption is not configured on the server' })
  }
  return json(400, { error: message || 'Invalid connection' })
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT id, name, protocol, base_url, model, api_key_masked,
              is_default, last_test_at, last_test_status, last_test_error,
              created_at, updated_at
       FROM ai_connections
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
    )
      .bind(user.id)
      .all()
    return json(200, { connections: (results || []).map(mapConnection) })
  }

  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  try {
    const input = validateConnectionInput(body)
    const now = new Date().toISOString()
    const id = `aic_${crypto.randomUUID().replace(/-/g, '')}`
    const countRow = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM ai_connections WHERE user_id = ?',
    )
      .bind(user.id)
      .first()
    const isDefault = Boolean(body?.isDefault) || Number(countRow?.count || 0) === 0
    const encrypted = await encryptApiKey(env, input.apiKey)

    await env.DB.prepare(
      `INSERT INTO ai_connections
       (id, user_id, name, protocol, base_url, model, api_key_ciphertext,
        api_key_iv, api_key_masked, key_version, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        user.id,
        input.name,
        AI_PROTOCOL,
        input.baseUrl,
        input.model,
        encrypted.ciphertext,
        encrypted.iv,
        maskApiKey(input.apiKey),
        encrypted.keyVersion,
        isDefault ? 1 : 0,
        now,
        now,
      )
      .run()

    if (isDefault) await setDefaultConnection(env.DB, user.id, id)

    const row = await env.DB.prepare('SELECT * FROM ai_connections WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first()
    return json(201, { connection: mapConnection(row) })
  } catch (error) {
    return handleError(error)
  }
}

