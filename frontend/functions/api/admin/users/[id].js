import {
  isAdmin,
  normalizePermissions,
  publicUser,
  requireAdmin,
  serializePermissions,
} from '../../_lib/auth.js'
import { empty, json, readJson } from '../../_lib/response.js'

function mapAdminUser(row) {
  return {
    ...publicUser(row),
    email: row.email || null,
    permissions: normalizePermissions(row.permissions),
    isAdmin: isAdmin(row),
  }
}

async function loadUser(env, id) {
  try {
    return await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url, permissions
       FROM users WHERE id = ?`,
    )
      .bind(id)
      .first()
  } catch {
    return await env.DB.prepare(
      `SELECT id, email, username, role, created_at, avatar_url
       FROM users WHERE id = ?`,
    )
      .bind(id)
      .first()
  }
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'PATCH' && request.method !== 'PUT') {
    return json(405, { error: 'Method not allowed' })
  }

  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const id = decodeURIComponent(params.id || '').trim()
  if (!id) return json(400, { error: 'id required' })

  const target = await loadUser(env, id)
  if (!target) return json(404, { error: 'User not found' })

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  let nextRole = target.role
  if (body.role !== undefined) {
    const role = String(body.role || '').trim()
    if (role !== 'admin' && role !== 'author') {
      return json(400, { error: 'role must be admin or author' })
    }
    if (target.id === auth.user.id && role !== 'admin') {
      return json(400, { error: 'Cannot demote yourself' })
    }
    if (target.role === 'admin' && role !== 'admin') {
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`,
      ).first()
      if (Number(row?.c || 0) <= 1) {
        return json(400, { error: 'Cannot demote the last admin' })
      }
    }
    nextRole = role
  }

  let nextPermissionsJson = null
  if (body.permissions !== undefined) {
    if (isAdmin({ ...target, role: nextRole })) {
      // Admins always have full access; keep stored map empty/compat
      nextPermissionsJson = '{}'
    } else {
      nextPermissionsJson = serializePermissions(body.permissions)
    }
  }

  try {
    if (nextPermissionsJson !== null && nextRole !== target.role) {
      await env.DB.prepare('UPDATE users SET role = ?, permissions = ? WHERE id = ?')
        .bind(nextRole, nextPermissionsJson, id)
        .run()
    } else if (nextRole !== target.role) {
      await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
        .bind(nextRole, id)
        .run()
    } else if (nextPermissionsJson !== null) {
      await env.DB.prepare('UPDATE users SET permissions = ? WHERE id = ?')
        .bind(nextPermissionsJson, id)
        .run()
    }
  } catch (err) {
    const msg = String(err?.message || err || '')
    if (/no such column: permissions/i.test(msg)) {
      if (nextRole !== target.role) {
        await env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
          .bind(nextRole, id)
          .run()
      } else {
        return json(503, { error: 'Permissions column not migrated yet' })
      }
    } else {
      return json(500, { error: msg || 'Update failed' })
    }
  }

  const updated = await loadUser(env, id)
  return json(200, { user: mapAdminUser(updated) })
}
