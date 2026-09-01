import { hashToken, newId, randomToken, signJwt } from './crypto.js'
import { getJwtSecret } from './auth.js'
import { buildAuthCookieHeaders, isSecureRequest } from './cookies.js'

const REFRESH_DAYS = 30

export async function createSession(env, user, request) {
  const secure = request ? isSecureRequest(request) : true
  const accessToken = await signJwt(
    { sub: user.id, role: user.role, username: user.username },
    getJwtSecret(env),
    15 * 60,
  )

  const refreshToken = randomToken()
  const refreshHash = await hashToken(refreshToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + REFRESH_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await env.DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(newId('rt'), user.id, refreshHash, expiresAt, now.toISOString())
    .run()

  return {
    accessToken,
    refreshToken,
    cookieHeaders: buildAuthCookieHeaders(accessToken, refreshToken, secure),
  }
}

export async function rotateRefreshToken(env, rawRefreshToken, request) {
  if (!rawRefreshToken) return null
  const secure = request ? isSecureRequest(request) : true
  const tokenHash = await hashToken(rawRefreshToken)
  const row = await env.DB.prepare(
    `SELECT rt.id AS rt_id, rt.user_id, rt.expires_at,
            u.id, u.email, u.username, u.role, u.created_at
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ?`,
  )
    .bind(tokenHash)
    .first()

  if (!row) return null
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(row.rt_id).run()
    return null
  }

  await env.DB.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(row.rt_id).run()

  const user = {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
  }
  return createSession(env, user, request)
}

export async function revokeRefreshToken(env, rawRefreshToken) {
  if (!rawRefreshToken) return
  const tokenHash = await hashToken(rawRefreshToken)
  await env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(tokenHash).run()
}
