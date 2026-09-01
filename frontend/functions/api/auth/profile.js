import { hashPassword, verifyPassword } from '../_lib/crypto.js'
import { publicUser, requireUser } from '../_lib/auth.js'
import { createSession } from '../_lib/session.js'
import { empty, json, jsonWithSetCookies, readJson } from '../_lib/response.js'

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fff-]{2,32}$/

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'PATCH' && request.method !== 'PUT') {
    return json(405, { error: 'Method not allowed' })
  }

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  try {
    const body = await readJson(request)
    const nextUsername = body.username != null ? String(body.username).trim() : null
    const currentPassword = body.currentPassword != null ? String(body.currentPassword) : ''
    const newPassword = body.newPassword != null ? String(body.newPassword) : ''

    const changingUsername = nextUsername && nextUsername !== user.username
    const changingPassword = Boolean(newPassword)

    if (!changingUsername && !changingPassword) {
      return json(400, { error: 'Nothing to update' })
    }

    if (changingUsername) {
      if (!USERNAME_RE.test(nextUsername)) {
        return json(400, {
          error: 'Username must be 2-32 chars (letters, numbers, _ - or Chinese)',
        })
      }
      const taken = await env.DB.prepare(
        `SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?`,
      )
        .bind(nextUsername, user.id)
        .first()
      if (taken) return json(409, { error: 'Username already taken' })
    }

    if (changingPassword) {
      if (!currentPassword) {
        return json(400, { error: 'Current password is required' })
      }
      if (newPassword.length < 6) {
        return json(400, { error: 'New password must be at least 6 characters' })
      }
      const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
        .bind(user.id)
        .first()
      if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
        return json(401, { error: 'Current password is incorrect' })
      }
    }

    if (changingUsername) {
      await env.DB.prepare('UPDATE users SET username = ? WHERE id = ?')
        .bind(nextUsername, user.id)
        .run()
    }
    if (changingPassword) {
      const passwordHash = await hashPassword(newPassword)
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(passwordHash, user.id)
        .run()
    }

    const updated = await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url FROM users WHERE id = ?`,
    )
      .bind(user.id)
      .first()

    // 用户名变更后刷新会话 Cookie，避免 JWT 里残留旧 username
    const session = await createSession(env, updated, request)
    return jsonWithSetCookies(200, { user: publicUser(updated) }, session.cookieHeaders)
  } catch (err) {
    return json(500, { error: err.message || 'Server error' })
  }
}
