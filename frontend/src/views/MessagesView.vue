<template>
  <section class="dm-page">
    <header class="dm-hero panel">
      <div>
        <p class="eyebrow">{{ t('dm.eyebrow') }}</p>
        <h1>{{ t('dm.title') }}</h1>
        <p class="muted">{{ t('dm.lede') }}</p>
      </div>
      <p v-if="!me" class="muted dm-login-hint">
        <RouterLink to="/me">{{ t('post.login') }}</RouterLink>{{ t('dm.loginHint') }}
      </p>
    </header>

    <div v-if="me" class="dm-shell panel" :class="{ 'show-thread': Boolean(activeUsername) }">
      <aside class="dm-inbox">
        <div class="dm-inbox-head">
          <strong>{{ t('dm.inbox') }}</strong>
          <span v-if="totalUnread > 0" class="dm-pill mono">{{ totalUnreadLabel }}</span>
        </div>

        <p v-if="listLoading" class="muted dm-empty">{{ t('home.loading') }}</p>
        <p v-else-if="listError" class="error dm-empty">{{ listError }}</p>
        <p v-else-if="!conversations.length" class="muted dm-empty">{{ t('dm.emptyInbox') }}</p>

        <ul v-else class="dm-list">
          <li
            v-for="c in conversations"
            :key="c.id"
            :class="{ active: activeUsername === c.peer.username, unread: c.unreadCount > 0 }"
          >
            <button type="button" class="dm-row" @click="openPeer(c.peer.username)">
              <span class="dm-avatar" aria-hidden="true">
                <img v-if="c.peer.avatarUrl" :src="c.peer.avatarUrl" alt="" />
                <template v-else>{{ letter(c.peer.username) }}</template>
              </span>
              <span class="dm-row-main">
                <span class="dm-row-top">
                  <strong>{{ c.peer.username }}</strong>
                  <time v-if="c.lastMessageAt" class="muted">{{ formatDate(c.lastMessageAt) }}</time>
                </span>
                <span class="dm-preview muted">{{ previewLabel(c.lastMessagePreview) }}</span>
              </span>
              <span v-if="c.unreadCount > 0" class="dm-unread mono">{{ c.unreadCount }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <section class="dm-thread">
        <template v-if="activeUsername">
          <header class="dm-thread-head">
            <button type="button" class="dm-back btn ghost small" @click="closeThread">
              {{ t('dm.back') }}
            </button>
            <RouterLink
              class="dm-peer-link"
              :to="{ name: 'user', params: { username: peer?.username || activeUsername } }"
            >
              <span class="dm-avatar sm" aria-hidden="true">
                <img v-if="peer?.avatarUrl" :src="peer.avatarUrl" alt="" />
                <template v-else>{{ letter(peer?.username || activeUsername) }}</template>
              </span>
              <span>
                <strong>{{ peer?.username || activeUsername }}</strong>
                <span class="muted">@{{ peer?.username || activeUsername }}</span>
              </span>
            </RouterLink>
          </header>

          <div ref="scrollerRef" class="dm-scroller" @scroll="onScroll">
            <p v-if="threadLoading && !messages.length" class="muted dm-empty">
              {{ t('home.loading') }}
            </p>
            <p v-else-if="threadError" class="error dm-empty">{{ threadError }}</p>
            <p v-else-if="!messages.length" class="muted dm-empty">{{ t('dm.emptyThread') }}</p>

            <template v-else>
              <div
                v-for="(m, i) in enrichedMessages"
                :key="m.id"
                class="dm-bubble-wrap"
                :class="{ mine: m.mine, 'show-time': shouldShowTime(m, i) }"
              >
                <time v-if="shouldShowTime(m, i)" class="dm-time muted">{{ formatDate(m.createdAt) }}</time>
                <div
                  v-if="m.share"
                  class="dm-share-msg"
                  :class="{ mine: m.mine, pending: m.pending, failed: m.failed }"
                >
                  <RouterLink
                    class="dm-share-card"
                    :to="{ name: 'post', params: { slug: m.share.slug } }"
                  >
                    <span class="dm-share-badge">{{ t('dm.shareBadge') }}</span>
                    <strong class="dm-share-title">{{ m.share.title }}</strong>
                    <span v-if="m.share.author" class="dm-share-meta muted">
                      @{{ m.share.author }}
                    </span>
                    <span v-if="m.share.excerpt" class="dm-share-excerpt muted">
                      {{ m.share.excerpt }}
                    </span>
                    <span class="dm-share-cta">{{ t('dm.shareOpen') }} →</span>
                  </RouterLink>
                  <p v-if="m.share.note" class="dm-share-note">{{ m.share.note }}</p>
                </div>
                <div
                  v-else
                  class="dm-bubble"
                  :class="{ mine: m.mine, pending: m.pending, failed: m.failed }"
                >
                  <p>{{ m.body }}</p>
                </div>
              </div>
            </template>
          </div>

          <form class="dm-composer" @submit.prevent="onSend">
            <textarea
              ref="inputRef"
              v-model="draft"
              rows="1"
              maxlength="2000"
              :placeholder="t('dm.placeholder')"
              :disabled="sending"
              @keydown="onKeydown"
              @input="autoResize"
            />
            <button type="submit" class="btn" :disabled="sending || !draft.trim()">
              {{ sending ? t('dm.sending') : t('dm.send') }}
            </button>
          </form>
          <p v-if="sendError" class="error dm-send-error">{{ sendError }}</p>
        </template>

        <div v-else class="dm-placeholder">
          <p class="muted">{{ t('dm.pick') }}</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  fetchConversations,
  fetchThread,
  getStoredUser,
  sendMessage,
} from '../api'
import { useLocale } from '../composables/useLocale.js'
import { parsePostShare, sharePreviewText } from '../utils/dmShare.js'

