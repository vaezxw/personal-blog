<template>
  <div class="about-share" ref="wrapRef">
    <button
      type="button"
      class="share-btn share-trigger"
      :aria-expanded="open"
      aria-controls="about-share-panel"
      @click.stop="toggle"
    >
      {{ t('share.recommend') }}
    </button>

    <div
      v-if="open"
      id="about-share-panel"
      class="share-panel"
      role="dialog"
      :aria-label="t('share.aboutPanelTitle')"
      @click.stop
    >
      <p class="share-panel-title">{{ t('share.aboutPanelTitle') }}</p>
      <div class="share-actions">
        <button type="button" class="share-action" @click="onCopyLink">
          <span class="share-ico" aria-hidden="true">⧉</span>
          {{ t('share.copy') }}
        </button>
        <button type="button" class="share-action" @click="onShareWeibo">
          <span class="share-ico" aria-hidden="true">微</span>
          {{ t('share.weibo') }}
        </button>
        <button type="button" class="share-action" @click="onShareX">
          <span class="share-ico" aria-hidden="true">𝕏</span>
          {{ t('share.x') }}
        </button>
        <button
          v-if="nativeShareAvailable"
          type="button"
          class="share-action"
          @click="onSystemShare"
        >
          <span class="share-ico" aria-hidden="true">↑</span>
          {{ t('share.system') }}
        </button>
      </div>
      <div class="share-mode" role="group" :aria-label="t('share.longImageModeHint')">
        <button
          type="button"
          class="share-mode-btn"
          :class="{ active: posterMode === 'compact' }"
          :aria-pressed="posterMode === 'compact'"
          @click="posterMode = 'compact'"
        >
          {{ t('share.longImageModeCompact') }}
        </button>
        <button
          type="button"
          class="share-mode-btn"
          :class="{ active: posterMode === 'detailed' }"
          :aria-pressed="posterMode === 'detailed'"
          @click="posterMode = 'detailed'"
        >
          {{ t('share.longImageModeDetailed') }}
        </button>
      </div>
      <p class="muted share-mode-hint">{{ t('share.longImageModeHint') }}</p>
      <button
        type="button"
        class="share-long-btn"
        :disabled="capturing"
        @click="onGenerateLongImage"
      >
        {{ capturing ? t('share.longImageBusy') : t('share.longImage') }}
      </button>
      <div class="share-qr">
        <img :src="qrSrc" :alt="t('share.aboutQrAlt')" width="132" height="132" />
        <p class="muted">{{ t('share.aboutQrHint') }}</p>
      </div>
      <p v-if="hint" class="share-feedback" :class="{ ok: hintOk }">{{ hint }}</p>
    </div>
  </div>

  <Teleport to="body">
    <div class="poster-host" aria-hidden="true" inert>
      <AboutSharePoster
        ref="posterRef"
        :qr-src="posterQr"
        :page-url="pageUrl"
        :detail-mode="posterMode"
      />
    </div>

    <div
      v-if="previewOpen"
      class="long-mask"
      role="presentation"
      @click="closePreview"
    >
      <div
        class="long-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('share.longImagePreview')"
        @click.stop
      >
        <div class="long-head">
          <strong>{{ t('share.longImagePreview') }}</strong>
          <button type="button" class="long-close" :aria-label="t('share.dmClose')" @click="closePreview">
            ×
          </button>
        </div>
        <div class="long-preview">
          <img v-if="previewUrl" :src="previewUrl" :alt="t('share.longImagePreview')" />
        </div>
        <div class="long-actions">
          <button type="button" class="btn" @click="onDownloadImage">
            {{ t('share.longImageDownload') }}
          </button>
          <button
            v-if="canShareImage"
            type="button"
            class="btn ghost"
            @click="onShareImage"
          >
            {{ t('share.longImageShare') }}
          </button>
        </div>
        <p class="muted long-hint">{{ t('share.longImageHint') }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useLocale } from '../composables/useLocale.js'
import { downloadBlob } from '../utils/download.js'
import { captureElementPng, fetchQrDataUrl } from '../utils/capture.js'
import {
  aboutShareUrl,
  canShareFiles,
  canUseNativeShare,
  copyText,
  openWeiboShare,
  openXShare,
  qrCodeUrl,
  systemShare,
} from '../utils/share.js'
import AboutSharePoster from './AboutSharePoster.vue'

const { t, profile } = useLocale()

const wrapRef = ref(null)
const posterRef = ref(null)
const open = ref(false)
const capturing = ref(false)
const posterMode = ref('compact')
const hint = ref('')
const hintOk = ref(false)
const nativeShareAvailable = ref(false)
const previewOpen = ref(false)
const previewUrl = ref('')
const previewBlob = ref(null)
const posterQr = ref('')
const canShareImage = ref(false)

let hintTimer = null

const pageUrl = computed(() => aboutShareUrl())
const qrSrc = computed(() => qrCodeUrl(pageUrl.value, 132))
const recommendTitle = computed(
  () => t('share.recommendText', { name: profile.value.name, title: profile.value.title }),
)

function flash(msg, ok = true) {
  hint.value = msg
  hintOk.value = ok
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = ''
  }, 2200)
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    hint.value = ''
    nativeShareAvailable.value = canUseNativeShare()
  }
}

function close() {
  open.value = false
}

