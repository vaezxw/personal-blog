<template>
  <section class="studio">
    <header class="studio-hero">
      <p class="eyebrow">{{ t('admin.eyebrow') }}</p>
      <h1>{{ t('admin.title') }}</h1>
      <p class="lede">{{ t('admin.lede') }}</p>
    </header>

    <div v-if="!user" class="panel studio-gate">
      <p>{{ t('admin.pleaseLogin') }}</p>
      <div class="studio-gate-actions">
        <RouterLink class="btn" :to="{ name: 'me', query: { next: '/admin' } }">
          {{ t('admin.login') }}
        </RouterLink>
        <RouterLink class="btn ghost" :to="{ name: 'me', query: { tab: 'register', next: '/admin' } }">
          {{ t('admin.register') }}
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="studio-who muted">
        <span>{{ t('admin.loggedInAs') }}<strong>{{ user.username }}</strong></span>
        <span aria-hidden="true">·</span>
        <RouterLink :to="{ name: 'me' }">{{ t('nav.me') }}</RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink :to="{ name: 'user', params: { username: user.username } }">
          {{ t('admin.profile') }}
        </RouterLink>
      </div>

      <nav class="studio-tabs" aria-label="studio">
        <button
          type="button"
          :class="{ active: studioTab === 'compose' }"
          @click="studioTab = 'compose'"
        >
          {{ t('admin.tabCompose') }}
        </button>
        <button
          type="button"
          :class="{ active: studioTab === 'library' }"
          @click="openLibrary"
        >
          {{ t('admin.tabLibrary') }}
        </button>
        <button
          type="button"
          :class="{ active: studioTab === 'stats' }"
          @click="openStats"
        >
          {{ t('admin.tabStats') }}
        </button>
        <button
          type="button"
          :class="{ active: studioTab === 'settings' }"
          @click="studioTab = 'settings'"
        >
          {{ t('admin.tabSettings') }}
        </button>
      </nav>

      <form
        v-show="studioTab === 'compose'"
        class="panel composer"
        @submit.prevent="submitPost"
      >
        <div class="composer-head">
          <h2>{{ editingId ? t('admin.editPost') : t('admin.newPost') }}</h2>
          <label class="md-upload btn ghost">
            <input
              ref="mdInputRef"
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              @change="onMarkdownFile"
            />
            {{ t('admin.uploadMd') }}
          </label>
        </div>

        <div class="composer-grid">
          <div class="field">
            <label>{{ t('admin.fieldTitle') }}</label>
            <input v-model="form.title" required :placeholder="t('admin.titlePlaceholder')" />
          </div>
          <div class="field">
            <label>{{ t('admin.fieldSlug') }}</label>
            <input v-model="form.slug" required :placeholder="t('admin.slugPlaceholder')" />
          </div>
          <div class="field full">
            <label>{{ t('admin.fieldExcerpt') }}</label>
            <input v-model="form.excerpt" :placeholder="t('admin.excerptPlaceholder')" />
          </div>
          <div
            class="field full content-field"
            @dragover.prevent
            @drop.prevent="onMarkdownDrop"
          >
            <div class="content-head">
              <label>{{ t('admin.fieldContent') }}</label>
              <div class="content-tools">
                <div class="content-mode" role="tablist" :aria-label="t('admin.editorMode')">
                  <button
                    type="button"
                    role="tab"
                    :class="{ active: contentMode === 'rich' }"
                    :aria-selected="contentMode === 'rich'"
                    @click="switchContentMode('rich')"
                  >
                    {{ t('admin.editorRich') }}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :class="{ active: contentMode === 'markdown' }"
                    :aria-selected="contentMode === 'markdown'"
                    @click="switchContentMode('markdown')"
                  >
                    {{ t('admin.editorMarkdown') }}
                  </button>
                </div>
                <div
                  v-if="contentMode === 'markdown'"
                  class="content-mode preview-mode"
                  role="tablist"
                  :aria-label="t('admin.previewMode')"
                >
                  <button
                    type="button"
                    role="tab"
                    :class="{ active: mdPane === 'edit' }"
                    :aria-selected="mdPane === 'edit'"
                    @click="mdPane = 'edit'"
                  >
                    {{ t('admin.previewEdit') }}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :class="{ active: mdPane === 'split' }"
                    :aria-selected="mdPane === 'split'"
                    @click="mdPane = 'split'"
                  >
                    {{ t('admin.previewSplit') }}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :class="{ active: mdPane === 'preview' }"
                    :aria-selected="mdPane === 'preview'"
                    @click="mdPane = 'preview'"
                  >
                    {{ t('admin.previewOnly') }}
                  </button>
                </div>
              </div>
            </div>
            <RichTextEditor
              v-if="contentMode === 'rich'"
              v-model="form.content"
              :placeholder="t('admin.contentPlaceholder')"
            />
            <div
              v-else
              class="md-workspace"
              :class="{
                'is-edit': mdPane === 'edit',
                'is-split': mdPane === 'split',
                'is-preview': mdPane === 'preview',
              }"
            >
              <textarea
                v-show="mdPane !== 'preview'"
                v-model="form.content"
                rows="14"
                :placeholder="t('admin.markdownPlaceholder')"
              ></textarea>
              <div v-show="mdPane !== 'edit'" class="md-preview panel">
                <p class="md-preview-label muted">{{ t('admin.previewLabel') }}</p>
                <header v-if="form.title.trim() || form.excerpt.trim()" class="md-preview-head">
                  <h3 v-if="form.title.trim()">{{ form.title }}</h3>
                  <p v-if="form.excerpt.trim()" class="muted">{{ form.excerpt }}</p>
                </header>
                <div v-if="previewHtml" ref="mdPreviewEl" class="prose" v-html="previewHtml"></div>
                <p v-else class="muted md-preview-empty">{{ t('admin.previewEmpty') }}</p>
              </div>
            </div>
          </div>
        </div>

        <p class="muted upload-note">{{ t('admin.uploadMdHint') }}</p>
        <p class="muted upload-note">{{ t('admin.uploadNote') }}</p>
        <p v-if="mdImportOk" class="ok">{{ mdImportOk }}</p>
        <p v-if="mdImportError" class="error">{{ mdImportError }}</p>

        <div class="attach-panel">
          <div class="attach-head">
            <div>
              <strong>{{ t('admin.attachments') }}</strong>
              <p class="muted upload-note">{{ t('admin.attachmentsHint') }}</p>
            </div>
            <label class="md-upload btn ghost" :class="{ busy: attachBusy }">
              <input
                ref="attachInputRef"
                type="file"
                multiple
                accept=".pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,application/pdf,application/zip"
                :disabled="attachBusy || attachments.length >= 20"
                @change="onAttachmentFiles"
              />
              {{ attachBusy ? t('admin.attachmentsUploading') : t('admin.attachmentsUpload') }}
            </label>
          </div>
          <p v-if="attachError" class="error">{{ attachError }}</p>
          <ul v-if="attachments.length" class="attach-list">
            <li v-for="(file, idx) in attachments" :key="file.id || file.key || idx">
              <div class="attach-meta">
                <strong>{{ file.name }}</strong>
                <span class="muted">{{ formatFileSize(file.size) }}</span>
              </div>
              <button class="btn ghost danger" type="button" @click="removeAttachment(idx)">
                {{ t('admin.attachmentsRemove') }}
              </button>
            </li>
          </ul>
          <p v-else class="muted attach-empty">{{ t('admin.attachmentsEmpty') }}</p>
        </div>

        <div class="composer-foot">
          <div class="composer-opts">
            <label class="check">
              <input v-model="form.published" type="checkbox" />
              {{ t('admin.publishNow') }}
            </label>
            <label class="vis-field">
              <span>{{ t('admin.fieldVisibility') }}</span>
              <select v-model="form.visibility">
                <option value="public">{{ t('admin.visibilityPublic') }}</option>
                <option value="friends">{{ t('admin.visibilityFriends') }}</option>
                <option value="private">{{ t('admin.visibilityPrivate') }}</option>
              </select>
            </label>
          </div>
          <div class="row">
            <button class="btn" type="submit" :disabled="saving">
              {{
                saving
                  ? t('admin.saving')
                  : editingId
                    ? t('admin.update')
                    : t('admin.create')
              }}
            </button>
            <button v-if="editingId" class="btn ghost" type="button" @click="resetForm">
              {{ t('admin.cancelEdit') }}
            </button>
          </div>
        </div>
        <p class="muted upload-note">{{ t('admin.visibilityHint') }}</p>
        <p v-if="formError" class="error">{{ formError }}</p>
        <p v-if="formOk" class="ok">{{ formOk }}</p>
      </form>

      <div v-show="studioTab === 'library'" class="panel">
        <div class="row between">
          <h2>{{ t('admin.myPosts') }}</h2>
          <button class="btn ghost" type="button" :disabled="loading" @click="loadPosts">
            {{ t('admin.refresh') }}
          </button>
        </div>
        <p v-if="loading" class="muted">{{ t('admin.loading') }}</p>
        <p v-else-if="listError" class="error">{{ listError }}</p>
        <p v-else-if="!posts.length" class="muted">{{ t('admin.emptyLibrary') }}</p>
        <ul v-else class="admin-list">
          <li v-for="post in posts" :key="post.id">
            <div class="admin-item-meta">
              <strong>{{ post.title }}</strong>
              <span class="muted">
                / {{ post.slug }} ·
                {{ post.published ? t('admin.published') : t('admin.draft') }}
                · {{ visibilityLabel(post.visibility) }}
                <template v-if="post.authorUsername"> · {{ post.authorUsername }}</template>
              </span>
            </div>
            <div class="admin-item-actions">
              <RouterLink
                class="btn ghost"
                :to="{ name: 'post', params: { slug: post.slug } }"
              >
                {{ t('admin.viewPost') }}
              </RouterLink>
              <button class="btn ghost" type="button" @click="editPost(post)">
                {{ t('admin.edit') }}
              </button>
              <button class="btn danger" type="button" @click="removePost(post)">
                {{ t('admin.delete') }}
              </button>
            </div>
          </li>
        </ul>
      </div>

      <div v-show="studioTab === 'stats'" class="panel stats-panel">
        <div class="row between">
          <h2>{{ t('admin.statsTitle') }}</h2>
          <button class="btn ghost" type="button" :disabled="statsLoading" @click="loadStats">
            {{ t('admin.refresh') }}
          </button>
        </div>
        <p v-if="statsError" class="error">{{ statsError }}</p>
        <div v-else class="stats-grid">
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.postCount }}</span>
            <span class="stat-label">{{ t('admin.statsPosts') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.viewCount }}</span>
            <span class="stat-label">{{ t('admin.statsViews') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.clickCount }}</span>
            <span class="stat-label">{{ t('admin.statsClicks') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.likeCount }}</span>
            <span class="stat-label">{{ t('admin.statsLikes') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.favoriteCount || 0 }}</span>
            <span class="stat-label">{{ t('admin.statsFavorites') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.commentCount }}</span>
            <span class="stat-label">{{ t('admin.statsComments') }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-value mono">{{ stats.heat }}</span>
            <span class="stat-label">{{ t('admin.statsHeat') }}</span>
          </div>
        </div>
      </div>

      <div v-show="studioTab === 'settings'" class="panel settings-panel">
        <h2>{{ t('admin.settingsTitle') }}</h2>
        <p class="muted settings-lede">{{ t('admin.settingsLede') }}</p>

        <div class="settings-block">
          <h3>{{ t('admin.avatarTitle') }}</h3>
          <div class="avatar-editor">
            <div class="avatar-preview">
              <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
              <span v-else>{{ user.username.slice(0, 1).toUpperCase() }}</span>
            </div>
            <div>
              <label class="md-upload btn ghost">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  :disabled="avatarBusy"
                  @change="onAvatarFile"
                />
                {{ avatarBusy ? t('admin.avatarUploading') : t('admin.avatarUpload') }}
              </label>
              <p class="muted upload-note">{{ t('admin.avatarHint') }}</p>
              <p v-if="avatarOk" class="ok">{{ avatarOk }}</p>
              <p v-if="avatarError" class="error">{{ avatarError }}</p>
            </div>
          </div>
        </div>

        <form class="settings-block" @submit.prevent="saveUsername">
          <h3>{{ t('admin.usernameTitle') }}</h3>
          <label>{{ t('admin.username') }}</label>
          <input v-model="profileForm.username" required maxlength="32" />
          <button class="btn" type="submit" :disabled="profileBusy">
            {{ profileBusy ? t('admin.saving') : t('admin.saveUsername') }}
          </button>
          <p v-if="usernameOk" class="ok">{{ usernameOk }}</p>
          <p v-if="usernameError" class="error">{{ usernameError }}</p>
        </form>

        <form class="settings-block" @submit.prevent="savePassword">
          <h3>{{ t('admin.passwordTitle') }}</h3>
          <label>{{ t('admin.currentPassword') }}</label>
          <input
            v-model="profileForm.currentPassword"
            type="password"
            required
            autocomplete="current-password"
          />
          <label>{{ t('admin.newPassword') }}</label>
          <input
            v-model="profileForm.newPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
            :placeholder="t('admin.passwordPlaceholder')"
          />
          <label>{{ t('admin.confirmPassword') }}</label>
          <input
            v-model="profileForm.confirmPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
          />
          <button class="btn" type="submit" :disabled="profileBusy">
            {{ profileBusy ? t('admin.saving') : t('admin.savePassword') }}
          </button>
          <p v-if="passwordOk" class="ok">{{ passwordOk }}</p>
          <p v-if="passwordError" class="error">{{ passwordError }}</p>
        </form>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  createPost,
  deletePost,
  fetchAllPosts,
  fetchMyStats,
  getStoredUser,
  logout,
  me,
  setStoredUser,
  updatePost,
  updateProfile,
  uploadAttachment,
  uploadAvatar,
} from '../api'
import { useLocale } from '../composables/useLocale.js'
import RichTextEditor from '../components/RichTextEditor.vue'
import { compressImageFile } from '../utils/avatar.js'
import { isHtmlContent, markdownToHtml, renderPostContent } from '../utils/contentFormat.js'
import { isMarkdownFile, parseMarkdownDocument } from '../utils/markdownUpload.js'
import { renderMermaidBlocks } from '../utils/mermaidBlocks.js'