const props = defineProps({
  username: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const { t, formatDate } = useLocale()

const me = ref(getStoredUser())
const conversations = ref([])
const listLoading = ref(false)
const listError = ref('')
const activeUsername = ref('')
const peer = ref(null)
const messages = ref([])
const threadLoading = ref(false)
const threadError = ref('')
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const scrollerRef = ref(null)
const inputRef = ref(null)
const stickToBottom = ref(true)

let pollTimer = null
let listPollTimer = null

const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0),
)
const totalUnreadLabel = computed(() => (totalUnread.value > 99 ? '99+' : String(totalUnread.value)))

const enrichedMessages = computed(() =>
  messages.value.map((m) => ({
    ...m,
    share: parsePostShare(m.body),
  })),
)

function letter(name) {
  return String(name || '?').slice(0, 1).toUpperCase()
}

function previewLabel(text) {
  const share = parsePostShare(text)
  if (share) return sharePreviewText(share)
  return text || '—'
}

function shouldShowTime(m, index) {
  if (index === 0) return true
  const prev = messages.value[index - 1]
  if (!prev) return true
  const a = new Date(prev.createdAt).getTime()
  const b = new Date(m.createdAt).getTime()
  return !Number.isFinite(a) || !Number.isFinite(b) || b - a > 5 * 60 * 1000
}

function onScroll() {
  const el = scrollerRef.value
  if (!el) return
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

async function scrollBottom(force = false) {
  await nextTick()
  const el = scrollerRef.value
  if (!el) return
  if (force || stickToBottom.value) {
    el.scrollTop = el.scrollHeight
  }
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSend()
  }
}

async function loadConversations() {
  if (!me.value) return
  listLoading.value = !conversations.value.length
  listError.value = ''
  try {
    conversations.value = await fetchConversations()
  } catch (err) {
    listError.value = err.message || t('home.loadFailed')
  } finally {
    listLoading.value = false
  }
}

function upsertConversationPreview(username, preview, at) {
  const idx = conversations.value.findIndex(
    (c) => c.peer.username.toLowerCase() === username.toLowerCase(),
  )
  if (idx >= 0) {
    const row = { ...conversations.value[idx] }
    row.lastMessagePreview = preview
    row.lastMessageAt = at
    row.unreadCount = 0
    conversations.value.splice(idx, 1)
    conversations.value.unshift(row)
  } else if (peer.value) {
    conversations.value.unshift({
      id: `tmp_${username}`,
      peer: { ...peer.value },
      lastMessageAt: at,
      lastMessagePreview: preview,
      unreadCount: 0,
    })
  }
}

