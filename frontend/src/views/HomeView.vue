<template>
  <section class="hero">
    <p class="eyebrow">Personal Blog</p>
    <h1>墨痕</h1>
    <p class="lede">记录技术、项目与偶尔的想法。写给未来的自己，也写给路过的你。</p>
  </section>

  <section class="post-list" aria-live="polite">
    <p v-if="loading" class="muted">加载中…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <article v-for="post in posts" :key="post.id" class="post-row">
      <div class="post-meta">
        <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
      </div>
      <div class="post-body">
        <h2>
          <RouterLink :to="`/post/${post.slug}`">{{ post.title }}</RouterLink>
        </h2>
        <p>{{ post.excerpt }}</p>
      </div>
    </article>
    <p v-if="!loading && !error && posts.length === 0" class="muted">还没有文章。</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchPosts } from '../api'

const posts = ref([])
const loading = ref(true)
const error = ref('')

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

onMounted(async () => {
  try {
    posts.value = await fetchPosts()
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>