const { t } = useLocale()

const user = ref(getStoredUser())
const studioTab = ref('compose')
const posts = ref([])
const loading = ref(false)
const listError = ref('')
const saving = ref(false)
const formError = ref('')
const formOk = ref('')
const editingId = ref('')
const contentMode = ref('rich')
/** Markdown 工作区：edit | split | preview */
const mdPane = ref('edit')
const mdInputRef = ref(null)
const attachInputRef = ref(null)
const attachments = ref([])
const attachBusy = ref(false)
const attachError = ref('')
const mdImportOk = ref('')
const mdImportError = ref('')
const statsLoading = ref(false)
const statsError = ref('')
const stats = reactive({
  postCount: 0,
  viewCount: 0,
  clickCount: 0,
  likeCount: 0,
  favoriteCount: 0,
  commentCount: 0,
  heat: 0,
})

const profileBusy = ref(false)
const avatarBusy = ref(false)
const avatarOk = ref('')
const avatarError = ref('')
const usernameOk = ref('')
const usernameError = ref('')
const passwordOk = ref('')
const passwordError = ref('')
const profileForm = reactive({
  username: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  published: true,
  visibility: 'public',
})

const previewHtml = computed(() => {
  if (contentMode.value !== 'markdown') return ''
  return renderPostContent(form.content)
})

