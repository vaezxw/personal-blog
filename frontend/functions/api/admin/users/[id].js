import {
  isAdmin,
  isDeleted,
  isMuted,
  normalizePermissions,
  publicUser,
  requireAdmin,
  serializePermissions,
} from '../../_lib/auth.js'
import { generateTempPassword, hashPassword } from '../../_lib/crypto.js'
import { empty, json, readJson } from '../../_lib/response.js'

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

async function loadUser(env, id) {
  const queries = [
    `SELECT id, email, username, role, created_at, avatar_url, permissions, muted_at, deleted_at
     FROM users WHERE id = ?`,
    `SELECT id, email, username, role, created_at, avatar_url, permissions
     FROM users WHERE id = ?`,
    `SELECT id, email, username, role, created_at, avatar_url
     FROM users WHERE id = ?`,
  ]
  for (const sql of queries) {
    try {
      const row = await env.DB.prepare(sql).bind(id).first()
      return row || null
    } catch {
      /* try next */
    }
  }
  return null
}

async function countAdmins(env) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND (deleted_at IS NULL OR deleted_at = '')`,
  )
    .first()
    .catch(async () =>
      env.DB.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'admin'`).first(),
    )
  return Number(row?.c || 0)
}

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return empty(204)

  const auth = await requireAdmin(context)
  if (auth.error) return auth.error

  const id = decodeURIComponent(params.id || '').trim()
  if (!id) return json(400, { error: 'id required' })

  const target = await loadUser(env, id)
  if (!target || isDeleted(target)) return json(404, { error: 'User not found' })

  if (request.method === 'DELETE') {
    if (target.id === auth.user.id) {
      return json(400, { error: 'Cannot delete yourself' })
    }
    if (isAdmin(target) && (await countAdmins(env)) <= 1) {
      return json(400, { error: 'Cannot delete the last admin' })
    }
    const now = new Date().toISOString()
    try {
      await env.DB.prepare('UPDATE users SET deleted_at = ? WHERE id = ?').bind(now, id).run()
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (/no such column: deleted_at/i.test(msg)) {
        return json(503, { error: 'Moderation columns not migrated yet' })
      }
      return json(500, { error: msg || 'Delete failed' })
    }
    try {
      await env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(id).run()
    } catch {
      /* ignore */
    }
    return json(200, { ok: true })
  }

  if (request.method !== 'PATCH' && request.method !== 'PUT') {
    return json(405, { error: 'Method not allowed' })
  }

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  if (body.resetPassword) {
    const temporaryPassword = generateTempPassword(12)
    const passwordHash = await hashPassword(temporaryPassword)
    try {
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        .bind(passwordHash, id)
        .run()
    } catch (err) {
      return json(500, { error: err?.message || 'Password reset failed' })
    }
    try {
      await env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(id).run()
    } catch {
      /* ignore */
    }
    const updated = await loadUser(env, id)
    return json(200, {
      user: mapAdminUser(updated),
      temporaryPassword,
    })
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
    if (target.role === 'admin' && role !== 'admin' && (await countAdmins(env)) <= 1) {
      return json(400, { error: 'Cannot demote the last admin' })
    }
    nextRole = role
  }

  let nextPermissionsJson = null
  if (body.permissions !== undefined) {
    if (isAdmin({ ...target, role: nextRole })) {
      nextPermissionsJson = '{}'
    } else {
      nextPermissionsJson = serializePermissions(body.permissions)
    }
  }

  let nextMutedAt = undefined
  if (body.muted !== undefined) {
    if (target.id === auth.user.id && body.muted) {
      return json(400, { error: 'Cannot mute yourself' })
    }
    if (isAdmin({ ...target, role: nextRole }) && body.muted) {
      return json(400, { error: 'Cannot mute an admin' })
    }
    nextMutedAt = body.muted ? new Date().toISOString() : null
  }

  const sets = []
  const binds = []
  if (nextRole !== target.role) {
    sets.push('role = ?')
    binds.push(nextRole)
  }
  if (nextPermissionsJson !== null) {
    sets.push('permissions = ?')
    binds.push(nextPermissionsJson)
  }
  if (nextMutedAt !== undefined) {
    sets.push('muted_at = ?')
    binds.push(nextMutedAt)
  }

  if (sets.length) {
    try {
      await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...binds, id)
        .run()
    } catch (err) {
      const msg = String(err?.message || err || '')
      if (/no such column: (permissions|muted_at)/i.test(msg)) {
        return json(503, { error: 'Run latest D1 migrations first' })
      }
      return json(500, { error: msg || 'Update failed' })
    }
  }

  const updated = await loadUser(env, id)
  return json(200, { user: mapAdminUser(updated) })
}
