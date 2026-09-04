<template>
  <section class="ai-page">
    <header class="ai-hero panel geek-panel">
      <div>
        <p class="eyebrow mono">{{ t('ai.eyebrow') }}</p>
        <h1>{{ t('ai.title') }}</h1>
        <p class="lede muted">{{ t('ai.lede') }}</p>
      </div>
      <span v-if="me" class="ai-privacy-note">{{ t('ai.aiLabel') }}</span>
    </header>

    <div v-if="!me" class="panel ai-login-card">
      <p class="eyebrow">{{ t('ai.eyebrow') }}</p>
      <h2>{{ t('ai.loginTitle') }}</h2>
      <p class="muted">{{ t('ai.loginHint') }}</p>
      <RouterLink class="btn" :to="{ name: 'me', query: { next: '/chat' } }">
        {{ t('admin.login') }}
      </RouterLink>
    </div>

    <div v-else class="ai-shell panel geek-panel" :class="{ 'sidebar-open': sidebarOpen }">
      <aside class="ai-sidebar" :aria-label="t('ai.conversations')">
        <div class="ai-sidebar-head">
          <strong>{{ t('ai.conversations') }}</strong>
          <button class="btn ghost small" type="button" @click="newChat">
            + {{ t('ai.newChat') }}
          </button>
        </div>
        <p v-if="conversationError" class="error ai-inline-error" role="alert">
          {{ conversationError }}
        </p>
        <p v-if="conversationsLoading" class="muted ai-sidebar-empty">{{ t('home.loading') }}</p>
        <p v-else-if="!conversations.length" class="muted ai-sidebar-empty">
          {{ t('ai.noConversations') }}
        </p>
        <ul v-else class="ai-conversation-list">
          <li v-for="conversation in conversations" :key="conversation.id">
            <div
              class="ai-conversation-row"
              :class="{ active: activeConversationId === conversation.id }"
              @click="openConversation(conversation.id)"
              @keydown.enter="openConversation(conversation.id)"
              @keydown.space.prevent="openConversation(conversation.id)"
              role="button"
              tabindex="0"
            >
              <span class="ai-conversation-copy">
                <strong>{{ conversation.title }}</strong>
                <span class="muted">{{ conversation.model || t('ai.connectionUnavailable') }}</span>
              </span>
              <span class="ai-conversation-actions">
                <span class="ai-conversation-date muted">{{ formatDate(conversation.updatedAt) }}</span>
                <span class="ai-conversation-action-buttons">
                  <button
                    type="button"
                    class="ai-row-action"
                    :aria-label="t('ai.rename')"
                    @click.stop="renameConversation(conversation)"
                  >
                    …
                  </button>
                  <button
                    type="button"
                    class="ai-row-action danger-text"
                    :aria-label="t('ai.delete')"
                    @click.stop="deleteConversation(conversation)"
                  >
                    ×
                  </button>
                </span>
              </span>
            </div>
          </li>
        </ul>
      </aside>

      <main class="ai-chat-main">
        <header class="ai-chat-head">
          <button class="btn ghost small ai-mobile-menu" type="button" @click="sidebarOpen = !sidebarOpen">
            {{ t('ai.conversations') }}
          </button>
          <div class="ai-chat-title">
            <strong>{{ activeConversation?.title || t('ai.emptyTitle') }}</strong>
            <span v-if="selectedConnection" class="muted">{{ selectedConnection.model }}</span>
          </div>
          <label class="ai-connection-select">
            <span class="sr-only">{{ t('ai.connection') }}</span>
            <select v-model="selectedConnectionId" :disabled="busy">
              <option value="">{{ t('ai.connection') }}</option>
              <option v-for="connection in connections" :key="connection.id" :value="connection.id">
                {{ connection.name }} · {{ connection.model }}
              </option>
            </select>
          </label>
        </header>

        <div ref="messageScroller" class="ai-message-scroller" aria-live="polite">
          <div v-if="messagesLoading" class="ai-state-message muted">{{ t('home.loading') }}</div>
          <div v-else-if="!messages.length && !streamingMessage" class="ai-state-message">
            <strong>{{ t('ai.emptyTitle') }}</strong>
            <span class="muted">
              {{ connections.length ? t('ai.emptyHint') : t('ai.noConnection') }}
            </span>
            <RouterLink v-if="!connections.length" class="btn ghost small" to="/me">
              {{ t('ai.configure') }}
            </RouterLink>
          </div>

          <template v-else>
            <article
              v-for="message in visibleMessages"
              :key="message.id"
              class="ai-message"
              :class="[message.role, message.status]"
            >
              <div class="ai-message-meta">
                <span>{{ message.role === 'user' ? `@${me.username}` : t('ai.aiLabel') }}</span>
                <span v-if="message.status === 'partial' && busy" class="muted">{{ t('ai.generating') }}</span>
              </div>
              <div v-if="message.role === 'assistant'" class="ai-message-content prose" v-html="renderAiMarkdown(message.content)" />
              <div v-else class="ai-message-content ai-user-content">{{ message.content }}</div>
              <div v-if="message.status === 'error'" class="ai-message-error" role="alert">
                {{ t('ai.error') }}
                <button class="btn ghost small" type="button" @click="retryLast">
                  {{ t('ai.retry') }}
                </button>
              </div>
              <div v-if="message.status === 'partial' && !busy" class="ai-message-error">
                {{ t('ai.error') }}
                <button class="btn ghost small" type="button" @click="retryLast">
                  {{ t('ai.retry') }}
                </button>
              </div>
            </article>
          </template>
        </div>

        <div v-if="chatError" class="ai-chat-error" role="alert">{{ chatError }}</div>

        <form class="ai-composer" @submit.prevent="sendMessage">
          <textarea
            ref="composerRef"
            v-model="draft"
            :disabled="busy || !connections.length"
            :placeholder="connections.length ? t('ai.inputPlaceholder') : t('ai.noConnection')"
            rows="3"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="ai-composer-foot">
            <span class="muted ai-composer-hint">{{ selectedConnection?.name || t('ai.connection') }}</span>
            <button v-if="busy" class="btn ghost" type="button" @click="stopGeneration">
              {{ t('ai.stop') }}
            </button>
            <button v-else class="btn" type="submit" :disabled="!draft.trim() || !connections.length">
              {{ t('ai.send') }}
            </button>
          </div>
        </form>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deleteAiConversation,
  fetchAiConnections,
  fetchAiConversationMessages,
  fetchAiConversations,
  meCached,
  streamAiChat,
  updateAiConversation,
} from '../api.js'
import { useLocale } from '../composables/useLocale.js'
import { renderAiMarkdown } from '../utils/renderAiMarkdown.js'

