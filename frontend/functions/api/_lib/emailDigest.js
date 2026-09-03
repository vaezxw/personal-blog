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
 * Run all deferred email digests (DMs + followed authors' new posts).
 */
export async function runAllEmailDigests(env) {
  const messages = await runUnreadMessageEmailDigest(env)
  const posts = await runNewPostEmailDigest(env)
  let mentions = { ok: true, sent: 0 }
  try {
    mentions = await runMentionEmailDigest(env)
  } catch (err) {
    mentions = { ok: false, sent: 0, error: String(err?.message || err) }
  }
  return {
    ok: Boolean(messages?.ok) && Boolean(posts?.ok) && Boolean(mentions?.ok),
    messages,
    posts,
    mentions,
    sent: Number(messages?.sent || 0) + Number(posts?.sent || 0) + Number(mentions?.sent || 0),
  }
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
      await markMessageNotified(
        env.DB,
        group.map((g) => g.message_id),
      )
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
      await markMessageNotified(
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

/**
 * Email followers about new posts they have not read in-site yet.
 */
export async function runNewPostEmailDigest(env) {
  if (!env?.DB) return { ok: false, error: 'DB missing', sent: 0 }
  if (!env.SMTP_PASS || !env.SMTP_USER) {
    return { ok: false, error: 'SMTP not configured', sent: 0 }
  }

  const cutoff = new Date(Date.now() - GRACE_MS).toISOString()

  // Clear pending emails for posts already read in the notification center
  await markReadPostEmailsAsNotified(env.DB, cutoff)

  const { results } = await env.DB.prepare(
    `SELECT
        e.id AS outbox_id,
        e.user_id AS recipient_id,
        recip.email AS recipient_email,
        recip.username AS recipient_username,
        author.username AS author_username,
        p.id AS post_id,
        p.title AS post_title,
        p.slug AS post_slug,
        p.excerpt AS post_excerpt,
        e.created_at AS created_at
     FROM post_follow_emails e
     JOIN users recip ON recip.id = e.user_id
     JOIN users author ON author.id = e.author_id
     JOIN posts p ON p.id = e.post_id
     LEFT JOIN notifications n
       ON n.user_id = e.user_id
      AND n.post_id = e.post_id
      AND n.type = 'post'
     WHERE e.email_notified_at IS NULL
       AND e.created_at <= ?
       AND p.published = 1
       AND COALESCE(p.visibility, 'public') != 'private'
       AND (n.id IS NULL OR n.read_at IS NULL)
     ORDER BY e.user_id, e.created_at ASC
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
      await markPostEmailNotified(
        env.DB,
        group.map((g) => g.outbox_id),
      )
      continue
    }

    const count = group.length
    const authors = [...new Set(group.map((g) => g.author_username))]
    const primaryAuthor = authors[0] || '有人'
    const primary = group[group.length - 1]
    const postUrl = `${origin}/post/${encodeURIComponent(primary.post_slug)}`
    const excerpt = String(primary.post_excerpt || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140)

    const subject =
      count === 1
        ? `【墨痕】${primaryAuthor} 发布了新文章《${primary.post_title}》`
        : `【墨痕】你关注的作者发布了 ${count} 篇新文章`

    const textLines = [
      `你好 ${first.recipient_username}，`,
      '',
      count === 1
        ? `你关注的 ${primaryAuthor} 发布了新文章《${primary.post_title}》：`
        : `你关注的作者发布了 ${count} 篇新文章（来自：${authors.join('、')}）：`,
    ]
    if (count === 1 && excerpt) {
      textLines.push('', excerpt)
    } else if (count > 1) {
      for (const g of group.slice(0, 8)) {
        textLines.push(
          `- ${g.author_username}：《${g.post_title}》 ${origin}/post/${encodeURIComponent(g.post_slug)}`,
        )
      }
      if (group.length > 8) textLines.push(`…还有 ${group.length - 8} 篇`)
    }
    textLines.push(
      '',
      count === 1 ? `阅读文章：${postUrl}` : `打开网站查看：${origin}/`,
      '',
      '若你已在站内看过，可忽略本邮件。',
      '— 墨痕',
    )
    const text = textLines.join('\n')

    const listHtml =
      count === 1
        ? `<p><strong>${escapeHtml(primaryAuthor)}</strong> 发布了新文章
            《<a href="${escapeHtml(postUrl)}">${escapeHtml(primary.post_title)}</a>》。
           </p>
           ${
             excerpt
               ? `<blockquote style="margin:1rem 0;padding:0.75rem 1rem;border-left:3px solid #0d9488;background:#f0fdfa">${escapeHtml(excerpt)}</blockquote>`
               : ''
           }
           <p><a href="${escapeHtml(postUrl)}" style="display:inline-block;padding:0.55rem 1rem;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px">阅读文章</a></p>`
        : `<p>你关注的作者发布了 <strong>${count}</strong> 篇新文章（来自：${escapeHtml(authors.join('、'))}）：</p>
           <ul>
             ${group
               .slice(0, 8)
               .map(
                 (g) =>
                   `<li><strong>${escapeHtml(g.author_username)}</strong>：
                     <a href="${escapeHtml(`${origin}/post/${encodeURIComponent(g.post_slug)}`)}">${escapeHtml(g.post_title)}</a>
                    </li>`,
               )
               .join('')}
             ${group.length > 8 ? `<li>…还有 ${group.length - 8} 篇</li>` : ''}
           </ul>
           <p><a href="${escapeHtml(origin + '/')}" style="display:inline-block;padding:0.55rem 1rem;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px">打开网站</a></p>`

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a1a">
        <p>你好 <strong>${escapeHtml(first.recipient_username)}</strong>，</p>
        ${listHtml}
        <p style="color:#64748b;font-size:0.9rem">若你已在站内看过，可忽略本邮件。<br/>— 墨痕</p>
      </div>
    `

    try {
      await sendSmtpMail(env, { to: email, subject, text, html })
      await markPostEmailNotified(
        env.DB,
        group.map((g) => g.outbox_id),
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

async function markMessageNotified(db, messageIds) {
  const ids = [...new Set(messageIds.filter(Boolean))]
  if (!ids.length) return
  const now = new Date().toISOString()
  const stmts = ids.map((id) =>
    db
      .prepare(`UPDATE messages SET email_notified_at = ? WHERE id = ? AND email_notified_at IS NULL`)
      .bind(now, id),
  )
  await db.batch(stmts)
}

async function markPostEmailNotified(db, outboxIds) {
  const ids = [...new Set(outboxIds.filter(Boolean))]
  if (!ids.length) return
  const now = new Date().toISOString()
  const stmts = ids.map((id) =>
    db
      .prepare(
        `UPDATE post_follow_emails SET email_notified_at = ? WHERE id = ? AND email_notified_at IS NULL`,
      )
      .bind(now, id),
  )
  await db.batch(stmts)
}

/** Email users who were @mentioned and have not been emailed yet. */
export async function runMentionEmailDigest(env) {
  if (!env?.DB) return { ok: false, error: 'DB missing', sent: 0 }
  if (!env.SMTP_PASS || !env.SMTP_USER) {
    return { ok: false, error: 'SMTP not configured', sent: 0 }
  }

  const cutoff = new Date(Date.now() - GRACE_MS).toISOString()
  let results = []
  try {
    const q = await env.DB.prepare(
      `SELECT
          me.id AS outbox_id,
          me.created_at AS created_at,
          me.post_id AS post_id,
          me.comment_id AS comment_id,
          recip.id AS recipient_id,
          recip.email AS recipient_email,
          recip.username AS recipient_username,
          actor.username AS actor_username,
          p.title AS post_title,
          p.slug AS post_slug
       FROM mention_emails me
       JOIN users recip ON recip.id = me.user_id
       JOIN users actor ON actor.id = me.actor_id
       LEFT JOIN posts p ON p.id = me.post_id
       WHERE me.email_notified_at IS NULL
         AND me.created_at <= ?
       ORDER BY recip.id, me.created_at ASC
       LIMIT 500`,
    )
      .bind(cutoff)
      .all()
    results = q.results || []
  } catch (err) {
    return { ok: false, error: String(err?.message || err), sent: 0 }
  }

  if (!results.length) return { ok: true, sent: 0, skipped: 0, recipients: 0 }

  /** @type {Map<string, typeof results>} */
  const byRecipient = new Map()
  for (const row of results) {
    if (!byRecipient.has(row.recipient_id)) byRecipient.set(row.recipient_id, [])
    byRecipient.get(row.recipient_id).push(row)
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
      await markMentionEmailNotified(
        env.DB,
        group.map((g) => g.outbox_id),
      )
      continue
    }

    const count = group.length
    const actors = [...new Set(group.map((g) => g.actor_username).filter(Boolean))]
    const primary = actors[0] || '有人'
    const subject =
      count === 1
        ? `【墨痕】${primary} 在内容中提到了你`
        : `【墨痕】你有 ${count} 条 @提及`

    const textLines = [
      `你好 ${first.recipient_username}，`,
      '',
      count === 1
        ? `${primary} 在「墨痕」提到了你。`
        : `你有 ${count} 条未读 @提及。`,
      '',
    ]
    for (const g of group.slice(0, 8)) {
      const link = g.post_slug
        ? `${origin}/post/${encodeURIComponent(g.post_slug)}${g.comment_id ? `#comment-${g.comment_id}` : ''}`
        : `${origin}/`
      textLines.push(`- @${g.actor_username} · ${g.post_title || '动态'} → ${link}`)
    }
    if (group.length > 8) textLines.push(`…还有 ${group.length - 8} 条`)
    textLines.push('', `打开网站：${origin}/`, '', '若你已在站内看过，可忽略本邮件。', '— 墨痕')
    const text = textLines.join('\n')

    const listHtml = `
      <ul>
        ${group
          .slice(0, 8)
          .map((g) => {
            const link = g.post_slug
              ? `${origin}/post/${encodeURIComponent(g.post_slug)}${g.comment_id ? `#comment-${g.comment_id}` : ''}`
              : `${origin}/`
            return `<li><strong>@${escapeHtml(g.actor_username)}</strong>：
              <a href="${escapeHtml(link)}">${escapeHtml(g.post_title || '查看内容')}</a></li>`
          })
          .join('')}
        ${group.length > 8 ? `<li>…还有 ${group.length - 8} 条</li>` : ''}
      </ul>`

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a1a">
        <p>你好 <strong>${escapeHtml(first.recipient_username)}</strong>，</p>
        <p>${count === 1 ? `${escapeHtml(primary)} 在「墨痕」提到了你。` : `你有 ${count} 条未读 @提及。`}</p>
        ${listHtml}
        <p><a href="${escapeHtml(origin + '/')}" style="display:inline-block;padding:0.55rem 1rem;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px">打开网站</a></p>
        <p style="color:#64748b;font-size:0.9rem">若你已在站内看过，可忽略本邮件。<br/>— 墨痕</p>
      </div>
    `

    try {
      await sendSmtpMail(env, { to: email, subject, text, html })
      await markMentionEmailNotified(
        env.DB,
        group.map((g) => g.outbox_id),
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

async function markMentionEmailNotified(db, outboxIds) {
  const ids = [...new Set(outboxIds.filter(Boolean))]
  if (!ids.length) return
  const now = new Date().toISOString()
  const stmts = ids.map((id) =>
    db
      .prepare(
        `UPDATE mention_emails SET email_notified_at = ? WHERE id = ? AND email_notified_at IS NULL`,
      )
      .bind(now, id),
  )
  await db.batch(stmts)
}

/** Clear pending emails for posts the user already read in the notification center. */
async function markReadPostEmailsAsNotified(db, cutoff) {
  const now = new Date().toISOString()
  await db
    .prepare(
      `UPDATE post_follow_emails
       SET email_notified_at = ?
       WHERE email_notified_at IS NULL
         AND created_at <= ?
         AND EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = post_follow_emails.user_id
             AND n.post_id = post_follow_emails.post_id
             AND n.type = 'post'
             AND n.read_at IS NOT NULL
         )`,
    )
    .bind(now, cutoff)
    .run()
}