async function loadThread(username, { silent = false } = {}) {
  if (!username || !me.value) return
  if (!silent) {
    threadLoading.value = true
    threadError.value = ''
  }
  try {
    const lastId = silent && messages.value.length ? messages.value[messages.value.length - 1].id : ''
    const data = lastId
      ? await fetchThread(username, lastId.startsWith('tmp_') ? undefined : lastId)
      : await fetchThread(username)

    if (!silent || !lastId) {
      peer.value = data.peer
      messages.value = data.messages || []
      stickToBottom.value = true
      await scrollBottom(true)
    } else if (data.messages?.length) {
      const known = new Set(messages.value.map((m) => m.id))
      const fresh = data.messages.filter((m) => !known.has(m.id))
      if (fresh.length) {
        messages.value = [...messages.value, ...fresh]
        await scrollBottom()
      }
      // Full refresh if after-cursor path returned empty but we had temp ids
    } else if (messages.value.some((m) => String(m.id).startsWith('tmp_'))) {
      const full = await fetchThread(username)
      peer.value = full.peer
      messages.value = full.messages || []
      await scrollBottom()
    }

    const row = conversations.value.find(
      (c) => c.peer.username.toLowerCase() === username.toLowerCase(),
    )
    if (row) row.unreadCount = 0
  } catch (err) {
    if (!silent) threadError.value = err.message || t('home.loadFailed')
  } finally {
    threadLoading.value = false
  }
}

function openPeer(username) {
  if (!username) return
  router.push({ name: 'messages-user', params: { username } })
}

function closeThread() {
  router.push({ name: 'messages' })
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || !activeUsername.value || sending.value) return

  sendError.value = ''
  sending.value = true
  const tempId = `tmp_${Date.now()}`
  const createdAt = new Date().toISOString()
  messages.value.push({
    id: tempId,
    body: text,
    createdAt,
    mine: true,
    pending: true,
  })
  draft.value = ''
  autoResize()
  stickToBottom.value = true
  await scrollBottom(true)

  try {
    const saved = await sendMessage(activeUsername.value, text)
    const idx = messages.value.findIndex((m) => m.id === tempId)
    if (idx >= 0) messages.value[idx] = saved
    upsertConversationPreview(activeUsername.value, text.replace(/\s+/g, ' ').slice(0, 80), saved.createdAt)
    window.dispatchEvent(new CustomEvent('mohhen-dm-change'))
  } catch (err) {
    const idx = messages.value.findIndex((m) => m.id === tempId)
    if (idx >= 0) {
      messages.value[idx] = { ...messages.value[idx], pending: false, failed: true }
    }
    sendError.value = err.message || t('dm.sendFailed')
  } finally {
    sending.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

function syncFromRoute() {
  const name = (props.username || route.params.username || '').toString().trim()
  activeUsername.value = name
  if (name) {
    loadThread(name)
  } else {
    peer.value = null
    messages.value = []
    threadError.value = ''
  }
}

watch(
  () => [props.username, route.params.username],
  () => {
    syncFromRoute()
  },
)

onMounted(async () => {
  me.value = getStoredUser()
  if (!me.value) return
  await loadConversations()
  syncFromRoute()
  pollTimer = setInterval(() => {
    if (activeUsername.value) loadThread(activeUsername.value, { silent: true })
  }, 8000)
  listPollTimer = setInterval(() => {
    loadConversations()
  }, 30000)
  window.addEventListener('mohhen-auth-change', onAuth)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (listPollTimer) clearInterval(listPollTimer)
  window.removeEventListener('mohhen-auth-change', onAuth)
})

async function onAuth() {
  me.value = getStoredUser()
  if (me.value) {
    await loadConversations()
    syncFromRoute()
  } else {
    conversations.value = []
    messages.value = []
    activeUsername.value = ''
  }
}
</script>

<style scoped>
.dm-page {
  display: grid;
  gap: 1rem;
}

.dm-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.dm-hero h1 {
  margin: 0.15rem 0 0.35rem;
}

.dm-login-hint {
  margin: 0;
}

.dm-shell {
  display: grid;
  grid-template-columns: minmax(240px, 320px) 1fr;
  min-height: min(70vh, 640px);
  padding: 0;
  overflow: hidden;
}

.dm-inbox {
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: color-mix(in srgb, var(--surface) 92%, var(--accent) 4%);
}

.dm-inbox-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--line);
}

