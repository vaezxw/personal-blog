import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let pdfjsReady = false

async function ensurePdfJs() {
  if (pdfjsReady) return
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker
  pdfjsReady = true
  return pdfjs
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

export async function extractPdfText(arrayBuffer) {
  const pdfjs = await ensurePdfJs()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const parts = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const text = content.items.map((item) => item.str).join(' ')
    parts.push(text.trim())
  }
  return parts.filter(Boolean).join('\n\n')
}

export async function pdfToDocx(arrayBuffer) {
  const text = await extractPdfText(arrayBuffer)
  if (!text.trim()) throw new Error('no text extracted')
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const paragraphs = text.split(/\n+/).map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line || ' ')],
      }),
  )
  const doc = new Document({
    sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph(' ')] }],
  })
  return Packer.toBlob(doc)
}

/**
 * Word → PDF via mammoth HTML + html2canvas + jsPDF.
 * Rasterizes pages so CJK text actually shows (jsPDF built-in fonts are Latin-only).
 */
export async function docxToPdf(arrayBuffer) {
  const mammoth = await import('mammoth')
  const { jsPDF } = await import('jspdf')
  const html2canvas = (await import('html2canvas')).default
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
  if (!html.trim()) throw new Error('empty document')

  const CONTENT_W = 720
  const MARGIN = 36

  const host = document.createElement('div')
  host.setAttribute('data-doc-convert', '1')
  // Keep in layout (not display:none). Translate off-screen so html2canvas still measures.
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${CONTENT_W}px`,
    'padding:32px',
    'box-sizing:border-box',
    'background:#ffffff',
    'color:#111111',
    'font-family:"Microsoft YaHei","PingFang SC","Noto Sans SC","Segoe UI",Arial,sans-serif',
    'font-size:14px',
    'line-height:1.7',
    'text-align:left',
    'z-index:0',
    'pointer-events:none',
    'overflow:visible',
    'transform:translateX(-120%)',
  ].join(';')
  host.innerHTML = html
  host.querySelectorAll('img').forEach((img) => {
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
  })
  host.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'collapse'
    table.style.width = '100%'
  })
  host.querySelectorAll('td,th').forEach((cell) => {
    cell.style.border = '1px solid #ccc'
    cell.style.padding = '4px 8px'
  })
  document.body.appendChild(host)

  try {
    if (document.fonts?.ready) await document.fonts.ready
    await waitForImages(host)
    // Force layout before capture
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
      onclone(doc, el) {
        // Ensure clone is visible to the canvas renderer
        el.style.transform = 'none'
        el.style.left = '0'
        el.style.top = '0'
        el.style.opacity = '1'
        el.style.visibility = 'visible'
      },
    })

    if (!canvas.width || !canvas.height) {
      throw new Error('render failed')
    }

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
      ctx.drawImage(
        canvas,
        0,
        y,
        canvas.width,
        sliceH,
        0,
        0,
        canvas.width,
        sliceH,
      )

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
      const drawH = (sliceH / canvas.height) * fullImgHeight
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', MARGIN, MARGIN, imgWidth, drawH)

      y += sliceH
      page += 1
      if (page > 200) break
    }

    if (page === 0) throw new Error('empty pdf')
    return doc.output('blob')
  } finally {
    host.remove()
  }
}

export function guessDocKind(file) {
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.pdf') || file?.type === 'application/pdf') return 'pdf'
  if (
    name.endsWith('.docx') ||
    file?.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  return ''
}