function onDocPointer(event) {
  if (!open.value) return
  const el = event.target
  if (!(el instanceof Element)) return
  if (wrapRef.value?.contains(el)) return
  close()
}

async function onCopyLink() {
  try {
    const ok = await copyText(pageUrl.value)
    flash(ok ? t('share.copied') : t('share.copyFailed'), ok)
  } catch {
    flash(t('share.copyFailed'), false)
  }
}

function onShareWeibo() {
  openWeiboShare({ url: pageUrl.value, title: recommendTitle.value })
  flash(t('share.opened'), true)
}

function onShareX() {
  openXShare({ url: pageUrl.value, title: recommendTitle.value })
  flash(t('share.opened'), true)
}

async function onSystemShare() {
  try {
    await systemShare({
      title: recommendTitle.value,
      text: profile.value.tagline,
      url: pageUrl.value,
    })
    flash(t('share.shared'), true)
  } catch (err) {
    if (err?.name === 'AbortError') return
    try {
      const ok = await copyText(pageUrl.value)
      flash(ok ? t('share.fallbackCopied') : t('share.systemUnavailable'), ok)
    } catch {
      flash(t('share.systemUnavailable'), false)
    }
  }
}

async function ensurePosterQr() {
  if (posterQr.value) return
  try {
    posterQr.value = await fetchQrDataUrl(pageUrl.value, 160)
  } catch {
    posterQr.value = qrSrc.value
  }
}

async function onGenerateLongImage() {
  if (capturing.value) return
  capturing.value = true
  try {
    await ensurePosterQr()
    await nextTick()
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    const el = posterRef.value?.getEl?.()
    if (!el) throw new Error('poster missing')
    const blob = await captureElementPng(el)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
    const fileName =
      posterMode.value === 'detailed' ? 'mohhen-about-detailed.png' : 'mohhen-about.png'
    const file = new File([blob], fileName, { type: 'image/png' })
    canShareImage.value = canShareFiles([file])
    previewOpen.value = true
    open.value = false
  } catch {
    flash(t('share.longImageFailed'), false)
  } finally {
    capturing.value = false
  }
}

function posterFileName() {
  return posterMode.value === 'detailed' ? 'mohhen-about-detailed.png' : 'mohhen-about.png'
}

function onDownloadImage() {
  if (!previewBlob.value) return
  downloadBlob(previewBlob.value, posterFileName())
}

async function onShareImage() {
  if (!previewBlob.value) return
  const file = new File([previewBlob.value], posterFileName(), { type: 'image/png' })
  try {
    await systemShare({
      title: recommendTitle.value,
      text: t('share.posterScan'),
      files: [file],
    })
  } catch (err) {
    if (err?.name === 'AbortError') return
    onDownloadImage()
  }
}

function closePreview() {
  previewOpen.value = false
}

function onKeydown(event) {
  if (event.key === 'Escape' && previewOpen.value) closePreview()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKeydown)
  if (hintTimer) clearTimeout(hintTimer)
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<style scoped>
.about-share {
  position: relative;
}

.share-btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  font-size: 0.82rem;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.share-btn:hover,
.share-trigger[aria-expanded='true'] {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.share-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  width: min(17.5rem, calc(100vw - 2rem));
  z-index: 30;
  padding: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(10px);
}

.share-panel-title {
  margin: 0 0 0.65rem;
  font-size: 0.88rem;
  font-weight: 650;
}

.share-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.share-action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--line);
  background: transparent;
  color: inherit;
  border-radius: 10px;
  padding: 0.5rem 0.55rem;
  font-size: 0.82rem;
  text-align: left;
}

.share-action:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.share-ico {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--stat-bg);
  color: var(--accent);
  flex-shrink: 0;
}

.share-long-btn {
  width: 100%;
  margin-top: 0.35rem;
  border: 1px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 650;
}

.share-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.share-mode-btn {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 10px;
  padding: 0.4rem 0.5rem;
  font-size: 0.8rem;
}

.share-mode-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  font-weight: 650;
}

.share-mode-hint {
  margin: 0.35rem 0 0;
  font-size: 0.74rem;
  text-align: center;
}

.share-long-btn:disabled {
  opacity: 0.65;
}

.share-qr {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--line);
  display: grid;
  justify-items: center;
  gap: 0.35rem;
}

.share-qr img {
  width: 132px;
  height: 132px;
  border-radius: 10px;
  background: #fff;
  padding: 0.35rem;
  border: 1px solid var(--line);
}

.share-qr p {
  margin: 0;
  font-size: 0.78rem;
  text-align: center;
}

.share-feedback {
  margin: 0.55rem 0 0;
  font-size: 0.82rem;
  color: var(--danger);
}

.share-feedback.ok {
  color: var(--accent);
}

.poster-host {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 750px;
  pointer-events: none;
  z-index: -1;
}

.long-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  padding: 1.25rem;
}

.long-panel {
  width: min(28rem, 100%);
  max-height: min(90vh, 52rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.long-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.long-close {
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
}

.long-preview {
  overflow: auto;
  max-height: min(62vh, 36rem);
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #0b1220;
}

.long-preview img {
  display: block;
  width: 100%;
  height: auto;
}

.long-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.long-hint {
  margin: 0;
  font-size: 0.82rem;
}
</style>
