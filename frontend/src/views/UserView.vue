<template>
  <section class="user-page" v-if="profile">
    <header class="user-hero panel">
      <div class="user-identity">
        <div class="user-avatar" aria-hidden="true">
          <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" />
          <template v-else>{{ avatarLetter }}</template>
        </div>
        <div>
          <p class="eyebrow">@{{ profile.username }}</p>
          <h1>{{ profile.username }}</h1>
          <p class="muted user-meta">
            <span>{{ roleLabel }}</span>
            <span>·</span>
            <span>{{ t('user.joined', { date: formatDate(profile.createdAt) }) }}</span>
          </p>
        </div>
      </div>

      <div class="user-actions">
        <button
          v-if="!profile.isSelf"
          type="button"
          class="btn"
          :class="{ ghost: profile.following }"
          :disabled="followBusy"
          @click="onFollow"
        >
          {{ followLabel }}
        </button>
        <RouterLink v-else class="btn ghost" to="/admin">{{ t('user.manage') }}</RouterLink>
        <RouterLink
          class="btn ghost"
          :to="{ name: 'user-dashboard', params: { username: profile.username } }"
        >
          {{ t('dash.open') }}
        </RouterLink>
        <p v-if="followHint" class="muted follow-hint">
          <RouterLink to="/admin">{{ t('post.login') }}</RouterLink>{{ t('user.loginToFollow') }}
        </p>
      </div>

      <div class="user-stats">
        <button type="button" class="stat-chip" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">
          <strong class="mono">{{ profile.postCount ?? posts.length }}</strong>
          <span>{{ t('user.posts') }}</span>
        </button>
        <button
          type="button"
          class="stat-chip"
          :class="{ active: tab === 'followers' }"
          @click="openTab('followers')"
        >
          <strong class="mono">{{ profile.followerCount || 0 }}</strong>
          <span>{{ t('user.followers') }}</span>
        </button>
        <button
          type="button"
          class="stat-chip"
          :class="{ active: tab === 'following' }"
          @click="openTab('following')"
        >
          <strong class="mono">{{ profile.followingCount || 0 }}</strong>
          <span>{{ t('user.following') }}</span>
        </button>
      </div>
    </header>

    <section v-if="tab === 'posts'" class="user-posts">
      <h2>{{ t('user.postsTitle') }}</h2>
      <p v-if="!posts.length" class="muted">{{ t('user.postsEmpty') }}</p>
      <article v-for="post in posts" :key="post.id" class="post-row">
        <div class="post-meta">
          <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
        </div>
        <div class="post-body">
          <h3>
            <RouterLink :to="{ name: 'post', params: { slug: post.slug } }">{{ post.title }}</RouterLink>
            <span v-if="post.visibility === 'friends'" class="vis-badge">{{ t('post.badgeFriends') }}</span>
            <span v-else-if="post.visibility === 'private'" class="vis-badge private">{{ t('post.badgePrivate') }}</span>
          </h3>
          <p class="post-engage muted">
            <span>{{ t('home.views', { count: post.viewCount || 0 }) }}</span>
            <span>·</span>
            <span>{{ t('home.likes', { count: post.likeCount || 0 }) }}</span>
            <span>·</span>
            <span>{{ t('home.comments', { count: post.commentCount || 0 }) }}</span>
          </p>
        </div>
      </article>
    </section>

    <section v-else class="user-graph panel">
      <h2>{{ tab === 'followers' ? t('user.followers') : t('user.following') }}</h2>
      <p v-if="listLoading" class="muted">{{ t('home.loading') }}</p>
      <p v-else-if="listError" class="error">{{ listError }}</p>
      <p v-else-if="!people.length" class="muted">{{ t('user.listEmpty') }}</p>
      <ul v-else class="people-list">
        <li v-for="p in people" :key="p.id">
          <RouterLink class="people-link" :to="{ name: 'user', params: { username: p.username } }">
            <span class="people-avatar" aria-hidden="true">
              <img v-if="p.avatarUrl" :src="p.avatarUrl" alt="" />
              <template v-else>{{ p.username.slice(0, 1).toUpperCase() }}</template>
            </span>
            <span>
              <strong>{{ p.username }}</strong>
              <span class="muted">@{{ p.username }}</span>
            </span>
          </RouterLink>
          <button
            v-if="!p.isSelf"
            type="button"
            class="btn ghost small"
            :disabled="rowBusy === p.username"
            @click="onFollowUser(p)"
          >
            {{ p.following ? t('user.unfollow') : t('user.follow') }}
          </button>
        </li>
      </ul>
    </section>
  </section>

  <p v-else-if="loading" class="muted">{{ t('home.loading') }}</p>
  <p v-else class="error">{{ error || t('user.missing') }}</p>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchFollowers,
  fetchFollowing,
  fetchUserProfile,
  getStoredUser,
  toggleFollow,
} from '../api'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  username: { type: String, required: true },
})

