const API_BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

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

export function fetchPost(slug) {
  return request(`/api/posts/${encodeURIComponent(slug)}`)
}

export function fetchAllPosts(token) {
  return request('/api/posts?all=1', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createPost(token, body) {
  return request('/api/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

export function updatePost(token, id, body) {
  return request(`/api/posts/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

export function deletePost(token, id) {
  return request(`/api/posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
