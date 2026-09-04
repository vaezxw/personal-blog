import { newId } from './crypto.js'
import { decryptSecret, encryptSecret } from './secretBox.js'

export const AI_PROTOCOL = 'openai-compatible'
export const AI_MAX_NAME = 80
export const AI_MAX_BASE_URL = 500
export const AI_MAX_MODEL = 200
export const AI_MAX_KEY = 5000
export const AI_MAX_MESSAGE_CHARS = 8000
export const AI_MAX_CONTEXT_CHARS = 24000
export const AI_MAX_DAILY_REQUESTS = 100
export const AI_UPSTREAM_TIMEOUT_MS = 60_000

export const AI_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    id: 'qwen',
    name: '通义千问 / Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  {
    id: 'moonshot',
    name: 'Moonshot / Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  {
    id: 'zhipu',
    name: '智谱 / GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
]

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    return true
  }

  const parts = host.split('.')
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const octets = parts.map(Number)
    const [first, second] = octets
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    )
  }

  return /^(fc|fd|fe80:)/i.test(host)
}

export function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('Base URL is required')
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Base URL is invalid')
  }
  if (url.protocol !== 'https:') throw new Error('Base URL must use HTTPS')
  if (url.username || url.password) throw new Error('Base URL must not contain credentials')
  if (isPrivateHost(url.hostname)) {
    throw new Error('Local and private network URLs are not supported')
  }
  if (url.search || url.hash) throw new Error('Base URL must not contain query or hash')

  let pathname = url.pathname.replace(/\/+$/, '')
  pathname = pathname.replace(/\/chat\/completions$/i, '')
  url.pathname = pathname || '/'
  return url.toString().replace(/\/$/, '')
}

export function chatCompletionsUrl(baseUrl) {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`
}

export function maskApiKey(value) {
  const key = String(value || '')
  if (!key) return ''
  if (key.length <= 4) return '••••'
  return `••••••••${key.slice(-4)}`
}

function cleanText(value, max, label) {
  const text = String(value || '').trim()
  if (!text) throw new Error(`${label} is required`)
  if (text.length > max) throw new Error(`${label} is too long (max ${max})`)
  return text
}

export function validateConnectionInput(body, { apiKeyRequired = true } = {}) {
  const name = cleanText(body?.name, AI_MAX_NAME, 'Name')
  const baseUrl = normalizeBaseUrl(body?.baseUrl)
  if (baseUrl.length > AI_MAX_BASE_URL) throw new Error(`Base URL is too long (max ${AI_MAX_BASE_URL})`)
  const model = cleanText(body?.model, AI_MAX_MODEL, 'Model')
  const apiKey = String(body?.apiKey || '').trim()
  if (apiKeyRequired && !apiKey) throw new Error('API Key is required')
  if (apiKey.length > AI_MAX_KEY) throw new Error(`API Key is too long (max ${AI_MAX_KEY})`)
  return { name, baseUrl, model, apiKey }
}

export function mapConnection(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    protocol: row.protocol || AI_PROTOCOL,
    baseUrl: row.base_url,
    model: row.model,
    apiKeyMasked: row.api_key_masked || '••••',
    isDefault: Boolean(row.is_default),
    lastTestAt: row.last_test_at || null,
    lastTestStatus: row.last_test_status || null,
    lastTestError: row.last_test_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapConversation(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    connectionId: row.connection_id || null,
    model: row.model || null,
    messageCount: Number(row.message_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMessage(row) {
  if (!row) return null
  return {
    id: row.id,
    role: row.role,
    content: row.content || '',
    status: row.status || 'complete',
    errorCode: row.error_code || null,
    sequence: Number(row.sequence_no || 0),
    createdAt: row.created_at,
  }
}

export async function encryptApiKey(env, apiKey) {
  return encryptSecret(env?.AI_CONFIG_ENCRYPTION_KEY, apiKey)
}

export async function decryptApiKey(env, row) {
  return decryptSecret(env?.AI_CONFIG_ENCRYPTION_KEY, row.api_key_ciphertext, row.api_key_iv)
}

export async function requestProvider(env, connection, body, signal) {
  const apiKey = await decryptApiKey(env, connection)
  return fetchWithTimeout(
    chatCompletionsUrl(connection.base_url),
    {
      method: 'POST',
      headers: providerHeaders(apiKey),
      body: JSON.stringify(body),
      signal,
    },
    AI_UPSTREAM_TIMEOUT_MS,
  )
}

export async function setDefaultConnection(db, userId, connectionId) {
  await db
    .prepare('UPDATE ai_connections SET is_default = 0, updated_at = ? WHERE user_id = ?')
    .bind(new Date().toISOString(), userId)
    .run()
  await db
    .prepare('UPDATE ai_connections SET is_default = 1, updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(new Date().toISOString(), connectionId, userId)
    .run()
}

export async function getConnection(db, userId, connectionId) {
  return db
    .prepare('SELECT * FROM ai_connections WHERE id = ? AND user_id = ?')
    .bind(connectionId, userId)
    .first()
}

export async function getDefaultConnection(db, userId) {
  return db
    .prepare(
      `SELECT * FROM ai_connections
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC
       LIMIT 1`,
    )
    .bind(userId)
    .first()
}

export async function nextMessageSequence(db, conversationId) {
  const row = await db
    .prepare('SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence FROM ai_messages WHERE conversation_id = ?')
    .bind(conversationId)
    .first()
  return Number(row?.next_sequence || 1)
}

export async function insertMessage(db, { conversationId, role, content, status = 'complete', errorCode = null }) {
  const id = newId('aim')
  const createdAt = new Date().toISOString()
  const sequence = await nextMessageSequence(db, conversationId)
  await db
    .prepare(
      `INSERT INTO ai_messages
       (id, conversation_id, role, content, status, error_code, sequence_no, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, conversationId, role, content, status, errorCode, sequence, createdAt)
    .run()
  return { id, createdAt, sequence }
}

