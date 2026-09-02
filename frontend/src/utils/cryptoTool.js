const SALT_LENGTH = 16
const IV_LENGTH = 12
const PBKDF2_ITERATIONS = 120000

function toBase64(bytes) {
  const bin = Array.from(new Uint8Array(bytes), (b) => String.fromCharCode(b)).join('')
  return btoa(bin)
}

function fromBase64(base64) {
  const bin = atob(base64.trim())
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 加密：返回 base64(salt + iv + ciphertext) */
export async function encryptText(plaintext, password) {
  if (!password) throw new Error('password required')
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  )
  const packed = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return toBase64(packed)
}

/** 解密：输入 encryptText 产出的 base64 */
export async function decryptText(payload, password) {
  if (!password) throw new Error('password required')
  const bytes = fromBase64(payload)
  if (bytes.length < SALT_LENGTH + IV_LENGTH + 1) {
    throw new Error('invalid payload')
  }
  const salt = bytes.slice(0, SALT_LENGTH)
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const data = bytes.slice(SALT_LENGTH + IV_LENGTH)
  const key = await deriveKey(password, salt)
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plainBuffer)
}
