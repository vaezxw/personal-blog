import { optionalUser } from '../../_lib/auth.js'
import { getFollowCounts, mapPublicUser } from '../../_lib/follows.js'
import { getUserStats } from '../../_lib/stats.js'
import { empty, json } from '../../_lib/response.js'

function dayKey(iso) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}

function fillDays(map, days) {
  const out = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, value: Number(map[key] || 0) })
  }
  return out
}

/** Calendar heatmap: full weeks Sun→Sat, ending on today. */
function buildHeatmap(map, weekCount = 53) {
  const now = new Date()
  // Workers run in UTC; keep calendar days in UTC to match ISO timestamps
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  // Sunday of the oldest week we show
  const start = new Date(today)
  start.setUTCDate(today.getUTCDate() - today.getUTCDay() - (weekCount - 1) * 7)

  const cells = []
  let max = 0
  const cursor = new Date(start)

  while (cursor.getTime() <= today.getTime()) {
    const key = cursor.toISOString().slice(0, 10)
    const value = Number(map[key] || 0)
    if (value > max) max = value
    cells.push({
      date: key,
      value,
      dow: cursor.getUTCDay(),
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (const cell of cells) {
    if (!cell.value) cell.level = 0
    else if (max <= 1) cell.level = 3
    else if (cell.value / max <= 0.25) cell.level = 1
    else if (cell.value / max <= 0.5) cell.level = 2
    else if (cell.value / max <= 0.75) cell.level = 3
    else cell.level = 4
  }

  return {
    cells,
    weeks: weekCount,
    max,
    start: cells[0]?.date || null,
    end: cells[cells.length - 1]?.date || null,
  }
}

function fillMonths(map, months) {
  const out = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    out.push({ month: key, value: Number(map[key] || 0) })
  }
  return out
}

export async function onRequest(context) {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' })

  const username = decodeURIComponent(params.username || '').trim()
  if (!username) return json(400, { error: 'username required' })

  const row = await env.DB.prepare(
    `SELECT id, username, role, created_at, avatar_url FROM users WHERE username = ? COLLATE NOCASE`,
  )
    .bind(username)
    .first()
  if (!row) return json(404, { error: 'User not found' })

  const viewer = await optionalUser(context)
  const followCounts = await getFollowCounts(env.DB, row.id)
  const stats = await getUserStats(env.DB, row.id)

  const { results: likeRows } = await env.DB.prepare(
    `SELECT pl.created_at AS created_at
     FROM post_likes pl
     JOIN posts p ON p.id = pl.post_id
     WHERE p.author_id = ?
       AND pl.created_at >= date('now', '-30 days')`,
  )
    .bind(row.id)
    .all()

  const { results: commentRows } = await env.DB.prepare(
    `SELECT c.created_at AS created_at
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     WHERE p.author_id = ?
       AND c.created_at >= date('now', '-30 days')`,
  )
    .bind(row.id)
    .all()

  const { results: followRows } = await env.DB.prepare(
    `SELECT created_at FROM follows
     WHERE following_id = ?
       AND created_at >= date('now', '-30 days')`,
  )
    .bind(row.id)
    .all()

  const likeMap = Object.create(null)
  for (const r of likeRows || []) {
    const k = dayKey(r.created_at)
    if (k) likeMap[k] = (likeMap[k] || 0) + 1
  }
  const commentMap = Object.create(null)
  for (const r of commentRows || []) {
    const k = dayKey(r.created_at)
    if (k) commentMap[k] = (commentMap[k] || 0) + 1
  }
  const followMap = Object.create(null)
  for (const r of followRows || []) {
    const k = dayKey(r.created_at)
    if (k) followMap[k] = (followMap[k] || 0) + 1
  }

  const monthMap = Object.create(null)
  const dayPostMap = Object.create(null)
  for (const p of stats.posts || []) {
    const day = dayKey(p.createdAt)
    const m = day.slice(0, 7)
    if (m) monthMap[m] = (monthMap[m] || 0) + 1
    if (day) dayPostMap[day] = (dayPostMap[day] || 0) + 1
  }

  const postHeatmap = buildHeatmap(dayPostMap, 53)

  const topPosts = [...(stats.posts || [])]
    .filter((p) => p.published)
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 6)
    .map((p) => ({
      title: p.title,
      slug: p.slug,
      views: p.viewCount,
      likes: p.likeCount,
      comments: p.commentCount,
      heat: p.heat,
    }))

  const published = (stats.posts || []).filter((p) => p.published).length
  const drafts = Math.max(0, stats.postCount - published)

  return json(200, {
    user: mapPublicUser(row, {
      ...followCounts,
      isSelf: viewer?.id === row.id,
    }),
    summary: {
      postCount: stats.postCount,
      published,
      drafts,
      viewCount: stats.viewCount,
      clickCount: stats.clickCount,
      likeCount: stats.likeCount,
      commentCount: stats.commentCount,
      heat: stats.heat,
      followerCount: followCounts.followerCount,
      followingCount: followCounts.followingCount,
    },
    series: {
      likes30d: fillDays(likeMap, 30),
      comments30d: fillDays(commentMap, 30),
      followers30d: fillDays(followMap, 30),
      postsByMonth: fillMonths(monthMap, 8),
      postHeatmap,
      topPosts,
      mix: [
        { key: 'views', value: stats.viewCount },
        { key: 'likes', value: stats.likeCount },
        { key: 'comments', value: stats.commentCount },
        { key: 'clicks', value: stats.clickCount },
      ],
    },
  })
}
