/**
 * Minimal SMTP client for QQ Mail (smtp.qq.com:465, implicit TLS).
 * Uses Cloudflare Workers TCP sockets — never put auth codes in source.
 */

import { connect } from 'cloudflare:sockets'
import { isDeliverableEmail } from './email.js'

export { isDeliverableEmail } from './email.js'

function b64(text) {
  return btoa(unescape(encodeURIComponent(text)))
}

function encodeSubject(subject) {
  const raw = String(subject || '')
  if (/^[\x20-\x7E]*$/.test(raw)) return raw
  return `=?UTF-8?B?${b64(raw)}?=`
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket
    this.reader = socket.readable.getReader()
    this.writer = socket.writable.getWriter()
    this.encoder = new TextEncoder()
    this.decoder = new TextDecoder()
    this.buffer = ''
  }

  async readLine() {
    while (true) {
      const idx = this.buffer.indexOf('\n')
      if (idx >= 0) {
        const line = this.buffer.slice(0, idx).replace(/\r$/, '')
        this.buffer = this.buffer.slice(idx + 1)
        return line
      }
      const { value, done } = await this.reader.read()
      if (done) throw new Error('SMTP connection closed')
      this.buffer += this.decoder.decode(value, { stream: true })
    }
  }

  async expect(okPrefix) {
    const lines = []
    while (true) {
      const line = await this.readLine()
      lines.push(line)
      // Multi-line replies: "250-..." then final "250 ..."
      if (/^\d{3}[ -]/.test(line) && line[3] === ' ') break
      if (/^\d{3}[ -]/.test(line) && line[3] === '-') continue
      if (/^\d{3}/.test(line)) break
    }
    const last = lines[lines.length - 1] || ''
    const code = last.slice(0, 3)
    if (!String(okPrefix).split(',').includes(code)) {
      throw new Error(`SMTP unexpected reply: ${lines.join(' | ')}`)
    }
    return lines
  }

  async command(cmd, okPrefix) {
    await this.writer.write(this.encoder.encode(`${cmd}\r\n`))
    return this.expect(okPrefix)
  }

  async close() {
    try {
      await this.writer.close()
    } catch {
      /* ignore */
    }
    try {
      this.reader.releaseLock()
    } catch {
      /* ignore */
    }
    try {
      await this.socket.close()
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {object} env
 * @param {{ to: string, subject: string, text: string, html?: string }} mail
 */
export async function sendSmtpMail(env, mail) {
  const host = env.SMTP_HOST || 'smtp.qq.com'
  const port = Number(env.SMTP_PORT || 465)
  const user = String(env.SMTP_USER || '').trim()
  const pass = String(env.SMTP_PASS || '').trim()
  const fromName = env.SMTP_FROM_NAME || '墨痕'
  const fromAddr = String(env.SMTP_FROM || user).trim()

  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS not configured')
  if (!isDeliverableEmail(mail.to)) throw new Error('Invalid recipient')
  if (!isDeliverableEmail(fromAddr)) throw new Error('Invalid SMTP_FROM')

  const socket = connect(
    { hostname: host, port },
    { secureTransport: 'on' },
  )
  await socket.opened
  const smtp = new SmtpSession(socket)

  try {
    await smtp.expect('220')
    await smtp.command(`EHLO mohhen-blog`, '250')
    await smtp.command('AUTH LOGIN', '334')
    await smtp.command(b64(user), '334')
    await smtp.command(b64(pass), '235')
    await smtp.command(`MAIL FROM:<${fromAddr}>`, '250')
    await smtp.command(`RCPT TO:<${mail.to}>`, '250')
    await smtp.command('DATA', '354')

    const boundary = `b_${crypto.randomUUID().replace(/-/g, '')}`
    const subject = encodeSubject(mail.subject)
    const text = String(mail.text || '')
    const html = mail.html ? String(mail.html) : null
    const date = new Date().toUTCString()

    const headers = [
      `From: ${fromName} <${fromAddr}>`,
      `To: <${mail.to}>`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `MIME-Version: 1.0`,
      `Message-ID: <${crypto.randomUUID()}@mohhen-blog>`,
    ]

    let body
    if (html) {
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
      body = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        text,
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        html,
        `--${boundary}--`,
        '',
      ].join('\r\n')
    } else {
      headers.push('Content-Type: text/plain; charset=UTF-8')
      headers.push('Content-Transfer-Encoding: 8bit')
      body = `${text}\r\n`
    }

    // Dot-stuff lines that start with .
    const payload = `${headers.join('\r\n')}\r\n\r\n${body}`.replace(/^\./gm, '..')
    await smtp.writer.write(smtp.encoder.encode(`${payload}\r\n.\r\n`))
    await smtp.expect('250')
    await smtp.command('QUIT', '221')
  } finally {
    await smtp.close()
  }
}
