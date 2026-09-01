import { mapPost } from '../../_lib/auth.js'
import { empty, json, readJson } from '../../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const slug = decodeURIComponent(params.slug || '')
  const post = await env.DB.prepare(
    'SELECT id, published FROM posts WHERE slug = ?',
  )
    .bind(slug)
    .first()

  if (!post || !post.published) return json(404, { error: 'Post not found' })

  let countView = true
  try {
    const body = await readJson(request)
    if (body && body.countView === false) countView = false
  } catch {
    /* empty body ok */
  }

  if (countView) {
    await env.DB.prepare(
      'UPDATE posts SET click_count = click_count + 1, view_count = view_count + 1 WHERE id = ?',
    )
      .bind(post.id)
      .run()
  } else {
    await env.DB.prepare('UPDATE posts SET click_count = click_count + 1 WHERE id = ?')
      .bind(post.id)
      .run()
  }

  const row = await env.DB.prepare(
    `SELECT p.*, u.username AS author_username,
    u.avatar_url AS author_avatar_url
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.id = ?`,
  )
    .bind(post.id)
    .first()

  const mapped = mapPost(row)
  return json(200, {
    viewCount: mapped.viewCount,
    likeCount: mapped.likeCount,
    clickCount: mapped.clickCount,
  })
}
