import { verifyJwt } from './crypto.js'
import { getCookie, ACCESS_COOKIE } from './cookies.js'
import { json } from './response.js'
import { isDeliverableEmail } from './email.js'

export const PERMISSION_KEYS = [
  'posts.publish',
  'ai.chat',
  'tools.use',
  'dashboard.view',
]

const USER_COLUMNS_FALLBACK = [
  'id, email, username, role, created_at, avatar_url, permissions, muted_at, deleted_at',
  'id, email, username, role, created_at, avatar_url, permissions',
  'id, email, username, role, created_at, avatar_url',
]

export function getJwtSecret(env) {
  return env?.JWT_SECRET || 'dev-jwt-secret-change-me'
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return getCookie(request, ACCESS_COOKIE)
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function isMuted(user) {
  return Boolean(user?.muted_at || user?.mutedAt || user?.muted)
}

export function isDeleted(user) {
  return Boolean(user?.deleted_at || user?.deletedAt || user?.deleted)
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

/** Expand to a full boolean map for admin UI / publicUser. Missing keys default true. */
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

/** Persist only known keys as booleans. */
export function serializePermissions(input) {
  const src = parsePermissions(input)
  const out = {}
  for (const key of PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      out[key] = Boolean(src[key])
    }
  }
  return JSON.stringify(out)
}

export function publicUser(row) {
  if (!row) return null
  const email = isDeliverableEmail(row.email) ? row.email : null
  return {
    id: row.id,
    email,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
    avatarUrl: row.avatar_url || null,
    permissions: normalizePermissions(row.permissions),
    muted: isMuted(row),
    mutedAt: row.muted_at || null,
    deleted: isDeleted(row),
  }
}

export function mapPost(row) {
  if (!row) return null
  const post = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    published: Boolean(row.published),
    visibility: row.visibility || 'public',
    authorId: row.author_id,
    authorUsername: row.author_username || undefined,
    authorAvatarUrl: row.author_avatar_url || null,
    viewCount: Number(row.view_count || 0),
    likeCount: Number(row.like_count || 0),
    dislikeCount: Number(row.dislike_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    clickCount: Number(row.click_count || 0),
    repostOfPostId: row.repost_of_post_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (row.content !== undefined && row.content !== null) {
    post.content = row.content
  }
  return post
}

async function loadUserById(env, id) {
  for (const cols of USER_COLUMNS_FALLBACK) {
    try {
      const row = await env.DB.prepare(`SELECT ${cols} FROM users WHERE id = ?`)
        .bind(id)
        .first()
      return row || null
    } catch {
      /* try next column set */
    }
  }
  return null
}

export async function optionalUser(context) {
  try {
    const { request, env } = context
    const token = getBearerToken(request)
    const payload = await verifyJwt(token, getJwtSecret(env))
    if (!payload?.sub) return null
    const user = await loadUserById(env, payload.sub)
    if (!user || isDeleted(user)) return null
    return user
  } catch {
    return null
  }
}

export async function requireUser(context) {
  const { request, env } = context
  const token = getBearerToken(request)
  const payload = await verifyJwt(token, getJwtSecret(env))
  if (!payload?.sub) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  const user = await loadUserById(env, payload.sub)
  if (!user || isDeleted(user)) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  return { user }
}

export async function requireAdmin(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth
  if (!isAdmin(auth.user)) {
    return { error: json(403, { error: 'Forbidden' }) }
  }
  return auth
}

export async function requireNotMuted(context) {
  const auth = await requireUser(context)
  if (auth.error) return auth
  if (isMuted(auth.user) && !isAdmin(auth.user)) {
    return { error: json(403, { error: 'Muted', code: 'muted' }) }
  }
  return auth
}

export async function requirePermission(context, key) {
  const auth = await requireUser(context)
  if (auth.error) return auth
  if (isMuted(auth.user) && !isAdmin(auth.user) && (key === 'posts.publish' || key === 'ai.chat')) {
    return { error: json(403, { error: 'Muted', code: 'muted' }) }
  }
  if (!hasPermission(auth.user, key)) {
    return { error: json(403, { error: 'Forbidden' }) }
  }
  return auth
}

export function canManagePost(user, post) {
  if (!user || !post) return false
  if (user.role === 'admin') return true
  return post.author_id === user.id
}

export { simpleMarkdown, renderMarkdown } from './markdown.js'
