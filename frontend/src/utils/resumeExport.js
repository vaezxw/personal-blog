import { downloadBlob, downloadText } from './download.js'
import { resumeToMarkdown } from './resumeSchema.js'

function safeFilenamePart(value) {
  return String(value || 'resume')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 48) || 'resume'
}

export function resumeMarkdownFilename(draft) {
  return `resume-${safeFilenamePart(draft?.basics?.name)}.md`
}

export function resumePdfFilename(draft) {
  return `resume-${safeFilenamePart(draft?.basics?.name)}.pdf`
}

export function downloadResumeMarkdown(draft) {
  const md = resumeToMarkdown(draft)
  downloadText(md, resumeMarkdownFilename(draft), 'text/markdown;charset=utf-8')
  return md
}

async function waitForImages(el) {
  if (!el) return
  const images = [...el.querySelectorAll('img')]
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve()
      return new Promise((resolve) => {
        const done = () => resolve()
        img.addEventListener('load', done, { once: true })
        img.addEventListener('error', done, { once: true })
      })
    }),
  )
}

/**
 * html2canvas cannot parse modern CSS color functions (color-mix / color()).
 * Export clone gets a self-contained hex/rgba stylesheet only.
 */
const EXPORT_CSS = `
[data-resume-export], [data-resume-export] * {
  animation: none !important;
  transition: none !important;
  backdrop-filter: none !important;
  filter: none !important;
  box-sizing: border-box;
}
[data-resume-export] .resume-sheet {
  position: relative;
  width: 794px;
  margin: 0;
  min-height: 420px;
  padding: 1.6rem 1.55rem 1.8rem;
  border-radius: 0;
  background: #ffffff;
  color: #0f172a;
  box-shadow: none;
  overflow: visible;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", Arial, sans-serif;
}
[data-resume-export] .resume-skeleton,
[data-resume-export] .resume-edit-only,
[data-resume-export] [data-resume-edit],
[data-resume-export] .empty {
  display: none !important;
}
[data-resume-export] .sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.95rem;
  border-bottom: 2px solid #0f766e;
  margin-bottom: 1rem;
}
[data-resume-export] .sheet-head h1 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: 0.02em;
  color: #0f172a;
}
[data-resume-export] .role {
  margin: 0.35rem 0 0;
  color: #334155;
  font-weight: 600;
}
[data-resume-export] .tagline {
  margin: 0.55rem 0 0;
  color: #475569;
  line-height: 1.55;
}
[data-resume-export] .contacts {
  display: grid;
  gap: 0.25rem;
  justify-items: end;
  font-size: 0.82rem;
}
[data-resume-export] .contacts a {
  color: #0f766e;
  text-decoration: none;
  font-weight: 600;
}
[data-resume-export] .sheet-section {
  margin-top: 1rem;
}
[data-resume-export] .sheet-section h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
  color: #0f766e;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
[data-resume-export] .sheet-section ul {
  margin: 0;
  padding-left: 1.1rem;
}
[data-resume-export] .sheet-section li {
  margin: 0.25rem 0;
  line-height: 1.55;
  color: #0f172a;
}
[data-resume-export] .sheet-section p {
  margin: 0;
  color: #0f172a;
  line-height: 1.55;
}
[data-resume-export] .hl-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}
[data-resume-export] .hl {
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: #f8fafc;
}
[data-resume-export] .hl strong {
  display: block;
  color: #0f766e;
}
[data-resume-export] .hl span {
  font-size: 0.8rem;
  color: #64748b;
}
[data-resume-export] .skill-rows {
  display: grid;
  gap: 0.35rem;
}
[data-resume-export] .skill-rows p {
  margin: 0;
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0.55rem;
  font-size: 0.9rem;
  color: #0f172a;
}
[data-resume-export] .project-list {
  display: grid;
  gap: 0.85rem;
}
[data-resume-export] .project-item {
  padding: 0.65rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}
[data-resume-export] .project-item.excluded {
  display: none !important;
}
[data-resume-export] .project-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}
[data-resume-export] .project-top h3 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}
[data-resume-export] .period {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}
[data-resume-export] .project-summary {
  margin: 0.4rem 0 0.25rem;
  color: #334155;
  line-height: 1.5;
}
[data-resume-export] .tech-line {
  margin: 0.4rem 0 0;
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 600;
}
`

function prepareCloneDocument(clonedDoc, root) {
  root.style.transform = 'none'
  root.style.left = '0'
  root.style.top = '0'
  root.style.opacity = '1'
  root.style.visibility = 'visible'
  root.style.position = 'static'

  root.querySelectorAll('[data-resume-edit], .resume-edit-only, .resume-skeleton').forEach((node) => {
    node.remove()
  })

  // Drop page stylesheets so html2canvas never sees color-mix / color().
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove())

  const style = clonedDoc.createElement('style')
  style.textContent = EXPORT_CSS
  clonedDoc.head.appendChild(style)
}

async function loadPdfDeps() {
  try {
    const [{ default: html2canvas }, jspdfMod] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    return { html2canvas, jsPDF: jspdfMod.jsPDF }
  } catch (err) {
    const error = new Error(err?.message || 'chunk load failed')
    error.code = 'CHUNK_LOAD_FAILED'
    error.cause = err
    throw error
  }
}

/**
 * Capture a preview DOM node to multi-page A4 PDF (CJK-safe via raster).
 */
export async function exportResumePdfFromElement(el, draft) {
  if (!el) throw new Error('preview missing')
  const { html2canvas, jsPDF } = await loadPdfDeps()

  const MARGIN = 28
  const host = document.createElement('div')
  host.setAttribute('data-resume-export', '1')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:794px',
    'padding:0',
    'box-sizing:border-box',
    'background:#ffffff',
    'color:#0f172a',
    'z-index:0',
    'pointer-events:none',
    'overflow:visible',
    'transform:translateX(-120%)',
  ].join(';')

  const clone = el.cloneNode(true)
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    if (document.fonts?.ready) await document.fonts.ready
    await waitForImages(host)
    void host.offsetHeight

    const width = Math.max(1, Math.ceil(host.scrollWidth))
    const height = Math.max(1, Math.ceil(host.scrollHeight))
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone(clonedDoc, node) {
        prepareCloneDocument(clonedDoc, node)
      },
    })

    if (!canvas.width || !canvas.height) throw new Error('render failed')

    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const printableW = pageWidth - MARGIN * 2
    const printableH = pageHeight - MARGIN * 2

    const imgWidth = printableW
    const fullImgHeight = (canvas.height * imgWidth) / canvas.width
    const srcPageH = (printableH / fullImgHeight) * canvas.height

    let y = 0
    let page = 0
    while (y < canvas.height - 0.5) {
      const sliceH = Math.min(srcPageH, canvas.height - y)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = Math.max(1, Math.ceil(sliceH))
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
      const drawH = (sliceH / canvas.height) * fullImgHeight
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', MARGIN, MARGIN, imgWidth, drawH)

      y += sliceH
      page += 1
      if (page > 200) break
    }

    if (page === 0) throw new Error('empty pdf')
    const blob = doc.output('blob')
    downloadBlob(blob, resumePdfFilename(draft))
    return blob
  } finally {
    host.remove()
  }
}
