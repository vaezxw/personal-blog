import { computed, onMounted, ref } from 'vue'

const STORAGE_KEY = 'mohhen-theme'

function readDomTheme() {
  if (typeof document === 'undefined') return 'light'
  const fromDom = document.documentElement.dataset.theme
  if (fromDom === 'light' || fromDom === 'dark') return fromDom
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const theme = ref(readDomTheme())
let hydrated = false

function applyTheme(next) {
  theme.value = next
  document.documentElement.dataset.theme = next
  document.documentElement.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore private mode */
  }
}

function resolveInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  onMounted(() => {
    if (!hydrated) {
      applyTheme(resolveInitialTheme())
      hydrated = true
    }
  })

  const isDark = computed(() => theme.value === 'dark')
  const label = computed(() => (isDark.value ? '切换白天' : '切换黑夜'))

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, isDark, label, toggleTheme }
}
