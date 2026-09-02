export function mapComment(row) {
  if (!row) return null
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url || null,
    content: row.content,
    parentId: row.parent_id || null,
    replyToUsername: row.reply_to_username || null,
    createdAt: row.created_at,
  }
}

export const COMMENT_SELECT = `
  SELECT c.*,
         u.username,
         u.avatar_url,
         pu.username AS reply_to_username
  FROM comments c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN comments pc ON pc.id = c.parent_id
  LEFT JOIN users pu ON pu.id = pc.user_id
`
