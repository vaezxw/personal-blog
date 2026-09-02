import { requireUser } from '../_lib/auth.js'
import { corsHeaders, empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'DELETE') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error

  const id = decodeURIComponent(params.id || '')
  const comment = await env.DB.prepare('SELECT * FROM comments WHERE id = ?').bind(id).first()
  if (!comment) return json(404, { error: 'Comment not found' })

  const canDelete = auth.user.role === 'admin' || comment.user_id === auth.user.id
  if (!canDelete) return json(403, { error: 'Forbidden' })

  // Delete nested replies first, then the comment itself
  await env.DB.prepare('DELETE FROM comments WHERE parent_id = ?').bind(id).run()
  await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run()
  return new Response(null, { status: 204, headers: corsHeaders() })
}
