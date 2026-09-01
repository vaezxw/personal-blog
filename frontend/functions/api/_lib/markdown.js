import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
})

/** 钉钉 / Word 导出常见的不间断空格等，会影响标题与表格识别 */
function normalizeMarkdown(md) {
  return String(md || '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
}

/** 用 marked（GFM）渲染：标题、表格、链接、列表、代码块等 */
export function renderMarkdown(md) {
  const src = normalizeMarkdown(md)
  if (!src.trim()) return ''
  return marked.parse(src, { async: false })
}

/** @deprecated 兼容旧 import 名 */
export function simpleMarkdown(md) {
  return renderMarkdown(md)
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
