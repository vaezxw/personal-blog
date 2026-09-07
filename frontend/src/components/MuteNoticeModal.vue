<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="mute-overlay"
      role="presentation"
      @click="close"
      @keydown.esc.prevent="close"
    >
      <div
        class="mute-dialog panel geek-panel"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="bodyId"
        @click.stop
      >
        <div class="mute-icon" aria-hidden="true">!</div>
        <h2 :id="titleId">{{ t('mute.title') }}</h2>
        <p :id="bodyId" class="muted">{{ t('mute.body') }}</p>
        <button ref="okRef" type="button" class="btn" @click="close">
          {{ t('mute.ok') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useLocale } from '../composables/useLocale.js'
import { closeMuteNotice, useMuteNotice } from '../composables/useMuteNotice.js'

const { t } = useLocale()
const { open } = useMuteNotice()
const titleId = 'mute-notice-title'
const bodyId = 'mute-notice-body'
const okRef = ref(null)

function close() {
  closeMuteNotice()
}

function onKeydown(e) {
  if (e.key === 'Escape' && open.value) close()
}

watch(open, async (v) => {
  if (v) {
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    okRef.value?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.mute-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: max(1rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(1rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, #020617 58%, transparent);
  backdrop-filter: blur(4px);
  box-sizing: border-box;
}

.mute-dialog {
  width: min(100%, 22rem);
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  text-align: center;
  padding: 1.25rem 1.2rem 1.15rem;
  border-radius: 16px;
  box-shadow: 0 24px 64px color-mix(in srgb, #000 35%, transparent);
}

.mute-icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.15rem;
  color: #c45c26;
  background: color-mix(in srgb, #c45c26 14%, transparent);
  border: 1px solid color-mix(in srgb, #c45c26 40%, var(--line));
}

.mute-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
}

.mute-dialog p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
}

.mute-dialog .btn {
  margin-top: 0.25rem;
  min-width: 7rem;
}
</style>
