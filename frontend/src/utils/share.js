/** Lightweight in-app + third-party share helpers (no SDK). */

export function postShareUrl(slug) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/post/${encodeURIComponent(slug)}`
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

export async function systemShare({ title, text, url }) {
  if (!canUseNativeShare()) {
    const err = new Error('unsupported')
    err.name = 'ShareUnsupportedError'
    throw err
  }
  await navigator.share({
    title: title || '',
    text: text || title || '',
    url,
  })
  return true
}
