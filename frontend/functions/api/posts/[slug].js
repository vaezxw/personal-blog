import { canManagePost, mapPost, optionalUser, requireUser, simpleMarkdown } from '../_lib/auth.js'
import { deletePostAttachments, replacePostAttachments } from '../_lib/attachments.js'
import { createNotification } from '../_lib/notifications.js'
import { notifyMentions } from '../_lib/mentions.js'
import { notifyFollowersOfNewPost } from '../_lib/postFollowNotify.js'
import { enrichPosts } from '../_lib/stats.js'
import { corsHeaders, empty, json, readJson } from '../_lib/response.js'
import {
  canViewPost,
  normalizeVisibility,
  visibilityDeniedPayload,
} from '../_lib/visibility.js'

async function resolveRepostSource(db, body, selfId) {
  if (body.repostOfSlug === '' || body.repostOfPostId === '') return { clear: true }
  const slug = String(body?.repostOfSlug || '').trim()
  const id = String(body?.repostOfPostId || '').trim()
  if (!slug && !id) return null
  const row = id
    ? await db.prepare('SELECT id, author_id, published FROM posts WHERE id = ?').bind(id).first()
    : await db.prepare('SELECT id, author_id, published FROM posts WHERE slug = ?').bind(slug).first()
  if (!row?.published) return { error: 'Source post not found or not published' }
  if (row.id === selfId) return { error: 'Cannot repost the same post onto itself' }
  return { source: row }
}

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)

  const param = decodeURIComponent(params.slug || '')
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('preview') === '1'
    let user = null
    if (includeDrafts) {
      const auth = await requireUser(context)
      if (auth.error) return auth.error
      user = auth.user
    } else {
      user = await optionalUser(context)
    }

    const row = await env.DB.prepare(
      `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
       FROM posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.slug = ?`,
    )
      .bind(param)
      .first()

    if (!row) return json(404, { error: 'Post not found' })
    if (!row.published) {
      if (!user || !canManagePost(user, row)) {
        return json(404, { error: 'Post not found' })
      }
    } else if (!(await canViewPost(env.DB, user, row))) {
      if (!user) return json(401, { ...visibilityDeniedPayload(row), error: 'Login required' })
      return json(403, visibilityDeniedPayload(row))
    }

    const [post] = await enrichPosts(env.DB, [mapPost(row)], { userId: user?.id || null })
    return json(200, {
      ...post,
      html: simpleMarkdown(post.content),
    })
  }

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(param).first()
  if (!row) return json(404, { error: 'Post not found' })
  if (!canManagePost(user, row)) return json(403, { error: 'Forbidden' })

  if (request.method === 'PUT') {
    try {
      const body = await readJson(request)
      if (body.slug) {
        const conflict = await env.DB.prepare(
          'SELECT id FROM posts WHERE slug = ? AND id != ?',
        )
          .bind(String(body.slug).trim(), param)
          .first()
        if (conflict) return json(409, { error: 'Slug already exists' })
      }

      const title = body.title !== undefined ? String(body.title).trim() : row.title
      const slug = body.slug !== undefined ? String(body.slug).trim() : row.slug
      const excerpt = body.excerpt !== undefined ? String(body.excerpt).trim() : row.excerpt
      const content = body.content !== undefined ? body.content : row.content
      const published =
        body.published !== undefined ? (body.published ? 1 : 0) : row.published
      const visibility =
        body.visibility !== undefined
          ? normalizeVisibility(body.visibility, row.visibility || 'public')
          : normalizeVisibility(row.visibility)
      const updatedAt = new Date().toISOString()

      const wasPublished = Number(row.published) === 1
      const wasVisibility = normalizeVisibility(row.visibility)

      let repostOf = row.repost_of_post_id || null
      let source = null
      if (body.repostOfSlug !== undefined || body.repostOfPostId !== undefined) {
        const resolved = await resolveRepostSource(env.DB, body, param)
        if (resolved?.error) return json(400, { error: resolved.error })
        if (resolved?.clear) repostOf = null
        else if (resolved?.source) {
          if (resolved.source.author_id === user.id) {
            return json(400, { error: 'Cannot republish your own post' })
          }
          source = resolved.source
          repostOf = source.id
        }
      }

      try {
        await env.DB.prepare(
          `UPDATE posts
           SET title = ?, slug = ?, excerpt = ?, content = ?, published = ?, visibility = ?, updated_at = ?, repost_of_post_id = ?
           WHERE id = ?`,
        )
          .bind(title, slug, excerpt, content, published, visibility, updatedAt, repostOf, param)
          .run()
      } catch {
        await env.DB.prepare(
          `UPDATE posts
           SET title = ?, slug = ?, excerpt = ?, content = ?, published = ?, visibility = ?, updated_at = ?
           WHERE id = ?`,
        )
          .bind(title, slug, excerpt, content, published, visibility, updatedAt, param)
          .run()
      }

      if (body.attachments !== undefined) {
        await replacePostAttachments(env.DB, param, body.attachments)
      }

      // First publish, or private → visible: notify followers once (idempotent)
      const becameVisible =
        published === 1 &&
        (!wasPublished || (wasVisibility === 'private' && visibility !== 'private'))
      if (becameVisible) {
        await notifyFollowersOfNewPost(env.DB, {
          id: param,
          author_id: row.author_id,
          published,
          visibility,
        })
        if (source?.author_id || repostOf) {
          const srcAuthor =
            source?.author_id ||
            (
              await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?')
                .bind(repostOf)
                .first()
            )?.author_id
          if (srcAuthor) {
            try {
              await createNotification(env.DB, {
                userId: srcAuthor,
                actorId: user.id,
                type: 'repost',
                postId: param,
              })
            } catch {
              /* ignore */
            }
          }
        }
      }
      if (published) {
        try {
          await notifyMentions(env.DB, {
            actorId: user.id,
            text: `${title}\n${excerpt}\n${content}`,
            postId: param,
          })
        } catch {
          /* ignore */
        }
      }

      const updated = await env.DB.prepare(
        `SELECT p.*, u.username AS author_username,
         u.avatar_url AS author_avatar_url
         FROM posts p
         JOIN users u ON u.id = p.author_id
         WHERE p.id = ?`,
      )
        .bind(param)
        .first()

      const [mapped] = await enrichPosts(env.DB, [mapPost(updated)], { userId: user.id })
      return json(200, mapped)
    } catch (err) {
      return json(400, { error: err.message || 'Invalid JSON body' })
    }
  }

  if (request.method === 'DELETE') {
    await deletePostAttachments(env.DB, env.MEDIA, param)
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ?').bind(param).run()
    try {
      await env.DB.prepare('DELETE FROM post_dislikes WHERE post_id = ?').bind(param).run()
    } catch {
      /* ignore */
    }
    await env.DB.prepare('DELETE FROM post_favorites WHERE post_id = ?').bind(param).run()
    await env.DB.prepare('DELETE FROM post_follow_emails WHERE post_id = ?').bind(param).run()
    await env.DB.prepare('DELETE FROM notifications WHERE post_id = ?').bind(param).run()
    await env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(param).run()
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(param).run()
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  return json(405, { error: 'Method not allowed' })
}
