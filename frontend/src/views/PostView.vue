<template>
  <article class="article" v-if="post">
    <p class="eyebrow">
      <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
      <span v-if="post.authorUsername" class="muted"> · {{ post.authorUsername }}</span>
    </p>
    <h1>{{ post.title }}</h1>
    <p class="lede">{{ post.excerpt }}</p>
    <div class="prose" v-html="post.html"></div>

    <section class="comments panel">
      <h2>评论</h2>
      <p v-if="commentsLoading" class="muted">加载评论…</p>
      <p v-else-if="commentsError" class="error">{{ commentsError }}</p>
      <ul v-else class="comment-list">
        <li v-for="c in comments" :key="c.id">
          <div class="comment-head">
            <strong>{{ c.username }}</strong>
            <time :datetime="c.createdAt">{{ formatDate(c.createdAt) }}</time>
            <button
              v-if="canDeleteComment(c)"
              class="btn ghost danger small"
              type="button"
              @click="removeComment(c)"
            >
              删除
            </button>
          </div>
          <p>{{ c.content }}</p>
        </li>
      </ul>
      <p v-if="!commentsLoading && comments.length === 0" class="muted">还没有评论。</p>

      <form v-if="currentUser" class="comment-form" @submit.prevent="submitComment">
        <label>发表评论</label>
        <textarea v-model="commentText" rows="3" placeholder="说点什么…" required maxlength="2000"></textarea>
        <button class="btn" type="submit" :disabled="commentBusy">{{ commentBusy ? '发送中…' : '发送' }}</button>
        <p v-if="commentFormError" class="error">{{ commentFormError }}</p>
      </form>
      <p v-else class="muted">
        <RouterLink to="/admin">登录</RouterLink> 后可评论。
      </p>
    </section>

    <RouterLink class="back" to="/">← 返回文章列表</RouterLink>
  </article>
  <p v-else-if="loading" class="muted">加载中…</p>
  <p v-else class="error">{{ error || '文章不存在' }}</p>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import {
  createComment,
  deleteComment,
  fetchComments,
  fetchPost,
  getStoredUser,
  me,
} from '../api'

const props = defineProps({
  slug: { type: String, required: true },
})

const post = ref(null)
const loading = ref(true)
const error = ref('')
const comments = ref([])
const commentsLoading = ref(true)
const commentsError = ref('')
const currentUser = ref(getStoredUser())
const commentText = ref('')
const commentBusy = ref(false)
const commentFormError = ref('')

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

function canDeleteComment(c) {
  if (!currentUser.value) return false
  return currentUser.value.role === 'admin' || currentUser.value.id === c.userId
}

async function loadComments() {
  commentsLoading.value = true
  commentsError.value = ''
  try {
    comments.value = await fetchComments(props.slug)
  } catch (err) {
    commentsError.value = err.message || '评论加载失败'
  } finally {
    commentsLoading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  post.value = null
  try {
    post.value = await fetchPost(props.slug)
    await loadComments()
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  commentBusy.value = true
  commentFormError.value = ''
  try {
    const created = await createComment(props.slug, commentText.value.trim())
    comments.value = [...comments.value, created]
    commentText.value = ''
  } catch (err) {
    commentFormError.value = err.message || '发送失败'
  } finally {
    commentBusy.value = false
  }
}

async function removeComment(c) {
  if (!confirm('确认删除这条评论？')) return
  try {
    await deleteComment(c.id)
    comments.value = comments.value.filter((x) => x.id !== c.id)
  } catch (err) {
    commentsError.value = err.message || '删除失败'
  }
}

async function restoreUser() {
  try {
    const data = await me()
    currentUser.value = data.user
  } catch {
    currentUser.value = null
  }
}

onMounted(() => {
  restoreUser()
  load()
})
watch(() => props.slug, load)
</script>

<style scoped>
.comments {
  margin-top: 2.5rem;
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: grid;
  gap: 1rem;
}

.comment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-bottom: 0.35rem;
}

.comment-head time {
  color: var(--muted);
  font-size: 0.9rem;
}

.btn.small {
  padding: 0.25rem 0.55rem;
  font-size: 0.85rem;
}

.comment-form {
  display: grid;
  gap: 0.55rem;
  margin-top: 1.25rem;
}
</style>
