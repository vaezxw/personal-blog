import html2canvas from 'html2canvas'
import { qrCodeUrl } from './share.js'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

export async function fetchQrDataUrl(url, size = 160) {
  const src = qrCodeUrl(url, size)
  const res = await fetch(src)
  if (!res.ok) throw new Error('qr fetch failed')
  return blobToDataUrl(await res.blob())
}

export async function waitForElementImages(el) {
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

export async function captureElementPng(el, { scale = 2, backgroundColor = '#0b1220' } = {}) {
  if (!el) throw new Error('capture target missing')
  await waitForElementImages(el)
  const width = Math.ceil(el.scrollWidth)
  const height = Math.ceil(el.scrollHeight)
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
  })
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) reject(new Error('capture failed'))
      else resolve(next)
    }, 'image/png')
  })
  return blob
}
