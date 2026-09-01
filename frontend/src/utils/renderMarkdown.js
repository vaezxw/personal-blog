import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
})

export function normalizeMarkdown(md) {
  return String(md || '')
    .replace(/^\uFEFF/, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
}

/** 前端渲染 Markdown（GFM：表格 / 链接 / 标题 / 列表） */
export function renderMarkdown(md) {
  const src = normalizeMarkdown(md)
  if (!src.trim()) return ''
  return marked.parse(src, { async: false })
}
