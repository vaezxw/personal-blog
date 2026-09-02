import { marked } from 'marked'
import { normalizeMarkdown } from './renderMarkdown.js'

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i

/** 判断正文是否为 wangEditor 等工具产出的 HTML */
export function isHtmlContent(content) {
  const text = String(content || '').trim()
  if (!text) return false
  return HTML_TAG_RE.test(text)
}

/** Markdown → HTML（用于导入 .md 或在富文本编辑器中打开旧文） */
export function markdownToHtml(md) {
  const src = normalizeMarkdown(md)
  if (!src.trim()) return ''
  return marked.parse(src, { async: false })
}

/** 文章展示：自动识别 Markdown / HTML */
export function renderPostContent(content) {
  const text = String(content || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return text
  return markdownToHtml(text)
}
