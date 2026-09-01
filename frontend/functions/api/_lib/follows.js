export async function getFollowCounts(db, userId) {
  const followers = await db
    .prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?')
    .bind(userId)
    .first()
  const following = await db
    .prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?')
    .bind(userId)
    .first()
  return {
    followerCount: Number(followers?.c || 0),
    followingCount: Number(following?.c || 0),
  }
}

export async function isFollowing(db, followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return false
  const row = await db
    .prepare('SELECT 1 AS ok FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(followerId, followingId)
    .first()
  return Boolean(row)
}

export async function isMutualFollow(db, a, b) {
  if (!a || !b || a === b) return false
  const [ab, ba] = await Promise.all([isFollowing(db, a, b), isFollowing(db, b, a)])
  return ab && ba
}

export function mapPublicUser(row, extras = {}) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
    avatarUrl: row.avatar_url || null,
    ...extras,
  }
}
