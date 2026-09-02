import { empty, json } from '../_lib/response.js'

function mediaPath(params) {
  const raw = params?.path
  if (Array.isArray(raw)) {
    return raw.map((seg) => decodeURIComponent(String(seg || ''))).join('/')
  }
  return decodeURIComponent(String(raw || ''))
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

  const object = await env.MEDIA.get(path)
  if (!object) return json(404, { error: 'Not found' })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Access-Control-Allow-Origin', '*')

  if (request.method === 'HEAD') {
    return new Response(null, { headers })
  }

  return new Response(object.body, { headers })
}
