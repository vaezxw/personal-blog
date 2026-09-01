<template>
  <article class="article" v-if="post">
    <p class="eyebrow">
      <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
    </p>
    <h1>{{ post.title }}</h1>
    <p class="lede">{{ post.excerpt }}</p>
    <div class="prose" v-html="post.html"></div>
    <RouterLink class="back" to="/">← 返回文章列表</RouterLink>
  </article>
  <p v-else-if="loading" class="muted">加载中…</p>
  <p v-else class="error">{{ error || '文章不存在' }}</p>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { fetchPost } from '../api'

const props = defineProps({
  slug: { type: String, required: true },
})

const post = ref(null)
const loading = ref(true)
const error = ref('')

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  error.value = ''
  post.value = null
  try {
    post.value = await fetchPost(props.slug)
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.slug, load)
</script>
