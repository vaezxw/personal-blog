import {
  getStore,
  json,
  empty,
  readJson,
  requireAdmin,
  simpleMarkdown,
  corsHeaders,
} from '../_store.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') {
    return empty(204)
  }

  const param = decodeURIComponent(params.slug || '')
  const posts = getStore()
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const includeDrafts = url.searchParams.get('preview') === '1'
    if (includeDrafts && !requireAdmin(request, env)) {
      return json(401, { error: 'Unauthorized' })
    }
    const post = posts.find((p) => p.slug === param && (includeDrafts || p.published))
    if (!post) {
      return json(404, { error: 'Post not found' })
    }
    return json(200, {
      ...post,
      html: simpleMarkdown(post.content),
    })
  }

  if (!requireAdmin(request, env)) {
    return json(401, { error: 'Unauthorized' })
  }

  const index = posts.findIndex((p) => p.id === param)
  if (index === -1) {
    return json(404, { error: 'Post not found' })
  }

  if (request.method === 'PUT') {
    try {
      const body = await readJson(request)
      if (body.slug && posts.some((p) => p.slug === body.slug && p.id !== param)) {
        return json(409, { error: 'Slug already exists' })
      }
      const current = posts[index]
      posts[index] = {
        ...current,
        title: body.title !== undefined ? String(body.title).trim() : current.title,
        slug: body.slug !== undefined ? String(body.slug).trim() : current.slug,
        excerpt: body.excerpt !== undefined ? String(body.excerpt).trim() : current.excerpt,
        content: body.content !== undefined ? body.content : current.content,
        published: body.published !== undefined ? Boolean(body.published) : current.published,
        updatedAt: new Date().toISOString(),
      }
      return json(200, posts[index])
    } catch {
      return json(400, { error: 'Invalid JSON body' })
    }
  }

  if (request.method === 'DELETE') {
    posts.splice(index, 1)
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  return json(405, { error: 'Method not allowed' })
}
