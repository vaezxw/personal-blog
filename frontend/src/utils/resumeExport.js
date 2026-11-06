import { downloadBlob, downloadText } from './download.js'
import { resumeToMarkdown } from './resumeSchema.js'

/** A4 @ 96dpi ≈ 794×1123; keep export width fixed for stable pagination. */
const EXPORT_WIDTH_PX = 794
const PAGE_OVERLAP_PX = 24

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
[data-resume-export] {
  width: ${EXPORT_WIDTH_PX}px !important;
  background: #ffffff !important;
  color: #0f172a !important;
}
[data-resume-export] .resume-sheet {
  position: relative;
  width: ${EXPORT_WIDTH_PX}px !important;
  max-width: ${EXPORT_WIDTH_PX}px !important;
  margin: 0;
  min-height: 0;
  padding: 0;
  border-radius: 0 !important;
  background: #ffffff !important;
  color: #0f172a;
  box-shadow: none !important;
  overflow: visible !important;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif;
}
[data-resume-export] .resume-skeleton,
[data-resume-export] .resume-edit-only,
[data-resume-export] [data-resume-edit],
[data-resume-export] .empty {
  display: none !important;
}
[data-resume-export] .sheet-banner {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  padding: 22px 24px 20px;
  background: #0f766e;
  color: #f8fafc;
  border-radius: 0;
}
[data-resume-export] .banner-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: 0.18em;
  font-weight: 700;
  opacity: 0.85;
  color: #ccfbf1;
}
[data-resume-export] .sheet-banner h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: 0.02em;
  font-weight: 750;
  color: #ffffff;
}
[data-resume-export] .role {
  margin: 8px 0 0;
  font-weight: 600;
  color: #ccfbf1;
  font-size: 14px;
}
[data-resume-export] .tagline {
  margin: 8px 0 0;
  color: #ecfeff;
  line-height: 1.55;
  font-size: 13px;
}
[data-resume-export] .banner-contacts {
  display: grid;
  align-content: start;
  gap: 6px;
  justify-items: end;
  font-size: 12px;
}
[data-resume-export] .banner-contacts a,
[data-resume-export] .banner-contacts .edu {
  color: #ecfeff;
  text-decoration: none;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  max-width: 100%;
  word-break: break-word;
}
[data-resume-export] .sheet-body {
  padding: 18px 24px 28px;
  background: #ffffff;
}
[data-resume-export] .sheet-section {
  margin-top: 16px;
  page-break-inside: avoid;
}
[data-resume-export] .sheet-section:first-child {
  margin-top: 0;
}
[data-resume-export] .sheet-section h2 {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 750;
}
[data-resume-export] .sheet-section h2 span {
  flex: none;
}
[data-resume-export] .sheet-section h2::after {
  content: '';
  height: 1px;
  flex: 1;
  background: #99f6e4;
}
[data-resume-export] .plain-list {
  margin: 0;
  padding-left: 18px;
}
[data-resume-export] .plain-list li {
  margin: 4px 0;
  line-height: 1.55;
  color: #1e293b;
  font-size: 13px;
}
[data-resume-export] .hl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
[data-resume-export] .hl {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 8px;
  background: #f8fafc;
  text-align: center;
}
[data-resume-export] .hl strong {
  display: block;
  color: #0f766e;
  font-size: 14px;
}
[data-resume-export] .hl span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #64748b;
}
[data-resume-export] .skill-groups {
  display: grid;
  gap: 8px;
}
[data-resume-export] .skill-group {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
  align-items: start;
}
[data-resume-export] .skill-cat {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}
[data-resume-export] .skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
[data-resume-export] .tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #115e59;
  border: 1px solid #99f6e4;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
}
[data-resume-export] .tag.soft {
  background: #f8fafc;
  color: #334155;
  border-color: #e2e8f0;
  font-weight: 600;
}
[data-resume-export] .project-list {
  display: grid;
  gap: 0;
}
[data-resume-export] .project-item {
  padding: 12px 0 14px;
  border-bottom: 1px dashed #e2e8f0;
  page-break-inside: avoid;
}
[data-resume-export] .project-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
[data-resume-export] .project-item.excluded {
  display: none !important;
}
[data-resume-export] .project-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
[data-resume-export] .project-title-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}
[data-resume-export] .project-title-wrap h3 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
  font-weight: 700;
}
[data-resume-export] .period {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
[data-resume-export] .project-summary {
  margin: 6px 0 4px;
  color: #334155;
  line-height: 1.55;
  font-size: 13px;
}
[data-resume-export] .tech-tags {
  margin-top: 8px;
}
`

function injectExportStyles(doc) {
  doc.querySelectorAll('style[data-resume-export-style]').forEach((node) => node.remove())
  const style = doc.createElement('style')
  style.setAttribute('data-resume-export-style', '1')
  style.textContent = EXPORT_CSS
  doc.head.appendChild(style)
}

function prepareCloneDocument(clonedDoc, root) {
  root.style.transform = 'none'
  root.style.left = '0'
  root.style.top = '0'
  root.style.opacity = '1'
  root.style.visibility = 'visible'
  root.style.position = 'static'
  root.style.width = `${EXPORT_WIDTH_PX}px`

  root.querySelectorAll('[data-resume-edit], .resume-edit-only, .resume-skeleton').forEach((node) => {
    node.remove()
  })
  root.querySelectorAll('.project-item.excluded').forEach((node) => node.remove())

  // Drop page stylesheets so html2canvas never sees color-mix / color().
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    if (node.getAttribute('data-resume-export-style') === '1') return
    node.remove()
  })
  injectExportStyles(clonedDoc)
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

  const MARGIN = 22
  const host = document.createElement('div')
  host.setAttribute('data-resume-export', '1')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${EXPORT_WIDTH_PX}px`,
    'padding:0',
    'margin:0',
    'box-sizing:border-box',
    'background:#ffffff',
    'color:#0f172a',
    'z-index:0',
    'pointer-events:none',
    'overflow:visible',
    'transform:translateX(-120%)',
  ].join(';')

  const clone = el.cloneNode(true)
  clone.classList.remove('ready')
  clone.style.width = `${EXPORT_WIDTH_PX}px`
  clone.style.maxWidth = `${EXPORT_WIDTH_PX}px`
  clone.style.borderRadius = '0'
  clone.style.boxShadow = 'none'
  clone.style.overflow = 'visible'
  clone.querySelectorAll('[data-resume-edit], .resume-edit-only, .resume-skeleton').forEach((node) => {
    node.remove()
  })
  clone.querySelectorAll('.project-item.excluded').forEach((node) => node.remove())

  host.appendChild(clone)
  document.body.appendChild(host)
  injectExportStyles(document)

  try {
    if (document.fonts?.ready) await document.fonts.ready
    await waitForImages(host)
    // Let export CSS settle before measuring.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    void host.offsetHeight

    const width = EXPORT_WIDTH_PX
    const height = Math.max(1, Math.ceil(Math.max(host.scrollHeight, clone.scrollHeight)))
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
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
    const overlap = Math.min(PAGE_OVERLAP_PX * 2, srcPageH * 0.04)

    let y = 0
    let page = 0
    while (y < canvas.height - 0.5) {
      const remaining = canvas.height - y
      const sliceH = Math.min(srcPageH, remaining)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = Math.max(1, Math.ceil(sliceH))
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.94)
      const drawH = (sliceH / canvas.height) * fullImgHeight
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', MARGIN, MARGIN, imgWidth, drawH)

      if (sliceH >= remaining - 0.5) break
      y += Math.max(1, sliceH - overlap)
      page += 1
      if (page > 200) break
    }

    if (page === 0 && canvas.height <= 0) throw new Error('empty pdf')
    const blob = doc.output('blob')
    downloadBlob(blob, resumePdfFilename(draft))
    return blob
  } finally {
    document.querySelectorAll('style[data-resume-export-style]').forEach((node) => node.remove())
    host.remove()
  }
}
