function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function shaDigest(algorithm, data) {
  const hash = await crypto.subtle.digest(algorithm, data)
  return toHex(hash)
}

export async function hashText(algorithm, text) {
  const enc = new TextEncoder()
  return shaDigest(algorithm, enc.encode(text))
}

export async function hashFile(algorithm, file) {
  const buffer = await file.arrayBuffer()
  return shaDigest(algorithm, buffer)
}

export const HASH_ALGORITHMS = [
  { id: 'SHA-1', label: 'SHA-1' },
  { id: 'SHA-256', label: 'SHA-256' },
  { id: 'SHA-384', label: 'SHA-384' },
  { id: 'SHA-512', label: 'SHA-512' },
]

export async function digestById(algorithmId, text) {
  if (!HASH_ALGORITHMS.some((item) => item.id === algorithmId)) {
    throw new Error('unsupported algorithm')
  }
  return hashText(algorithmId, text)
}

export async function digestFileById(algorithmId, file) {
  if (!HASH_ALGORITHMS.some((item) => item.id === algorithmId)) {
    throw new Error('unsupported algorithm')
  }
  return hashFile(algorithmId, file)
}