const route = useRoute()
const { t, formatDate } = useLocale()

const loading = ref(true)
const error = ref('')
const profile = ref(null)
const posts = ref([])
const tab = ref('posts')
const people = ref([])
const listLoading = ref(false)
const listError = ref('')
const followBusy = ref(false)
const followHint = ref(false)
const rowBusy = ref('')

const avatarLetter = computed(() => (profile.value?.username || '?').slice(0, 1).toUpperCase())
const roleLabel = computed(() =>
  profile.value?.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleAuthor'),
)
const followLabel = computed(() => {
  if (profile.value?.mutual) return t('user.mutual')
  if (profile.value?.following) return t('user.unfollow')
  return t('user.follow')
})

async function load() {
  loading.value = true
  error.value = ''
  tab.value = 'posts'
  people.value = []
  followHint.value = false
  try {
    const data = await fetchUserProfile(props.username)
    profile.value = data.user
    posts.value = data.posts || []
  } catch (err) {
    profile.value = null
    posts.value = []
    error.value = err.message || t('user.missing')
  } finally {
    loading.value = false
  }
}

async function openTab(next) {
  tab.value = next
  listLoading.value = true
  listError.value = ''
  try {
    people.value =
      next === 'followers'
        ? await fetchFollowers(props.username)
        : await fetchFollowing(props.username)
  } catch (err) {
    people.value = []
    listError.value = err.message || t('home.loadFailed')
  } finally {
    listLoading.value = false
  }
}

async function onFollow() {
  followHint.value = false
  const me = getStoredUser()
  if (!me) {
    followHint.value = true
    return
  }
  followBusy.value = true
  try {
    const data = await toggleFollow(props.username)
    if (profile.value) {
      profile.value.following = data.following
      profile.value.mutual = data.mutual
      profile.value.followerCount = data.followerCount
      profile.value.followingCount = data.followingCount
    }
  } catch (err) {
    error.value = err.message || t('user.followFailed')
  } finally {
    followBusy.value = false
  }
}

async function onFollowUser(person) {
  const me = getStoredUser()
  if (!me) {
    followHint.value = true
    return
  }
  rowBusy.value = person.username
  try {
    const data = await toggleFollow(person.username)
    person.following = data.following
    if (profile.value && props.username.toLowerCase() === me.username.toLowerCase()) {
      // viewing own following list: counts may change
      if (tab.value === 'following' && !data.following) {
        people.value = people.value.filter((x) => x.id !== person.id)
        profile.value.followingCount = Math.max(0, (profile.value.followingCount || 1) - 1)
      }
    }
    if (profile.value && person.id === profile.value.id) {
      profile.value.following = data.following
      profile.value.mutual = data.mutual
      profile.value.followerCount = data.followerCount
    }
  } catch {
    /* ignore */
  } finally {
    rowBusy.value = ''
  }
}

watch(
  () => props.username || route.params.username,
  () => load(),
  { immediate: true },
)
</script>

<style scoped>
.user-hero {
  display: grid;
  gap: 1.1rem;
  margin-bottom: 1.5rem;
}

.user-identity {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-avatar,
.people-avatar {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar img,
.people-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.people-avatar {
  width: 2.4rem;
  height: 2.4rem;
  font-size: 1rem;
  border-radius: 10px;
}

.user-hero h1 {
  margin: 0.1rem 0 0.25rem;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0;
}

.user-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.follow-hint {
  margin: 0;
  font-size: 0.9rem;
}

.user-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.stat-chip {
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
  border-radius: 12px;
  padding: 0.55rem 0.85rem;
  display: grid;
  gap: 0.1rem;
  text-align: left;
  min-width: 5.5rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.stat-chip:hover,
.stat-chip.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.stat-chip strong {
  font-size: 1.15rem;
  color: var(--accent);
}

.stat-chip span {
  font-size: 0.8rem;
  color: var(--muted);
}

.user-posts h2,
.user-graph h2 {
  margin: 0 0 0.85rem;
  font-size: 1.15rem;
}

.people-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.people-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px dashed var(--line);
}

.people-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
  min-width: 0;
}

.people-link span:last-child {
  display: grid;
  gap: 0.05rem;
}

.btn.small {
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
}
</style>
