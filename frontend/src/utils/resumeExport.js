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
 * Capture a preview DOM node to multi-page A4 PDF (CJK-safe via raster).
 */
export async function exportResumePdfFromElement(el, draft) {
  if (!el) throw new Error('preview missing')
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const MARGIN = 28
  const clone = el.cloneNode(true)
  clone.querySelectorAll('[data-resume-edit], .resume-edit-only').forEach((node) => node.remove())

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
      onclone(_doc, node) {
        node.style.transform = 'none'
        node.style.left = '0'
        node.style.top = '0'
        node.style.opacity = '1'
        node.style.visibility = 'visible'
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
