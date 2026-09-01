function bytesToBase64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64UrlEncode(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)
  return base64ToBytes(padded)
}

function textToBytes(text) {
  return new TextEncoder().encode(text)
}

async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return new Uint8Array(bits)
}

/** Store format: pbkdf2$iterations$saltB64$hashB64 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(password, salt)
  return `pbkdf2$100000$${bytesToBase64(salt)}$${bytesToBase64(hash)}`
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!iterations) return false
  const salt = base64ToBytes(parts[2])
  const expected = base64ToBytes(parts[3])
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBytes(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expected.length * 8,
  )
  const actual = new Uint8Array(bits)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
  return diff === 0
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    textToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, textToBytes(data))
  return base64UrlEncode(new Uint8Array(sig))
}

export async function signJwt(payload, secret, expiresInSec = 60 * 15) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const h = base64UrlEncode(textToBytes(JSON.stringify(header)))
  const p = base64UrlEncode(textToBytes(JSON.stringify(body)))
  const data = `${h}.${p}`
  const s = await hmacSign(secret, data)
  return `${data}.${s}`
}

export async function verifyJwt(token, secret) {
  if (!token || !secret) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const data = `${h}.${p}`
  const expected = await hmacSign(secret, data)
  if (s !== expected) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p)))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function newId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

export function randomToken() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', textToBytes(token))
  return bytesToBase64(new Uint8Array(digest))
}
