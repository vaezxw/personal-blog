const textEncoder = new TextEncoder()

function bytesToBase64(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function getKey(secret) {
  const raw = String(secret || '').trim()
  if (!raw) throw new Error('AI_CONFIG_ENCRYPTION_KEY is not configured')
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(raw))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptSecret(secret, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await getKey(secret)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(String(value || '')),
  )
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    keyVersion: 1,
  }
}

export async function decryptSecret(secret, ciphertext, iv) {
  const key = await getKey(secret)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}

