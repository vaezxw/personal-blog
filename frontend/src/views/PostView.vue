<template>
  <article class="article" v-if="post">
    <header class="post-header">
      <RouterLink
        v-if="post.authorUsername"
        class="person-chip"
        :to="{ name: 'user', params: { username: post.authorUsername } }"
      >
        <span class="person-avatar" aria-hidden="true">
          <img v-if="post.authorAvatarUrl" :src="post.authorAvatarUrl" alt="" />
          <template v-else>{{ authorLetter }}</template>
        </span>
        <span class="person-text">
          <strong class="person-name">{{ post.authorUsername }}</strong>
          <time class="person-sub" :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
        </span>
      </RouterLink>
      <p v-else class="eyebrow">
        <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
      </p>
      <h1>
        {{ post.title }}
        <span v-if="post.visibility === 'friends'" class="vis-badge">{{ t('post.badgeFriends') }}</span>
        <span v-else-if="post.visibility === 'private'" class="vis-badge private">{{ t('post.badgePrivate') }}</span>
      </h1>
    </header>

    <div id="likes" class="engage-bar" :class="{ flash: highlightTarget === 'likes' }">
      <span class="engage-stat muted">{{ t('post.views', { count: post.viewCount || 0 }) }}</span>
      <span class="engage-stat muted">{{ t('post.commentsCount', { count: post.commentCount || comments.length || 0 }) }}</span>
      <button
        type="button"
        class="like-btn"
        :class="{ active: post.likedByMe, busy: likeBusy }"
        :disabled="likeBusy"
        @click="onLike"
      >
        <span aria-hidden="true">{{ post.likedByMe ? '♥' : '♡' }}</span>
        {{ t('post.likes', { count: post.likeCount || 0 }) }}
      </button>
      <button
        type="button"
        class="like-btn favorite-btn"
        :class="{ active: post.favoritedByMe, busy: favoriteBusy }"
        :disabled="favoriteBusy"
        @click="onFavorite"
      >
        <span aria-hidden="true">{{ post.favoritedByMe ? '★' : '☆' }}</span>
        {{ t('post.favorites', { count: post.favoriteCount || 0 }) }}
      </button>
      <div class="share-wrap" ref="shareWrapRef">
        <button
          type="button"
          class="share-btn share-trigger"
          :aria-expanded="shareOpen"
          :aria-controls="'share-panel'"
          @click.stop="toggleShare"
        >
          {{ t('share.open') }}
        </button>
        <div
          v-if="shareOpen"
          id="share-panel"
          class="share-panel geek-surface"
          role="dialog"
          :aria-label="t('share.open')"
          @click.stop
        >
          <p class="share-panel-title">{{ t('share.panelTitle') }}</p>
          <div class="share-actions">
            <button type="button" class="share-action" @click="onCopyLink">
              <span class="share-ico" aria-hidden="true">⧉</span>
              {{ t('share.copy') }}
            </button>
            <button type="button" class="share-action" @click="onShareWeibo">
              <span class="share-ico" aria-hidden="true">微</span>
              {{ t('share.weibo') }}
            </button>
            <button type="button" class="share-action" @click="onShareX">
              <span class="share-ico" aria-hidden="true">𝕏</span>
              {{ t('share.x') }}
            </button>
            <button
              v-if="nativeShareAvailable"
              type="button"
              class="share-action"
              @click="onSystemShare"
            >
              <span class="share-ico" aria-hidden="true">↑</span>
              {{ t('share.system') }}
            </button>
          </div>
          <div class="share-qr">
            <img :src="shareQrSrc" :alt="t('share.qrAlt')" width="132" height="132" />
            <p class="muted">{{ t('share.qrHint') }}</p>
          </div>
          <p v-if="shareHint" class="share-feedback" :class="{ ok: shareOk }">{{ shareHint }}</p>
        </div>
      </div>
      <p v-if="likeHint" class="muted like-hint">
        <RouterLink to="/admin">{{ t('post.login') }}</RouterLink>{{ t('post.loginToLike') }}
      </p>
      <p v-else-if="favoriteHint" class="muted like-hint">
        <RouterLink to="/admin">{{ t('post.login') }}</RouterLink>{{ t('post.loginToFavorite') }}
      </p>
    </div>

    <div class="prose" v-html="renderedHtml"></div>

    <section id="comments" class="comments panel" :class="{ flash: highlightTarget === 'comments' }">
      <h2>{{ t('post.comments') }}</h2>
      <p v-if="commentsLoading" class="muted">{{ t('post.commentsLoading') }}</p>
      <p v-else-if="commentsError" class="error">{{ commentsError }}</p>
      <ul v-else class="comment-list">
        <li
          v-for="thread in commentThreads"
          :id="`comment-${thread.root.id}`"
          :key="thread.root.id"
          :class="{ flash: highlightTarget === `comment-${thread.root.id}` }"
        >
          <RouterLink
            class="person-avatar sm"
            :to="{ name: 'user', params: { username: thread.root.username } }"
            :aria-label="thread.root.username"
          >
            <img v-if="thread.root.avatarUrl" :src="thread.root.avatarUrl" alt="" />
            <template v-else>{{ (thread.root.username || '?').slice(0, 1).toUpperCase() }}</template>
          </RouterLink>
          <div class="comment-body">
            <div class="comment-head">
              <RouterLink
                class="person-name"
                :to="{ name: 'user', params: { username: thread.root.username } }"
              >
                {{ thread.root.username }}
              </RouterLink>
              <time :datetime="thread.root.createdAt">{{ formatDate(thread.root.createdAt) }}</time>
              <button
                v-if="currentUser"
                class="btn ghost small"
                type="button"
                @click="startReply(thread.root)"
              >
                {{ t('post.reply') }}
              </button>
              <button
                v-if="canDeleteComment(thread.root)"
                class="btn ghost danger small"
                type="button"
                @click="removeComment(thread.root)"
              >
                {{ t('post.delete') }}
              </button>
            </div>
            <p class="comment-text">{{ thread.root.content }}</p>

            <ul v-if="thread.replies.length" class="reply-list">
              <li
                v-for="reply in thread.replies"
                :id="`comment-${reply.id}`"
                :key="reply.id"
                :class="{ flash: highlightTarget === `comment-${reply.id}` }"
              >
                <RouterLink
                  class="person-avatar xs"
                  :to="{ name: 'user', params: { username: reply.username } }"
                  :aria-label="reply.username"
                >
                  <img v-if="reply.avatarUrl" :src="reply.avatarUrl" alt="" />
                  <template v-else>{{ (reply.username || '?').slice(0, 1).toUpperCase() }}</template>
                </RouterLink>
                <div class="comment-body">
                  <div class="comment-head">
                    <RouterLink
                      class="person-name"
                      :to="{ name: 'user', params: { username: reply.username } }"
                    >
                      {{ reply.username }}
                    </RouterLink>
                    <span v-if="reply.replyToUsername" class="reply-to muted">
                      {{ t('post.replyTo', { user: reply.replyToUsername }) }}
                    </span>
                    <time :datetime="reply.createdAt">{{ formatDate(reply.createdAt) }}</time>
                    <button
                      v-if="currentUser"
                      class="btn ghost small"
                      type="button"
                      @click="startReply(reply)"
                    >
                      {{ t('post.reply') }}
                    </button>
                    <button
                      v-if="canDeleteComment(reply)"
                      class="btn ghost danger small"
                      type="button"
                      @click="removeComment(reply)"
                    >
                      {{ t('post.delete') }}
                    </button>
                  </div>
                  <p class="comment-text">{{ reply.content }}</p>
                </div>
              </li>
            </ul>
          </div>
        </li>
      </ul>
      <p v-if="!commentsLoading && comments.length === 0" class="muted">
        {{ t('post.commentsEmpty') }}
      </p>

      <form v-if="currentUser" class="comment-form" @submit.prevent="submitComment">
        <div class="comment-compose">
          <span class="person-avatar sm" aria-hidden="true">
            <img v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" alt="" />
            <template v-else>{{ (currentUser.username || '?').slice(0, 1).toUpperCase() }}</template>
          </span>
          <div class="comment-compose-fields">
            <div class="comment-compose-label-row">
              <label>{{ replyTarget ? t('post.replyingTo', { user: replyTarget.username }) : t('post.writeComment') }}</label>
              <button
                v-if="replyTarget"
                class="btn ghost small"
                type="button"
                @click="cancelReply"
              >
                {{ t('post.cancelReply') }}
              </button>
            </div>
            <textarea
              ref="commentInputRef"
              v-model="commentText"
              rows="3"
              :placeholder="replyTarget ? t('post.replyPlaceholder') : t('post.commentPlaceholder')"
              required
              maxlength="2000"
            ></textarea>
            <div class="comment-compose-actions">
              <EmojiPicker :label="t('post.emoji')" @pick="insertEmoji" />
              <button class="btn" type="submit" :disabled="commentBusy">
                {{ commentBusy ? t('post.sending') : replyTarget ? t('post.sendReply') : t('post.send') }}
              </button>
            </div>
            <p v-if="commentFormError" class="error">{{ commentFormError }}</p>
          </div>
        </div>
      </form>
      <p v-else class="muted">
        <RouterLink to="/admin">{{ t('post.login') }}</RouterLink>{{ t('post.loginToComment') }}
      </p>
    </section>

    <RouterLink class="back" to="/">{{ t('post.back') }}</RouterLink>
  </article>
  <p v-else-if="loading" class="muted">{{ t('post.loading') }}</p>
  <p v-else class="error">{{ error || t('post.missing') }}</p>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  createComment,
  deleteComment,
  fetchComments,
  fetchPost,
  getStoredUser,
  me,
  recordPostView,
  shouldCountUniqueView,
  togglePostFavorite,
  togglePostLike,
} from '../api'
import { useLocale } from '../composables/useLocale.js'
import EmojiPicker from '../components/EmojiPicker.vue'
import { renderPostContent } from '../utils/contentFormat.js'
import {
  canUseNativeShare,
  copyText,
  openWeiboShare,
  openXShare,
  postShareUrl,
  qrCodeUrl,
  systemShare,
} from '../utils/share.js'

