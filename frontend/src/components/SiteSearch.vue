<template>
  <div class="site-search" :class="{ expanded: mobileOpen }" ref="rootRef">
    <button
      type="button"
      class="site-search-toggle"
      :aria-label="t('search.title')"
      :title="t('search.title')"
      :aria-expanded="mobileOpen"
      @click="openMobile"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M16.2 16.2 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <form class="site-search-form" role="search" @submit.prevent="submitSearch">
      <label class="sr-only" for="header-site-search">{{ t('search.placeholder') }}</label>
      <input
        id="header-site-search"
        ref="inputRef"
        v-model="query"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        :placeholder="t('search.placeholderShort')"
        @focus="onFocus"
        @input="onInput"
        @keydown.escape.prevent="onEscape"
      />
      <button
        type="button"
        class="site-search-close"
        :aria-label="t('search.close')"
        @click="closeMobile"
      >
        ×
      </button>
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
            @click="closeAll"
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
            v-for="p in posts"
            :key="p.id"
            class="site-search-item"
            :to="{ name: 'post', params: { slug: p.slug } }"
            @click="closeAll"
          >
            <span class="site-search-text">
              <strong>{{ p.title }}</strong>
              <span v-if="p.excerpt" class="muted">{{ p.excerpt }}</span>
            </span>
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { searchSite } from '../api'
import { useLocale } from '../composables/useLocale.js'

const { t } = useLocale()
const route = useRoute()

const rootRef = ref(null)
const inputRef = ref(null)
const query = ref('')
const open = ref(false)
const mobileOpen = ref(false)
const loading = ref(false)
const searched = ref(false)
const error = ref('')
const activeQuery = ref('')
const posts = ref([])
const users = ref([])

let debounceTimer = 0
let requestSeq = 0

const hasResults = computed(() => posts.value.length > 0 || users.value.length > 0)

function close() {
  open.value = false
}

function closeMobile() {
  mobileOpen.value = false
  close()
}

function closeAll() {
  closeMobile()
}

function clearResults() {
  posts.value = []
  users.value = []
  searched.value = false
  error.value = ''
  activeQuery.value = ''
}

async function openMobile() {
  mobileOpen.value = true
  open.value = true
  await nextTick()
  inputRef.value?.focus()
}

function onEscape() {
  if (mobileOpen.value) closeMobile()
  else close()
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
  if (!open.value && !mobileOpen.value) return
  const el = event.target
  if (!(el instanceof Element)) return
  if (rootRef.value?.contains(el)) return
  closeMobile()
}

watch(
  () => route.fullPath,
  () => {
    closeAll()
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  clearTimeout(debounceTimer)
})
</script>

<style scoped>
.site-search {
  position: relative;
}

.site-search-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 999px;
  box-shadow: var(--shadow);
  padding: 0;
}

.site-search-toggle svg {
  width: 1.15rem;
  height: 1.15rem;
}

.site-search-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.site-search-form {
  position: relative;
  display: block;
}

.site-search-close {
  display: none;
}

.site-search-form input {
  width: min(12.5rem, 28vw);
  min-width: 7.5rem;
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

html[lang='en'] .site-search-form input {
  width: min(10.5rem, 22vw);
  min-width: 6.5rem;
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
}

.site-search-hint {
  margin: 0.35rem 0.4rem;
  font-size: 0.86rem;
}

.site-search-group + .site-search-group {
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--line);
}

.site-search-label {
  margin: 0 0.4rem 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.site-search-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.45rem;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
}

.site-search-item:hover {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

html.dark .site-search-item:hover {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.site-search-avatar {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  flex-shrink: 0;
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
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-search-text .muted {
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 760px) {
  .site-search-toggle {
    display: inline-flex;
  }

  .site-search:not(.expanded) .site-search-form {
    display: none;
  }

  .site-search.expanded {
    position: static;
  }

  .site-search.expanded .site-search-toggle {
    display: none;
  }

  .site-search.expanded .site-search-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    position: fixed;
    left: 0.75rem;
    right: 0.75rem;
    top: max(0.55rem, env(safe-area-inset-top, 0px));
    z-index: 90;
  }

  .site-search.expanded .site-search-form input {
    flex: 1;
    width: auto;
    min-width: 0;
  }

  .site-search-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-size: 1.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .site-search-panel {
    position: fixed;
    top: calc(max(0.55rem, env(safe-area-inset-top, 0px)) + 3.1rem);
    left: 0.75rem;
    right: 0.75rem;
    width: auto;
    max-height: min(65vh, 22rem);
  }
}
</style>
