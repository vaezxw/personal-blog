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
        <RouterLink class="btn" :to="{ name: 'me', query: { next: adminReturnPath } }">
          {{ t('admin.login') }}
        </RouterLink>
        <RouterLink
          class="btn ghost"
          :to="{ name: 'me', query: { tab: 'register', next: adminReturnPath } }"
        >
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
          v-if="canPublish"
          type="button"
          :class="{ active: studioTab === 'compose' }"
          @click="studioTab = 'compose'"
        >
          {{ t('admin.tabCompose') }}
        </button>
        <button
          v-if="canPublish"
          type="button"
          :class="{ active: studioTab === 'library' }"
          @click="openLibrary"
        >
          {{ t('admin.tabLibrary') }}
        </button>
        <button
          v-if="canPublish"
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
        <button
          v-if="isAdminUser"
          type="button"
          :class="{ active: studioTab === 'users' }"
          @click="openUsers"
        >
          {{ t('admin.tabUsers') }}
        </button>
      </nav>

      <div v-if="!canPublish && !isAdminUser && studioTab !== 'settings'" class="panel studio-gate">
        <h2>{{ t('perm.deniedTitle') }}</h2>
        <p class="muted">{{ t('perm.postsDenied') }}</p>
        <button type="button" class="btn ghost" @click="studioTab = 'settings'">
          {{ t('admin.tabSettings') }}
        </button>
      </div>

      <form
        v-if="canPublish"
        v-show="studioTab === 'compose'"
        class="panel composer"
        @submit.prevent="submitPost"
      >
        <div class="composer-head">
          <h2>
            {{
              editingId
                ? t('admin.editPost')
                : form.repostOfSlug
                  ? t('admin.repostCompose')
                  : t('admin.newPost')
            }}
          </h2>
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

        <div v-if="repostSource" class="repost-compose-card">
          <div class="repost-compose-head">
            <span class="repost-label">{{ t('admin.repostAttached') }}</span>
            <button
              v-if="!editingId"
              class="btn ghost"
              type="button"
              @click="clearRepostSource"
            >
              {{ t('admin.repostClear') }}
            </button>
          </div>
          <RouterLink
            class="repost-card"
            :to="{ name: 'post', params: { slug: repostSource.slug } }"
            target="_blank"
          >
            <strong>{{ repostSource.title }}</strong>
            <span class="muted">
              @{{ repostSource.authorUsername }}
              <template v-if="repostSource.excerpt"> · {{ repostSource.excerpt }}</template>
            </span>
          </RouterLink>
          <p class="muted upload-note">{{ t('admin.repostComposeHint') }}</p>
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

      <div v-if="canPublish" v-show="studioTab === 'library'" class="panel">
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

      <div v-if="canPublish" v-show="studioTab === 'stats'" class="panel stats-panel">
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
            <span class="stat-value mono">{{ stats.dislikeCount || 0 }}</span>
            <span class="stat-label">{{ t('admin.statsDislikes') }}</span>
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

      <div v-show="studioTab === 'users' && isAdminUser" class="panel users-panel">
        <div class="users-head">
          <div>
            <h2>{{ t('admin.tabUsers') }}</h2>
            <p class="muted">{{ t('admin.usersLede') }}</p>
          </div>
          <button type="button" class="btn ghost users-refresh" :disabled="usersLoading" @click="loadUsers">
            {{ t('admin.refresh') }}
          </button>
        </div>
        <p v-if="usersLoading" class="muted users-status">{{ t('home.loading') }}</p>
        <p v-else-if="usersError" class="error users-status">{{ usersError }}</p>
        <div v-else class="users-scroll">
          <div class="users-list" role="list">
            <article
              v-for="row in adminUsers"
              :key="row.id"
              class="user-row"
              :class="{ muted: row.muted, dirty: userRowDirty(row) }"
              role="listitem"
            >
              <div class="user-identity">
                <strong>@{{ row.username }}</strong>
                <span v-if="row.email" class="muted users-email" :title="row.email">{{ row.email }}</span>
                <div class="user-badges">
                  <span v-if="row.muted" class="user-badge warn">{{ t('admin.usersMuted') }}</span>
                  <span v-if="row.draftRole === 'admin'" class="user-badge">{{ t('admin.roleAdmin') }}</span>
                </div>
              </div>

              <label class="user-field">
                <span class="sr-only">{{ t('admin.usersRole') }}</span>
                <div class="select-wrap">
                  <select
                    v-model="row.draftRole"
                    :disabled="row.id === user.id || row.saving || row.acting"
                    :aria-label="t('admin.usersRole')"
                  >
                    <option value="author">{{ t('admin.roleAuthor') }}</option>
                    <option value="admin">{{ t('admin.roleAdmin') }}</option>
                  </select>
                </div>
              </label>

              <div class="user-perms" :aria-label="t('admin.usersPerms')">
                <label
                  v-for="key in PERMISSION_KEYS"
                  :key="key"
                  class="perm-chip"
                  :class="{ on: row.draftPerms[key] || row.draftRole === 'admin', locked: row.draftRole === 'admin' }"
                >
                  <input
                    type="checkbox"
                    v-model="row.draftPerms[key]"
                    :disabled="row.draftRole === 'admin' || row.saving || row.acting"
                  />
                  <span>{{ permLabel(key) }}</span>
                </label>
              </div>

              <div class="user-actions" :aria-label="t('admin.usersActions')">
                <button
                  type="button"
                  class="btn ghost sm"
                  :disabled="row.saving || row.acting || !userRowDirty(row)"
                  @click="saveUserRow(row)"
                >
                  {{ row.saving ? t('admin.saving') : t('admin.usersSave') }}
                </button>
                <button
                  type="button"
                  class="btn ghost sm"
                  :disabled="row.acting || row.saving || row.id === user.id || row.role === 'admin'"
                  @click="toggleMuteUser(row)"
                >
                  {{ row.muted ? t('admin.usersUnmute') : t('admin.usersMute') }}
                </button>
                <button
                  type="button"
                  class="btn danger ghost sm"
                  :disabled="row.acting || row.saving || row.id === user.id"
                  @click="removeUser(row)"
                >
                  {{ t('admin.usersDelete') }}
                </button>
              </div>

              <p v-if="row.ok" class="ok users-row-msg">{{ row.ok }}</p>
              <p v-if="row.error" class="error users-row-msg">{{ row.error }}</p>
            </article>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createPost,
  deleteAdminUser,
  deletePost,
  fetchAdminUsers,
  fetchAllPosts,
  fetchMyStats,
  fetchPostCached,
  getStoredUser,
  logout,
  meCached,
  peekPostCache,
  setStoredUser,
  takeRepostSourceStash,
  updateAdminUser,
  updatePost,
  warmPostCache,
  updateProfile,
  uploadAttachment,
  uploadAvatar,
} from '../api'
import { useLocale } from '../composables/useLocale.js'
import { assertNotMuted } from '../composables/useMuteNotice.js'
import RichTextEditor from '../components/RichTextEditor.vue'
import { compressImageFile } from '../utils/avatar.js'
import { isHtmlContent, markdownToHtml, renderPostContent } from '../utils/contentFormat.js'
import { isMarkdownFile, parseMarkdownDocument } from '../utils/markdownUpload.js'
import { renderMermaidBlocks } from '../utils/mermaidBlocks.js'
import { hasPermission, isAdmin, normalizePermissions, PERMISSION_KEYS } from '../utils/permissions.js'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const user = ref(getStoredUser())
const isAdminUser = computed(() => isAdmin(user.value))
const canPublish = computed(() => hasPermission(user.value, 'posts.publish'))
const studioTab = ref(canPublish.value ? 'compose' : 'settings')
const posts = ref([])
const loading = ref(false)
const listError = ref('')
const saving = ref(false)
const formError = ref('')
const formOk = ref('')
const editingId = ref('')
const adminUsers = ref([])
const usersLoading = ref(false)
const usersError = ref('')
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
  dislikeCount: 0,
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
  repostOfSlug: '',
})