const mdPreviewEl = ref(null)

watch(
  [previewHtml, mdPane],
  async () => {
    if (contentMode.value !== 'markdown' || mdPane.value === 'edit') return
    await nextTick()
    await nextTick()
    await renderMermaidBlocks(mdPreviewEl.value)
  },
  { flush: 'post' },
)

function applyUser(nextUser) {
  user.value = nextUser
  setStoredUser(nextUser)
  if (nextUser?.username) profileForm.username = nextUser.username
}

async function loadStats() {
  if (!user.value) return
  statsLoading.value = true
  statsError.value = ''
  try {
    const data = await fetchMyStats()
    stats.postCount = data.postCount || 0
    stats.viewCount = data.viewCount || 0
    stats.clickCount = data.clickCount || 0
    stats.likeCount = data.likeCount || 0
    stats.favoriteCount = data.favoriteCount || 0
    stats.commentCount = data.commentCount || 0
    stats.heat = data.heat || 0
  } catch (err) {
    statsError.value = err.message || t('admin.loadFailed')
  } finally {
    statsLoading.value = false
  }
}

function openLibrary() {
  studioTab.value = 'library'
  loadPosts()
}

function openStats() {
  studioTab.value = 'stats'
  loadStats()
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsText(file, 'UTF-8')
  })
}

