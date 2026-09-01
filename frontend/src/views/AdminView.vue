<template>
  <section class="admin">
    <p class="eyebrow">Admin</p>
    <h1>文章管理</h1>
    <p class="lede">使用后端配置的 ADMIN_TOKEN 登录后，可发布、编辑与删除文章。</p>

    <form class="panel" @submit.prevent="saveToken">
      <label for="token">Admin Token</label>
      <div class="row">
        <input id="token" v-model="tokenInput" type="password" autocomplete="current-password" placeholder="粘贴管理令牌" />
        <button type="submit" class="btn">保存</button>
      </div>
      <p v-if="token" class="ok">已保存令牌（仅存于本机浏览器）。</p>
    </form>

    <form class="panel" @submit.prevent="submitPost">
      <h2>{{ editingId ? '编辑文章' : '发布新文章' }}</h2>
      <label>标题</label>
      <input v-model="form.title" required placeholder="文章标题" />
      <label>Slug</label>
      <input v-model="form.slug" required placeholder="url-friendly-slug" />
      <label>摘要</label>
      <input v-model="form.excerpt" placeholder="列表页显示的一句话" />
      <label>正文（Markdown）</label>
      <textarea v-model="form.content" rows="12" placeholder="支持 Markdown"></textarea>
      <label class="check">
        <input v-model="form.published" type="checkbox" />
        立即发布
      </label>
      <div class="row">
        <button class="btn" type="submit" :disabled="!token || saving">
          {{ saving ? '保存中…' : editingId ? '更新' : '创建' }}
        </button>
        <button v-if="editingId" class="btn ghost" type="button" @click="resetForm">取消编辑</button>
      </div>
      <p v-if="formError" class="error">{{ formError }}</p>
      <p v-if="formOk" class="ok">{{ formOk }}</p>
    </form>

    <div class="panel">
      <div class="row between">
        <h2>全部文章</h2>
        <button class="btn ghost" type="button" :disabled="!token || loading" @click="loadPosts">刷新</button>
      </div>
      <p v-if="!token" class="muted">请先保存 Admin Token。</p>
      <p v-else-if="loading" class="muted">加载中…</p>
      <p v-else-if="listError" class="error">{{ listError }}</p>
      <ul v-else class="admin-list">
        <li v-for="post in posts" :key="post.id">
          <div>
            <strong>{{ post.title }}</strong>
            <span class="muted"> / {{ post.slug }} · {{ post.published ? '已发布' : '草稿' }}</span>
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
import { createPost, deletePost, fetchAllPosts, updatePost } from '../api'

const TOKEN_KEY = 'blog_admin_token'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const tokenInput = ref(token.value)
const posts = ref([])
const loading = ref(false)
const listError = ref('')
const saving = ref(false)
const formError = ref('')
const formOk = ref('')
const editingId = ref('')

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  published: true,
})

function saveToken() {
  token.value = tokenInput.value.trim()
  localStorage.setItem(TOKEN_KEY, token.value)
  loadPosts()
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
  if (!token.value) return
  loading.value = true
  listError.value = ''
  try {
    posts.value = await fetchAllPosts(token.value)
  } catch (err) {
    listError.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function submitPost() {
  if (!token.value) {
    formError.value = '请先保存 Admin Token'
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
      await updatePost(token.value, editingId.value, payload)
      formOk.value = '已更新'
    } else {
      await createPost(token.value, payload)
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
  if (!token.value) return
  if (!confirm(`确认删除「${post.title}」？`)) return
  try {
    await deletePost(token.value, post.id)
    if (editingId.value === post.id) resetForm()
    await loadPosts()
  } catch (err) {
    listError.value = err.message || '删除失败'
  }
}

onMounted(loadPosts)
</script>
