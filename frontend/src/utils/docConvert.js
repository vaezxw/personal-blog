import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let pdfjsReady = false

async function ensurePdfJs() {
  if (pdfjsReady) return
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker
  pdfjsReady = true
  return pdfjs
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

export async function docxToPdf(arrayBuffer) {
  const mammoth = await import('mammoth')
  const { jsPDF } = await import('jspdf')
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
  if (!html.trim()) throw new Error('empty document')

  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;width:720px;padding:24px;background:#fff;color:#111;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;'
  host.innerHTML = html
  document.body.appendChild(host)

  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    await doc.html(host, {
      x: 40,
      y: 40,
      width: 515,
      windowWidth: 720,
      autoPaging: 'text',
    })
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
