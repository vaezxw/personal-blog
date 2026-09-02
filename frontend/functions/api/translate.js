import { empty, json, readJson } from './_lib/response.js'

const MAX_CHARS = 4500

function detectLang(text) {
  const sample = String(text || '').slice(0, 800)
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (sample.match(/[A-Za-z]/g) || []).length
  if (cjk >= latin && cjk > 0) return 'zh-CN'
  if (latin > 0) return 'en'
  return 'auto'
}

function normalizePair(from, to, text) {
  let source = String(from || 'auto').trim() || 'auto'
  let target = String(to || '').trim()
  if (!target) {
    const guessed = detectLang(text)
    target = guessed === 'zh-CN' ? 'en' : 'zh-CN'
    if (source === 'auto') source = guessed === 'auto' ? 'auto' : guessed
  }
  if (source === 'zh') source = 'zh-CN'
  if (target === 'zh') target = 'zh-CN'
  return { source, target }
}

async function translateViaGoogle(text, source, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', source === 'auto' ? 'auto' : source)
  url.searchParams.set('tl', target)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Translate upstream ${res.status}`)
  const data = await res.json()
  const chunks = Array.isArray(data?.[0]) ? data[0] : []
  const translated = chunks.map((row) => row?.[0] || '').join('')
  const detected = data?.[2] || source
  if (!translated) throw new Error('Empty translation')
  return { translated, detected }
}

export async function onRequest(context) {
  const { request } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = await readJson(request)
    const text = String(body?.text || '').trim()
    if (!text) return json(400, { error: 'text is required' })
    if (text.length > MAX_CHARS) {
      return json(400, { error: `text too long (max ${MAX_CHARS})` })
    }

    const { source, target } = normalizePair(body?.from, body?.to, text)
    if (source !== 'auto' && source === target) {
      return json(200, { text, from: source, to: target, detected: source })
    }

    const { translated, detected } = await translateViaGoogle(text, source, target)
    return json(200, {
      text: translated,
      from: source,
      to: target,
      detected: detected || source,
    })
  } catch (err) {
    return json(500, { error: err.message || 'Translate failed' })
  }
}
