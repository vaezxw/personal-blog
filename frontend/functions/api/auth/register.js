import { hashPassword, newId } from '../_lib/crypto.js'
import { publicUser } from '../_lib/auth.js'
import { createSession } from '../_lib/session.js'
import { empty, json, jsonWithSetCookies, readJson } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = await readJson(request)
    const email = String(body.email || '').trim().toLowerCase()
    const username = String(body.username || '').trim()
    const password = String(body.password || '')

    if (!email || !username || !password) {
      return json(400, { error: 'email, username and password are required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Invalid email' })
    }
    if (username.length < 2 || username.length > 32) {
      return json(400, { error: 'username must be 2-32 characters' })
    }
    if (password.length < 6) {
      return json(400, { error: 'password must be at least 6 characters' })
    }

    const countRow = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first()
    const isFirst = Number(countRow?.c || 0) === 0
    const role = isFirst ? 'admin' : 'author'
    const id = newId('u')
    const passwordHash = await hashPassword(password)
    const createdAt = new Date().toISOString()

    try {
      await env.DB.prepare(
        `INSERT INTO users (id, email, username, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, email, username, passwordHash, role, createdAt)
        .run()
    } catch (err) {
      const msg = String(err?.message || err)
      if (msg.includes('UNIQUE') || msg.includes('unique')) {
        return json(409, { error: 'Email or username already exists' })
      }
      throw err
    }

    const user = { id, email, username, role, created_at: createdAt }
    const session = await createSession(env, user, request)
    return jsonWithSetCookies(201, { user: publicUser(user) }, session.cookieHeaders)
  } catch (err) {
    return json(500, { error: err.message || 'Server error' })
  }
}
