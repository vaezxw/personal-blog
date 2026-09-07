import {
  isAdmin,
  isDeleted,
  isMuted,
  normalizePermissions,
  publicUser,
  requireAdmin,
} from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

function mapAdminUser(row) {
  return {
    ...publicUser(row),
    email: row.email || null,
    permissions: normalizePermissions(row.permissions),
    isAdmin: isAdmin(row),
    muted: isMuted(row),
    mutedAt: row.muted_at || null,
    deleted: isDeleted(row),
  }
}

const LIST_QUERIES = [
  `SELECT id, email, username, role, created_at, avatar_url, permissions, muted_at, deleted_at
   FROM users
   WHERE deleted_at IS NULL
   ORDER BY created_at ASC`,
  `SELECT id, email, username, role, created_at, avatar_url, permissions
   FROM users
   ORDER BY created_at ASC`,
  `SELECT id, email, username, role, created_at, avatar_url
   FROM users
   ORDER BY created_at ASC`,
]

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  let results = []
  for (const sql of LIST_QUERIES) {
    try {
      ;({ results } = await env.DB.prepare(sql).all())
      break
    } catch {
      /* try next */
    }
  }

  return json(200, {
    users: (results || []).map(mapAdminUser),
  })
}
