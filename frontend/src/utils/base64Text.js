export function encodeBase64Text(text) {
  const bytes = new TextEncoder().encode(String(text))
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function decodeBase64Text(base64) {
  const payload = String(base64 || '').trim()
  const comma = payload.indexOf(',')
  const raw = comma >= 0 ? payload.slice(comma + 1) : payload
  const bin = atob(raw)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
