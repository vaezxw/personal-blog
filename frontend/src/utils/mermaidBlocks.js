let mermaidPromise = null

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      })
      return mermaid
    })
  }
  return mermaidPromise
}

/** 渲染容器内尚未处理的 <pre class="mermaid"> */
export async function renderMermaidBlocks(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return
  const nodes = [...root.querySelectorAll('pre.mermaid')].filter(
    (el) => !el.getAttribute('data-processed'),
  )
  if (!nodes.length) return
  try {
    const mermaid = await getMermaid()
    await mermaid.run({ nodes })
  } catch (err) {
    console.warn('[mermaid]', err)
  }
}
