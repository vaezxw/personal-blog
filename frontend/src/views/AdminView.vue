<template>
  <section class="studio">
    <header class="studio-hero">
      <p class="eyebrow">{{ t('admin.eyebrow') }}</p>
      <h1>{{ t('admin.title') }}</h1>
      <p class="lede">{{ t('admin.lede') }}</p>
    </header>

    <div v-if="!user" class="panel auth-panel">
      <div class="row tabs">
        <button
          type="button"
          class="btn"
          :class="{ ghost: mode !== 'login' }"
          @click="switchMode('login')"
        >
          {{ t('admin.login') }}
        </button>
        <button
          type="button"
          class="btn"
          :class="{ ghost: mode !== 'register' }"
          @click="switchMode('register')"
        >
          {{ t('admin.register') }}
        </button>
      </div>

      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="doLogin">
        <label>{{ t('admin.loginOrUser') }}</label>
        <input
          v-model="auth.login"
          required
          autocomplete="username"
          :placeholder="t('admin.loginPlaceholder')"
        />
        <label>{{ t('admin.password') }}</label>
        <div class="password-field">
          <input
            v-model="auth.password"
            :type="showLoginPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            :placeholder="t('admin.passwordPlaceholder')"
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="showLoginPassword ? t('admin.hidePassword') : t('admin.showPassword')"
            :title="showLoginPassword ? t('admin.hidePassword') : t('admin.showPassword')"
            @click="showLoginPassword = !showLoginPassword"
          >
            <svg v-if="!showLoginPassword" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
              />
              <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3l18 18M10.6 10.6A2.8 2.8 0 0 0 13.4 13.4M7.1 7.3C5 8.6 3.4 10.6 2.5 12c0 0 3.5 6.5 9.5 6.5 1.7 0 3.2-.4 4.5-1M16.9 16.7C19 15.4 20.6 13.4 21.5 12c0 0-3.5-6.5-9.5-6.5-1.2 0-2.3.2-3.3.6"
              />
            </svg>
          </button>
        </div>
        <button class="btn" type="submit" :disabled="authBusy">
          {{ authBusy ? t('admin.loggingIn') : t('admin.login') }}
        </button>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>

      <form v-else class="auth-form" @submit.prevent="doRegister">
        <label>{{ t('admin.email') }} <span class="muted">{{ t('admin.emailOptional') }}</span></label>
        <input
          v-model="auth.email"
          type="email"
          autocomplete="email"
          :placeholder="t('admin.emailPlaceholder')"
        />
        <label>{{ t('admin.username') }}</label>
        <input
          v-model="auth.username"
          required
          autocomplete="username"
          :placeholder="t('admin.usernamePlaceholder')"
        />
        <label>{{ t('admin.password') }}</label>
        <div class="password-field">
          <input
            v-model="auth.password"
            :type="showRegisterPassword ? 'text' : 'password'"
            required
            autocomplete="new-password"
            :placeholder="t('admin.passwordPlaceholder')"
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="showRegisterPassword ? t('admin.hidePassword') : t('admin.showPassword')"
            :title="showRegisterPassword ? t('admin.hidePassword') : t('admin.showPassword')"
            @click="showRegisterPassword = !showRegisterPassword"
          >
            <svg v-if="!showRegisterPassword" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
              />
              <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3l18 18M10.6 10.6A2.8 2.8 0 0 0 13.4 13.4M7.1 7.3C5 8.6 3.4 10.6 2.5 12c0 0 3.5 6.5 9.5 6.5 1.7 0 3.2-.4 4.5-1M16.9 16.7C19 15.4 20.6 13.4 21.5 12c0 0-3.5-6.5-9.5-6.5-1.2 0-2.3.2-3.3.6"
              />
            </svg>
          </button>
        </div>
        <button class="btn" type="submit" :disabled="authBusy">
          {{ authBusy ? t('admin.registering') : t('admin.register') }}
        </button>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>
    </div>

    <template v-else>
      <div class="panel account-bar">
        <div class="account-main">
          <div class="account-avatar" aria-hidden="true">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
            <template v-else>{{ user.username.slice(0, 1).toUpperCase() }}</template>
          </div>
          <div>
            <p class="ok account-name">
              {{ t('admin.loggedInAs') }}<strong>{{ user.username }}</strong>
              <span class="muted">
                （{{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleAuthor') }}）
              </span>
            </p>
            <RouterLink class="profile-link" :to="{ name: 'user', params: { username: user.username } }">
              {{ t('admin.profile') }} →
            </RouterLink>
            <RouterLink
              class="profile-link"
              :to="{ name: 'user-dashboard', params: { username: user.username } }"
            >
              {{ t('dash.open') }} →
            </RouterLink>
          </div>
        </div>
        <button class="btn ghost" type="button" @click="doLogout">{{ t('admin.logout') }}</button>
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
            </div>
            <RichTextEditor
              v-if="contentMode === 'rich'"
              v-model="form.content"
              :placeholder="t('admin.contentPlaceholder')"
            />
            <textarea
              v-else
              v-model="form.content"
              rows="14"
              :placeholder="t('admin.markdownPlaceholder')"
            ></textarea>
          </div>
        </div>

        <p class="muted upload-note">{{ t('admin.uploadMdHint') }}</p>
        <p class="muted upload-note">{{ t('admin.uploadNote') }}</p>
        <p v-if="mdImportOk" class="ok">{{ mdImportOk }}</p>
        <p v-if="mdImportError" class="error">{{ mdImportError }}</p>

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
import { onMounted, reactive, ref } from 'vue'
import {
  createPost,
  deletePost,
  fetchAllPosts,
  fetchMyStats,
  getStoredUser,
  login,
  logout,
  me,
  register,
  setStoredUser,
  updatePost,
  updateProfile,
  uploadAvatar,
} from '../api'
import { useLocale } from '../composables/useLocale.js'
import RichTextEditor from '../components/RichTextEditor.vue'
import { compressImageFile } from '../utils/avatar.js'
import { isHtmlContent, markdownToHtml } from '../utils/contentFormat.js'
import { isMarkdownFile, parseMarkdownDocument } from '../utils/markdownUpload.js'

const { t } = useLocale()

const user = ref(getStoredUser())
const mode = ref('login')
const studioTab = ref('compose')
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const authBusy = ref(false)
const authError = ref('')
const posts = ref([])
const loading = ref(false)
const listError = ref('')
const saving = ref(false)
const formError = ref('')
const formOk = ref('')
const editingId = ref('')
const contentMode = ref('rich')
const mdInputRef = ref(null)
const mdImportOk = ref('')
const mdImportError = ref('')
const statsLoading = ref(false)
const statsError = ref('')
const stats = reactive({
  postCount: 0,
  viewCount: 0,
  clickCount: 0,
  likeCount: 0,
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

const auth = reactive({
  login: '',
  email: '',
  username: '',
  password: '',
})

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  published: true,
  visibility: 'public',
})

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

function switchMode(next) {
  mode.value = next
  authError.value = ''
  showLoginPassword.value = false
  showRegisterPassword.value = false
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
    form.content =
      contentMode.value === 'rich' ? markdownToHtml(parsed.content) : parsed.content
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
  posts.value = []
  studioTab.value = 'compose'
  stats.postCount = 0
  stats.viewCount = 0
  stats.clickCount = 0
  stats.likeCount = 0
  stats.commentCount = 0
  stats.heat = 0
  resetForm()
}

async function doLogin() {
  authBusy.value = true
  authError.value = ''
  try {
    const data = await login({
      email: auth.login,
      password: auth.password,
    })
    applyUser(data.user)
    auth.password = ''
    studioTab.value = 'compose'
    await Promise.all([loadPosts(), loadStats()])
  } catch (err) {
    authError.value = err.message || t('admin.loginFailed')
  } finally {
    authBusy.value = false
  }
}

async function doRegister() {
  authBusy.value = true
  authError.value = ''
  try {
    const data = await register({
      email: auth.email,
      username: auth.username,
      password: auth.password,
    })
    applyUser(data.user)
    auth.password = ''
    studioTab.value = 'compose'
    await Promise.all([loadPosts(), loadStats()])
  } catch (err) {
    authError.value = err.message || t('admin.registerFailed')
  } finally {
    authBusy.value = false
  }
}

function visibilityLabel(visibility) {
  if (visibility === 'friends') return t('admin.visibilityFriendsShort')
  if (visibility === 'private') return t('admin.visibilityPrivateShort')
  return t('admin.visibilityPublicShort')
}

function resetForm() {
  editingId.value = ''
  contentMode.value = 'rich'
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.content = ''
  form.published = true
  form.visibility = 'public'
  formError.value = ''
  formOk.value = ''
  mdImportOk.value = ''
  mdImportError.value = ''
  if (mdInputRef.value) mdInputRef.value.value = ''
}

function editPost(post) {
  editingId.value = post.id
  contentMode.value = isHtmlContent(post.content) ? 'rich' : 'markdown'
  form.title = post.title
  form.slug = post.slug
  form.excerpt = post.excerpt
  form.content =
    contentMode.value === 'rich' ? contentForEditor(post.content) : post.content
  form.published = post.published
  form.visibility = post.visibility || 'public'
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

.auth-panel {
  max-width: 28rem;
}

.tabs {
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.auth-form {
  display: grid;
  gap: 0.55rem;
}

.auth-form .btn {
  margin-top: 0.4rem;
  justify-self: start;
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
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

.content-field textarea {
  min-height: 360px;
  resize: vertical;
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
