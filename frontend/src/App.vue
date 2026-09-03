<template>
  <div class="shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">
        <img class="brand-mark" src="/logo-mark.svg" width="32" height="32" alt="" />
        <span>{{ t('home.title') }}</span>
      </RouterLink>
      <div class="header-right">
        <nav class="nav">
          <RouterLink to="/">{{ t('nav.posts') }}</RouterLink>
          <RouterLink to="/about">{{ t('nav.about') }}</RouterLink>
          <RouterLink to="/tools">{{ t('nav.tools') }}</RouterLink>
          <RouterLink to="/admin">{{ t('nav.admin') }}</RouterLink>
        </nav>
        <div class="header-tools">
          <SiteSearch />
          <div v-if="currentUser" class="notify-wrap" ref="notifyWrapRef">
            <button
              type="button"
              class="notify-bell"
              :aria-label="t('notify.open')"
              :title="t('notify.open')"
              :aria-expanded="notifyOpen"
              @click="toggleNotify"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
                />
              </svg>
              <span v-if="unreadCount > 0" class="notify-badge">{{ unreadLabel }}</span>
            </button>
            <div v-if="notifyOpen" class="notify-panel geek-surface">
              <div class="notify-head">
                <strong>{{ t('notify.title') }}</strong>
                <button
                  v-if="unreadCount > 0"
                  type="button"
                  class="notify-mark"
                  @click="markAllRead"
                >
                  {{ t('notify.markAll') }}
                </button>
              </div>
              <p v-if="notifyLoading" class="muted notify-empty">{{ t('home.loading') }}</p>
              <p v-else-if="!notifications.length" class="muted notify-empty">
                {{ t('notify.empty') }}
              </p>
              <ul v-else class="notify-list">
                <li
                  v-for="n in notifications"
                  :key="n.id"
                  :class="{ unread: !n.readAt }"
                >
                  <a
                    class="notify-item"
                    :href="notifyHref(n)"
                    @click="openNotification(n)"
                  >
                    <span class="notify-text">{{ notifyText(n) }}</span>
                    <time class="muted">{{ formatDate(n.createdAt) }}</time>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div v-if="currentUser" class="me-wrap" ref="meWrapRef">
            <button
              type="button"
              class="me-trigger"
              :aria-label="t('nav.me')"
              :title="t('nav.me')"
              :aria-expanded="meOpen"
              @click="toggleMe"
            >
              <span class="me-avatar" aria-hidden="true">
                <img v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" alt="" />
                <template v-else>{{ meLetter }}</template>
              </span>
              <span v-if="dmUnreadCount > 0" class="notify-badge">{{ dmUnreadLabel }}</span>
            </button>
            <div v-if="meOpen" class="me-panel geek-surface">
              <p class="me-panel-name">@{{ currentUser.username }}</p>
              <RouterLink class="me-item" to="/me" @click="meOpen = false">
                {{ t('nav.me') }}
              </RouterLink>
              <RouterLink
                class="me-item"
                :to="{ name: 'user', params: { username: currentUser.username } }"
                @click="meOpen = false"
              >
                {{ t('nav.myProfile') }}
              </RouterLink>
              <RouterLink class="me-item" to="/messages" @click="meOpen = false">
                <span>{{ t('nav.messages') }}</span>
                <span v-if="dmUnreadCount > 0" class="me-item-badge mono">{{ dmUnreadLabel }}</span>
              </RouterLink>
              <RouterLink
                class="me-item"
                :to="{ name: 'user-library', params: { username: currentUser.username } }"
                @click="meOpen = false"
              >
                {{ t('nav.library') }}
              </RouterLink>
              <RouterLink
                class="me-item"
                :to="{ name: 'user-dashboard', params: { username: currentUser.username } }"
                @click="meOpen = false"
              >
                {{ t('dash.open') }}
              </RouterLink>
              <RouterLink class="me-item" to="/admin" @click="meOpen = false">
                {{ t('nav.admin') }}
              </RouterLink>
              <button type="button" class="me-item me-item-logout" @click="onLogout">
                {{ t('admin.logout') }}
              </button>
            </div>
          </div>
          <RouterLink
            v-else
            class="me-login"
            :to="{ name: 'me' }"
          >
            {{ t('admin.login') }}
          </RouterLink>

          <button
            type="button"
            class="lang-toggle"
            :aria-label="t('lang.label')"
            :title="t('lang.label')"
            @click="toggleLocale"
          >
            <span class="lang-opt" :class="{ active: !isEn }">{{ t('lang.zh') }}</span>
            <span class="lang-divider">/</span>
            <span class="lang-opt" :class="{ active: isEn }">{{ t('lang.en') }}</span>
          </button>
          <button
            type="button"
            class="theme-toggle"
            :class="{ dark: isDark }"
            :aria-label="themeLabel"
            :title="themeLabel"
            :aria-pressed="isDark"
            @click="toggleTheme"
          >
            <span class="theme-track">
              <span class="theme-thumb" aria-hidden="true">
                <svg class="icon-sun" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                  <g stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none">
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                    <line x1="4.9" y1="4.9" x2="7" y2="7" />
                    <line x1="17" y1="17" x2="19.1" y2="19.1" />
                    <line x1="4.9" y1="19.1" x2="7" y2="17" />
                    <line x1="17" y1="7" x2="19.1" y2="4.9" />
                  </g>
                </svg>
                <svg class="icon-moon" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M20.2 14.3A8.2 8.2 0 0 1 9.7 3.8a8.5 8.5 0 1 0 10.5 10.5z"
                  />
                </svg>
              </span>
            </span>
            <span class="theme-text mono">{{ isDark ? t('theme.night') : t('theme.day') }}</span>
          </button>
        </div>
      </div>
    </header>
    <main class="main">
      <RouterView v-slot="{ Component }">
        <KeepAlive :include="['HomeView']">
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <p class="footer-brand">{{ t('footer.brand') }}</p>
        <p>{{ t('footer.disclaimer') }}</p>
        <p>{{ t('footer.copyright') }}</p>
        <p class="footer-meta">{{ t('footer.contact') }}</p>
      </div>
    </footer>
    <BackToTop />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BackToTop from './components/BackToTop.vue'