const { t, formatDate } = useLocale()
const route = useRoute()
const router = useRouter()

const me = ref(null)
const connections = ref([])
const conversations = ref([])
const messages = ref([])
const streamingMessage = ref(null)
const activeConversationId = ref('')
const selectedConnectionId = ref('')
const draft = ref('')
const messagesLoading = ref(false)
const conversationsLoading = ref(false)
const conversationError = ref('')
const chatError = ref('')
const busy = ref(false)
const sidebarOpen = ref(false)
const messageScroller = ref(null)
const composerRef = ref(null)
const abortController = ref(null)
const lastFailedPrompt = ref('')
let initializePromise = null

const activeConversation = computed(
  () => conversations.value.find((item) => item.id === activeConversationId.value) || null,
)
const selectedConnection = computed(
  () => connections.value.find((item) => item.id === selectedConnectionId.value) || null,
)
const visibleMessages = computed(() =>
  streamingMessage.value ? [...messages.value, streamingMessage.value] : messages.value,
)

async function refreshUser() {
  try {
    // meCached() updates the shared auth state after the first request. Using
    // force here would re-trigger that event on every auth notification and
    // make this page initialize itself indefinitely.
    const data = await meCached()
    me.value = data.user
  } catch {
    me.value = null
  }
}

async function loadConnections() {
  try {
    const data = await fetchAiConnections()
    connections.value = data.connections || []
    const routeConnection = String(route.query.connection || '')
    const preferred = routeConnection && connections.value.some((item) => item.id === routeConnection)
      ? routeConnection
      : connections.value.find((item) => item.isDefault)?.id || connections.value[0]?.id || ''
    selectedConnectionId.value = preferred
  } catch (error) {
    conversationError.value = error.message || t('ai.loadFailed')
  }
}