.dm-pill {
  min-width: 1.25rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-size: 0.75rem;
  text-align: center;
}

.dm-list {
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  align-content: flex-start;
  justify-content: flex-start;
}

.dm-list > li {
  flex: 0 0 auto;
}

.dm-row {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 0.45rem 0.55rem;
  color: inherit;
  cursor: pointer;
}

.dm-row:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.dm-list li.active .dm-row {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
}

.dm-list li.unread .dm-preview {
  color: var(--ink);
  font-weight: 600;
}

.dm-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--stat-bg, color-mix(in srgb, var(--accent) 14%, transparent));
  color: var(--accent);
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}

.dm-avatar.sm {
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  font-size: 0.85rem;
}

.dm-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dm-row-main {
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.dm-row-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.dm-row-top time {
  font-size: 0.72rem;
  white-space: nowrap;
}

.dm-preview {
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dm-unread {
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #e11d48;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1.2rem;
  text-align: center;
}

.dm-thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.dm-thread-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--line);
}

.dm-back {
  display: none;
}

.dm-peer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: inherit;
  text-decoration: none;
}

.dm-peer-link span {
  display: grid;
  line-height: 1.25;
}

.dm-peer-link .muted {
  font-size: 0.8rem;
}

.dm-scroller {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 55%),
    var(--surface);
}

.dm-empty {
  margin: auto;
  text-align: center;
  padding: 1rem;
}

.dm-bubble-wrap {
  display: grid;
  gap: 0.25rem;
  max-width: min(78%, 28rem);
}

.dm-bubble-wrap.mine {
  margin-left: auto;
}

.dm-bubble-wrap.show-time {
  margin-top: 0.55rem;
}

.dm-time {
  font-size: 0.72rem;
  text-align: center;
  justify-self: center;
  width: 100%;
  margin-bottom: 0.15rem;
}

.dm-bubble {
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 88%, #000 4%);
  border-radius: 14px 14px 14px 6px;
  padding: 0.55rem 0.75rem;
  box-shadow: var(--shadow);
}

.dm-bubble.mine {
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 28%, var(--line));
  border-radius: 14px 14px 6px 14px;
}

.dm-bubble.pending {
  opacity: 0.7;
}

.dm-bubble.failed {
  border-color: #e11d48;
  opacity: 0.9;
}

.dm-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
  font-size: 0.95rem;
}

.dm-share-msg {
  display: grid;
  gap: 0.4rem;
  max-width: 100%;
}

.dm-share-msg.pending {
  opacity: 0.7;
}

.dm-share-msg.failed .dm-share-card {
  border-color: #e11d48;
}

.dm-share-card {
  display: grid;
  gap: 0.28rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 92%, var(--accent) 6%);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.dm-share-msg.mine .dm-share-card {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
}

.dm-share-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.dm-share-badge {
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 650;
}

.dm-share-title {
  font-size: 0.95rem;
  line-height: 1.35;
  font-weight: 650;
}

.dm-share-meta {
  font-size: 0.78rem;
}

.dm-share-excerpt {
  font-size: 0.8rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dm-share-cta {
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--accent);
  font-weight: 600;
}

.dm-share-note {
  margin: 0;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 88%, #000 4%);
  border: 1px solid var(--line);
  font-size: 0.88rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.dm-share-msg.mine .dm-share-note {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 22%, var(--line));
}

.dm-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.55rem;
  align-items: end;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.dm-composer textarea {
  width: 100%;
  resize: none;
  min-height: 2.6rem;
  max-height: 140px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  color: var(--ink);
  padding: 0.65rem 0.8rem;
  font: inherit;
  line-height: 1.4;
}

.dm-composer textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.dm-send-error {
  margin: 0 1rem 0.75rem;
  font-size: 0.85rem;
}

.dm-placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(80% 60% at 50% 40%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%),
    var(--surface);
}

@media (max-width: 860px) {
  .dm-shell {
    grid-template-columns: 1fr;
    min-height: min(75vh, 720px);
  }

  .dm-inbox {
    border-right: none;
  }

  .dm-shell.show-thread .dm-inbox {
    display: none;
  }

  .dm-shell:not(.show-thread) .dm-thread {
    display: none;
  }

  .dm-back {
    display: inline-flex;
  }
}
</style>
