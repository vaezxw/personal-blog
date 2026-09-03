/** Structured DM post-share payload (new) + legacy plain-text fallback. */

export const SHARE_MARKER = '⟦MOHHEN_SHARE_POST⟧'

/**
 * @param {{ slug: string, title: string, authorUsername?: string, excerpt?: string, note?: string }} data
 */
export function encodePostShare(data) {
  const payload = {
    v: 1,
    type: 'post',
    slug: String(data.slug || '').trim(),
    title: String(data.title || '').trim().slice(0, 200),
    author: String(data.authorUsername || '').trim().slice(0, 64),
    excerpt: String(data.excerpt || '').trim().slice(0, 160),
    note: String(data.note || '').trim().slice(0, 200),
  }
  return `${SHARE_MARKER}${JSON.stringify(payload)}`
}

export function sharePreviewText(data) {
  const title = String(data?.title || '').trim() || '文章'
  return `分享《${title}》`
}

/**
 * @returns {{ slug: string, title: string, author: string, excerpt: string, note: string } | null}
 */
export function parsePostShare(body) {
  const text = String(body || '')
  if (!text) return null

  if (text.startsWith(SHARE_MARKER)) {
    try {
      const raw = JSON.parse(text.slice(SHARE_MARKER.length))
      if (!raw || raw.type !== 'post' || !raw.slug) return null
      return {
        slug: String(raw.slug),
        title: String(raw.title || raw.slug),
        author: String(raw.author || ''),
        excerpt: String(raw.excerpt || ''),
        note: String(raw.note || ''),
      }
    } catch {
      return null
    }
  }

  // Legacy: 【分享文章】\n《title》\n作者：@user\nhttps://.../post/slug\n留言：...
  if (!text.includes('【分享文章】')) return null
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let title = ''
  let author = ''
  let note = ''
  let slug = ''
  for (const line of lines) {
    const titleMatch = line.match(/^《(.+)》$/)
    if (titleMatch) title = titleMatch[1]
    const authorMatch = line.match(/^作者：@?(.+)$/)
    if (authorMatch) author = authorMatch[1].trim()
    const noteMatch = line.match(/^留言：(.+)$/)
    if (noteMatch) note = noteMatch[1]
    const urlMatch = line.match(/\/post\/([^/?#\s]+)/)
    if (urlMatch) {
      try {
        slug = decodeURIComponent(urlMatch[1])
      } catch {
        slug = urlMatch[1]
      }
    }
  }
  if (!slug) return null
  return { slug, title: title || slug, author, excerpt: '', note }
}
