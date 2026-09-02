/**
 * Cron Worker: every 5 minutes call Pages digest API.
 * Env: SITE_ORIGIN, EMAIL_CRON_SECRET
 */
export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerDigest(env))
  },

  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/run' || url.pathname === '/') {
      const result = await triggerDigest(env)
      return Response.json(result.body, { status: result.status })
    }
    return new Response('mohhen-email-cron ok', { status: 200 })
  },
}

async function triggerDigest(env) {
  const origin = String(env.SITE_ORIGIN || 'https://mohhen-blog.pages.dev').replace(/\/$/, '')
  const secret = String(env.EMAIL_CRON_SECRET || '').trim()
  if (!secret) {
    console.error('EMAIL_CRON_SECRET missing')
    return { status: 500, body: { ok: false, error: 'EMAIL_CRON_SECRET missing' } }
  }

  try {
    const res = await fetch(`${origin}/api/cron/email-digest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    })
    const text = await res.text()
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { ok: false, error: text.slice(0, 500) }
    }
    console.log('email-digest', res.status, JSON.stringify(body))
    return { status: res.status, body }
  } catch (err) {
    const message = String(err?.message || err)
    console.error('email-digest fetch failed', message)
    return { status: 500, body: { ok: false, error: message } }
  }
}
