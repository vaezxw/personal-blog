<template>
  <section class="library-page" v-if="payload">
    <header class="library-hero panel">
      <div class="library-identity">
        <div class="library-avatar" aria-hidden="true">
          <img v-if="payload.user.avatarUrl" :src="payload.user.avatarUrl" alt="" />
          <template v-else>{{ avatarLetter }}</template>
        </div>
        <div>
          <p class="eyebrow">{{ t('library.eyebrow') }}</p>
          <h1>{{ t('library.title', { user: payload.user.username }) }}</h1>
          <p class="muted">{{ t('library.lede') }}</p>
        </div>
      </div>
      <div class="library-actions">
        <RouterLink class="btn ghost" :to="{ name: 'user', params: { username } }">
          {{ t('dash.backProfile') }}
        </RouterLink>
        <RouterLink
          class="btn ghost"
          :to="{ name: 'user-dashboard', params: { username } }"
        >
          {{ t('dash.open') }}
        </RouterLink>
      </div>
    </header>

    <div class="library-tabs">
      <button
        type="button"
        class="stat-chip"
        :class="{ active: tab === 'likes' }"
        @click="tab = 'likes'"
      >
        <strong class="mono">{{ payload.likes.length }}</strong>
        <span>{{ t('library.tabLikes') }}</span>
      </button>
      <button
        type="button"
        class="stat-chip"
        :class="{ active: tab === 'favorites' }"
        @click="tab = 'favorites'"
      >
        <strong class="mono">{{ payload.favorites.length }}</strong>
        <span>{{ t('library.tabFavorites') }}</span>
      </button>
    </div>

    <section class="library-list panel">
      <p v-if="!activeList.length" class="muted">{{ emptyText }}</p>
      <article v-for="post in activeList" :key="`${tab}-${post.id}`" class="post-row">
        <div class="post-meta">
          <time :datetime="post.savedAt || post.createdAt">
            {{ formatDate(post.savedAt || post.createdAt) }}
          </time>
        </div>
        <div class="post-body">
          <h3>
            <RouterLink :to="{ name: 'post', params: { slug: post.slug } }">{{ post.title }}</RouterLink>
          </h3>
          <p v-if="post.excerpt" class="muted">{{ post.excerpt }}</p>
          <p class="engage-meta muted">
            <RouterLink
              v-if="post.authorUsername"
              class="author-link"
              :to="{ name: 'user', params: { username: post.authorUsername } }"
            >
              @{{ post.authorUsername }}
            </RouterLink>
            <span>{{ t('post.views', { count: post.viewCount || 0 }) }}</span>
            <span>{{ t('post.likes', { count: post.likeCount || 0 }) }}</span>
            <span>{{ t('post.favorites', { count: post.favoriteCount || 0 }) }}</span>
          </p>
        </div>
      </article>
    </section>
  </section>

  <p v-else-if="loading" class="muted">{{ t('home.loading') }}</p>
  <p v-else class="error">{{ error || t('library.missing') }}</p>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { fetchUserLibrary } from '../api'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  username: { type: String, required: true },
})

const { t, formatDate } = useLocale()
const loading = ref(true)
const error = ref('')
const payload = ref(null)
const tab = ref('likes')

const avatarLetter = computed(() => (payload.value?.user?.username || '?').slice(0, 1).toUpperCase())
const activeList = computed(() =>
  tab.value === 'favorites' ? payload.value?.favorites || [] : payload.value?.likes || [],
)
const emptyText = computed(() =>
  tab.value === 'favorites' ? t('library.emptyFavorites') : t('library.emptyLikes'),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    payload.value = await fetchUserLibrary(props.username)
  } catch (err) {
    payload.value = null
    error.value = err.message || t('library.missing')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.username,
  () => {
    tab.value = 'likes'
    load()
  },
  { immediate: true },
)
</script>

<style scoped>
.library-page {
  display: grid;
  gap: 1rem;
}

.library-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.library-identity {
  display: flex;
  gap: 0.9rem;
  align-items: center;
}

.library-avatar {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}

.library-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-hero h1 {
  margin: 0.15rem 0 0.35rem;
}

.library-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.library-tabs {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.library-list {
  display: grid;
  gap: 0.75rem;
  max-height: min(62vh, 560px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.library-list::-webkit-scrollbar {
  display: none;
}

.post-row {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.85rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--line);
}

.post-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.post-meta time {
  font-size: 0.82rem;
  color: var(--muted);
}

.post-body h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.post-body h3 a {
  color: inherit;
  text-decoration: none;
}

.post-body h3 a:hover {
  color: var(--accent);
}

.engage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
}

.author-link {
  color: var(--accent);
  text-decoration: none;
}

@media (max-width: 640px) {
  .post-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}
</style>