async function loadConversations() {
  conversationsLoading.value = true
  conversationError.value = ''
  try {
    const data = await fetchAiConversations()
    conversations.value = data.conversations || []
  } catch (error) {
    conversationError.value = error.message || t('ai.loadFailed')
  } finally {
    conversationsLoading.value = false
  }
}

async function loadMessages(id) {
  if (!id) {
    messages.value = []
    return
  }
  messagesLoading.value = true
  chatError.value = ''
  try {
    const data = await fetchAiConversationMessages(id)
    messages.value = data.messages || []
    const conversation = conversations.value.find((item) => item.id === id)
    if (conversation?.connectionId && connections.value.some((item) => item.id === conversation.connectionId)) {
      selectedConnectionId.value = conversation.connectionId
    }
    await scrollToBottom()
  } catch (error) {
    chatError.value = error.message || t('ai.loadFailed')
  } finally {
    messagesLoading.value = false
  }
}

async function openConversation(id) {
  if (busy.value) return
  activeConversationId.value = id
  sidebarOpen.value = false
  await router.replace({ name: 'chat', query: { id } })
  await loadMessages(id)
}

function newChat() {
  if (busy.value) return
  activeConversationId.value = ''
  messages.value = []
  streamingMessage.value = null
  chatError.value = ''
  lastFailedPrompt.value = ''
  sidebarOpen.value = false
  router.replace({ name: 'chat' })
  nextTick(() => composerRef.value?.focus())
}

async function renameConversation(conversation) {
  const title = window.prompt(t('ai.rename'), conversation.title)
  if (!title || title.trim() === conversation.title) return
  try {
    const data = await updateAiConversation(conversation.id, { title: title.trim() })
    const index = conversations.value.findIndex((item) => item.id === conversation.id)
    if (index >= 0) conversations.value[index] = data.conversation
  } catch (error) {
    conversationError.value = error.message || t('ai.loadFailed')
  }
}

async function deleteConversation(conversation) {
  if (!window.confirm(t('ai.deleteConfirm', { title: conversation.title }))) return
  try {
    await deleteAiConversation(conversation.id)
    conversations.value = conversations.value.filter((item) => item.id !== conversation.id)
    if (activeConversationId.value === conversation.id) newChat()
  } catch (error) {
    conversationError.value = error.message || t('ai.loadFailed')
  }
}

async function scrollToBottom() {
  await nextTick()
  const el = messageScroller.value
  if (el) el.scrollTop = el.scrollHeight
}

