import { getCookie, REFRESH_COOKIE, buildClearAuthCookieHeaders, isSecureRequest } from '../_lib/cookies.js'
import { rotateRefreshToken } from '../_lib/session.js'
import { getJwtSecret, publicUser } from '../_lib/auth.js'
import { verifyJwt } from '../_lib/crypto.js'
import { empty, json, jsonWithSetCookies } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const refreshToken = getCookie(request, REFRESH_COOKIE)
  const session = await rotateRefreshToken(env, refreshToken, request)
  if (!session) {
    const secure = isSecureRequest(request)
    return jsonWithSetCookies(401, { error: 'Invalid refresh token' }, buildClearAuthCookieHeaders(secure))
  }

  const payload = await verifyJwt(session.accessToken, getJwtSecret(env))
  const userRow = await env.DB.prepare(
    'SELECT id, email, username, role, created_at FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first()

  return jsonWithSetCookies(200, { user: publicUser(userRow) }, session.cookieHeaders)
}
