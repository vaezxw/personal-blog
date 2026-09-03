import { renderMarkdown } from './renderMarkdown.js'

/** wangEditor / 富文本保存的正文几乎都以块级标签开头 */
const RICH_HTML_START_RE =
  /^<(?:p|h[1-6]|div|ul|ol|blockquote|figure|table|section|article|img|pre|hr)\b/i

const FONT_TAG_RE = /<\/?font\b[^>]*>/gi
/** 行内代码里被转义后的 &lt;font...&gt;…&lt;/font&gt; */
const ESCAPED_FONT_IN_CODE_RE =
  /&lt;font\b[^&]*&gt;([\s\S]*?)&lt;\/font&gt;/gi

/**
 * 判断正文是否为富文本 HTML。
 * 注意：Markdown 里常出现 `<canvas>`、`<script setup>` 等字样，不能仅凭「含有尖括号标签」判定。
 */
export function isHtmlContent(content) {
  const text = String(content || '').trim()
  if (!text) return false
  // 以 Markdown 标题 / 表格 / 列表起手 → 按 Markdown
  if (/^(?:#{1,6}\s|>\s|\*\s|-\s|\d+\.\s|\|.+\|)/m.test(text.slice(0, 800))) {
    return false
  }
  return RICH_HTML_START_RE.test(text)
}

/**
 * 语雀导出会把样式包进 Markdown 反引号：
 *   `<font style="color:rgb(31,35,40);">access_token</font>`
 * marked 会当成「行内代码」并转义，页面上就会看到一整段 &lt;font&gt; 标签。
 * 先在源码层拆掉 <font>，只保留真正要高亮的词。
 */
export function scrubYuqueArtifacts(src) {
  let s = String(src || '')
  if (!s) return s
  s = s.replace(FONT_TAG_RE, '')
  return s
}

/**
 * 语雀 / Word 导出常带死黑字色（如 rgb(31,35,40)），夜间主题下会看不见。
 * 去掉强制 color / 背景色，并拆掉无语义的 <font>；顺带清理 code 里已转义的 font 残骸。
 */
export function scrubForcedColors(html) {
  let s = String(html || '')
  if (!s) return s

  // 未转义的 <font>…</font>
  s = s.replace(FONT_TAG_RE, '')

  // <code>&lt;font …&gt;token&lt;/font&gt;</code> → <code>token</code>
  s = s.replace(/<code\b([^>]*)>([\s\S]*?)<\/code>/gi, (full, attrs, inner) => {
    let next = String(inner)
    let prev
    do {
      prev = next
      next = next.replace(ESCAPED_FONT_IN_CODE_RE, '$1')
    } while (next !== prev)
    return `<code${attrs}>${next}</code>`
  })

  s = s.replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (full, quote, style) => {
    const kept = String(style)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((decl) => {
        if (/^(?:color|background(?:-color)?)\s*:/i.test(decl)) return false
        return true
      })
    if (!kept.length) return ''
    return ` style=${quote}${kept.join('; ')}${quote}`
  })

  s = s.replace(/\sstyle\s*=\s*(["'])\s*\1/gi, '')
  return s
}

/** Markdown → HTML（用于导入 .md 或在富文本编辑器中打开旧文） */
export function markdownToHtml(md) {
  return scrubForcedColors(renderMarkdown(scrubYuqueArtifacts(md)))
}

/** 文章展示：自动识别 Markdown / HTML */
export function renderPostContent(content) {
  const text = String(content || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return scrubForcedColors(text)
  return markdownToHtml(text)
}
