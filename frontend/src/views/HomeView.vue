<template>
  <section class="hero">
    <p class="eyebrow">{{ t('home.eyebrow') }}</p>
    <h1>{{ t('home.title') }}</h1>
    <p class="lede">{{ t('home.lede') }}</p>
    <div class="hero-actions">
      <button type="button" class="btn ghost tip-trigger" @click="tipOpen = true">
        {{ t('tip.open') }}
      </button>
    </div>
    <TipJarModal v-model:open="tipOpen" />
  </section>

  <section class="post-list" aria-live="polite">
    <p v-if="loading && !posts.length" class="muted">{{ t('home.loading') }}</p>
    <p v-else-if="error && !posts.length" class="error">{{ error }}</p>
    <article v-for="post in posts" :key="post.id" class="post-row">
      <div class="post-meta">
        <RouterLink
          v-if="post.authorUsername"
          class="person-chip"
          :to="{ name: 'user', params: { username: post.authorUsername } }"
        >
          <span class="person-avatar" aria-hidden="true">
            <img v-if="post.authorAvatarUrl" :src="post.authorAvatarUrl" alt="" />
            <template v-else>{{ post.authorUsername.slice(0, 1).toUpperCase() }}</template>
          </span>
          <span class="person-text">
            <strong>{{ post.authorUsername }}</strong>
            <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
          </span>
        </RouterLink>
        <time v-else :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
      </div>
      <div class="post-body">
        <h2>
          <RouterLink :to="{ name: 'post', params: { slug: post.slug } }">{{ post.title }}</RouterLink>
          <span v-if="post.repostOf" class="vis-badge">{{ t('post.repostBadge') }}</span>
          <span v-if="post.visibility === 'friends'" class="vis-badge">{{ t('post.badgeFriends') }}</span>
          <span v-else-if="post.visibility === 'private'" class="vis-badge private">{{ t('post.badgePrivate') }}</span>
        </h2>
        <RouterLink
          v-if="post.repostOf"
          class="home-repost"
          :to="{ name: 'post', params: { slug: post.repostOf.slug } }"
          @click.stop
        >
          <span>{{ t('post.repostSource') }}</span>
          <strong>{{ post.repostOf.title }}</strong>
          <span class="muted">@{{ post.repostOf.authorUsername }}</span>
        </RouterLink>
        <p>{{ plainExcerpt(post.excerpt || post.content) }}</p>
        <p class="post-engage muted">
          <span>{{ t('home.views', { count: post.viewCount || 0 }) }}</span>
          <span>·</span>
          <span>{{ t('home.likes', { count: post.likeCount || 0 }) }}</span>
          <span>·</span>
          <span>{{ t('home.comments', { count: post.commentCount || 0 }) }}</span>
        </p>
      </div>
    </article>
    <p v-if="!loading && !error && posts.length === 0" class="muted">{{ t('home.empty') }}</p>
  </section>
</template>

<script>
export default { name: 'HomeView' }
</script>

<script setup>
import { onActivated, onMounted, ref } from 'vue'
import { fetchPostsCached } from '../api'
import TipJarModal from '../components/TipJarModal.vue'
import { useLocale } from '../composables/useLocale.js'
import { toPlainExcerpt } from '../utils/markdownUpload.js'

const { t, formatDate } = useLocale()
const posts = ref([])
const loading = ref(true)
const error = ref('')
const tipOpen = ref(false)
const ready = ref(false)

function plainExcerpt(text) {
  return toPlainExcerpt(text, 120)
}

async function loadPosts({ force = false, showLoading = false } = {}) {
  if (showLoading && !posts.value.length) loading.value = true
  error.value = ''
  try {
    const data = await fetchPostsCached({ force })
    posts.value = Array.isArray(data) ? data : []
  } catch (err) {
    if (!posts.value.length) error.value = err.message || t('home.loadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadPosts({ showLoading: true })
  ready.value = true
})

// Keep-alive: returning from article restores DOM instantly; soft-refresh in background
onActivated(() => {
  if (!ready.value) return
  loadPosts({ force: false, showLoading: false })
})
</script>

<style scoped>
.hero-actions {
  margin-top: 1.15rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.tip-trigger {
  padding: 0.55rem 1rem;
  font-size: 0.92rem;
}

.post-engage {
  margin: 0.45rem 0 0;
  font-size: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.home-repost {
  display: grid;
  gap: 0.1rem;
  margin: 0.35rem 0 0.55rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 0.4rem;
  text-decoration: none;
  color: inherit;
  font-size: 0.88rem;
}

.home-repost:hover {
  border-color: var(--accent);
}

.home-repost span:first-child {
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.03em;
}

.person-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  padding: 0.15rem;
  transition: background 0.2s ease;
}

.person-chip:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: inherit;
}

.person-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 9px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-text {
  display: grid;
  gap: 0.05rem;
  line-height: 1.2;
}

.person-text strong {
  font-size: 0.92rem;
}

.person-text time {
  color: var(--muted);
  font-size: 0.78rem;
}
</style>
