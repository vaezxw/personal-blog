import { isMutualFollow } from './follows.js'

export const VISIBILITIES = ['public', 'friends', 'private']

export function normalizeVisibility(value, fallback = 'public') {
  const v = String(value || '').trim().toLowerCase()
  return VISIBILITIES.includes(v) ? v : fallback
}

/** SQL fragment: published posts visible to viewerId (or public-only if null). Bind viewerId twice when not null. */
export function publishedVisibilitySql(viewerId) {
  if (!viewerId) {
    return {
      sql: `p.published = 1 AND COALESCE(p.visibility, 'public') = 'public'`,
      binds: [],
    }
  }
  return {
    sql: `p.published = 1 AND (
      COALESCE(p.visibility, 'public') = 'public'
      OR p.author_id = ?
      OR (
        COALESCE(p.visibility, 'public') = 'friends'
        AND EXISTS (
          SELECT 1 FROM follows f1
          JOIN follows f2
            ON f2.follower_id = f1.following_id
           AND f2.following_id = f1.follower_id
          WHERE f1.follower_id = ?
            AND f1.following_id = p.author_id
        )
      )
    )`,
    binds: [viewerId, viewerId],
  }
}

export async function canViewPost(db, viewer, post) {
  if (!post) return false
  const visibility = normalizeVisibility(post.visibility)
  const authorId = post.author_id || post.authorId
  if (viewer?.id && viewer.id === authorId) return true
  if (visibility === 'public') return true
  if (visibility === 'private') return false
  if (visibility === 'friends') {
    if (!viewer?.id || !authorId) return false
    return isMutualFollow(db, viewer.id, authorId)
  }
  return false
}

export function visibilityDeniedPayload(post) {
  const visibility = normalizeVisibility(post?.visibility)
  if (visibility === 'friends') {
    return { error: 'Friends only', code: 'friends' }
  }
  return { error: 'Private post', code: 'private' }
}
