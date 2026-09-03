import { newId } from './_lib/crypto.js'
import { requireUser } from './_lib/auth.js'
import { empty, json } from './_lib/response.js'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])

function extForType(type) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/webp') return 'webp'
  if (type === 'video/mp4') return 'mp4'
  if (type === 'video/webm') return 'webm'
  if (type === 'video/ogg') return 'ogv'
  if (type === 'video/quicktime') return 'mov'
  return 'bin'
}

function kindForType(type) {
  if (IMAGE_TYPES.has(type)) return 'image'
  if (VIDEO_TYPES.has(type)) return 'video'
  return null
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
    const kind = kindForType(type)
    if (!kind) {
      return json(400, {
        error: 'Only JPEG/PNG/GIF/WebP images or MP4/WebM/OGG/MOV videos are allowed',
      })
    }

    const maxBytes = kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > maxBytes) {
      return json(400, {
        error: kind === 'video' ? 'Video too large (max 50MB)' : 'File too large (max 5MB)',
      })
    }

    const ext = extForType(type)
    const prefix = kind === 'video' ? 'vid' : 'img'
    const key = `uploads/${auth.user.id}/${newId(prefix)}.${ext}`
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: type },
    })

    const url = new URL(request.url)
    const publicUrl = `${url.origin}/api/media/${key}`
    return json(201, { url: publicUrl, key, kind })
  } catch (err) {
    return json(500, { error: err.message || 'Upload failed' })
  }
}
