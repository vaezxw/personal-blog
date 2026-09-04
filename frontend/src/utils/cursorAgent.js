export const CURSOR_CONNECTION_ID = 'cursor-agent-local'
const STORAGE_KEY = 'mohhen-cursor-agent-relay'
const DEFAULT_RELAY_URL = 'http://127.0.0.1:3210'

function cleanUrl(value) {
  const raw = String(value || DEFAULT_RELAY_URL).trim().replace(/\/+$/, '')
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Relay URL must use HTTP or HTTPS')
    if (url.username || url.password || url.search || url.hash) throw new Error('Relay URL is invalid')
    return url.toString().replace(/\/$/, '')
  } catch (error) {
    if (error?.message === 'Relay URL is invalid' || error?.message === 'Relay URL must use HTTP or HTTPS') throw error
    throw new Error('Relay URL is invalid')
  }
}

export function getCursorRelayConfig() {
  const fallback = { enabled: false, relayUrl: DEFAULT_RELAY_URL, token: '', model: '' }
  if (typeof window === 'undefined') return fallback
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}
    return {
      enabled: Boolean(value.enabled),
      relayUrl: cleanUrl(value.relayUrl || DEFAULT_RELAY_URL),
      token: String(value.token || '').trim(),
      model: String(value.model || '').trim().slice(0, 200),
    }
  } catch {
    return fallback
  }
}

export function saveCursorRelayConfig(value) {
  const config = {
    enabled: Boolean(value?.enabled),
    relayUrl: cleanUrl(value?.relayUrl || DEFAULT_RELAY_URL),
    token: String(value?.token || '').trim(),
    model: String(value?.model || '').trim().slice(0, 200),
  }
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  return config
}

export function cursorConnectionFromConfig(config = getCursorRelayConfig()) {
  if (!config.enabled || !config.token) return null
  return {
    id: CURSOR_CONNECTION_ID,
    name: 'Cursor Agent',
    protocol: 'cursor-agent',
    baseUrl: config.relayUrl,
    model: config.model || 'Cursor default',
    apiKeyMasked: 'Local CLI',
    isDefault: false,
    lastTestStatus: null,
  }
}

export async function checkCursorRelay(value = getCursorRelayConfig()) {
  const config = {
    ...value,
    relayUrl: cleanUrl(value?.relayUrl || DEFAULT_RELAY_URL),
    token: String(value?.token || '').trim(),
  }
  if (!config.token) throw new Error('Pairing token is required')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`${config.relayUrl}/health`, {
      headers: { 'X-Cursor-Relay-Token': config.token },
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Relay request failed (${response.status})`)
    if (!data.ok || !data.cliAvailable) throw new Error('Cursor CLI is not available in the local Relay')
    return data
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Cursor Relay connection timed out')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export { DEFAULT_RELAY_URL }
