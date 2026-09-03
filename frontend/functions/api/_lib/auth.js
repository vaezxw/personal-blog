import { verifyJwt } from './crypto.js'
import { getCookie, ACCESS_COOKIE } from './cookies.js'
import { json } from './response.js'
import { isDeliverableEmail } from './email.js'

export function getJwtSecret(env) {
  return env?.JWT_SECRET || 'dev-jwt-secret-change-me'
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return getCookie(request, ACCESS_COOKIE)
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

export async function optionalUser(context) {
  try {
    const { request, env } = context
    const token = getBearerToken(request)
    const payload = await verifyJwt(token, getJwtSecret(env))
    if (!payload?.sub) return null
    const user = await env.DB.prepare(
      'SELECT id, email, username, role, created_at, avatar_url FROM users WHERE id = ?',
    )
      .bind(payload.sub)
      .first()
    return user || null
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
  const user = await env.DB.prepare(
    'SELECT id, email, username, role, created_at, avatar_url FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first()
  if (!user) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  return { user }
}

export function canManagePost(user, post) {
  if (!user || !post) return false
  if (user.role === 'admin') return true
  return post.author_id === user.id
}

export { simpleMarkdown, renderMarkdown } from './markdown.js'