/** Attached source post for republish (card preview). */
const repostSource = ref(null)

const adminReturnPath = computed(() => {
  const slug = String(route.query.repost || '').trim()
  return slug ? `/admin?repost=${slug}` : '/admin'
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
    stats.dislikeCount = data.dislikeCount || 0
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

function mapAdminUserRow(u) {
  const perms = normalizePermissions(u.permissions)
  return {
    ...u,
    muted: Boolean(u.muted),
    draftRole: u.role,
    draftPerms: { ...perms },
    baselineRole: u.role,
    baselinePerms: { ...perms },
    saving: false,
    acting: false,
    ok: '',
    error: '',
  }
}

function permLabel(key) {
  const map = {
    'posts.publish': 'admin.chipPublish',
    'ai.chat': 'admin.chipAi',
    'tools.use': 'admin.chipTools',
    'dashboard.view': 'admin.chipDash',
  }
  return t(map[key] || key)
}

function userRowDirty(row) {
  if (row.draftRole !== row.baselineRole) return true
  return PERMISSION_KEYS.some((key) => Boolean(row.draftPerms[key]) !== Boolean(row.baselinePerms[key]))
}

async function loadUsers() {
  if (!isAdminUser.value) return
  usersLoading.value = true
  usersError.value = ''
  try {
    const data = await fetchAdminUsers()
    adminUsers.value = (data.users || []).map(mapAdminUserRow)
  } catch (err) {
    usersError.value = err.message || t('admin.loadFailed')
  } finally {
    usersLoading.value = false
  }
}

function openUsers() {
  studioTab.value = 'users'
  loadUsers()
}

async function saveUserRow(row) {
  row.saving = true
  row.ok = ''
  row.error = ''
  try {
    const body = {
      role: row.draftRole,
      permissions: row.draftRole === 'admin' ? {} : { ...row.draftPerms },
    }
    const data = await updateAdminUser(row.id, body)
    const next = mapAdminUserRow(data.user)
    const idx = adminUsers.value.findIndex((u) => u.id === row.id)
    if (idx >= 0) {
      next.ok = t('admin.usersSaved')
      adminUsers.value[idx] = next
    }
    if (row.id === user.value?.id && data.user) {
      applyUser({ ...user.value, ...data.user })
    }
  } catch (err) {
    row.error = err.message || t('admin.saveFailed')
  } finally {
    row.saving = false
  }
}

async function toggleMuteUser(row) {
  row.acting = true
  row.ok = ''
  row.error = ''
  try {
    const muted = !row.muted
    const data = await updateAdminUser(row.id, { muted })
    const next = mapAdminUserRow(data.user)
    const idx = adminUsers.value.findIndex((u) => u.id === row.id)
    if (idx >= 0) {
      next.ok = muted ? t('admin.usersMuteOk') : t('admin.usersUnmuteOk')
      adminUsers.value[idx] = next
    }
  } catch (err) {
    row.error = err.message || t('admin.saveFailed')
  } finally {
    row.acting = false
  }
}

async function removeUser(row) {
  const ok = window.confirm(t('admin.usersDeleteConfirm', { user: row.username }))
  if (!ok) return
  row.acting = true
  row.ok = ''
  row.error = ''
  try {
    await deleteAdminUser(row.id)
    adminUsers.value = adminUsers.value.filter((u) => u.id !== row.id)
  } catch (err) {
    row.error = err.message || t('admin.saveFailed')
    row.acting = false
  }
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
  stats.dislikeCount = 0
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
  form.repostOfSlug = ''
  repostSource.value = null
  attachments.value = []
  attachError.value = ''
  formError.value = ''
  formOk.value = ''
  mdImportOk.value = ''
  mdImportError.value = ''
  if (mdInputRef.value) mdInputRef.value.value = ''
  if (attachInputRef.value) attachInputRef.value.value = ''
}

function clearRepostSource() {
  form.repostOfSlug = ''
  repostSource.value = null
}

function slugifyHint(title) {
  const raw = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return raw.slice(0, 48) || 'repost'
}

async function applyRepostFromRoute() {
  const slug = String(route.query.repost || '').trim()
  if (!slug || !user.value) return

  studioTab.value = 'compose'
  editingId.value = ''
  contentMode.value = 'rich'
  mdPane.value = 'edit'
  form.title = ''
  form.excerpt = ''
  form.content = ''
  form.published = true
  form.visibility = 'public'
  form.repostOfSlug = slug
  attachments.value = []
  formError.value = ''
  formOk.value = ''
  mdImportOk.value = ''
  mdImportError.value = ''

  // Instant card from stash / warm cache, then confirm with network if needed
  const stash = takeRepostSourceStash(slug)
  const cached = peekPostCache(slug)
  const seed = stash || (cached
    ? {
        slug: cached.slug,
        title: cached.title,
        excerpt: cached.excerpt || '',
        authorUsername: cached.authorUsername || '',
        authorId: cached.authorId || '',
      }
    : null)

  if (seed) {
    if (
      (seed.authorId && seed.authorId === user.value.id) ||
      (seed.authorUsername && seed.authorUsername === user.value.username)
    ) {
      form.repostOfSlug = ''
      repostSource.value = null
      formError.value = t('admin.repostOwnDenied')
      clearRepostQuery()
      return
    }
    repostSource.value = {
      slug: seed.slug,
      title: seed.title,
      excerpt: seed.excerpt || '',
      authorUsername: seed.authorUsername || '',
    }
    form.slug = `r-${slugifyHint(seed.slug || seed.title)}-${Date.now().toString(36).slice(-4)}`
  }

  try {
    const source = await fetchPostCached(slug)
    if (!source?.published || source.visibility === 'private') {
      form.repostOfSlug = ''
      repostSource.value = null
      formError.value = t('admin.repostUnavailable')
      return
    }
    if (
      (source.authorId && source.authorId === user.value.id) ||
      (source.authorUsername && source.authorUsername === user.value.username)
    ) {
      form.repostOfSlug = ''
      repostSource.value = null
      formError.value = t('admin.repostOwnDenied')
      return
    }
    repostSource.value = {
      slug: source.slug,
      title: source.title,
      excerpt: source.excerpt || '',
      authorUsername: source.authorUsername || '',
    }
    if (!form.slug) {
      form.slug = `r-${slugifyHint(source.slug || source.title)}-${Date.now().toString(36).slice(-4)}`
    }
  } catch (err) {
    if (!repostSource.value) {
      form.repostOfSlug = ''
      formError.value = err.message || t('admin.repostUnavailable')
    }
  } finally {
    clearRepostQuery()
  }
}

function clearRepostQuery() {
  if (route.query.repost) {
    const q = { ...route.query }
    delete q.repost
    router.replace({ name: 'admin', query: q })
  }
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
  form.repostOfSlug = post.repostOf?.slug || ''
  repostSource.value = post.repostOf
    ? {
        slug: post.repostOf.slug,
        title: post.repostOf.title,
        excerpt: post.repostOf.excerpt || '',
        authorUsername: post.repostOf.authorUsername || '',
      }
    : null
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

async function submitPost() {
  if (!user.value) {
    formError.value = t('admin.pleaseLoginShort')
    return
  }
  if (!assertNotMuted(user.value)) return
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
      repostOfSlug: form.repostOfSlug || '',
      attachments: attachments.value.map((a) => ({
        id: a.id,
        key: a.key,
        url: a.url,
        name: a.name,
        mime: a.mime,
        size: a.size,
      })),
    }
    let saved
    if (editingId.value) {
      saved = await updatePost(editingId.value, payload)
      formOk.value = t('admin.updated')
    } else {
      saved = await createPost(payload)
      formOk.value = t('admin.created')
    }
    const publishedSlug = saved?.slug || form.slug
    const wasPublished = Boolean(payload.published)
    if (wasPublished && publishedSlug && saved) warmPostCache(publishedSlug, saved)
    resetForm()
    // Don't block UI on library refetch; open the post when published
    if (wasPublished && publishedSlug) {
      router.push({ name: 'post', params: { slug: publishedSlug } })
      loadPosts()
    } else {
      studioTab.value = 'library'
      await loadPosts()
    }
  } catch (err) {
    formError.value = err.message || t('admin.saveFailed')
  } finally {
    saving.value = false
  }
}

async function restoreSession() {
  // Seed from session so compose gate isn't blank while /me resolves
  const stored = getStoredUser()
  if (stored) user.value = stored

  const pendingRepost = String(route.query.repost || '').trim()
  try {
    const data = await meCached()
    applyUser(data.user)
    if (!canPublish.value && !isAdminUser.value) {
      studioTab.value = 'settings'
      return
    }
    if (!canPublish.value && isAdminUser.value) {
      studioTab.value = 'users'
      await loadUsers()
      return
    }
    if (pendingRepost) {
      // Repost entry: prioritize compose; defer library/stats
      await applyRepostFromRoute()
      Promise.all([loadPosts(), loadStats()]).catch(() => {})
    } else {
      await Promise.all([loadPosts(), loadStats()])
    }
  } catch {
    applyUser(null)
  }
}

watch(
  () => route.query.repost,
  (slug) => {
    if (slug && user.value) applyRepostFromRoute()
  },
)

onMounted(restoreSession)
</script>

<style scoped>
.studio-hero {
  margin-bottom: 1.25rem;
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
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 0.1rem;
}

.studio-tabs::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.studio-tabs button {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.4rem 0.95rem;
  font-size: 0.9rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.studio-tabs button:hover,
.studio-tabs button.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.users-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: min(68dvh, calc(100dvh - 13.5rem));
  min-height: 14rem;
  overflow: hidden;
}

.users-head {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  align-items: flex-start;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.users-head h2 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
}

.users-head p {
  margin: 0;
  max-width: 42rem;
  font-size: 0.86rem;
  line-height: 1.45;
}

.users-refresh {
  padding: 0.4rem 0.85rem;
  font-size: 0.86rem;
}

.users-status {
  margin: 0;
  flex-shrink: 0;
}

.users-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border: 1px solid var(--line);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
}

