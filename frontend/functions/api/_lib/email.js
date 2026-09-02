/** Shared email helpers (no SMTP / sockets dependency). */

export function isDeliverableEmail(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return false
  if (e.endsWith('.invalid') || e.endsWith('@local') || e.includes('@noreply.')) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}
