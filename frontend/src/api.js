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

export function searchSite(q, limit = 20) {
  const params = new URLSearchParams()
  params.set('q', String(q || '').trim())
  if (limit) params.set('limit', String(limit))
  return request(`/api/search?${params.toString()}`)
}

export function fetchPost(slug, preview = false) {
  const qs = preview ? '?preview=1' : ''
  return request(`/api/posts/${encodeURIComponent(slug)}${qs}`)
}

export function fetchAllPosts() {
  return request('/api/posts?all=1')
}

export function createPost(body) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updatePost(id, body) {
  return request(`/api/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deletePost(id) {
  return request(`/api/posts/${id}`, {
    method: 'DELETE',
  })
}

export function register(body) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function login(body) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function logout() {
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

export function togglePostFavorite(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}/favorite`, {
    method: 'POST',
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