function contentForEditor(raw) {
  const text = String(raw || '')
  if (!text.trim()) return ''
  if (isHtmlContent(text)) return text
  return markdownToHtml(text)
}

function switchContentMode(mode) {
  if (mode === contentMode.value) return
  if (mode === 'rich' && !isHtmlContent(form.content)) {
    form.content = markdownToHtml(form.content)
  }
  contentMode.value = mode
  if (mode === 'markdown') mdPane.value = 'edit'
}

async function importMarkdownFile(file) {
  mdImportOk.value = ''
  mdImportError.value = ''
  if (!file) return
  if (!isMarkdownFile(file)) {
    mdImportError.value = t('admin.uploadMdInvalid')
    return
  }
  if (form.content.trim() && !confirm(t('admin.uploadMdReplace'))) {
    return
  }
  try {
    const raw = await readFileAsText(file)
    const parsed = parseMarkdownDocument(raw, file.name)
    // 上传 Markdown 后进入 Markdown 模式并打开预览
    contentMode.value = 'markdown'
    form.content = parsed.content
    mdPane.value = 'split'
    if (!form.title.trim() && parsed.title) form.title = parsed.title
    if (!form.slug.trim() && parsed.slug) form.slug = parsed.slug
    if (!form.excerpt.trim() && parsed.excerpt) form.excerpt = parsed.excerpt
    mdImportOk.value = t('admin.uploadMdOk', { name: file.name })
    formOk.value = ''
    formError.value = ''
  } catch {
    mdImportError.value = t('admin.uploadMdFailed')
  }
}

