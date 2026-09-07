import { computed, onMounted, onUnmounted, ref } from 'vue'

const deferredPrompt = ref(null)
const installed = ref(false)
const iosHintOpen = ref(false)

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    Boolean(window.navigator.standalone)
  )
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const chromeLike = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return iOS && webkit && !chromeLike
}

export function usePwaInstall() {
  const canInstall = computed(() => Boolean(deferredPrompt.value) && !installed.value && !isStandalone())
  const showIosInstall = computed(() => isIosSafari() && !installed.value && !isStandalone())

  function onBeforeInstallPrompt(event) {
    event.preventDefault()
    deferredPrompt.value = event
  }

  function onAppInstalled() {
    installed.value = true
    deferredPrompt.value = null
    iosHintOpen.value = false
  }

  onMounted(() => {
    if (isStandalone()) installed.value = true
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  async function promptInstall() {
    if (deferredPrompt.value) {
      deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice.catch(() => null)
      deferredPrompt.value = null
      if (choice?.outcome === 'accepted') installed.value = true
      return
    }
    if (showIosInstall.value) {
      iosHintOpen.value = true
    }
  }

  function closeIosHint() {
    iosHintOpen.value = false
  }

  return {
    canInstall,
    showIosInstall,
    iosHintOpen,
    installed,
    promptInstall,
    closeIosHint,
  }
}
