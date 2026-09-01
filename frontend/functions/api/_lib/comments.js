export function mapComment(row) {
  if (!row) return null
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    username: row.username,
    content: row.content,
    createdAt: row.created_at,
  }
}