import SiteSearch from './components/SiteSearch.vue'
import {
  fetchMessageUnreadCount,
  fetchNotifications,
  fetchUnreadCount,
  getStoredUser,
  logout,
  markNotificationsRead,
  me,
  setStoredUser,
} from './api'
import { useLocale } from './composables/useLocale.js'
import { useTheme } from './composables/useTheme.js'

const { t, isEn, toggleLocale, formatDate } = useLocale()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()
const themeLabel = computed(() => (isDark.value ? t('theme.toDay') : t('theme.toNight')))

const currentUser = ref(getStoredUser())
const unreadCount = ref(0)
const dmUnreadCount = ref(0)
const notifications = ref([])
const notifyOpen = ref(false)
const notifyLoading = ref(false)
const notifyWrapRef = ref(null)
const meOpen = ref(false)
const meWrapRef = ref(null)
let pollTimer = null

const unreadLabel = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))
const dmUnreadLabel = computed(() => (dmUnreadCount.value > 99 ? '99+' : String(dmUnreadCount.value)))
const meLetter = computed(() => (currentUser.value?.username || '?').slice(0, 1).toUpperCase())

function notifyText(n) {
  if (n.type === 'follow') return t('notify.follow', { user: n.actorUsername || 'user' })
  if (n.type === 'reply') return t('notify.reply', { user: n.actorUsername || 'user' })
  if (n.type === 'message') return t('notify.message', { user: n.actorUsername || 'user' })
  if (n.type === 'mention') return t('notify.mention', { user: n.actorUsername || 'user' })
  if (n.type === 'post') {
    return t('notify.post', { user: n.actorUsername || 'user', title: n.postTitle || '' })
  }
  if (n.type === 'repost') {
    return t('notify.repost', { user: n.actorUsername || 'user', title: n.postTitle || '' })
  }
  const key = n.type === 'like' ? 'notify.like' : 'notify.comment'
  return t(key, { user: n.actorUsername || 'user', title: n.postTitle || '' })
}

