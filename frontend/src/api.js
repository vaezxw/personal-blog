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
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

export function fetchPosts() {
  return request('/api/posts')
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

export function createComment(slug, content) {
  return request(`/api/posts/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function deleteComment(id) {
  return request(`/api/comments/${id}`, { method: 'DELETE' })
}

export function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', {
    method: 'POST',
    body: form,
  })
}
