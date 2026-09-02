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
    // 语雀流程图：CDN 图站外 403，抽出源码作 mermaid 块（服务端仅输出 pre，客户端再渲染）
    .replace(
      /<!--\s*这是一个文本绘图，源码为：([\s\S]*?)!\[\]\((https:\/\/cdn\.nlark\.com\/yuque\/__mermaid[^)\s]+)\)/g,
      (_, rawSource) => {
        let code = String(rawSource || '')
          .replace(/-->\s*$/, '')
          .trim()
          .replace(/```/g, "'''")
        if (!code) return '\n\n'
        return `\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`
      },
    )
}

/** 判断正文是否为 HTML（wangEditor 等） */
function isHtmlContent(content) {
  const text = String(content || '').trim()
  if (!text) return false
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

/** 用 marked（GFM）渲染：标题、表格、链接、列表、代码块等 */
export function renderMarkdown(md) {
  const src = normalizeMarkdown(md)
  if (!src.trim()) return ''
  return marked.parse(src, { async: false })
}

/** 文章展示：自动识别 Markdown / HTML */
export function renderPostContent(content) {
  const text = String(content || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return text
  return renderMarkdown(text)
}

/** @deprecated 兼容旧 import 名 */
export function simpleMarkdown(md) {
  return renderPostContent(md)
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
