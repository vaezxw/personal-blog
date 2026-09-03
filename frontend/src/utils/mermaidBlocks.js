/** @type {WeakMap<Element, string>} */
const sourceMap = new WeakMap()

let mermaidPromise = null
/** @type {'light' | 'dark' | null} */
let appliedTheme = null
/** @type {MutationObserver | null} */
let themeObserver = null
/** @type {Promise<void>} */
let renderLock = Promise.resolve()

function getSiteTheme() {
  if (typeof document === 'undefined') return 'light'
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'light' || fromDom === 'dark') return fromDom
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function mermaidThemeName(siteTheme) {
  return siteTheme === 'dark' ? 'dark' : 'neutral'
}

function rememberSource(el) {
  if (!sourceMap.has(el)) {
    sourceMap.set(el, el.textContent ?? '')
  }
  return sourceMap.get(el)
}

async function getMermaid() {
  const siteTheme = getSiteTheme()
  const theme = mermaidThemeName(siteTheme)

  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: 'loose',
        fontFamily: 'inherit',
      })
      appliedTheme = siteTheme
      return mermaid
    })
  }

  const mermaid = await mermaidPromise

  if (appliedTheme !== siteTheme) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })
    appliedTheme = siteTheme
  }

  return mermaid
}

function resetNodeForRerender(el) {
  const src = sourceMap.get(el)
  if (src == null) return false
  el.removeAttribute('data-processed')
  el.textContent = src
  return true
}

async function rerenderAllMermaidBlocks() {
  const nodes = [...document.querySelectorAll('pre.mermaid')]
  for (const el of nodes) resetNodeForRerender(el)
  await renderMermaidBlocks(document.body)
}

function ensureThemeObserver() {
  if (themeObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return
  }
  themeObserver = new MutationObserver(() => {
    if (getSiteTheme() === appliedTheme) return
    if (!document.querySelector('pre.mermaid')) {
      appliedTheme = null
      return
    }
    renderLock = renderLock
      .then(() => rerenderAllMermaidBlocks())
      .catch((err) => console.warn('[mermaid]', err))
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
}

/** 渲染容器内尚未处理的 <pre class="mermaid"> */
export async function renderMermaidBlocks(root) {
  ensureThemeObserver()
  if (!root || typeof root.querySelectorAll !== 'function') return

  const nodes = [...root.querySelectorAll('pre.mermaid')].filter((el) => {
    if (!el.getAttribute('data-processed')) {
      rememberSource(el)
      return true
    }
    return false
  })
  if (!nodes.length) return

  const run = async () => {
    try {
      const mermaid = await getMermaid()
      await mermaid.run({ nodes })
    } catch (err) {
      console.warn('[mermaid]', err)
    }
  }

  renderLock = renderLock.then(run, run)
  await renderLock
}
