import DOMPurify from 'dompurify'
import { Marked } from 'marked'

const aiMarked = new Marked({
  gfm: true,
  breaks: true,
  pedantic: false,
})

export function renderAiMarkdown(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  const html = aiMarked.parse(source, { async: false })
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style', 'srcdoc'],
    ALLOW_DATA_ATTR: false,
  })
}
