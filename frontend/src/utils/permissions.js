/** Client-side permission helpers — keep in sync with functions/api/_lib/auth.js */

export const PERMISSION_KEYS = [
  'posts.publish',
  'ai.chat',
  'tools.use',
  'dashboard.view',
]

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function parsePermissions(raw) {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
  try {
    const parsed = JSON.parse(String(raw))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...parsed }
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function normalizePermissions(raw) {
  const parsed = parsePermissions(raw)
  const out = {}
  for (const key of PERMISSION_KEYS) {
    out[key] = Object.prototype.hasOwnProperty.call(parsed, key)
      ? Boolean(parsed[key])
      : true
  }
  return out
}

/**
 * Empty / missing key = allowed (compat). Explicit false = denied.
 * Admin always allowed.
 */
export function hasPermission(user, key) {
  if (!user) return false
  if (isAdmin(user)) return true
  const perms =
    user.permissions && typeof user.permissions === 'object' && !Array.isArray(user.permissions)
      ? user.permissions
      : parsePermissions(user.permissions)
  if (Object.prototype.hasOwnProperty.call(perms, key)) {
    return Boolean(perms[key])
  }
  return true
}