async function onMarkdownFile(event) {
  const input = event.target
  const file = input?.files?.[0]
  await importMarkdownFile(file)
  if (input) input.value = ''
}

async function onMarkdownDrop(event) {
  if (!user.value) return
  const file = event.dataTransfer?.files?.[0]
  await importMarkdownFile(file)
}

async function onAvatarFile(event) {
  const input = event.target
  const file = input?.files?.[0]
  avatarOk.value = ''
  avatarError.value = ''
  if (!file) return
  avatarBusy.value = true
  try {
    const compressed = await compressImageFile(file)
    const data = await uploadAvatar(compressed)
    applyUser(data.user)
    avatarOk.value = t('admin.avatarOk')
  } catch (err) {
    avatarError.value = err.message || t('admin.avatarFailed')
  } finally {
    avatarBusy.value = false
    if (input) input.value = ''
  }
}

async function saveUsername() {
  usernameOk.value = ''
  usernameError.value = ''
  const next = profileForm.username.trim()
  if (!next || next === user.value?.username) {
    usernameError.value = t('admin.usernameUnchanged')
    return
  }
  profileBusy.value = true
  try {
    const data = await updateProfile({ username: next })
    applyUser(data.user)
    usernameOk.value = t('admin.usernameOk')
  } catch (err) {
    usernameError.value = err.message || t('admin.saveFailed')
  } finally {
    profileBusy.value = false
  }
}

async function savePassword() {
  passwordOk.value = ''
  passwordError.value = ''
  if (profileForm.newPassword !== profileForm.confirmPassword) {
    passwordError.value = t('admin.passwordMismatch')
    return
  }
  profileBusy.value = true
  try {
    const data = await updateProfile({
      currentPassword: profileForm.currentPassword,
      newPassword: profileForm.newPassword,
    })
    applyUser(data.user)
    profileForm.currentPassword = ''
    profileForm.newPassword = ''
    profileForm.confirmPassword = ''
    passwordOk.value = t('admin.passwordOk')
  } catch (err) {
    passwordError.value = err.message || t('admin.saveFailed')
  } finally {
    profileBusy.value = false
  }
}

async function doLogout() {
  try {
    await logout()
  } catch {
    /* ignore */
  }
  applyUser(null)
  window.dispatchEvent(new CustomEvent('mohhen-auth-change'))
  posts.value = []
  studioTab.value = 'compose'
  stats.postCount = 0
  stats.viewCount = 0
  stats.clickCount = 0
  stats.likeCount = 0
  stats.favoriteCount = 0
  stats.commentCount = 0
  stats.heat = 0
  resetForm()
}

