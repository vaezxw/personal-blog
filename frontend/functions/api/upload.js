import { newId } from './_lib/crypto.js'
import { requireUser } from './_lib/auth.js'
import { empty, json } from './_lib/response.js'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const VIDEO_MAX_BYTES = 50 * 1024 * 1024
const FILE_MAX_BYTES = 20 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])
const FILE_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/octet-stream',
])

const EXT_MIME = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
}

function fileExt(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''))
  return m ? m[1].toLowerCase() : ''
}

function extForType(type, filename) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/gif') return 'gif'
  if (type === 'image/webp') return 'webp'
  if (type === 'video/mp4') return 'mp4'
  if (type === 'video/webm') return 'webm'
  if (type === 'video/ogg') return 'ogv'
  if (type === 'video/quicktime') return 'mov'
  const fromName = fileExt(filename)
  if (fromName && EXT_MIME[fromName]) return fromName
  if (type === 'application/pdf') return 'pdf'
  if (type.includes('zip')) return 'zip'
  if (type.includes('wordprocessingml') || type === 'application/msword') return 'docx'
  if (type.includes('spreadsheetml')) return 'xlsx'
  if (type.includes('presentationml')) return 'pptx'
  if (type === 'text/plain') return 'txt'
  if (type === 'text/markdown') return 'md'
  if (type === 'text/csv') return 'csv'
  if (type === 'application/json') return 'json'
  return fromName || 'bin'
}

function resolveKindAndMime(file) {
  const filename = file.name || 'file'
  const ext = fileExt(filename)
  let type = file.type || ''
  if ((!type || type === 'application/octet-stream') && EXT_MIME[ext]) {
    type = EXT_MIME[ext]
  }
  if (IMAGE_TYPES.has(type)) return { kind: 'image', mime: type }
  if (VIDEO_TYPES.has(type)) return { kind: 'video', mime: type }
  if (FILE_TYPES.has(type) || EXT_MIME[ext]) {
    return { kind: 'file', mime: type || EXT_MIME[ext] || 'application/octet-stream' }
  }
  return { kind: null, mime: type }
}

function safeFilename(name) {
  const base = String(name || 'file')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
  return base || 'file'
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

    const filename = safeFilename(file.name || 'file')
    const { kind, mime } = resolveKindAndMime(file)
    if (!kind) {
      return json(400, {
        error:
          'Unsupported file type. Allowed: images, videos, PDF, Office, zip/rar/7z, txt/md/csv/json',
      })
    }

    const maxBytes =
      kind === 'video' ? VIDEO_MAX_BYTES : kind === 'file' ? FILE_MAX_BYTES : IMAGE_MAX_BYTES
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > maxBytes) {
      const label =
        kind === 'video' ? 'Video too large (max 50MB)' : kind === 'file' ? 'File too large (max 20MB)' : 'File too large (max 5MB)'
      return json(400, { error: label })
    }

    const ext = extForType(mime, filename)
    const prefix = kind === 'video' ? 'vid' : kind === 'file' ? 'file' : 'img'
    const key = `uploads/${auth.user.id}/${newId(prefix)}.${ext}`
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: mime },
      customMetadata: { filename },
    })

    const url = new URL(request.url)
    const publicUrl = `${url.origin}/api/media/${key}`
    return json(201, {
      url: publicUrl,
      key,
      kind,
      filename,
      mime,
      size: bytes.byteLength,
    })
  } catch (err) {
    return json(500, { error: err.message || 'Upload failed' })
  }
}