function notifyHref(n) {
  if (n?.type === 'follow') {
    const user = n.actorUsername
    return user ? `/u/${encodeURIComponent(user)}` : '#'
  }
  if (n?.type === 'message') {
    const user = n.actorUsername
    return user ? `/messages/${encodeURIComponent(user)}` : '/messages'
  }
  const slug = n?.postSlug
  if (!slug) return '#'
  if (n?.type === 'post' || n?.type === 'repost') return `/post/${encodeURIComponent(slug)}`
  const hash =
    n?.type === 'like'
      ? '#likes'
      : n?.type === 'mention' && n?.commentId
        ? `#comment-${n.commentId}`
        : n?.commentId
          ? `#comment-${n.commentId}`
          : '#comments'
  return `/post/${encodeURIComponent(slug)}${hash}`
}

function openNotification(n) {
  // 不要在这里关面板：同步销毁 <a> 会取消浏览器默认跳转
  if (!n?.readAt && n?.id) {
    markNotificationsRead([n.id]).catch(() => {})
  }
}

async function refreshUser() {
  try {
    const data = await me()
    currentUser.value = data.user
    setStoredUser(data.user)
  } catch {
    currentUser.value = null
    setStoredUser(null)
    unreadCount.value = 0
    dmUnreadCount.value = 0
    notifications.value = []
  }
}

async function refreshUnread() {
  if (!currentUser.value) {
    unreadCount.value = 0
    dmUnreadCount.value = 0
    return
  }
  try {
    const [notifyData, dmData] = await Promise.all([
      fetchUnreadCount(),
      fetchMessageUnreadCount(),
    ])
    unreadCount.value = Number(notifyData.count || 0)
    dmUnreadCount.value = Number(dmData.count || 0)
  } catch {
    /* ignore */
  }
}

async function loadNotifications() {
  if (!currentUser.value) return
  notifyLoading.value = true
  try {
    notifications.value = await fetchNotifications()
    await refreshUnread()
  } catch {
    notifications.value = []
  } finally {
    notifyLoading.value = false
  }
}

async function toggleNotify() {
  meOpen.value = false
  notifyOpen.value = !notifyOpen.value
  if (notifyOpen.value) await loadNotifications()
}

function toggleMe() {
  notifyOpen.value = false
  meOpen.value = !meOpen.value
}

async function onLogout() {
  meOpen.value = false
  try {
    await logout()
  } catch {
    /* ignore */
  }
  currentUser.value = null
  setStoredUser(null)
  unreadCount.value = 0
  dmUnreadCount.value = 0
  notifications.value = []
  window.dispatchEvent(new CustomEvent('mohhen-auth-change'))
}

async function markAllRead() {
  try {
    const data = await markNotificationsRead()
    unreadCount.value = Number(data.count || 0)
    notifications.value = notifications.value.map((n) => ({
      ...n,
      readAt: n.readAt || new Date().toISOString(),
    }))
  } catch {
    /* ignore */
  }
}

function onDocPointerDown(event) {
  const el = event.target
  if (!(el instanceof Element)) return
  if (notifyOpen.value && !notifyWrapRef.value?.contains(el)) {
    notifyOpen.value = false
  }
  if (meOpen.value && !meWrapRef.value?.contains(el)) {
    meOpen.value = false
  }
}

onMounted(async () => {
  await refreshUser()
  await refreshUnread()
  document.addEventListener('pointerdown', onDocPointerDown)
  window.addEventListener('mohhen-auth-change', onAuthChange)
  window.addEventListener('mohhen-dm-change', refreshUnread)
  pollTimer = setInterval(refreshUnread, 60000)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  window.removeEventListener('mohhen-auth-change', onAuthChange)
  window.removeEventListener('mohhen-dm-change', refreshUnread)
  if (pollTimer) clearInterval(pollTimer)
})

async function onAuthChange() {
  currentUser.value = getStoredUser()
  await refreshUnread()
}

watch(
  () => route.fullPath,
  async () => {
    currentUser.value = getStoredUser()
    meOpen.value = false
    notifyOpen.value = false
    await refreshUnread()
  },
)
</script>