function visibilityLabel(visibility) {
  if (visibility === 'friends') return t('admin.visibilityFriendsShort')
  if (visibility === 'private') return t('admin.visibilityPrivateShort')
  return t('admin.visibilityPublicShort')
}

function formatFileSize(n) {
  const size = Number(n || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function removeAttachment(index) {
  attachments.value = attachments.value.filter((_, i) => i !== index)
}

async function onAttachmentFiles(event) {
  const input = event.target
  const files = [...(input?.files || [])]
  attachError.value = ''
  if (!files.length) return
  const room = Math.max(0, 20 - attachments.value.length)
  if (!room) {
    attachError.value = t('admin.attachmentsLimit')
    if (input) input.value = ''
    return
  }
  attachBusy.value = true
  try {
    for (const file of files.slice(0, room)) {
      const data = await uploadAttachment(file)
      attachments.value.push({
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        key: data.key,
        url: data.url,
        name: data.filename || file.name,
        mime: data.mime || file.type || 'application/octet-stream',
        size: data.size || file.size || 0,
      })
    }
  } catch (err) {
    attachError.value = err.message || t('admin.attachmentsFailed')
  } finally {
    attachBusy.value = false
    if (input) input.value = ''
  }
}

function resetForm() {
  editingId.value = ''
  contentMode.value = 'rich'
  mdPane.value = 'edit'
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.content = ''
  form.published = true
  form.visibility = 'public'
  attachments.value = []
  attachError.value = ''
  formError.value = ''
  formOk.value = ''
  mdImportOk.value = ''
  mdImportError.value = ''
  if (mdInputRef.value) mdInputRef.value.value = ''
  if (attachInputRef.value) attachInputRef.value.value = ''
}

function editPost(post) {
  editingId.value = post.id
  contentMode.value = isHtmlContent(post.content) ? 'rich' : 'markdown'
  mdPane.value = contentMode.value === 'markdown' ? 'split' : 'edit'
  form.title = post.title
  form.slug = post.slug
  form.excerpt = post.excerpt
  form.content =
    contentMode.value === 'rich' ? contentForEditor(post.content) : post.content
  form.published = post.published
  form.visibility = post.visibility || 'public'
  attachments.value = (post.attachments || []).map((a) => ({
    id: a.id,
    key: a.key,
    url: a.url,
    name: a.name,
    mime: a.mime,
    size: a.size,
  }))
  attachError.value = ''
  formOk.value = ''
  formError.value = ''
  studioTab.value = 'compose'
}

async function loadPosts() {
  if (!user.value) return
  loading.value = true
  listError.value = ''
  try {
    posts.value = await fetchAllPosts()
  } catch (err) {
    listError.value = err.message || t('admin.loadFailed')
    if (String(err.message || '').includes('Unauthorized')) await doLogout()
  } finally {
    loading.value = false
  }
}

async function submitPost() {
  if (!user.value) {
    formError.value = t('admin.pleaseLoginShort')
    return
  }
  saving.value = true
  formError.value = ''
  formOk.value = ''
  try {
    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      published: form.published,
      visibility: form.visibility || 'public',
      attachments: attachments.value.map((a) => ({
        id: a.id,
        key: a.key,
        url: a.url,
        name: a.name,
        mime: a.mime,
        size: a.size,
      })),
    }
    if (editingId.value) {
      await updatePost(editingId.value, payload)
      formOk.value = t('admin.updated')
    } else {
      await createPost(payload)
      formOk.value = t('admin.created')
    }
    resetForm()
    await loadPosts()
    studioTab.value = 'library'
  } catch (err) {
    formError.value = err.message || t('admin.saveFailed')
  } finally {
    saving.value = false
  }
}

async function removePost(post) {
  if (!user.value) return
  if (!confirm(t('admin.deleteConfirm', { title: post.title }))) return
  try {
    await deletePost(post.id)
    if (editingId.value === post.id) resetForm()
    await loadPosts()
  } catch (err) {
    listError.value = err.message || t('admin.deleteFailed')
  }
}

async function restoreSession() {
  try {
    const data = await me()
    applyUser(data.user)
    await Promise.all([loadPosts(), loadStats()])
  } catch {
    applyUser(null)
  }
}

onMounted(restoreSession)
</script>

<style scoped>
.studio-hero {
  margin-bottom: 1.25rem;
}

.studio-gate {
  display: grid;
  gap: 0.85rem;
  max-width: 28rem;
}

.studio-gate p {
  margin: 0;
}

.studio-gate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.studio-who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.85rem;
  font-size: 0.9rem;
}