.users-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.users-list {
  display: grid;
  gap: 0;
}

.user-row {
  display: grid;
  grid-template-columns: minmax(7.5rem, 1.05fr) 7.25rem minmax(11rem, 1.6fr) auto;
  gap: 0.55rem 0.75rem;
  align-items: center;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--line);
  transition: background 0.15s ease;
}

.user-row:last-child {
  border-bottom: none;
}

.user-row:hover {
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.user-row.muted {
  background: color-mix(in srgb, #c45c26 7%, transparent);
}

.user-row.dirty {
  box-shadow: inset 2px 0 0 var(--accent);
}

.user-identity {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.user-identity strong {
  font-size: 0.95rem;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.users-email {
  display: block;
  font-size: 0.74rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.15rem;
}

.user-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 0.68rem;
  letter-spacing: 0.02em;
  color: var(--muted);
  white-space: nowrap;
}

.user-badge.warn {
  border-color: color-mix(in srgb, #c45c26 45%, var(--line));
  color: #c45c26;
  background: color-mix(in srgb, #c45c26 10%, transparent);
}

.user-field {
  display: block;
  min-width: 0;
}

.select-wrap {
  position: relative;
}

.select-wrap::after {
  content: '';
  position: absolute;
  right: 0.7rem;
  top: 50%;
  width: 0.4rem;
  height: 0.4rem;
  border-right: 1.5px solid var(--muted);
  border-bottom: 1.5px solid var(--muted);
  transform: translateY(-65%) rotate(45deg);
  pointer-events: none;
}

.select-wrap select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  min-height: 2.1rem;
  padding: 0.35rem 1.85rem 0.35rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.86rem;
  cursor: pointer;
}

.select-wrap select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.select-wrap select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.user-perms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
}

.perm-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.perm-chip input {
  accent-color: var(--accent);
  margin: 0;
  width: 0.85rem;
  height: 0.85rem;
}

.perm-chip.on {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  color: var(--ink);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.perm-chip.locked {
  opacity: 0.72;
  cursor: default;
}

.user-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.3rem;
}

.btn.sm {
  padding: 0.32rem 0.65rem;
  font-size: 0.78rem;
  border-radius: 999px;
}

.users-row-msg {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.76rem;
}

@media (max-width: 980px) {
  .user-row {
    grid-template-columns: minmax(0, 1fr) 7rem;
    grid-template-areas:
      'id role'
      'perms perms'
      'actions actions'
      'msg msg';
  }

  .user-identity {
    grid-area: id;
  }

  .user-field {
    grid-area: role;
  }

  .user-perms {
    grid-area: perms;
  }

  .user-actions {
    grid-area: actions;
    justify-content: flex-start;
  }

  .users-row-msg {
    grid-area: msg;
  }

  .users-panel {
    max-height: min(72dvh, calc(100dvh - 11rem));
  }
}

@media (max-width: 640px) {
  .user-row {
    grid-template-columns: 1fr;
    grid-template-areas:
      'id'
      'role'
      'perms'
      'actions'
      'msg';
    padding: 0.75rem;
  }

  .user-actions {
    flex-wrap: wrap;
  }
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

.repost-field {
  flex-wrap: wrap;
  max-width: 100%;
}

.repost-field select {
  min-width: 12rem;
  max-width: min(22rem, 100%);
}

.repost-compose-card {
  display: grid;
  gap: 0.55rem;
  margin: 0 0 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--surface) 90%, var(--accent));
}

.repost-compose-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.repost-compose-card .repost-label {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.repost-compose-card .repost-card {
  display: grid;
  gap: 0.2rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  border-radius: 0.45rem;
  text-decoration: none;
  color: inherit;
  background: var(--surface);
}

.repost-compose-card .repost-card:hover {
  border-color: var(--accent);
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
