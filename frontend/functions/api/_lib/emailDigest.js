import { isDeliverableEmail, sendSmtpMail } from './smtp.js'

/** Wait this long after a message arrives before emailing (user may still be online). */
const GRACE_MS = 3 * 60 * 1000
const MAX_RECIPIENTS = 40

function siteOrigin(env) {
  return String(env.SITE_ORIGIN || 'https://mohhen-blog.pages.dev').replace(/\/$/, '')
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Email users who still have unread DMs that have not been emailed yet.
 * Skips recipients without a real mailbox.
 */
export async function runUnreadMessageEmailDigest(env) {
  if (!env?.DB) return { ok: false, error: 'DB missing', sent: 0 }
  if (!env.SMTP_PASS || !env.SMTP_USER) {
    return { ok: false, error: 'SMTP not configured', sent: 0 }
  }

  const cutoff = new Date(Date.now() - GRACE_MS).toISOString()

  const { results } = await env.DB.prepare(
    `SELECT
        m.id AS message_id,
        m.body AS body,
        m.created_at AS created_at,
        m.conversation_id AS conversation_id,
        recip.id AS recipient_id,
        recip.email AS recipient_email,
        recip.username AS recipient_username,
        sender.username AS sender_username
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     JOIN users sender ON sender.id = m.sender_id
     JOIN users recip ON recip.id = CASE
       WHEN c.user_low_id = m.sender_id THEN c.user_high_id
       ELSE c.user_low_id
     END
     WHERE m.read_at IS NULL
       AND m.email_notified_at IS NULL
       AND m.created_at <= ?
     ORDER BY recip.id, m.created_at ASC
     LIMIT 500`,
  )
    .bind(cutoff)
    .all()

  const rows = results || []
  if (!rows.length) return { ok: true, sent: 0, skipped: 0, recipients: 0 }

  /** @type {Map<string, typeof rows>} */
  const byRecipient = new Map()
  for (const row of rows) {
    const key = row.recipient_id
    if (!byRecipient.has(key)) byRecipient.set(key, [])
    byRecipient.get(key).push(row)
  }

  const origin = siteOrigin(env)
  let sent = 0
  let skipped = 0
  const errors = []

  for (const [, group] of byRecipient) {
    if (sent >= MAX_RECIPIENTS) break
    const first = group[0]
    const email = first.recipient_email
    if (!isDeliverableEmail(email)) {
      skipped += 1
      // Mark so we do not retry forever for placeholder / missing emails
      await markNotified(env.DB, group.map((g) => g.message_id))
      continue
    }

    const count = group.length
    const senders = [...new Set(group.map((g) => g.sender_username))]
    const preview = String(group[group.length - 1].body || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
    const primarySender = senders[0] || '有人'
    const inboxUrl =
      senders.length === 1
        ? `${origin}/messages/${encodeURIComponent(primarySender)}`
        : `${origin}/messages`

    const subject =
      count === 1
        ? `【墨痕】${primarySender} 给你发来私信`
        : `【墨痕】你有 ${count} 条未读私信`

    const textLines = [
      `你好 ${first.recipient_username}，`,
      '',
      count === 1
        ? `${primarySender} 给你发来一条私信，你还没有在站内查看：`
        : `你有 ${count} 条未读私信（来自：${senders.join('、')}），尚未在站内查看：`,
    ]
    if (preview) {
      textLines.push('', `最新内容：${preview}`)
    }
    textLines.push('', `打开对话：${inboxUrl}`, '', '若你已在网站读过，可忽略本邮件。', '— 墨痕')
    const text = textLines.join('\n')

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a1a">
        <p>你好 <strong>${escapeHtml(first.recipient_username)}</strong>，</p>
        <p>${
          count === 1
            ? `<strong>${escapeHtml(primarySender)}</strong> 给你发来一条私信，你还没有在站内查看。`
            : `你有 <strong>${count}</strong> 条未读私信（来自：${escapeHtml(senders.join('、'))}），尚未在站内查看。`
        }</p>
        ${
          preview
            ? `<blockquote style="margin:1rem 0;padding:0.75rem 1rem;border-left:3px solid #0d9488;background:#f0fdfa">${escapeHtml(preview)}</blockquote>`
            : ''
        }
        <p><a href="${escapeHtml(inboxUrl)}" style="display:inline-block;padding:0.55rem 1rem;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px">打开私信</a></p>
        <p style="color:#64748b;font-size:0.9rem">若你已在网站读过，可忽略本邮件。<br/>— 墨痕</p>
      </div>
    `

    try {
      await sendSmtpMail(env, { to: email, subject, text, html })
      await markNotified(
        env.DB,
        group.map((g) => g.message_id),
      )
      sent += 1
    } catch (err) {
      errors.push({ user: first.recipient_username, error: String(err?.message || err) })
    }
  }

  return {
    ok: errors.length === 0,
    sent,
    skipped,
    recipients: byRecipient.size,
    errors: errors.length ? errors : undefined,
  }
}

async function markNotified(db, messageIds) {
  const ids = [...new Set(messageIds.filter(Boolean))]
  if (!ids.length) return
  const now = new Date().toISOString()
  // D1 batch bound updates
  const stmts = ids.map((id) =>
    db.prepare(`UPDATE messages SET email_notified_at = ? WHERE id = ? AND email_notified_at IS NULL`).bind(now, id),
  )
  await db.batch(stmts)
}
