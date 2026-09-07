import {
  isAdmin,
  normalizePermissions,
  publicUser,
  requireAdmin,
} from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

function mapAdminUser(row) {
  const base = publicUser(row)
  return {
    ...base,
    email: row.email || null,
    permissions: normalizePermissions(row.permissions),
    isAdmin: isAdmin(row),
  }
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  let results
  try {
    ;({ results } = await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url, permissions
       FROM users
       ORDER BY created_at ASC`,
    ).all())
  } catch {
    ;({ results } = await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url
       FROM users
       ORDER BY created_at ASC`,
    ).all())
  }

  return json(200, {
    users: (results || []).map(mapAdminUser),
  })
}
