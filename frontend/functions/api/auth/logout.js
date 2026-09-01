import { getCookie, REFRESH_COOKIE, buildClearAuthCookieHeaders, isSecureRequest } from '../_lib/cookies.js'
import { revokeRefreshToken } from '../_lib/session.js'
import { empty, json, jsonWithSetCookies } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const refreshToken = getCookie(request, REFRESH_COOKIE)
  await revokeRefreshToken(env, refreshToken)

  const secure = isSecureRequest(request)
  return jsonWithSetCookies(200, { ok: true }, buildClearAuthCookieHeaders(secure))
}
