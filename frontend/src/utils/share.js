/** Lightweight in-app + third-party share helpers (no SDK). */

import { getProfile } from '../data/profile.js'

const FALLBACK_PUBLIC_ORIGIN = 'https://mohhen-blog.pages.dev'

function publicSiteOrigin() {
  const blog = getProfile('zh')?.blog || FALLBACK_PUBLIC_ORIGIN
  try {
    return new URL(blog).origin
  } catch {
    return FALLBACK_PUBLIC_ORIGIN
  }
}

/** Prefer the live site origin when sharing from localhost / preview hosts. */
export function shareOrigin() {
  if (typeof window === 'undefined') return publicSiteOrigin()
  const { hostname, origin } = window.location
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  ) {
    return publicSiteOrigin()
  }
  return origin
}

export function pageShareUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${shareOrigin()}${normalized}`
}

export function postShareUrl(slug) {
  return pageShareUrl(`/post/${encodeURIComponent(slug)}`)
}

export function aboutShareUrl() {
  return pageShareUrl('/about')
}

export function canUseNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through */
    }
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}

export function openWeiboShare({ url, title }) {
  const href = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`
  openShareWindow(href)
}

export function openXShare({ url, title }) {
  const text = title ? `${title} ${url}` : url
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  openShareWindow(href)
}

export function qrCodeUrl(url, size = 160) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(url)}`
}

function openShareWindow(href) {
  const win = window.open(href, '_blank', 'noopener,noreferrer,width=640,height=520')
  if (!win) {
    // 弹窗被拦截时降级为当前页跳转
    window.location.assign(href)
  }
}

export function canShareFiles(files) {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.canShare !== 'function' ||
    !Array.isArray(files) ||
    !files.length
  ) {
    return false
  }
  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

export async function systemShare({ title, text, url, files } = {}) {
  if (!canUseNativeShare()) {
    const err = new Error('unsupported')
    err.name = 'ShareUnsupportedError'
    throw err
  }
  const payload = {
    title: title || '',
    text: text || title || '',
  }
  if (files?.length) {
    payload.files = files
  } else if (url) {
    payload.url = url
  }
  await navigator.share(payload)
  return true
}
