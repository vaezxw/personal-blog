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
    image({ href, title, text }) {
      const src = String(href || '')
      const alt = escapeHtml(text || '')
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      // 语雀 CDN 对站外 Referer 返回 403，必须去掉 Referer
      const noReferrer = /cdn\.nlark\.com/i.test(src) ? ' referrerpolicy="no-referrer"' : ''
      return `<img src="${escapeHtml(src)}" alt="${alt}"${titleAttr}${noReferrer} loading="lazy" />`
    },
  },
})

/**
 * 语雀导出的流程图：
 * 1) 源码藏在 HTML 注释里，但 Mermaid 的 `-->` 会提前结束注释，箭头泄漏成正文
 * 2) 后面的 CDN SVG 在站外 Referer 下会 403，不能当图片用
 * → 抽出 Mermaid 源码，交给前端 mermaid.js 渲染
 */
function restoreYuqueDiagrams(md) {
  return String(md || '').replace(
    /<!--\s*这是一个文本绘图，源码为：([\s\S]*?)!\[\]\((https:\/\/cdn\.nlark\.com\/yuque\/__mermaid[^)\s]+)\)/g,
    (_, rawSource) => {
      let code = String(rawSource || '')
        // 语雀用结尾的 --> 关掉 HTML 注释，不是边
        .replace(/-->\s*$/, '')
        .trim()
      if (!code) return '\n\n'
      // 防止围栏被内容打断
      code = code.replace(/```/g, "'''")
      return `\n\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`
    },
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