async function sendMessage() {
  if (busy.value) return
  const text = draft.value.trim()
  if (!text) return
  if (!selectedConnectionId.value) {
    chatError.value = t('ai.noConnection')
    return
  }

  busy.value = true
  chatError.value = ''
  lastFailedPrompt.value = text
  draft.value = ''
  messages.value = [
    ...messages.value,
    {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: text,
      status: 'complete',
    },
  ]
  streamingMessage.value = {
    id: `local-assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    status: 'partial',
  }
  abortController.value = new AbortController()
  await scrollToBottom()

  let streamFailed = false
  try {
    await streamAiChat(
      {
        conversationId: activeConversationId.value || undefined,
        connectionId: selectedConnectionId.value,
        message: text,
      },
      {
        signal: abortController.value.signal,
        onEvent(event, payload) {
          if (event === 'start' && payload?.conversationId) {
            activeConversationId.value = payload.conversationId
            router.replace({ name: 'chat', query: { id: payload.conversationId } })
          }
          if (event === 'delta' && streamingMessage.value) {
            streamingMessage.value.content += String(payload?.text || '')
            scrollToBottom()
          }
          if (event === 'error') {
            streamFailed = true
            chatError.value = payload?.message || t('ai.error')
            if (streamingMessage.value) streamingMessage.value.status = 'error'
          }
        },
      },
    )
    if (!streamFailed && streamingMessage.value) streamingMessage.value.status = 'complete'
  } catch (error) {
    if (error?.name !== 'AbortError' && error?.message !== 'The user aborted a request.') {
      chatError.value = error.message || t('ai.error')
      streamFailed = true
      if (streamingMessage.value) streamingMessage.value.status = 'error'
    }
  } finally {
    busy.value = false
    abortController.value = null
    if (streamFailed) {
      if (streamingMessage.value) streamingMessage.value.status = 'error'
    } else {
      streamingMessage.value = null
      await loadConversations()
      if (activeConversationId.value) await loadMessages(activeConversationId.value)
    }
    await scrollToBottom()
  }
}

function stopGeneration() {
  abortController.value?.abort()
  if (streamingMessage.value) streamingMessage.value.status = 'partial'
  chatError.value = ''
}

async function retryLast() {
  if (!lastFailedPrompt.value || busy.value) return
  draft.value = lastFailedPrompt.value
  await sendMessage()
}

async function initialize() {
  if (initializePromise) return initializePromise

  initializePromise = (async () => {
    await refreshUser()
    if (!me.value) return
    await Promise.all([loadConnections(), loadConversations()])
    const routeId = String(route.query.id || '')
    if (routeId && conversations.value.some((item) => item.id === routeId)) {
      activeConversationId.value = routeId
      await loadMessages(routeId)
    }
  })()

  try {
    await initializePromise
  } finally {
    initializePromise = null
  }
}

function onAuthChange() {
  initialize()
}

onMounted(() => {
  initialize()
  window.addEventListener('mohhen-auth-change', onAuthChange)
})

onUnmounted(() => {
  abortController.value?.abort()
  window.removeEventListener('mohhen-auth-change', onAuthChange)
})
</script>

<style scoped>
.ai-page {
  display: grid;
  gap: 1rem;
}

.ai-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.ai-hero h1 {
  margin: 0.25rem 0 0.35rem;
}

.ai-hero .lede {
  margin: 0;
}

.ai-privacy-note {
  flex-shrink: 0;
  padding: 0.32rem 0.6rem;
  border: 1px solid color-mix(in srgb, var(--accent) 38%, var(--line));
  border-radius: 999px;
  color: var(--accent);
  font-size: 0.78rem;
}

.ai-login-card {
  max-width: 36rem;
}

.ai-login-card h2 {
  margin: 0.2rem 0 0.35rem;
}

.ai-login-card p:not(.eyebrow) {
  margin: 0 0 1rem;
}

.ai-shell {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  min-height: min(74vh, 760px);
  padding: 0;
  overflow: hidden;
}

.ai-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 72%, transparent);
}

.ai-sidebar-head,
.ai-chat-head,
.ai-composer-foot {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.ai-sidebar-head {
  justify-content: space-between;
  padding: 0.85rem;
  border-bottom: 1px solid var(--line);
}

.ai-sidebar-empty,
.ai-inline-error {
  margin: 0;
  padding: 0.85rem;
}

.ai-conversation-list {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding: 0.55rem;
  overflow-y: auto;
  list-style: none;
}

.ai-conversation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  gap: 0.35rem;
  padding: 0.72rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ai-conversation-row:hover,
.ai-conversation-row.active {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  background: color-mix(in srgb, var(--accent) 9%, transparent);
}

.ai-conversation-copy,
.ai-conversation-actions,
.ai-conversation-action-buttons {
  display: flex;
  min-width: 0;
  align-items: center;
}

.ai-conversation-copy {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}

.ai-conversation-copy strong,
.ai-conversation-copy span {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-conversation-copy strong {
  font-size: 0.9rem;
}

.ai-conversation-copy span,
.ai-conversation-date {
  font-size: 0.74rem;
}

.ai-conversation-actions {
  justify-content: space-between;
  gap: 0.5rem;
}

.ai-conversation-action-buttons {
  gap: 0.15rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.ai-conversation-row:hover .ai-conversation-action-buttons,
.ai-conversation-row:focus-visible .ai-conversation-action-buttons,
.ai-conversation-row.active .ai-conversation-action-buttons {
  opacity: 1;
}

.ai-row-action {
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.ai-row-action:hover,
.ai-row-action:focus-visible {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  outline: none;
}

.ai-chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  min-width: 0;
  min-height: 0;
}

.ai-chat-head {
  justify-content: space-between;
  min-width: 0;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--line);
}

.ai-chat-title {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.05rem;
}

.ai-chat-title strong,
.ai-chat-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-title span {
  font-size: 0.76rem;
}

.ai-connection-select select {
  max-width: 220px;
  min-height: 2.3rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--input-bg);
  color: var(--ink);
  font: inherit;
}

.ai-mobile-menu {
  display: none;
}

.ai-message-scroller {
  min-height: 0;
  overflow-y: auto;
  padding: 1.1rem clamp(0.9rem, 4vw, 3.5rem);
  background:
    radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%),
    color-mix(in srgb, var(--bg) 68%, transparent);
  scroll-behavior: smooth;
}

.ai-state-message {
  display: grid;
  min-height: 100%;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;
}

.ai-state-message span {
  max-width: 30rem;
}

.ai-message {
  max-width: 46rem;
  margin: 0 auto 1rem;
}

.ai-message.user {
  max-width: 38rem;
  margin-right: max(0px, 3vw);
}

.ai-message-meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.3rem;
  color: var(--muted);
  font-size: 0.76rem;
}

.ai-message.user .ai-message-meta {
  justify-content: flex-end;
}

.ai-message-content {
  overflow-wrap: anywhere;
  line-height: 1.68;
}

.ai-message.user .ai-message-content {
  padding: 0.7rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--accent) 36%, var(--line));
  border-radius: 14px 14px 4px 14px;
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  white-space: pre-wrap;
}

.ai-message.assistant .ai-message-content {
  padding: 0.2rem 0;
}

.ai-message-content :deep(p:first-child) {
  margin-top: 0;
}

.ai-message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-message-content :deep(pre) {
  overflow-x: auto;
  padding: 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--input-bg) 86%, #000 14%);
}

.ai-message-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}

.ai-message-error,
.ai-chat-error {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem;
  color: var(--danger);
  font-size: 0.84rem;
}

.ai-chat-error {
  padding: 0.55rem 1rem 0;
}

.ai-composer {
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.ai-composer textarea {
  min-height: 4.5rem;
  max-height: 14rem;
  resize: vertical;
  padding: 0.72rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--input-bg) 88%, transparent);
  color: var(--ink);
  line-height: 1.5;
}

.ai-composer textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.ai-composer-foot {
  justify-content: space-between;
}

.ai-composer-hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
}

.danger-text {
  color: var(--danger);
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
  .ai-hero {
    flex-direction: column;
  }

  .ai-shell {
    position: relative;
    grid-template-columns: 1fr;
    min-height: min(78vh, 760px);
  }

  .ai-sidebar {
    display: none;
    position: absolute;
    inset: 0 25% 0 0;
    z-index: 2;
    border-right: 1px solid var(--line);
    box-shadow: 16px 0 40px rgba(0, 0, 0, 0.16);
  }

  .ai-shell.sidebar-open .ai-sidebar {
    display: flex;
  }

  .ai-mobile-menu {
    display: inline-flex;
  }

  .ai-chat-head {
    gap: 0.45rem;
  }

  .ai-connection-select {
    max-width: 42%;
  }

  .ai-connection-select select {
    width: 100%;
    max-width: none;
  }

  .ai-message.user {
    margin-right: 0;
  }
}

@media (max-width: 460px) {
  .ai-sidebar {
    inset: 0 12% 0 0;
  }

  .ai-chat-title {
    display: none;
  }

  .ai-connection-select {
    max-width: none;
    flex: 1;
  }

  .ai-message-scroller {
    padding-inline: 0.8rem;
  }
}
</style>
