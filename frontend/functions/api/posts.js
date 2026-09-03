import { mapPost, optionalUser, requireUser } from './_lib/auth.js'
import { replacePostAttachments } from './_lib/attachments.js'
import { newId } from './_lib/crypto.js'
import { notifyFollowersOfNewPost } from './_lib/postFollowNotify.js'
import { enrichPosts } from './_lib/stats.js'
import { empty, json, readJson } from './_lib/response.js'
import { normalizeVisibility, publishedVisibilitySql } from './_lib/visibility.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') return empty(204)

  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('all') === '1'

    if (!includeDrafts) {
      const user = await optionalUser(context)
      const vis = publishedVisibilitySql(user?.id || null)
      const { results } = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE ${vis.sql}
         ORDER BY p.created_at DESC`,
      )
        .bind(...vis.binds)
        .all()
      const posts = await enrichPosts(env.DB, (results || []).map(mapPost), {
        userId: user?.id || null,
      })
      return json(200, posts)
    }

    const auth = await requireUser(context)
    if (auth.error) return auth.error
    const { user } = auth

    let stmt
    if (user.role === 'admin') {
      stmt = env.DB.prepare(
        `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
         FROM posts p
         JOIN users u ON u.id = p.author_id
         ORDER BY p.created_at DESC`,
      )
    } else {
      stmt = env.DB.prepare(
        `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.author_id = ?
         ORDER BY p.created_at DESC`,
      ).bind(user.id)
    }
    const { results } = await stmt.all()
    const posts = await enrichPosts(env.DB, (results || []).map(mapPost), { userId: user.id })
    return json(200, posts)
  }

  if (request.method === 'POST') {
    const auth = await requireUser(context)
    if (auth.error) return auth.error
    const { user } = auth

    try {
      const body = await readJson(request)
      if (!body.title || !body.slug) {
        return json(400, { error: 'title and slug are required' })
      }

      const slug = String(body.slug).trim()
      const existing = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first()
      if (existing) return json(409, { error: 'Slug already exists' })

      const now = new Date().toISOString()
      const id = newId('p')
      const title = String(body.title).trim()
      const excerpt = String(body.excerpt || '').trim()
      const content = body.content || ''
      const published = body.published ? 1 : 0
      const visibility = normalizeVisibility(body.visibility)

      await env.DB.prepare(
        `INSERT INTO posts (id, title, slug, excerpt, content, published, visibility, author_id, created_at, updated_at, view_count, like_count, click_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      )
        .bind(id, title, slug, excerpt, content, published, visibility, user.id, now, now)
        .run()

      if (body.attachments !== undefined) {
        await replacePostAttachments(env.DB, id, body.attachments)
      }

      if (published) {
        await notifyFollowersOfNewPost(env.DB, {
          id,
          author_id: user.id,
          published,
          visibility,
        })
      }

      const row = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.id = ?`,
      )
        .bind(id)
        .first()

      const [mapped] = await enrichPosts(env.DB, [mapPost(row)], { userId: user.id })
      return json(201, mapped)
    } catch (err) {
      return json(400, { error: err.message || 'Invalid JSON body' })
    }
  }

  return json(405, { error: 'Method not allowed' })
}
