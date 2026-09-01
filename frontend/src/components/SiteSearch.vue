<template>
  <div class="site-search" ref="rootRef">
    <form class="site-search-form" role="search" @submit.prevent="submitSearch">
      <label class="sr-only" for="header-site-search">{{ t('search.placeholder') }}</label>
      <input
        id="header-site-search"
        v-model="query"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        :placeholder="t('search.placeholderShort')"
        @focus="onFocus"
        @input="onInput"
        @keydown.escape.prevent="close"
      />
    </form>

    <div
      v-if="open"
      class="site-search-panel"
      role="listbox"
      :aria-label="t('search.title')"
    >
      <p v-if="!query.trim()" class="muted site-search-hint">{{ t('search.hint') }}</p>
      <p v-else-if="loading" class="muted site-search-hint">{{ t('search.searching') }}</p>
      <p v-else-if="error" class="error site-search-hint">{{ error }}</p>
      <p v-else-if="searched && !hasResults" class="muted site-search-hint">
        {{ t('search.empty', { q: activeQuery }) }}
      </p>

      <template v-else-if="searched && hasResults">
        <div v-if="users.length" class="site-search-group">
          <p class="site-search-label">{{ t('search.usersTitle', { count: users.length }) }}</p>
          <RouterLink
            v-for="u in users"
            :key="u.id"
            class="site-search-item"
            :to="{ name: 'user', params: { username: u.username } }"
            @click="close"
          >
            <span class="site-search-avatar" aria-hidden="true">
              <img v-if="u.avatarUrl" :src="u.avatarUrl" alt="" />
              <template v-else>{{ u.username.slice(0, 1).toUpperCase() }}</template>
            </span>
            <span class="site-search-text">
              <strong>{{ u.username }}</strong>
              <span class="muted">@{{ u.username }}</span>
            </span>
          </RouterLink>
        </div>

        <div v-if="posts.length" class="site-search-group">
          <p class="site-search-label">{{ t('search.postsTitle', { count: posts.length }) }}</p>
          <RouterLink
            v-for="post in posts"
            :key="post.id"
            class="site-search-item"
            :to="{ name: 'post', params: { slug: post.slug } }"
            @click="close"
          >
            <span class="site-search-text">
              <strong>{{ post.title }}</strong>
              <span class="muted">
                {{ post.authorUsername ? `@${post.authorUsername}` : '' }}
                <template v-if="post.authorUsername"> · </template>
                {{ formatDate(post.createdAt) }}
              </span>
            </span>
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { searchSite } from '../api'
import { useLocale } from '../composables/useLocale.js'

const { t, formatDate } = useLocale()
const route = useRoute()

const rootRef = ref(null)
const query = ref('')
const activeQuery = ref('')
const open = ref(false)
const loading = ref(false)
const searched = ref(false)
const error = ref('')
const posts = ref([])
const users = ref([])

let debounceTimer = null
let requestSeq = 0

const hasResults = computed(() => posts.value.length > 0 || users.value.length > 0)

function close() {
  open.value = false
}

function clearResults() {
  posts.value = []
  users.value = []
  searched.value = false
  error.value = ''
  activeQuery.value = ''
}

async function runSearch(raw) {
  const q = String(raw || '').trim()
  activeQuery.value = q
  error.value = ''

  if (!q) {
    clearResults()
    loading.value = false
    return
  }

  const seq = ++requestSeq
  loading.value = true
  open.value = true
  try {
    const data = await searchSite(q, 12)
    if (seq !== requestSeq) return
    posts.value = data.posts || []
    users.value = data.users || []
    searched.value = true
  } catch (err) {
    if (seq !== requestSeq) return
    error.value = err.message || t('search.failed')
    posts.value = []
    users.value = []
    searched.value = true
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function onInput() {
  open.value = true
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    runSearch(query.value)
  }, 280)
}

function onFocus() {
  open.value = true
  if (query.value.trim() && !searched.value && !loading.value) {
    runSearch(query.value)
  }
}

function submitSearch() {
  clearTimeout(debounceTimer)
  runSearch(query.value)
}

function onDocPointerDown(event) {
  if (!open.value) return
  const el = event.target
  if (!(el instanceof Element)) return
  if (rootRef.value?.contains(el)) return
  close()
}

watch(
  () => route.fullPath,
  () => {
    close()
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
})

onUnmounted(() => {
  clearTimeout(debounceTimer)
  document.removeEventListener('pointerdown', onDocPointerDown)
})
</script>

<style scoped>
.site-search {
  position: relative;
}

.site-search-form input {
  width: min(15rem, 42vw);
  min-width: 8.5rem;
  height: 2.35rem;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
  font: inherit;
  font-size: 0.9rem;
}

.site-search-form input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.site-search-panel {
  position: absolute;
  top: calc(100% + 0.45rem);
  right: 0;
  width: min(22rem, calc(100vw - 2rem));
  max-height: min(70vh, 26rem);
  overflow: auto;
  z-index: 80;
  padding: 0.55rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--line) 85%, var(--accent));
  background: color-mix(in srgb, var(--input-bg) 92%, var(--accent));
  box-shadow:
    0 12px 32px color-mix(in srgb, #0f172a 14%, transparent),
    0 2px 8px color-mix(in srgb, #0f172a 8%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: var(--ink);
}

html.dark .site-search-panel {
  background: color-mix(in srgb, #0f172a 94%, var(--accent));
  border-color: color-mix(in srgb, var(--line) 70%, var(--accent));
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.55),
    0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent);
}

.site-search-hint {
  margin: 0;
  padding: 0.65rem 0.55rem;
  font-size: 0.88rem;
}

.site-search-group + .site-search-group {
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid var(--line);
}

.site-search-label {
  margin: 0;
  padding: 0.35rem 0.55rem 0.2rem;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.site-search-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
}

.site-search-item:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: inherit;
}

html.dark .site-search-item:hover {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.site-search-avatar {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
}

.site-search-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-search-text {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
}

.site-search-text strong {
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-search-text .muted {
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 720px) {
  .site-search-form input {
    width: min(11rem, 36vw);
  }

  .site-search-panel {
    right: auto;
    left: 0;
  }
}
</style>
