<template>
  <button
    v-show="visible"
    type="button"
    class="back-to-top"
    :aria-label="t('common.backTop')"
    :title="t('common.backTop')"
    @click="scrollTop"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 19V5m0 0 6 6M12 5l-6 6"
      />
    </svg>
  </button>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useLocale } from '../composables/useLocale.js'

const { t } = useLocale()
const visible = ref(false)
const SHOW_AFTER = 420

function onScroll() {
  visible.value = window.scrollY > SHOW_AFTER
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: max(0.85rem, env(safe-area-inset-right, 0px));
  bottom: max(1.1rem, calc(env(safe-area-inset-bottom, 0px) + 0.85rem));
  z-index: 65;
  width: 2.75rem;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--line) 90%, transparent);
  background: var(--toc-bg, var(--surface));
  color: var(--ink);
  box-shadow: var(--shadow);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: transform 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.back-to-top svg {
  width: 1.15rem;
  height: 1.15rem;
}

.back-to-top:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  transform: translateY(-2px);
}

@media (max-width: 980px) {
  .back-to-top {
    right: max(0.75rem, env(safe-area-inset-right, 0px));
    bottom: max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem));
  }
}
</style>
