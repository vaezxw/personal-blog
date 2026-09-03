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

/** Markdown → HTML（用于导入 .md 或在富文本编辑器中打开旧文） */
export function markdownToHtml(md) {
  return renderMarkdown(md)
}

/** 文章展示：自动识别 Markdown / HTML */
export function renderPostContent(content) {
  const text = String(content || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return text
  return markdownToHtml(text)
}