.studio-who a {
  color: var(--accent);
  text-decoration: none;
}

.studio-who strong {
  color: var(--ink);
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field input {
  padding-right: 2.7rem;
}

.password-toggle {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  padding: 0;
}

.password-toggle:hover {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.password-toggle svg {
  width: 1.15rem;
  height: 1.15rem;
  display: block;
}

.account-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.account-main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.account-avatar {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
  flex-shrink: 0;
  overflow: hidden;
}

.account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-name {
  margin: 0 0 0.15rem;
}

.profile-link {
  font-size: 0.9rem;
  color: var(--accent);
  text-decoration: none;
  margin-right: 0.85rem;
}

.studio-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.studio-tabs button {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.4rem 0.95rem;
  font-size: 0.9rem;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.studio-tabs button:hover,
.studio-tabs button.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.composer-head h2 {
  margin: 0;
}

.composer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
}

.composer-grid .field {
  display: grid;
  gap: 0.35rem;
}

.composer-grid .field.full {
  grid-column: 1 / -1;
}

.content-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin-bottom: 0.45rem;
}

.content-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.content-mode {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--panel) 88%, #000);
}

.content-mode button {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.28rem 0.75rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.content-mode button.active {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.md-workspace {
  display: grid;
  gap: 0.65rem;
  min-height: 360px;
}

.md-workspace.is-split {
  grid-template-columns: 1fr 1fr;
}

.md-workspace textarea {
  min-height: 360px;
  resize: vertical;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  padding: 0.75rem 0.9rem;
  font: inherit;
  line-height: 1.5;
}

.md-workspace textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}

.md-preview {
  min-height: 360px;
  max-height: min(70vh, 720px);
  overflow: auto;
  padding: 0.85rem 1rem 1rem;
  background: color-mix(in srgb, var(--surface) 92%, var(--accent) 3%);
}

.md-preview-label {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.md-preview-head {
  margin-bottom: 0.85rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
}

.md-preview-head h3 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
}

.md-preview-head p {
  margin: 0;
}

.md-preview-empty {
  margin: 2rem 0;
  text-align: center;
}

.content-field textarea {
  min-height: 360px;
  resize: vertical;
}

@media (max-width: 860px) {
  .md-workspace.is-split {
    grid-template-columns: 1fr;
  }
}

.composer-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.composer-opts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
}

.vis-field {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.92rem;
  color: var(--muted);
}

.vis-field select {
  min-width: 7.5rem;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 88%, #000);
  color: var(--text);
}

.upload-note {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
}

.attach-panel {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 92%, var(--accent) 3%);
}

.attach-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.attach-head strong {
  display: block;
  margin-bottom: 0.15rem;
}

.attach-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.attach-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0 0;
  border-top: 1px solid var(--line);
  min-width: 0;
}

.attach-meta {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.attach-meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-empty {
  margin: 0.65rem 0 0;
  font-size: 0.9rem;
}

.md-upload.busy {
  opacity: 0.7;
  pointer-events: none;
}

.md-upload {
  position: relative;
  overflow: hidden;
  padding: 0.4rem 0.85rem;
  font-size: 0.88rem;
  margin: 0;
}

.md-upload input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 0.75rem 0.8rem;
  background: var(--stat-bg, color-mix(in srgb, var(--accent) 6%, transparent));
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  color: var(--muted);
  font-size: 0.85rem;
}

.settings-lede {
  margin-top: -0.35rem;
}

.settings-block {
  display: grid;
  gap: 0.55rem;
  padding: 1rem 0;
  border-top: 1px dashed var(--line);
}

.settings-block:first-of-type {
  border-top: none;
}

.settings-block h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.settings-block .btn {
  justify-self: start;
  margin-top: 0.25rem;
}

.avatar-editor {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.avatar-preview {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--stat-bg);
  color: var(--accent);
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 720px) {
  .composer-grid {
    grid-template-columns: 1fr;
  }

  .account-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
