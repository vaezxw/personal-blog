import { fetchAiConnections, streamAiChat } from '../api.js'
import { extractPdfText, guessDocKind } from './docConvert.js'
import {
  aboutResumePayload,
  buildResumeFromAbout,
  normalizeAiResume,
} from './resumeSchema.js'

const RESUME_TEXT_LIMIT = 3800
const ABOUT_JSON_LIMIT = 2400

export function guessResumeKind(file) {
  const name = String(file?.name || '').toLowerCase()
  const docKind = guessDocKind(file)
  if (docKind) return docKind
  if (name.endsWith('.md') || name.endsWith('.markdown') || file?.type === 'text/markdown') {
    return 'md'
  }
  if (name.endsWith('.txt') || file?.type === 'text/plain') return 'txt'
  return ''
}

export async function extractResumeText(file) {
  const kind = guessResumeKind(file)
  if (!kind) throw new Error('unsupported')

  if (kind === 'pdf') {
    const buffer = await file.arrayBuffer()
    const text = await extractPdfText(buffer)
    if (!String(text || '').trim()) throw new Error('empty')
    return { kind, text: String(text).trim() }
  }

  if (kind === 'docx') {
    const mammoth = await import('mammoth')
    const buffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
    const text = String(result?.value || '').trim()
    if (!text) throw new Error('empty')
    return { kind, text }
  }

  const text = String(await file.text()).trim()
  if (!text) throw new Error('empty')
  return { kind, text }
}

function truncate(text, max) {
  const value = String(text || '')
  if (value.length <= max) return value
  return `${value.slice(0, max)}\n…[truncated]`
}

function extractJsonObject(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] || raw).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    /* fall through */
  }

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }
  return null
}

export async function pickDefaultAiConnection() {
  const data = await fetchAiConnections()
  const list = Array.isArray(data?.connections)
    ? data.connections
    : Array.isArray(data)
      ? data
      : []
  if (!list.length) return null
  return list.find((item) => item.isDefault) || list[0]
}

function buildMergePrompt(locale, aboutPayload, resumeText) {
  const lang = locale === 'en' ? 'en' : 'zh'
  const aboutJson = truncate(JSON.stringify(aboutPayload), ABOUT_JSON_LIMIT)
  const oldResume = truncate(resumeText, RESUME_TEXT_LIMIT)

  return [
    'You are a resume merge assistant. Reply with ONE JSON object only. No markdown fences, no commentary.',
    'Schema:',
    '{',
    '  "meta": { "locale": "zh|en", "source": "merged" },',
    '  "basics": { "name","title","location","email","github","blog","education","years","tagline" },',
    '  "summary": string[],',
    '  "highlights": [{ "label","value" }],',
    '  "skills": [{ "category","items": string[] }],',
    '  "projects": [{ "id","name","period","summary","bullets": string[],"tech": string[],"included": true }],',
    '  "extras": { "fromResume": string[] }',
    '}',
    'Rules:',
    '- Prefer About Me data for basics/contact/identity.',
    '- Keep About Me projects and skills as the primary source; merge and dedupe.',
    '- Put unique old-resume experience, certificates, or employer details into extras.fromResume.',
    '- You may enrich project bullets with complementary facts from the old resume.',
    `- Output language for narrative fields: ${lang === 'en' ? 'English' : 'Chinese'}.`,
    '',
    'About Me JSON:',
    aboutJson,
    '',
    'Existing resume text:',
    oldResume,
  ].join('\n')
}

/**
 * Merge uploaded resume text with About Me data via AI.
 * Falls back to local draft + extras if JSON parse fails.
 */
export async function mergeResumeWithAi({
  locale = 'zh',
  resumeText,
  connectionId,
  signal,
  onDelta,
} = {}) {
  const base = buildResumeFromAbout(locale)
  const aboutPayload = aboutResumePayload(locale)
  const message = buildMergePrompt(locale, aboutPayload, resumeText)

  let assistantText = ''
  await streamAiChat(
    {
      connectionId,
      message,
    },
    {
      signal,
      onEvent(event, payload) {
        if (event === 'delta') {
          const chunk = String(payload?.text || '')
          assistantText += chunk
          onDelta?.(assistantText)
        }
        if (event === 'error') {
          throw new Error(payload?.message || 'AI merge failed')
        }
      },
    },
  )

  const parsed = extractJsonObject(assistantText)
  if (!parsed) {
    const fallback = normalizeAiResume(null, base)
    fallback.meta.source = 'about'
    fallback.extras = {
      fromResume: truncate(resumeText, 1800)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 12),
    }
    return { draft: fallback, usedAi: false, rawText: assistantText }
  }

  // Force About Me basics for contact/identity stability
  const merged = normalizeAiResume(parsed, base)
  merged.basics = {
    ...merged.basics,
    name: base.basics.name,
    email: base.basics.email,
    github: base.basics.github,
    blog: base.basics.blog,
    education: base.basics.education || merged.basics.education,
  }
  return { draft: merged, usedAi: true, rawText: assistantText }
}
