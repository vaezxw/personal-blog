/**
 * 解析 Markdown 文本：可选 YAML-like front matter + 正文
 * 支持 --- 包裹的简单 key: value（不依赖外部库）
 */
export function parseMarkdownDocument(raw, fileName = '') {
  const text = String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
  const meta = {}
  let body = text

  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (fm) {
    const yamlBlock = fm[1]
    body = fm[2] || ''
    for (const line of yamlBlock.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf(':')
      if (idx <= 0) continue
      const key = trimmed.slice(0, idx).trim().toLowerCase()
      let value = trimmed.slice(idx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (key === 'title' || key === 'slug' || key === 'excerpt' || key === 'description') {
        meta[key === 'description' ? 'excerpt' : key] = value
      }
    }
  }

  const baseName = String(fileName || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(md|markdown|txt)$/i, '')

  if (!meta.title && baseName) {
    meta.title = baseName.replace(/[-_]+/g, ' ').trim()
  }
  if (!meta.slug && baseName) {
    meta.slug = slugify(baseName)
  }
  if (!meta.excerpt) {
    meta.excerpt = toPlainExcerpt(body)
  } else {
    meta.excerpt = toPlainExcerpt(meta.excerpt, 160)
  }

  return {
    title: meta.title || '',
    slug: meta.slug || '',
    excerpt: meta.excerpt || '',
    content: body.replace(/^\s+/, ''),
  }
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** 把 Markdown / 脏摘要清成列表页可用的纯文本 */
export function toPlainExcerpt(text, max = 120) {
  const plain = String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*\|.*\|?\s*$/gm, ' ')
    .replace(/^\s*[-:| +\t]{3,}\s*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`>#]+/g, '')
    .replace(/\|+/g, ' ')
    .replace(/\$\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return ''
  return plain.length > max ? `${plain.slice(0, max).trim()}…` : plain
}

export function isMarkdownFile(file) {
  if (!file) return false
  const name = String(file.name || '').toLowerCase()
  if (/\.(md|markdown|txt)$/.test(name)) return true
  const type = String(file.type || '').toLowerCase()
  return (
    type === 'text/markdown' ||
    type === 'text/x-markdown' ||
    type === 'text/plain' ||
    type === ''
  )
}
