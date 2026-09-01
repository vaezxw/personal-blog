import { publicUser, requireUser } from '../_lib/auth.js'
import { empty, json } from '../_lib/response.js'

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return empty(204)
  if (context.request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  return json(200, { user: publicUser(auth.user) })
}
