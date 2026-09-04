const API_BASE = import.meta.env.VITE_API_BASE || ''
const USER_KEY = 'blog_user'

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(USER_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mohhen-auth-change', { detail: { user } }))
  }
}

async function tryRefresh() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  if (data.user) setStoredUser(data.user)
  return data.user || null
}

async function request(path, options = {}, retry = true) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && retry && !path.includes('/auth/refresh')) {
    const user = await tryRefresh()
    if (user) return request(path, options, false)
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.code = data.code || ''
    throw err
  }
  return data
}

export function fetchPosts() {
  return request('/api/posts')
}

const POSTS_CACHE_TTL_MS = 60_000
let postsListCache = { at: 0, data: null, inflight: null }

export function invalidatePostsCache() {
  postsListCache = { at: 0, data: null, inflight: null }
}

/** Homepage list with short TTL + stale-while-revalidate. */
export async function fetchPostsCached({ force = false } = {}) {
  const now = Date.now()
  const fresh = postsListCache.data && now - postsListCache.at < POSTS_CACHE_TTL_MS
  if (!force && fresh) return postsListCache.data

  if (!force && postsListCache.data) {
    // Return stale immediately; refresh in background
    if (!postsListCache.inflight) {
      postsListCache.inflight = fetchPosts()
        .then((data) => {
          postsListCache = { at: Date.now(), data, inflight: null }
          return data
        })
        .catch(() => {
          postsListCache.inflight = null
          return postsListCache.data
        })
    }
    return postsListCache.data
  }

  if (postsListCache.inflight) return postsListCache.inflight

  postsListCache.inflight = fetchPosts()
    .then((data) => {
      postsListCache = { at: Date.now(), data, inflight: null }
      return data
    })
    .catch((err) => {
      postsListCache.inflight = null
      throw err
    })
  return postsListCache.inflight
}

export function searchSite(q, limit = 20) {
  const params = new URLSearchParams()
  params.set('q', String(q || '').trim())
  if (limit) params.set('limit', String(limit))
  return request(`/api/search?${params.toString()}`)
}

export function fetchPost(slug, preview = false) {
  return request(`/api/posts/${encodeURIComponent(slug)}${preview ? '?preview=1' : ''}`)
}

const POST_CACHE_TTL_MS = 90_000
/** @type {Map<string, { at: number, data: any, inflight: Promise<any>|null }>} */
const postDetailCache = new Map()

export function invalidatePostCache(slug) {
  if (slug) postDetailCache.delete(String(slug))
  else postDetailCache.clear()
}

export function peekPostCache(slug) {
  const key = String(slug || '')
  const hit = postDetailCache.get(key)
  if (!hit?.data) return null
  if (Date.now() - hit.at > POST_CACHE_TTL_MS) return null
  return hit.data
}

export function warmPostCache(slug, data) {
  if (!slug || !data) return
  postDetailCache.set(String(slug), { at: Date.now(), data, inflight: null })
}

/** Deduped + short-TTL post detail fetch (shared by PostView / Admin repost). */
export async function fetchPostCached(slug, { force = false, preview = false } = {}) {
  const key = String(slug || '')
  if (!key) throw new Error('slug required')
  if (preview) return fetchPost(key, true)

  const now = Date.now()
  const hit = postDetailCache.get(key)
  if (!force && hit?.data && now - hit.at < POST_CACHE_TTL_MS) return hit.data
  if (!force && hit?.inflight) return hit.inflight

  const inflight = fetchPost(key)
    .then((data) => {
      postDetailCache.set(key, { at: Date.now(), data, inflight: null })
      return data
    })
    .catch((err) => {
      const cur = postDetailCache.get(key)
      if (cur) cur.inflight = null
      throw err
    })
  postDetailCache.set(key, {
    at: hit?.at || 0,
    data: hit?.data || null,
    inflight,
  })
  return inflight
}

const ME_TTL_MS = 45_000
let meCache = { at: 0, data: null, inflight: null }

export function invalidateMeCache() {
  meCache = { at: 0, data: null, inflight: null }
}

