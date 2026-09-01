import { newId } from '../_lib/crypto.js'
import { publicUser, requireUser } from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

const MAX_BYTES = 2 * 1024 * 1024
const MAX_DATA_URL = 180_000
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function extForType(type) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/webp') return 'webp'
  return 'bin'
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return json(400, { error: 'file is required' })
    }

    const type = file.type || 'application/octet-stream'
    if (!ALLOWED.has(type)) {
      return json(400, { error: 'Only JPEG, PNG, GIF, WebP images are allowed' })
    }

    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES) {
      return json(400, { error: 'File too large (max 2MB)' })
    }

    let avatarUrl = ''

    if (env.MEDIA) {
      const ext = extForType(type)
      const key = `uploads/${auth.user.id}/avatar-${newId('av')}.${ext}`
      await env.MEDIA.put(key, bytes, {
        httpMetadata: { contentType: type },
      })
      const origin = new URL(request.url).origin
      avatarUrl = `${origin}/api/media/${key}`
    } else {
      const b64 = arrayBufferToBase64(bytes)
      avatarUrl = `data:${type};base64,${b64}`
      if (avatarUrl.length > MAX_DATA_URL) {
        return json(400, {
          error: 'Avatar too large after encode. Please use a smaller image (≤200KB recommended).',
        })
      }
    }

    await env.DB.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
      .bind(avatarUrl, auth.user.id)
      .run()

    const updated = await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url FROM users WHERE id = ?`,
    )
      .bind(auth.user.id)
      .first()

    return json(200, { user: publicUser(updated), url: avatarUrl })
  } catch (err) {
    return json(500, { error: err.message || 'Upload failed' })
  }
}
