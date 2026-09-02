import { newId } from './_lib/crypto.js'
import { requireUser } from './_lib/auth.js'
import { empty, json } from './_lib/response.js'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function extForType(type) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/webp') return 'webp'
  return 'bin'
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  if (!env.MEDIA) {
    return json(503, {
      error: 'R2 storage not configured',
      hint:
        '请在 Cloudflare 控制台启用 R2，创建桶 mohhen-blog-media，并在 Pages 项目绑定 MEDIA；同时取消注释 frontend/wrangler.toml 中的 r2_buckets。',
    })
  }

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
      return json(400, { error: 'File too large (max 5MB)' })
    }

    const ext = extForType(type)
    const key = `uploads/${auth.user.id}/${newId('img')}.${ext}`
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: type },
    })

    const url = new URL(request.url)
    const publicUrl = `${url.origin}/api/media/${key}`
    return json(201, { url: publicUrl, key })
  } catch (err) {
    return json(500, { error: err.message || 'Upload failed' })
  }
}
