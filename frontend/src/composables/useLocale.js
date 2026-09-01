import { computed, onMounted, ref } from 'vue'
import { translate } from '../i18n/messages.js'
import {
  getCategoryLabels,
  getProfile,
  getProjects,
  getTechStack,
  projectsForTech as projectsForTechRaw,
  techForProject as techForProjectRaw,
} from '../data/profile.js'

const STORAGE_KEY = 'mohhen-locale'

function readDomLocale() {
  if (typeof document === 'undefined') return 'zh'
  const fromDom = document.documentElement.lang
  if (fromDom?.toLowerCase().startsWith('en')) return 'en'
  return 'zh'
}

const locale = ref(readDomLocale())
let hydrated = false

function applyLocale(next) {
  locale.value = next
  document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN'
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
}

function resolveInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || '').toLowerCase()
  return nav.startsWith('en') ? 'en' : 'zh'
}

export function useLocale() {
  onMounted(() => {
    if (!hydrated) {
      applyLocale(resolveInitialLocale())
      hydrated = true
    }
  })

  const isEn = computed(() => locale.value === 'en')
  const profile = computed(() => getProfile(locale.value))
  const projects = computed(() => getProjects(locale.value))
  const categoryLabels = computed(() => getCategoryLabels(locale.value))
  const techStack = computed(() => getTechStack(locale.value))

  function t(key, params) {
    return translate(locale.value, key, params)
  }

  function setLocale(next) {
    if (next !== 'zh' && next !== 'en') return
    applyLocale(next)
  }

  function toggleLocale() {
    applyLocale(locale.value === 'en' ? 'zh' : 'en')
  }

  function formatDate(value) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    const pad = (n) => String(n).padStart(2, '0')
    const y = d.getFullYear()
    const m = pad(d.getMonth() + 1)
    const day = pad(d.getDate())
    const h = pad(d.getHours())
    const min = pad(d.getMinutes())
    const s = pad(d.getSeconds())
    if (locale.value === 'en') return `${y}-${m}-${day} ${h}:${min}:${s}`
    return `${y}年${m}月${day}日 ${h}:${min}:${s}`
  }

  function projectsForTech(techId) {
    return projectsForTechRaw(techId, locale.value)
  }

  function techForProject(projectId) {
    return techForProjectRaw(projectId, locale.value)
  }

  return {
    locale,
    isEn,
    t,
    setLocale,
    toggleLocale,
    formatDate,
    profile,
    projects,
    categoryLabels,
    techStack,
    projectsForTech,
    techForProject,
  }
}