const props = defineProps({
  slug: { type: String, required: true },
})

const route = useRoute()
const { t, formatDate } = useLocale()

const post = ref(null)
const loading = ref(true)
const error = ref('')
const comments = ref([])
const commentsLoading = ref(true)
const commentsError = ref('')
const currentUser = ref(getStoredUser())
const commentInputRef = ref(null)
const commentText = ref('')
const commentBusy = ref(false)
const commentFormError = ref('')
const replyTarget = ref(null)
const likeBusy = ref(false)
const likeHint = ref(false)
const favoriteBusy = ref(false)
const favoriteHint = ref(false)
const shareOpen = ref(false)
const shareHint = ref('')
const shareOk = ref(false)
const shareWrapRef = ref(null)
const nativeShareAvailable = ref(false)
const highlightTarget = ref('')
let shareHintTimer = null
let highlightTimer = null

const shareQrSrc = computed(() => qrCodeUrl(postShareUrl(props.slug), 132))

function toggleShare() {
  shareOpen.value = !shareOpen.value
  if (shareOpen.value) {
    shareHint.value = ''
    nativeShareAvailable.value = canUseNativeShare()
  }
}

function closeShare() {
  shareOpen.value = false
}

function onShareDocPointer(event) {
  if (!shareOpen.value) return
  const el = event.target
  if (!(el instanceof Element)) return
  if (shareWrapRef.value?.contains(el)) return
  closeShare()
}

