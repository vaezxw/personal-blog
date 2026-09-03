/** Post share payload stored in DM message body. Keep in sync with src/utils/dmShare.js */

export const SHARE_MARKER = '⟦MOHHEN_SHARE_POST⟧'

export function encodePostShare(data) {
  const payload = {
    v: 1,
    type: 'post',
    slug: String(data.slug || '').trim(),
    title: String(data.title || '').trim().slice(0, 200),
    author: String(data.authorUsername || '').trim().slice(0, 64),
    excerpt: String(data.excerpt || '').trim().slice(0, 160),
    note: String(data.note || '').trim().slice(0, 200),
  }
  return `${SHARE_MARKER}${JSON.stringify(payload)}`
}

export function sharePreviewText(data) {
  const title = String(data?.title || '').trim() || '文章'
  return `分享《${title}》`
}
