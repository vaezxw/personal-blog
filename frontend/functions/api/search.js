import { mapPost, optionalUser } from './_lib/auth.js'
import { mapPublicUser } from './_lib/follows.js'
import { enrichPosts } from './_lib/stats.js'
import { empty, json } from './_lib/response.js'
import { publishedVisibilitySql } from './_lib/visibility.js'

const MAX_Q = 80
const MAX_TOKENS = 5
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 40

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

function parseQuery(raw) {
  const q = String(raw || '')
    .trim()
    .slice(0, MAX_Q)
  if (!q) return { q: '', tokens: [] }
  const tokens = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TOKENS)
  return { q, tokens }
}

function likePatterns(tokens) {
  return tokens.map((t) => `%${escapeLike(t)}%`)
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const url = new URL(request.url)
  const { q, tokens } = parseQuery(url.searchParams.get('q') || '')
  let limit = Number(url.searchParams.get('limit') || DEFAULT_LIMIT)
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT
  limit = Math.min(MAX_LIMIT, Math.floor(limit))

  if (!tokens.length) {
    return json(200, { q: '', posts: [], users: [] })
  }

  const viewer = await optionalUser(context)
  const patterns = likePatterns(tokens)
  const vis = publishedVisibilitySql(viewer?.id || null)

  // Every token must match title/excerpt/content/slug (AND across tokens, OR across fields)
  const postTokenSql = tokens
    .map(
      () =>
        `(p.title LIKE ? ESCAPE '\\' OR p.excerpt LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\' OR p.slug LIKE ? ESCAPE '\\')`,
    )
    .join(' AND ')
  const postBinds = []
  for (const pat of patterns) {
    postBinds.push(pat, pat, pat, pat)
  }

  const titleBoostSql = tokens
    .map(() => `(CASE WHEN p.title LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END)`)
    .join(' + ')
  const titleBoostBinds = patterns.slice()

  const { results: postRows } = await env.DB.prepare(
    `SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar_url,
            (${titleBoostSql}) AS title_hits
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE ${vis.sql}
       AND (${postTokenSql})
     ORDER BY title_hits DESC, p.created_at DESC
     LIMIT ?`,
  )
    .bind(...titleBoostBinds, ...vis.binds, ...postBinds, limit)
    .all()

  const enriched = await enrichPosts(env.DB, (postRows || []).map(mapPost), {
    userId: viewer?.id || null,
  })
  const posts = enriched.map((p) => {
    const { content, ...rest } = p
    const excerpt =
      rest.excerpt ||
      String(content || '')
        .replace(/[#>*`\[\]()_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180)
    return { ...rest, excerpt }
  })

  const userTokenSql = tokens.map(() => `username LIKE ? ESCAPE '\\'`).join(' AND ')
  const { results: userRows } = await env.DB.prepare(
    `SELECT id, username, role, created_at, avatar_url
     FROM users
     WHERE ${userTokenSql}
     ORDER BY
       CASE WHEN username = ? COLLATE NOCASE THEN 0
            WHEN username LIKE ? ESCAPE '\\' THEN 1
            ELSE 2 END,
       username COLLATE NOCASE ASC
     LIMIT ?`,
  )
    .bind(...patterns, tokens[0], `${escapeLike(tokens[0])}%`, Math.min(limit, 20))
    .all()

  const users = (userRows || []).map((row) => mapPublicUser(row))

  return json(200, {
    q,
    posts,
    users,
  })
}