async function onCopyLink() {
  try {
    const ok = await copyText(postShareUrl(props.slug))
    flashShare(ok ? t('share.copied') : t('share.copyFailed'), ok)
  } catch {
    flashShare(t('share.copyFailed'), false)
  }
}

function onShareWeibo() {
  openWeiboShare({ url: postShareUrl(props.slug), title: post.value?.title || '' })
  flashShare(t('share.opened'), true)
}

function onShareX() {
  openXShare({ url: postShareUrl(props.slug), title: post.value?.title || '' })
  flashShare(t('share.opened'), true)
}

async function onSystemShare() {
  try {
    await systemShare({
      title: post.value?.title || '',
      text: post.value?.excerpt || post.value?.title || '',
      url: postShareUrl(props.slug),
    })
    flashShare(t('share.shared'), true)
  } catch (err) {
    if (err?.name === 'AbortError') return
    // 桌面端不支持时自动降级为复制链接
    try {
      const ok = await copyText(postShareUrl(props.slug))
      flashShare(ok ? t('share.fallbackCopied') : t('share.systemUnavailable'), ok)
    } catch {
      flashShare(t('share.systemUnavailable'), false)
    }
  }
}

function flashShare(msg, ok = true) {
  shareHint.value = msg
  shareOk.value = ok
  if (shareHintTimer) clearTimeout(shareHintTimer)
  shareHintTimer = setTimeout(() => {
    shareHint.value = ''
  }, 2200)
}

