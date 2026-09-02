/** Build a URL-safe unique id from heading text. */
export function slugifyHeading(text, used) {
  const base =
    String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}\-_]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'section'

  let id = base
  let n = 2
  while (used.has(id)) {
    id = `${base}-${n}`
    n += 1
  }
  used.add(id)
  return id
}

/**
 * Ensure h2–h4 in a prose root have ids; return flat toc entries.
 * @returns {{ id: string, level: number, text: string }[]}
 */
export function collectHeadings(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return []
  const used = new Set(
    [...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean),
  )
  const nodes = [...root.querySelectorAll('h2, h3, h4')]
  const items = []
  for (const el of nodes) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (!el.id) el.id = slugifyHeading(text, used)
    else used.add(el.id)
    const level = Number(el.tagName.slice(1))
    items.push({ id: el.id, level, text })
  }
  return items
}

/** Nest flat heading list into a tree (h2 → h3 → h4). */
export function buildTocTree(items) {
  const root = []
  const stack = []
  for (const item of items) {
    const node = { ...item, children: [] }
    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (!stack.length) root.push(node)
    else stack[stack.length - 1].children.push(node)
    stack.push(node)
  }
  return root
}