export async function meCached({ force = false } = {}) {
  const now = Date.now()
  if (!force && meCache.data && now - meCache.at < ME_TTL_MS) return meCache.data
  if (!force && meCache.inflight) return meCache.inflight

  meCache.inflight = me()
    .then((data) => {
      meCache = { at: Date.now(), data, inflight: null }
      if (data?.user) setStoredUser(data.user)
      return data
    })
    .catch((err) => {
      meCache.inflight = null
      throw err
    })
  return meCache.inflight
}

/** Stash a slim source snapshot for /admin?repost= to avoid a cold fetch. */
const REPOST_STASH_KEY = 'mohhen-repost-source'

export function stashRepostSource(post) {
  if (!post?.slug) return
  try {
    sessionStorage.setItem(
      REPOST_STASH_KEY,
      JSON.stringify({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt || '',
        authorUsername: post.authorUsername || '',
        authorId: post.authorId || '',
        at: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function takeRepostSourceStash(slug) {
  try {
    const raw = sessionStorage.getItem(REPOST_STASH_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.slug || data.slug !== slug) return null
    if (Date.now() - Number(data.at || 0) > 5 * 60_000) {
      sessionStorage.removeItem(REPOST_STASH_KEY)
      return null
    }
    sessionStorage.removeItem(REPOST_STASH_KEY)
    return data
  } catch {
    return null
  }
}

export function fetchAllPosts() {
  return request('/api/posts?all=1')
}

export async function createPost(body) {
  const data = await request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  invalidatePostsCache()
  invalidatePostCache()
  return data
}

export async function updatePost(id, body) {
  const data = await request(`/api/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  invalidatePostsCache()
  invalidatePostCache(data?.slug)
  return data
}

export async function deletePost(id) {
  const data = await request(`/api/posts/${id}`, {
    method: 'DELETE',
  })
  invalidatePostsCache()
  invalidatePostCache()
  return data
}

export async function login(body) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (data?.user) {
    setStoredUser(data.user)
    meCache = { at: Date.now(), data, inflight: null }
  }
  return data
}

export async function register(body) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (data?.user) {
    setStoredUser(data.user)
    meCache = { at: Date.now(), data, inflight: null }
  }
  return data
}

export function logout() {
  invalidateMeCache()
  invalidatePostsCache()
  invalidatePostCache()
  setStoredUser(null)
  return request('/api/auth/logout', { method: 'POST' })
}

export function me() {
  return request('/api/auth/me')
}

export function fetchComments(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}/comments`)
}

export function createComment(slug, content, parentId = null) {
  return request(`/api/posts/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId: parentId || undefined }),
  })
}

export function deleteComment(id) {
  return request(`/api/comments/${id}`, { method: 'DELETE' })
}

export function recordPostView(slug, { countView = true } = {}) {
  return request(`/api/posts/${encodeURIComponent(slug)}/view`, {
    method: 'POST',
    body: JSON.stringify({ countView }),
  })
}

export function togglePostLike(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}/like`, {
    method: 'POST',
  })
}

export function togglePostDislike(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}/dislike`, {
    method: 'POST',
  })
}

export function togglePostFavorite(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}/favorite`, {
    method: 'POST',
  })
}

export function fetchFriends() {
  return request('/api/friends')
}

export function sharePostViaDm(slug, { usernames, note } = {}) {
  return request(`/api/posts/${encodeURIComponent(slug)}/share-dm`, {
    method: 'POST',
    body: JSON.stringify({ usernames, note }),
  })
}

export function fetchUserLibrary(username, tab) {
  const q = tab ? `?tab=${encodeURIComponent(tab)}` : ''
  return request(`/api/users/${encodeURIComponent(username)}/library${q}`)
}

export function fetchNotifications() {
  return request('/api/notifications')
}

export function fetchUnreadCount() {
  return request('/api/notifications/unread-count')
}

export function markNotificationsRead(ids) {
  return request('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify(ids ? { ids } : {}),
  })
}

export function fetchMyStats() {
  return request('/api/stats/me')
}

export function updateProfile(body) {
  return request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function uploadAvatar(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/auth/avatar', {
    method: 'POST',
    body: form,
  })
}

export function fetchUserProfile(username) {
  return request(`/api/users/${encodeURIComponent(username)}`)
}

export function toggleFollow(username) {
  return request(`/api/users/${encodeURIComponent(username)}/follow`, {
    method: 'POST',
  })
}

export function fetchUserDashboard(username) {
  return request(`/api/users/${encodeURIComponent(username)}/dashboard`)
}

export function fetchFollowers(username) {
  return request(`/api/users/${encodeURIComponent(username)}/followers`)
}

export function fetchFollowing(username) {
  return request(`/api/users/${encodeURIComponent(username)}/following`)
}

export function fetchConversations() {
  return request('/api/messages')
}

export function fetchMessageUnreadCount() {
  return request('/api/messages/unread-count')
}

export function fetchThread(username, after) {
  const q = after ? `?after=${encodeURIComponent(after)}` : ''
  return request(`/api/messages/${encodeURIComponent(username)}${q}`)
}

export function sendMessage(username, body) {
  return request(`/api/messages/${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

const VIEW_KEY = 'mohhen-post-views'

/** 同一浏览器 24h 内同一文章只计一次阅读 */
export function shouldCountUniqueView(slug) {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    const map = raw ? JSON.parse(raw) : {}
    const prev = Number(map[slug] || 0)
    const now = Date.now()
    if (prev && now - prev < 24 * 60 * 60 * 1000) return false
    map[slug] = now
    localStorage.setItem(VIEW_KEY, JSON.stringify(map))
    return true
  } catch {
    return true
  }
}

export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', {
    method: 'POST',
    body: form,
  })
}

export function uploadVideo(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', {
    method: 'POST',
    body: form,
  })
}

export function uploadAttachment(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', {
    method: 'POST',
    body: form,
  })
}

export function translateText({ text, from = 'auto', to = 'en' }) {
  return request('/api/translate', {
    method: 'POST',
    body: JSON.stringify({ text, from, to }),
  })
}

export function fetchAiConnections() {
  return request('/api/ai/connections')
}

export function createAiConnection(body) {
  return request('/api/ai/connections', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAiConnection(id, body) {
  return request(`/api/ai/connections/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteAiConnection(id) {
  return request(`/api/ai/connections/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function testAiConnection(id) {
  return request(`/api/ai/connections/${encodeURIComponent(id)}/test`, { method: 'POST' })
}

export function fetchAiConversations() {
  return request('/api/ai/conversations')
}

export function createAiConversation(body = {}) {
  return request('/api/ai/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function fetchAiConversationMessages(id) {
  return request(`/api/ai/conversations/${encodeURIComponent(id)}/messages`)
}

export function updateAiConversation(id, body) {
  return request(`/api/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteAiConversation(id) {
  return request(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

function parseAiSseBlocks(buffer) {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split('\n\n')
  return { blocks: blocks.slice(0, -1), rest: blocks[blocks.length - 1] || '' }
}

/** Read a same-origin AI SSE stream. Keys never pass through this function. */
export async function streamAiChat(body, { signal, onEvent } = {}, retry = true) {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  })

  if (res.status === 401 && retry) {
    const user = await tryRefresh()
    if (user) return streamAiChat(body, { signal, onEvent }, false)
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data.error || `Request failed (${res.status})`)
    error.status = res.status
    error.code = data.code || ''
    throw error
  }
  if (!res.body) throw new Error('AI stream is empty')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastPayload = null

  while (true) {
    const result = await reader.read()
    if (result.done) break
    buffer += decoder.decode(result.value, { stream: true })
    const parsed = parseAiSseBlocks(buffer)
    buffer = parsed.rest
    for (const block of parsed.blocks) {
      const eventName = block
        .split('\n')
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim() || 'message'
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data) continue
      let payload
      try {
        payload = JSON.parse(data)
      } catch {
        continue
      }
      lastPayload = payload
      onEvent?.(eventName, payload)
    }
  }
  return lastPayload
}
