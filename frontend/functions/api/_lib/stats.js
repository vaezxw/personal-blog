import { heatScore } from './notifications.js'

export async function getCommentCount(db, postId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?')
    .bind(postId)
    .first()
  return Number(row?.c || 0)
}

export async function getCommentCountsForPosts(db, postIds) {
  const map = Object.create(null)
  if (!postIds?.length) return map
  for (const id of postIds) map[id] = 0
  const placeholders = postIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `SELECT post_id, COUNT(*) AS c FROM comments WHERE post_id IN (${placeholders}) GROUP BY post_id`,
    )
    .bind(...postIds)
    .all()
  for (const row of results || []) {
    map[row.post_id] = Number(row.c || 0)
  }
  return map
}

export async function enrichPosts(db, posts, { userId = null } = {}) {
  if (!posts?.length) return []
  const ids = posts.map((p) => p.id)
  const commentMap = await getCommentCountsForPosts(db, ids)

  let likedSet = new Set()
  let favoritedSet = new Set()
  if (userId) {
    const placeholders = ids.map(() => '?').join(',')
    const [likeRes, favRes] = await Promise.all([
      db
        .prepare(
          `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`,
        )
        .bind(userId, ...ids)
        .all(),
      db
        .prepare(
          `SELECT post_id FROM post_favorites WHERE user_id = ? AND post_id IN (${placeholders})`,
        )
        .bind(userId, ...ids)
        .all(),
    ])
    likedSet = new Set((likeRes.results || []).map((r) => r.post_id))
    favoritedSet = new Set((favRes.results || []).map((r) => r.post_id))
  }

  return posts.map((p) => {
    const viewCount = Number(p.viewCount || 0)
    const likeCount = Number(p.likeCount || 0)
    const favoriteCount = Number(p.favoriteCount || 0)
    const clickCount = Number(p.clickCount || 0)
    const commentCount = commentMap[p.id] || 0
    return {
      ...p,
      viewCount,
      likeCount,
      favoriteCount,
      clickCount,
      commentCount,
      heat: heatScore({ viewCount, likeCount, commentCount, favoriteCount }),
      likedByMe: likedSet.has(p.id),
      favoritedByMe: favoritedSet.has(p.id),
    }
  })
}

export async function getUserStats(db, userId) {
  const agg = await db
    .prepare(
      `SELECT
         COUNT(*) AS post_count,
         COALESCE(SUM(view_count), 0) AS view_count,
         COALESCE(SUM(click_count), 0) AS click_count,
         COALESCE(SUM(like_count), 0) AS like_count,
         COALESCE(SUM(favorite_count), 0) AS favorite_count
       FROM posts
       WHERE author_id = ?`,
    )
    .bind(userId)
    .first()

  const commentAgg = await db
    .prepare(
      `SELECT COUNT(*) AS comment_count
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       WHERE p.author_id = ?`,
    )
    .bind(userId)
    .first()

  const { results } = await db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.published, p.view_count, p.like_count, p.favorite_count,
              p.click_count, p.created_at,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC`,
    )
    .bind(userId)
    .all()

  const posts = (results || []).map((row) => {
    const viewCount = Number(row.view_count || 0)
    const likeCount = Number(row.like_count || 0)
    const favoriteCount = Number(row.favorite_count || 0)
    const clickCount = Number(row.click_count || 0)
    const commentCount = Number(row.comment_count || 0)
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      published: Boolean(row.published),
      viewCount,
      likeCount,
      favoriteCount,
      clickCount,
      commentCount,
      heat: heatScore({ viewCount, likeCount, commentCount, favoriteCount }),
      createdAt: row.created_at,
    }
  })

  const postCount = Number(agg?.post_count || 0)
  const viewCount = Number(agg?.view_count || 0)
  const clickCount = Number(agg?.click_count || 0)
  const likeCount = Number(agg?.like_count || 0)
  const favoriteCount = Number(agg?.favorite_count || 0)
  const commentCount = Number(commentAgg?.comment_count || 0)

  return {
    postCount,
    viewCount,
    clickCount,
    likeCount,
    favoriteCount,
    commentCount,
    heat: heatScore({ viewCount, likeCount, commentCount, favoriteCount }),
    posts,
  }
}
