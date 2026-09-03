import { renderMarkdown } from './renderMarkdown.js'

/** wangEditor / 富文本保存的正文几乎都以块级标签开头 */
const RICH_HTML_START_RE =
  /^<(?:p|h[1-6]|div|ul|ol|blockquote|figure|table|section|article|img|pre|hr)\b/i

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
 * 语雀 / Word 导出常带死黑字色（如 rgb(31,35,40)），夜间主题下会看不见。
 * 去掉强制 color / 背景色，并拆掉无语义的 <font>。
 */
export function scrubForcedColors(html) {
  let s = String(html || '')
  if (!s) return s

  // <font style="color:...">…</font> → 只保留正文
  s = s.replace(/<\/?font\b[^>]*>/gi, '')

  s = s.replace(/\sstyle\s*=\s*(["'])(.*?)\1/gi, (full, quote, style) => {
    const kept = String(style)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((decl) => {
        // 保留非颜色声明；去掉 color / background-color（主题自适应）
        if (/^(?:color|background(?:-color)?)\s*:/i.test(decl)) return false
        return true
      })
    if (!kept.length) return ''
    return ` style=${quote}${kept.join('; ')}${quote}`
  })

  // 清理空 style
  s = s.replace(/\sstyle\s*=\s*(["'])\s*\1/gi, '')
  return s
}

/** Markdown → HTML（用于导入 .md 或在富文本编辑器中打开旧文） */
export function markdownToHtml(md) {
  return scrubForcedColors(renderMarkdown(md))
}

/** 文章展示：自动识别 Markdown / HTML */
export function renderPostContent(content) {
  const text = String(content || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return scrubForcedColors(text)
  return markdownToHtml(text)
}
