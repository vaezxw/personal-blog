import { runUnreadMessageEmailDigest } from '../_lib/emailDigest.js'
import { empty, json } from '../_lib/response.js'

function authorized(request, env) {
  const secret = String(env.EMAIL_CRON_SECRET || '').trim()
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const query = new URL(request.url).searchParams.get('secret') || ''
  return bearer === secret || query === secret
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  if (!authorized(request, env)) {
    return json(401, { error: 'Unauthorized' })
  }

  try {
    const result = await runUnreadMessageEmailDigest(env)
    return json(result.ok ? 200 : 500, result)
  } catch (err) {
    return json(500, { ok: false, error: String(err?.message || err) })
  }
}
