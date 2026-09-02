<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="tip-overlay"
      role="presentation"
      @click="onBackdrop"
    >
      <div
        class="tip-dialog panel geek-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('tip.title')"
        @click.stop
      >
        <div class="tip-head">
          <div>
            <h2><span class="mono prompt">#</span> tip.jar</h2>
            <p class="muted tip-hint">{{ t('tip.hint') }}</p>
          </div>
          <button
            type="button"
            class="tip-close"
            :aria-label="t('tip.close')"
            @click="close"
          >
            ×
          </button>
        </div>

        <div class="tip-grid">
          <figure
            v-for="item in items"
            :key="item.id"
            class="tip-card"
          >
            <button
              type="button"
              class="tip-thumb"
              :aria-label="t('tip.preview', { name: item.label })"
              @click="openPreview(item)"
            >
              <img :src="item.src" :alt="item.label" loading="lazy" />
            </button>
            <figcaption>{{ item.label }}</figcaption>
            <button
              type="button"
              class="btn ghost tip-download"
              @click="download(item)"
            >
              {{ t('tip.download') }}
            </button>
          </figure>
        </div>

        <p class="muted tip-thanks">{{ t('tip.thanks') }}</p>
      </div>
    </div>

    <div
      v-if="preview"
      class="tip-preview-overlay"
      role="presentation"
      @click="closePreview"
    >
      <div class="tip-preview-panel" role="dialog" aria-modal="true" @click.stop>
        <img :src="preview.src" :alt="preview.label" />
        <div class="tip-preview-actions">
          <button type="button" class="btn" @click="download(preview)">
            {{ t('tip.download') }}
          </button>
          <button type="button" class="btn ghost" @click="closePreview">
            {{ t('tip.close') }}
          </button>
        </div>
        <p class="muted tip-preview-hint">{{ t('tip.previewHint') }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const { t } = useLocale()
const preview = ref(null)

const items = computed(() => [
  {
    id: 'wechat',
    src: '/qr/wechat.png',
    file: 'wechat-pay.png',
    label: t('tip.wechat'),
  },
  {
    id: 'alipay',
    src: '/qr/alipay.png',
    file: 'alipay.png',
    label: t('tip.alipay'),
  },
])

function close() {
  preview.value = null
  emit('update:open', false)
}

function onBackdrop() {
  close()
}

function openPreview(item) {
  preview.value = item
}

function closePreview() {
  preview.value = null
}

async function download(item) {
  try {
    const res = await fetch(item.src)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.file
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    window.open(item.src, '_blank', 'noopener')
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape') return
  if (preview.value) {
    closePreview()
    return
  }
  if (props.open) close()
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) preview.value = null
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.tip-overlay,
.tip-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, #020617 58%, transparent);
  backdrop-filter: blur(4px);
}

.tip-preview-overlay {
  z-index: 95;
  background: color-mix(in srgb, #020617 78%, transparent);
}

.tip-dialog {
  width: min(100%, 34rem);
  max-height: min(90vh, 40rem);
  overflow: auto;
  padding: 1.15rem 1.2rem 1.25rem;
  border-radius: 16px;
  box-shadow: 0 24px 64px color-mix(in srgb, #000 35%, transparent);
}

.tip-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.tip-head h2 {
  margin: 0;
  font-size: 1.25rem;
}

.tip-hint {
  margin: 0.45rem 0 0;
  font-size: 0.92rem;
}

.tip-close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.tip-close:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.tip-card {
  margin: 0;
  padding: 0.7rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
}

.tip-thumb {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
  border-radius: 10px;
  overflow: hidden;
}

.tip-thumb img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 10px;
  transition: transform 0.2s ease;
}

.tip-thumb:hover img {
  transform: scale(1.02);
}

.tip-card figcaption {
  font-weight: 600;
  color: var(--ink);
  font-size: 0.92rem;
}

.tip-download {
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
}

.tip-thanks {
  margin: 0.95rem 0 0;
  text-align: center;
  font-size: 0.88rem;
}

.tip-preview-panel {
  width: min(100%, 28rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.tip-preview-panel img {
  width: 100%;
  max-height: min(72vh, 36rem);
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 48px color-mix(in srgb, #000 40%, transparent);
}

.tip-preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  justify-content: center;
}

.tip-preview-hint {
  margin: 0;
  font-size: 0.85rem;
  text-align: center;
}

@media (max-width: 520px) {
  .tip-grid {
    grid-template-columns: 1fr;
  }

  .tip-dialog {
    width: min(100%, 22rem);
  }

  .tip-thumb img {
    max-width: 220px;
    margin: 0 auto;
  }
}
</style>
