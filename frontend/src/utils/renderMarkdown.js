import { marked } from 'marked'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
})

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = String(lang || '').trim().split(/\s+/)[0]
      if (language === 'mermaid') {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`
      }
      return false
    },
  },
})

/**
 * 语雀导出的流程图：源码塞进 HTML 注释，但 Mermaid 的 `-->` 会提前结束注释，
 * 箭头泄漏成正文；真正可显示的是后面的 CDN SVG。提取图片，丢掉破损注释。
 */
function restoreYuqueDiagrams(md) {
  return String(md || '').replace(
    /<!--\s*这是一个文本绘图[\s\S]*?!\[\]\((https:\/\/cdn\.nlark\.com\/yuque\/__mermaid[^)\s]+)\)/g,
    '\n\n![]($1)\n\n',
  )
}

export function normalizeMarkdown(md) {
  return restoreYuqueDiagrams(
    String(md || '')
      .replace(/^\uFEFF/, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n'),
  )
}

/** 前端渲染 Markdown（GFM：表格 / 链接 / 标题 / 列表；mermaid 代码块交给客户端二次渲染） */
export function renderMarkdown(md) {
  const src = normalizeMarkdown(md)
  if (!src.trim()) return ''
  return marked.parse(src, { async: false })
}