export async function updateMessage(db, messageId, content, status, errorCode = null) {
  await db
    .prepare('UPDATE ai_messages SET content = ?, status = ?, error_code = ? WHERE id = ?')
    .bind(content, status, errorCode, messageId)
    .run()
}

export async function recordUsage(db, userId, { inputChars = 0, outputChars = 0, inputTokens = 0, outputTokens = 0 }) {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  await db
    .prepare(
      `INSERT INTO ai_usage_daily
       (user_id, usage_date, request_count, input_chars, output_chars, input_tokens, output_tokens, updated_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, usage_date) DO UPDATE SET
         request_count = request_count + 1,
         input_chars = input_chars + excluded.input_chars,
         output_chars = output_chars + excluded.output_chars,
         input_tokens = input_tokens + excluded.input_tokens,
         output_tokens = output_tokens + excluded.output_tokens,
         updated_at = excluded.updated_at`,
    )
    .bind(userId, date, inputChars, outputChars, inputTokens, outputTokens, now.toISOString())
    .run()
}

export async function assertDailyLimit(db, userId, env) {
  const limit = Math.max(1, Number(env?.AI_MAX_REQUESTS_PER_DAY || AI_MAX_DAILY_REQUESTS))
  const date = new Date().toISOString().slice(0, 10)
  const row = await db
    .prepare('SELECT request_count FROM ai_usage_daily WHERE user_id = ? AND usage_date = ?')
    .bind(userId, date)
    .first()
  if (Number(row?.request_count || 0) >= limit) {
    const error = new Error('Daily AI request limit reached')
    error.status = 429
    error.code = 'AI_DAILY_LIMIT'
    throw error
  }
}

export function extractUsage(payload) {
  const usage = payload?.usage || payload?.result?.usage || {}
  return {
    inputTokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0),
  }
}

export function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? ''
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
  }
  return String(content || '')
}

export function extractDelta(payload) {
  const content = payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.text ?? ''
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
  }
  return String(content || '')
}

export function upstreamError(status, payload) {
  const detail =
    payload?.error?.message || payload?.message || payload?.error || (typeof payload === 'string' ? payload : '')
  const error = new Error(
    status === 401 || status === 403
      ? 'Invalid API Key or unauthorized model access'
      : status === 404
        ? 'Model or API endpoint not found'
        : status === 429
          ? 'Model provider rate limit reached'
          : status >= 500
            ? 'Model provider is temporarily unavailable'
            : detail || `Model provider request failed (${status})`,
  )
  error.status = status === 429 ? 429 : status >= 500 ? 502 : status === 401 || status === 403 ? 502 : 502
  error.code =
    status === 401 || status === 403
      ? 'AI_AUTH'
      : status === 404
        ? 'AI_MODEL_NOT_FOUND'
        : status === 429
          ? 'AI_UPSTREAM_RATE_LIMIT'
          : status >= 500
            ? 'AI_UPSTREAM_UNAVAILABLE'
            : 'AI_UPSTREAM_ERROR'
  error.detail = String(detail || '').slice(0, 300)
  return error
}

export function providerHeaders(apiKey) {
  return {
    Accept: 'text/event-stream, application/json',
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchWithTimeout(url, options, timeoutMs = AI_UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const signal = options?.signal
  const abortListener = () => controller.abort()
  signal?.addEventListener('abort', abortListener, { once: true })
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortListener)
  }
}
