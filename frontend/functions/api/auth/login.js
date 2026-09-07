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

    const loginQueries = [
      `SELECT id, email, username, password_hash, role, created_at, avatar_url, permissions, muted_at, deleted_at
       FROM users
       WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE`,
      `SELECT id, email, username, password_hash, role, created_at, avatar_url, permissions
       FROM users
       WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE`,
      `SELECT id, email, username, password_hash, role, created_at, avatar_url
       FROM users
       WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE`,
    ]

    let user = null
    for (const sql of loginQueries) {
      try {
        user = await env.DB.prepare(sql).bind(login, login).first()
        break
      } catch {
        /* try next */
      }
    }

    if (!user || user.deleted_at || !(await verifyPassword(password, user.password_hash))) {
      return json(401, { error: 'Invalid credentials' })
    }

    const session = await createSession(env, user, request)
    return jsonWithSetCookies(200, { user: publicUser(user) }, session.cookieHeaders)
  } catch (err) {
    return json(500, { error: err.message || 'Server error' })
  }
}
