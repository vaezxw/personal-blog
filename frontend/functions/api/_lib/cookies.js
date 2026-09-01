const ACCESS_COOKIE = 'access_token'
const REFRESH_COOKIE = 'refresh_token'

export function isSecureRequest(request) {
  try {
    return new URL(request.url).protocol === 'https:'
  } catch {
    return false
  }
}

export function parseCookies(request) {
  const header = request.headers.get('Cookie') || ''
  const out = {}
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=')
    if (!rawKey) continue
    out[rawKey] = decodeURIComponent(rest.join('='))
  }
  return out
}

export function getCookie(request, name) {
  return parseCookies(request)[name] || ''
}

function cookieParts(name, value, { maxAge, path = '/', httpOnly = true, secure = false } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    'SameSite=Lax',
    httpOnly ? 'HttpOnly' : '',
    secure ? 'Secure' : '',
    maxAge != null ? `Max-Age=${maxAge}` : '',
  ].filter(Boolean)
  return parts.join('; ')
}

export function clearCookie(name, path = '/', secure = false) {
  return cookieParts(name, '', { maxAge: 0, path, secure })
}

export function buildAuthCookieHeaders(accessToken, refreshToken, secure = true) {
  const accessMax = 15 * 60
  const refreshMax = 60 * 60 * 24 * 30
  return [
    cookieParts(ACCESS_COOKIE, accessToken, { maxAge: accessMax, path: '/', secure }),
    cookieParts(REFRESH_COOKIE, refreshToken, { maxAge: refreshMax, path: '/api/auth', secure }),
  ]
}

export function buildClearAuthCookieHeaders(secure = true) {
  return [
    clearCookie(ACCESS_COOKIE, '/', secure),
    clearCookie(REFRESH_COOKIE, '/api/auth', secure),
  ]
}

export { ACCESS_COOKIE, REFRESH_COOKIE }
