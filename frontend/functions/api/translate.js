import { empty, json, readJson } from './_lib/response.js'

const MAX_CHARS = 4500
const AI_MODEL = '@cf/meta/m2m100-1.2b'

function detectLang(text) {
  const sample = String(text || '').slice(0, 800)
  const cjk = (sample.match(/[\u4e00-\u9fff]/g) || []).length
  const latin = (sample.match(/[A-Za-z]/g) || []).length
  if (cjk >= latin && cjk > 0) return 'zh-CN'
  if (latin > 0) return 'en'
  return 'en'
}

function normalizePair(from, to, text) {
  let source = String(from || 'auto').trim() || 'auto'
  let target = String(to || '').trim()
  if (!target) {
    const guessed = detectLang(text)
    target = guessed === 'zh-CN' ? 'en' : 'zh-CN'
  }
  if (source === 'zh') source = 'zh-CN'
  if (target === 'zh') target = 'zh-CN'
  if (source === 'auto') source = detectLang(text)
  return { source, target }
}

/** Workers AI m2m100 language codes */
function toAiLang(code) {
  if (code === 'zh-CN' || code === 'zh') return 'chinese'
  if (code === 'en') return 'english'
  return String(code || 'english').toLowerCase()
}

function toMyMemoryLang(code) {
  if (code === 'zh' || code === 'zh-CN') return 'zh-CN'
  if (code === 'en') return 'en'
  return code
}

async function translateViaWorkersAI(ai, text, source, target) {
  if (!ai?.run) throw new Error('Workers AI not configured')
  const result = await ai.run(AI_MODEL, {
    text,
    source_lang: toAiLang(source),
    target_lang: toAiLang(target),
  })
  const translated =
    (typeof result === 'string' && result) ||
    result?.translated_text ||
    result?.translation ||
    result?.result?.translated_text ||
    ''
  if (!translated) throw new Error('Empty translation from Workers AI')
  return { translated: String(translated), detected: source, provider: 'workers-ai' }
}

async function translateViaMyMemory(text, source, target) {
  // Free GET endpoint is limited to ~500 bytes per request
  if (new TextEncoder().encode(text).length > 480) {
    throw new Error('Text too long for MyMemory')
  }
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', `${toMyMemoryLang(source)}|${toMyMemoryLang(target)}`)

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (res.status === 429) throw new Error('Translate upstream 429')
  if (!res.ok) throw new Error(`Translate upstream ${res.status}`)
  const data = await res.json()
  if (Number(data?.responseStatus) !== 200) {
    throw new Error(data?.responseDetails || 'MyMemory translate failed')
  }
  const translated = data?.responseData?.translatedText
  if (!translated) throw new Error('Empty translation')
  if (/IS AN INVALID|QUERY LENGTH/i.test(translated)) {
    throw new Error(translated)
  }
  return { translated: String(translated), detected: source, provider: 'mymemory' }
}

async function translateViaGoogle(text, source, target) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', source === 'auto' ? 'auto' : source)
  url.searchParams.set('tl', target)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (compatible; MohhenBlog/1.0; +https://mohhen-blog.pages.dev)',
    },
  })
  if (!res.ok) throw new Error(`Translate upstream ${res.status}`)
  const data = await res.json()
  const chunks = Array.isArray(data?.[0]) ? data[0] : []
  const translated = chunks.map((row) => row?.[0] || '').join('')
  const detected = data?.[2] || source
  if (!translated) throw new Error('Empty translation')
  return { translated, detected, provider: 'google' }
}

async function translateWithFallback(env, text, source, target) {
  const errors = []

  if (env?.AI) {
    try {
      return await translateViaWorkersAI(env.AI, text, source, target)
    } catch (err) {
      errors.push(`ai: ${err.message}`)
    }
  }

  try {
    return await translateViaMyMemory(text, source, target)
  } catch (err) {
    errors.push(`mymemory: ${err.message}`)
  }

  try {
    return await translateViaGoogle(text, source, target)
  } catch (err) {
    errors.push(`google: ${err.message}`)
  }

  const hit429 = errors.some((e) => e.includes('429'))
  const err = new Error(
    hit429
      ? '请求过于频繁，请稍后再试'
      : errors[errors.length - 1] || 'Translate failed',
  )
  err.status = hit429 ? 429 : 502
  throw err
}

export async function onRequest(context) {
  const { request, env } = context

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
    if (source === target) {
      return json(200, { text, from: source, to: target, detected: source })
    }

    const { translated, detected, provider } = await translateWithFallback(
      env,
      text,
      source,
      target,
    )
    return json(200, {
      text: translated,
      from: source,
      to: target,
      detected: detected || source,
      provider,
    })
  } catch (err) {
    const status = err.status || 500
    return json(status, { error: err.message || 'Translate failed' })
  }
}
