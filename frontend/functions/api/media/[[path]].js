import { empty, json } from '../_lib/response.js'

function mediaPath(params) {
  const raw = params?.path
  if (Array.isArray(raw)) {
    return raw.map((seg) => decodeURIComponent(String(seg || ''))).join('/')
  }
  return decodeURIComponent(String(raw || ''))
}

function parseRange(rangeHeader, size) {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader || '').trim())
  if (!m) return null
  let start = m[1] === '' ? NaN : Number(m[1])
  let end = m[2] === '' ? NaN : Number(m[2])
  if (Number.isNaN(start) && Number.isNaN(end)) return null
  if (Number.isNaN(start)) {
    const suffix = end
    if (!suffix || suffix <= 0) return null
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else if (Number.isNaN(end)) {
    end = size - 1
  }
  if (start < 0 || end < start || start >= size) return null
  end = Math.min(end, size - 1)
  return { start, end }
}

function contentDisposition(filename) {
  const raw = String(filename || 'download')
    .replace(/[\r\n"]+/g, '_')
    .slice(0, 180)
  const ascii = raw.replace(/[^\x20-\x7E]+/g, '_') || 'download'
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`
}

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!env.MEDIA) return json(503, { error: 'R2 storage not configured' })

  const path = mediaPath(params)
  if (!path.startsWith('uploads/')) {
    return json(403, { error: 'Forbidden' })
  }

  const meta = await env.MEDIA.head(path)
  if (!meta) return json(404, { error: 'Not found' })

  const size = meta.size
  const headers = new Headers()
  meta.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Accept-Ranges', 'bytes')

  const downloadName = new URL(request.url).searchParams.get('download')
  if (downloadName) {
    headers.set('Content-Disposition', contentDisposition(downloadName))
  }

  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(size))
    return new Response(null, { headers })
  }

  const range = parseRange(request.headers.get('Range'), size)
  if (range) {
    const partial = await env.MEDIA.get(path, {
      range: { offset: range.start, length: range.end - range.start + 1 },
    })
    if (!partial) return json(404, { error: 'Not found' })
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
    headers.set('Content-Length', String(range.end - range.start + 1))
    return new Response(partial.body, { status: 206, headers })
  }

  const full = await env.MEDIA.get(path)
  if (!full) return json(404, { error: 'Not found' })
  headers.set('Content-Length', String(size))
  return new Response(full.body, { headers })
}
