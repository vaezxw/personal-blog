<template>
  <section class="admin">
    <p class="eyebrow">Admin</p>
    <h1>文章管理</h1>
    <p class="lede">注册或登录后可发布文章。登录态保存在 httpOnly Cookie，支持刷新令牌。</p>

    <div v-if="!user" class="panel">
      <div class="row tabs">
        <button type="button" class="btn" :class="{ ghost: mode !== 'login' }" @click="mode = 'login'">登录</button>
        <button type="button" class="btn" :class="{ ghost: mode !== 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="doLogin">
        <label>邮箱或用户名</label>
        <input v-model="auth.login" required autocomplete="username" placeholder="email 或 username" />
        <label>密码</label>
        <input v-model="auth.password" type="password" required autocomplete="current-password" placeholder="至少 6 位" />
        <button class="btn" type="submit" :disabled="authBusy">{{ authBusy ? '登录中…' : '登录' }}</button>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>

      <form v-else class="auth-form" @submit.prevent="doRegister">
        <label>邮箱</label>
        <input v-model="auth.email" type="email" required autocomplete="email" placeholder="you@example.com" />
        <label>用户名</label>
        <input v-model="auth.username" required autocomplete="username" placeholder="2-32 个字符" />
        <label>密码</label>
        <input v-model="auth.password" type="password" required autocomplete="new-password" placeholder="至少 6 位" />
        <button class="btn" type="submit" :disabled="authBusy">{{ authBusy ? '注册中…' : '注册' }}</button>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>
    </div>

    <div v-else class="panel">
      <div class="row between">
        <p class="ok">
          已登录：<strong>{{ user.username }}</strong>
          <span class="muted">（{{ user.role === 'admin' ? '管理员' : '作者' }}）</span>
        </p>
        <button class="btn ghost" type="button" @click="doLogout">退出</button>
      </div>
    </div>

    <form class="panel" @submit.prevent="submitPost">
      <h2>{{ editingId ? '编辑文章' : '发布新文章' }}</h2>
      <label>标题</label>
      <input v-model="form.title" required placeholder="文章标题" />
      <label>Slug</label>
      <input v-model="form.slug" required placeholder="url-friendly-slug" />
      <label>摘要</label>
      <input v-model="form.excerpt" placeholder="列表页显示的一句话" />
      <label>正文（Markdown）</label>
      <textarea v-model="form.content" rows="12" placeholder="支持 Markdown；图片可用外链 ![](https://...)"></textarea>
      <p class="muted upload-note">图片上传（R2）暂未启用，可在正文中使用外链图片。</p>
      <label class="check">
        <input v-model="form.published" type="checkbox" />
        立即发布
      </label>
      <div class="row">
        <button class="btn" type="submit" :disabled="!user || saving">
          {{ saving ? '保存中…' : editingId ? '更新' : '创建' }}
        </button>
        <button v-if="editingId" class="btn ghost" type="button" @click="resetForm">取消编辑</button>
      </div>
      <p v-if="formError" class="error">{{ formError }}</p>
      <p v-if="formOk" class="ok">{{ formOk }}</p>
    </form>

    <div class="panel">
      <div class="row between">
        <h2>我的文章</h2>
        <button class="btn ghost" type="button" :disabled="!user || loading" @click="loadPosts">刷新</button>
      </div>
      <p v-if="!user" class="muted">请先登录。</p>
      <p v-else-if="loading" class="muted">加载中…</p>
      <p v-else-if="listError" class="error">{{ listError }}</p>
      <ul v-else class="admin-list">
        <li v-for="post in posts" :key="post.id">
          <div>
            <strong>{{ post.title }}</strong>
            <span class="muted">
              / {{ post.slug }} · {{ post.published ? '已发布' : '草稿' }}
              <template v-if="post.authorUsername"> · {{ post.authorUsername }}</template>
            </span>
          </div>
          <div class="row">
            <button class="btn ghost" type="button" @click="editPost(post)">编辑</button>
            <button class="btn danger" type="button" @click="removePost(post)">删除</button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  createPost,
  deletePost,
  fetchAllPosts,
  getStoredUser,
  login,
  logout,
  me,
  register,
  setStoredUser,
  updatePost,
} from '../api'

const user = ref(getStoredUser())
const mode = ref('login')
const authBusy = ref(false)
const authError = ref('')
const posts = ref([])
const loading = ref(false)
const listError = ref('')
const saving = ref(false)
const formError = ref('')
const formOk = ref('')
const editingId = ref('')

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
})

function applyUser(nextUser) {
  user.value = nextUser
  setStoredUser(nextUser)
}

async function doLogout() {
  try {
    await logout()
  } catch {
    /* ignore */
  }
  applyUser(null)
  posts.value = []
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
    await loadPosts()
  } catch (err) {
    authError.value = err.message || '登录失败'
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
    await loadPosts()
  } catch (err) {
    authError.value = err.message || '注册失败'
  } finally {
    authBusy.value = false
  }
}

function resetForm() {
  editingId.value = ''
  form.title = ''
  form.slug = ''
  form.excerpt = ''
  form.content = ''
  form.published = true
  formError.value = ''
  formOk.value = ''
}

function editPost(post) {
  editingId.value = post.id
  form.title = post.title
  form.slug = post.slug
  form.excerpt = post.excerpt
  form.content = post.content
  form.published = post.published
  formOk.value = ''
  formError.value = ''
}

async function loadPosts() {
  if (!user.value) return
  loading.value = true
  listError.value = ''
  try {
    posts.value = await fetchAllPosts()
  } catch (err) {
    listError.value = err.message || '加载失败'
    if (String(err.message || '').includes('Unauthorized')) await doLogout()
  } finally {
    loading.value = false
  }
}

async function submitPost() {
  if (!user.value) {
    formError.value = '请先登录'
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
    }
    if (editingId.value) {
      await updatePost(editingId.value, payload)
      formOk.value = '已更新'
    } else {
      await createPost(payload)
      formOk.value = '已创建'
    }
    resetForm()
    await loadPosts()
  } catch (err) {
    formError.value = err.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function removePost(post) {
  if (!user.value) return
  if (!confirm(`确认删除「${post.title}」？`)) return
  try {
    await deletePost(post.id)
    if (editingId.value === post.id) resetForm()
    await loadPosts()
  } catch (err) {
    listError.value = err.message || '删除失败'
  }
}

async function restoreSession() {
  try {
    const data = await me()
    applyUser(data.user)
    await loadPosts()
  } catch {
    applyUser(null)
  }
}

onMounted(restoreSession)
</script>

<style scoped>
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

.upload-note {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.9rem;
}
</style>
