import { verifyJwt } from './crypto.js'
import { getCookie, ACCESS_COOKIE } from './cookies.js'
import { json } from './response.js'

export function getJwtSecret(env) {
  return env?.JWT_SECRET || 'dev-jwt-secret-change-me'
}

export function getBearerToken(request) {
  const header = request.headers.get('Authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return getCookie(request, ACCESS_COOKIE)
}

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
  }
}

export function mapPost(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    published: Boolean(row.published),
    authorId: row.author_id,
    authorUsername: row.author_username || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function requireUser(context) {
  const { request, env } = context
  const token = getBearerToken(request)
  const payload = await verifyJwt(token, getJwtSecret(env))
  if (!payload?.sub) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  const user = await env.DB.prepare(
    'SELECT id, email, username, role, created_at FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first()
  if (!user) {
    return { error: json(401, { error: 'Unauthorized' }) }
  }
  return { user }
}

export function canManagePost(user, post) {
  if (!user || !post) return false
  if (user.role === 'admin') return true
  return post.author_id === user.id
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function simpleMarkdown(md) {
  const escaped = escapeHtml(md || '')
  const withCode = escaped.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
  const lines = withCode.split(/\n/)
  const html = []
  let inList = false

  for (const line of lines) {
    if (/^### /.test(line)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h3>${line.slice(4)}</h3>`)
      continue
    }
    if (/^## /.test(line)) {
      if (inList) {
        html.push('</ul>')
        inList = false
      }
      html.push(`<h2>${line.slice(3)}</h2>`)
      continue
    }
    if (/^- /.test(line)) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`)
      continue
    }
    if (inList) {
      html.push('</ul>')
      inList = false
    }
    if (!line.trim()) continue
    if (line.startsWith('<pre>')) {
      html.push(line)
      continue
    }
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      html.push(
        `<p><img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}" loading="lazy" /></p>`,
      )
      continue
    }
    html.push(`<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`)
  }
  if (inList) html.push('</ul>')
  return html.join('\n')
}
