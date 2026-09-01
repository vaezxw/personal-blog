export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  }
}

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

export function jsonWithSetCookies(status, body, setCookieHeaders) {
  const res = new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  })
  for (const cookie of setCookieHeaders || []) {
    res.headers.append('Set-Cookie', cookie)
  }
  return res
}

export function empty(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders(),
  })
}

export async function readJson(request) {
  const text = await request.text()
  if (!text) return {}
  return JSON.parse(text)
}
