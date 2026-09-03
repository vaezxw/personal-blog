import { newId } from './crypto.js'

const MAX_ATTACHMENTS = 20

export function mapAttachment(row) {
  if (!row) return null
  return {
    id: row.id,
    postId: row.post_id,
    key: row.object_key,
    url: row.url,
    name: row.filename,
    mime: row.mime || 'application/octet-stream',
    size: Number(row.size_bytes || 0),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
  }
}

/** Normalize client payload into safe attachment records (pre-insert). */
export function normalizeAttachmentInput(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!item || typeof item !== 'object') continue
    const key = String(item.key || '').trim()
    const url = String(item.url || '').trim()
    const name = String(item.name || item.filename || 'file').trim().slice(0, 200)
    if (!key.startsWith('uploads/') || !url || !name) continue
    out.push({
      id: String(item.id || '').trim() || newId('att'),
      key,
      url,
      name,
      mime: String(item.mime || 'application/octet-stream').slice(0, 120),
      size: Math.max(0, Number(item.size || item.sizeBytes || 0) || 0),
    })
  }
  return out
}

export async function getAttachmentsForPosts(db, postIds) {
  const map = Object.create(null)
  if (!postIds?.length) return map
  for (const id of postIds) map[id] = []
  const placeholders = postIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `SELECT * FROM post_attachments
       WHERE post_id IN (${placeholders})
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .bind(...postIds)
    .all()
  for (const row of results || []) {
    const list = map[row.post_id]
    if (list) list.push(mapAttachment(row))
  }
  return map
}

export async function replacePostAttachments(db, postId, attachments) {
  const list = normalizeAttachmentInput(attachments)
  await db.prepare('DELETE FROM post_attachments WHERE post_id = ?').bind(postId).run()
  const now = new Date().toISOString()
  for (let i = 0; i < list.length; i++) {
    const a = list[i]
    await db
      .prepare(
        `INSERT INTO post_attachments
         (id, post_id, object_key, url, filename, mime, size_bytes, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(a.id, postId, a.key, a.url, a.name, a.mime, a.size, i, now)
      .run()
  }
  return list
}

export async function deletePostAttachments(db, media, postId) {
  const { results } = await db
    .prepare('SELECT object_key FROM post_attachments WHERE post_id = ?')
    .bind(postId)
    .all()
  await db.prepare('DELETE FROM post_attachments WHERE post_id = ?').bind(postId).run()
  if (!media?.delete) return
  for (const row of results || []) {
    try {
      await media.delete(row.object_key)
    } catch {
      /* ignore missing objects */
    }
  }
}

export function formatBytes(n) {
  const size = Number(n || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