const renderedHtml = computed(() => {
  if (!post.value) return ''
  return renderPostContent(post.value.content || '')
})

const authorLetter = computed(() =>
  (post.value?.authorUsername || '?').slice(0, 1).toUpperCase(),
)

const commentThreads = computed(() => {
  const roots = []
  const repliesByParent = new Map()
  for (const c of comments.value) {
    if (c.parentId) {
      const list = repliesByParent.get(c.parentId) || []
      list.push(c)
      repliesByParent.set(c.parentId, list)
    } else {
      roots.push(c)
    }
  }
  return roots.map((root) => ({
    root,
    replies: repliesByParent.get(root.id) || [],
  }))
})

function canDeleteComment(c) {
  if (!currentUser.value) return false
  return currentUser.value.role === 'admin' || currentUser.value.id === c.userId
}

async function trackView() {
  try {
    const countView = shouldCountUniqueView(props.slug)
    const data = await recordPostView(props.slug, { countView })
    if (post.value && data) {
      post.value = {
        ...post.value,
        viewCount: data.viewCount,
        clickCount: data.clickCount,
        likeCount: data.likeCount ?? post.value.likeCount,
      }
    }
  } catch {
    /* ignore view errors */
  }
}

async function loadComments() {
  commentsLoading.value = true
  commentsError.value = ''
  try {
    comments.value = await fetchComments(props.slug)
    if (post.value) {
      post.value = { ...post.value, commentCount: comments.value.length }
    }
  } catch (err) {
    commentsError.value = err.message || t('post.commentsFailed')
  } finally {
    commentsLoading.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  post.value = null
  likeHint.value = false
  try {
    post.value = await fetchPost(props.slug)
    await Promise.all([loadComments(), trackView()])
  } catch (err) {
    if (err.status === 401 && (err.code === 'friends' || err.code === 'private')) {
      error.value = t('post.loginForVisibility')
    } else if (err.code === 'friends') {
      error.value = t('post.friendsOnly')
    } else if (err.code === 'private') {
      error.value = t('post.privateOnly')
    } else {
      error.value = err.message || t('post.loadFailed')
    }
  } finally {
    loading.value = false
    await scrollToHashTarget()
  }
}

async function scrollToHashTarget() {
  const hash = route.hash?.replace(/^#/, '')
  if (!hash) return
  await nextTick()

  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 80))
    let el = document.getElementById(hash)
    if (!el && hash.startsWith('comment-')) el = document.getElementById('comments')
    if (!el) continue
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightTarget.value = el.id
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightTarget.value = ''
    }, 1800)
    return
  }
}

