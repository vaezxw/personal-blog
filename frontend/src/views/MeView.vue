<template>
  <section class="me-page">
    <header class="me-hero panel">
      <div>
        <p class="eyebrow">{{ t('me.eyebrow') }}</p>
        <h1>{{ user ? t('me.titleIn') : t('me.titleOut') }}</h1>
        <p class="muted">{{ user ? t('me.ledeIn') : t('me.ledeOut') }}</p>
      </div>
    </header>

    <!-- 未登录：登录 / 注册 -->
    <div v-if="!user" class="panel auth-panel">
      <div class="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          {{ t('admin.login') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          :class="{ active: mode === 'register' }"
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
        <label>{{ t('admin.email') }}</label>
        <input
          v-model="auth.email"
          type="email"
          required
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

    <!-- 已登录：个人中心 -->
    <template v-else>
      <div class="panel me-card">
        <div class="me-identity">
          <div class="me-avatar-lg" aria-hidden="true">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
            <template v-else>{{ letter }}</template>
          </div>
          <div>
            <p class="eyebrow">@{{ user.username }}</p>
            <h2>{{ user.username }}</h2>
            <p class="muted">
              {{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleAuthor') }}
            </p>
          </div>
        </div>
        <div class="me-card-actions">
          <RouterLink class="btn ghost" :to="{ name: 'user', params: { username: user.username } }">
            {{ t('admin.profile') }}
          </RouterLink>
          <button class="btn ghost danger-text" type="button" :disabled="logoutBusy" @click="doLogout">
            {{ logoutBusy ? t('me.loggingOut') : t('admin.logout') }}
          </button>
        </div>
      </div>

      <nav class="me-hub" :aria-label="t('nav.me')">
        <RouterLink class="me-hub-card" to="/chat">
          <strong>{{ t('nav.chat') }}</strong>
          <span class="muted">{{ t('ai.lede') }}</span>
        </RouterLink>
        <RouterLink class="me-hub-card" to="/messages">
          <strong>{{ t('nav.messages') }}</strong>
          <span class="muted">{{ t('user.hubMessages') }}</span>
        </RouterLink>
        <RouterLink
          class="me-hub-card"
          :to="{ name: 'user-library', params: { username: user.username } }"
        >
          <strong>{{ t('nav.library') }}</strong>
          <span class="muted">{{ t('user.hubLibrary') }}</span>
        </RouterLink>
        <RouterLink
          class="me-hub-card"
          :to="{ name: 'user-dashboard', params: { username: user.username } }"
        >
          <strong>{{ t('dash.open') }}</strong>
          <span class="muted">{{ t('user.hubDash') }}</span>
        </RouterLink>
        <RouterLink class="me-hub-card" to="/admin">
          <strong>{{ t('nav.admin') }}</strong>
          <span class="muted">{{ t('user.hubStudio') }}</span>
        </RouterLink>
      </nav>

      <AiConnectionSettings />
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoredUser, login, logout, meCached, register, setStoredUser } from '../api'
import { useLocale } from '../composables/useLocale.js'
import AiConnectionSettings from '../components/AiConnectionSettings.vue'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const user = ref(getStoredUser())
const mode = ref(route.query.tab === 'register' ? 'register' : 'login')
const authBusy = ref(false)
const logoutBusy = ref(false)
const authError = ref('')
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)

const auth = reactive({
  login: '',
  email: '',
  username: '',
  password: '',
})

const letter = computed(() => (user.value?.username || '?').slice(0, 1).toUpperCase())

function switchMode(next) {
  mode.value = next
  authError.value = ''
  showLoginPassword.value = false
  showRegisterPassword.value = false
}

function afterAuth(nextUser) {
  user.value = nextUser
  setStoredUser(nextUser)
  window.dispatchEvent(new CustomEvent('mohhen-auth-change'))
  const next = String(route.query.next || '').trim()
  if (next.startsWith('/') && !next.startsWith('//')) {
    router.replace(next)
    return
  }
  router.replace({ name: 'me' })
}

async function doLogin() {
  authBusy.value = true
  authError.value = ''
  try {
    const data = await login({
      email: auth.login,
      password: auth.password,
    })
    auth.password = ''
    afterAuth(data.user)
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
    auth.password = ''
    afterAuth(data.user)
  } catch (err) {
    authError.value = err.message || t('admin.registerFailed')
  } finally {
    authBusy.value = false
  }
}

async function doLogout() {
  logoutBusy.value = true
  try {
    await logout()
  } catch {
    /* ignore */
  }
  user.value = null
  setStoredUser(null)
  window.dispatchEvent(new CustomEvent('mohhen-auth-change'))
  mode.value = 'login'
  logoutBusy.value = false
}

async function refresh() {
  try {
    const data = await meCached()
    user.value = data.user
    setStoredUser(data.user)
  } catch {
    user.value = null
    setStoredUser(null)
  }
}

function onAuthChange() {
  user.value = getStoredUser()
}

onMounted(() => {
  refresh()
  window.addEventListener('mohhen-auth-change', onAuthChange)
})

onUnmounted(() => {
  window.removeEventListener('mohhen-auth-change', onAuthChange)
})
</script>

<style scoped>
.me-page {
  display: grid;
  gap: 1rem;
  max-width: 40rem;
}

.me-hero h1 {
  margin: 0.15rem 0 0.35rem;
}

.auth-panel {
  display: grid;
  gap: 1rem;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 0.3rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
}

.auth-tabs button {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.auth-tabs button.active {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.auth-form {
  display: grid;
  gap: 0.45rem;
}

.auth-form label {
  font-size: 0.88rem;
  color: var(--muted);
  margin-top: 0.25rem;
}

.auth-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  padding: 0.65rem 0.8rem;
  font: inherit;
}

.auth-form input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}

.password-field {
  position: relative;
  display: grid;
}

.password-field input {
  padding-right: 2.6rem;
}

.password-toggle {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--muted);
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 8px;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}

.password-toggle svg {
  width: 1.1rem;
  height: 1.1rem;
}

.auth-form .btn {
  margin-top: 0.55rem;
}

.me-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.me-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.me-avatar-lg {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-weight: 700;
  font-size: 1.35rem;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.me-avatar-lg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.me-identity h2 {
  margin: 0.1rem 0 0.2rem;
  font-size: 1.35rem;
}

.me-card-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.danger-text {
  color: #e11d48;
}

.me-hub {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.me-hub-card {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  background: var(--surface);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.me-hub-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.me-hub-card strong {
  font-size: 0.98rem;
}

.me-hub-card .muted {
  font-size: 0.78rem;
  line-height: 1.35;
}

@media (max-width: 520px) {
  .me-hub {
    grid-template-columns: 1fr;
  }
}
</style>
