import { verifyPassword } from '../_lib/crypto.js'
import { publicUser } from '../_lib/auth.js'
import { createSession } from '../_lib/session.js'
import { empty, json, jsonWithSetCookies, readJson } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = await readJson(request)
    const login = String(body.email || body.username || '').trim()
    const password = String(body.password || '')

    if (!login || !password) {
      return json(400, { error: 'email/username and password are required' })
    }

    const user = await env.DB.prepare(
      `SELECT id, email, username, password_hash, role, created_at, avatar_url
       FROM users
       WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE`,
    )
      .bind(login, login)
      .first()

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json(401, { error: 'Invalid credentials' })
    }

    const session = await createSession(env, user, request)
    return jsonWithSetCookies(200, { user: publicUser(user) }, session.cookieHeaders)
  } catch (err) {
    return json(500, { error: err.message || 'Server error' })
  }
}