async function onLike() {
  likeHint.value = false
  favoriteHint.value = false
  if (!currentUser.value) {
    likeHint.value = true
    return
  }
  likeBusy.value = true
  try {
    const data = await togglePostLike(props.slug)
    if (post.value) {
      post.value = {
        ...post.value,
        likedByMe: data.likedByMe,
        likeCount: data.likeCount,
        viewCount: data.viewCount ?? post.value.viewCount,
        commentCount: data.commentCount ?? post.value.commentCount,
        heat: data.heat,
      }
    }
  } catch (err) {
    if (String(err.message || '').includes('Unauthorized')) {
      likeHint.value = true
      currentUser.value = null
    }
  } finally {
    likeBusy.value = false
  }
}

async function onFavorite() {
  likeHint.value = false
  favoriteHint.value = false
  if (!currentUser.value) {
    favoriteHint.value = true
    return
  }
  favoriteBusy.value = true
  try {
    const data = await togglePostFavorite(props.slug)
    if (post.value) {
      post.value = {
        ...post.value,
        favoritedByMe: data.favoritedByMe,
        favoriteCount: data.favoriteCount,
        likeCount: data.likeCount ?? post.value.likeCount,
        viewCount: data.viewCount ?? post.value.viewCount,
        commentCount: data.commentCount ?? post.value.commentCount,
        heat: data.heat,
      }
    }
  } catch (err) {
    if (String(err.message || '').includes('Unauthorized')) {
      favoriteHint.value = true
      currentUser.value = null
    }
  } finally {
    favoriteBusy.value = false
  }
}

async function submitComment() {
  commentBusy.value = true
  commentFormError.value = ''
  try {
    const parentId = replyTarget.value?.parentId || replyTarget.value?.id || null
    const created = await createComment(props.slug, commentText.value.trim(), parentId)
    comments.value = [...comments.value, created]
    commentText.value = ''
    replyTarget.value = null
    if (post.value) {
      post.value = { ...post.value, commentCount: (post.value.commentCount || 0) + 1 }
    }
  } catch (err) {
    commentFormError.value = err.message || t('post.sendFailed')
  } finally {
    commentBusy.value = false
  }
}

function startReply(comment) {
  replyTarget.value = comment
  nextTick(() => {
    commentInputRef.value?.focus()
    commentInputRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function cancelReply() {
  replyTarget.value = null
}

function insertEmoji(emoji) {
  const el = commentInputRef.value
  const text = commentText.value || ''
  if (!el) {
    commentText.value = text + emoji
    return
  }
  const start = el.selectionStart ?? text.length
  const end = el.selectionEnd ?? text.length
  commentText.value = text.slice(0, start) + emoji + text.slice(end)
  nextTick(() => {
    const pos = start + emoji.length
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

async function removeComment(c) {
  if (!confirm(t('post.deleteConfirm'))) return
  try {
    await deleteComment(c.id)
    const removedIds = new Set([c.id])
    if (!c.parentId) {
      for (const item of comments.value) {
        if (item.parentId === c.id) removedIds.add(item.id)
      }
    }
    comments.value = comments.value.filter((x) => !removedIds.has(x.id))
    if (post.value) {
      post.value = {
        ...post.value,
        commentCount: Math.max(0, (post.value.commentCount || removedIds.size) - removedIds.size),
      }
    }
    if (replyTarget.value && removedIds.has(replyTarget.value.id)) {
      replyTarget.value = null
    }
  } catch (err) {
    commentsError.value = err.message || t('post.deleteFailed')
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
  nativeShareAvailable.value = canUseNativeShare()
  document.addEventListener('pointerdown', onShareDocPointer)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onShareDocPointer)
  if (shareHintTimer) clearTimeout(shareHintTimer)
  if (highlightTimer) clearTimeout(highlightTimer)
})

watch(() => props.slug, () => {
  closeShare()
  load()
})
watch(
  () => route.hash,
  () => {
    if (post.value && !loading.value) scrollToHashTarget()
  },
)
</script>

<style scoped>
.post-header {
  margin-bottom: 0.35rem;
}

.post-header h1 {
  margin: 0.85rem 0 0;
}

.person-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  max-width: 100%;
  padding: 0.2rem 0.35rem 0.2rem 0.2rem;
  margin: 0 -0.2rem;
  border-radius: 14px;
  transition: background 0.2s ease;
}

.person-chip:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: inherit;
}

.person-avatar {
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
  text-decoration: none;
}

.person-avatar.sm {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 10px;
  font-size: 0.92rem;
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-text {
  display: grid;
  gap: 0.08rem;
  min-width: 0;
}

.person-name {
  font-weight: 650;
  line-height: 1.2;
  text-decoration: none;
  color: inherit;
}

.person-name:hover {
  color: var(--accent);
}

.person-sub {
  color: var(--muted);
  font-size: 0.82rem;
}

.engage-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin: 1rem 0 1.5rem;
  scroll-margin-top: 5rem;
}

.engage-stat {
  font-size: 0.92rem;
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.like-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.like-btn.active {
  border-color: #e11d48;
  color: #e11d48;
  background: color-mix(in srgb, #e11d48 8%, transparent);
}

.like-btn.busy {
  opacity: 0.65;
}

.like-hint {
  margin: 0;
  width: 100%;
  font-size: 0.88rem;
}

.share-wrap {
  position: relative;
  margin-left: auto;
}

.share-btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-size: 0.82rem;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.share-btn:hover,
.share-trigger[aria-expanded='true'] {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.share-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  width: min(17.5rem, calc(100vw - 2rem));
  z-index: 30;
  padding: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(10px);
  animation: rise 0.25s ease both;
}

.share-panel-title {
  margin: 0 0 0.65rem;
  font-size: 0.88rem;
  font-weight: 650;
}

.share-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.share-action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
  border-radius: 10px;
  padding: 0.5rem 0.55rem;
  font-size: 0.82rem;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.share-action:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.share-ico {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--stat-bg);
  color: var(--accent);
  flex-shrink: 0;
}

.share-qr {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--line);
  display: grid;
  justify-items: center;
  gap: 0.35rem;
}

.share-qr img {
  width: 132px;
  height: 132px;
  border-radius: 10px;
  background: #fff;
  padding: 0.35rem;
  border: 1px solid var(--line);
}

.share-qr p {
  margin: 0;
  font-size: 0.78rem;
  text-align: center;
}

.share-feedback {
  margin: 0.55rem 0 0;
  font-size: 0.82rem;
  color: var(--danger);
}

.share-feedback.ok {
  color: var(--accent);
}

.flash {
  animation: notify-flash 1.6s ease;
  border-radius: 12px;
}

@keyframes notify-flash {
  0%,
  100% {
    box-shadow: none;
    background-color: transparent;
  }
  20%,
  55% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent);
    background-color: color-mix(in srgb, var(--accent) 10%, transparent);
  }
}

.comments {
  margin-top: 2.5rem;
  scroll-margin-top: 5rem;
}

.comment-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  display: grid;
  gap: 0.95rem;
}

.comment-list > li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
  padding: 0.55rem 0.5rem;
  border-radius: 12px;
  scroll-margin-top: 5rem;
}

.comment-body {
  min-width: 0;
}

.comment-text {
  margin: 0.2rem 0 0;
  line-height: 1.55;
  color: var(--prose-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.65rem;
}

.comment-head time {
  color: var(--muted);
  font-size: 0.85rem;
}

.reply-to {
  font-size: 0.85rem;
}

.reply-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0.65rem 0 0 0.85rem;
  border-left: 2px solid var(--line);
  display: grid;
  gap: 0.75rem;
}

.reply-list > li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: start;
  scroll-margin-top: 5rem;
}

.person-avatar.xs {
  width: 1.85rem;
  height: 1.85rem;
  font-size: 0.75rem;
}

.btn.small {
  padding: 0.25rem 0.55rem;
  font-size: 0.85rem;
}

.comment-form {
  margin-top: 1.25rem;
}

.comment-compose {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: start;
}

.comment-compose-fields {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.comment-compose-label-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.comment-compose-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.comment-compose-actions .btn {
  justify-self: start;
}
</style>
