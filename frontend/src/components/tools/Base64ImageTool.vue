<template>
  <div class="tool-pane">
    <div class="tool-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'encode' }"
        @click="mode = 'encode'"
      >
        {{ t('tools.base64.encode') }}
      </button>
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'decode' }"
        @click="mode = 'decode'"
      >
        {{ t('tools.base64.decode') }}
      </button>
    </div>

    <template v-if="mode === 'encode'">
      <div class="tool-actions">
        <label class="file-btn btn ghost">
          <input type="file" accept="image/*" @change="onImageUpload" />
          {{ t('tools.base64.pickImage') }}
        </label>
        <button class="btn" type="button" :disabled="!base64Out" @click="copyBase64">
          {{ t('tools.common.copy') }}
        </button>
        <button class="btn ghost" type="button" :disabled="!base64Out" @click="downloadBase64">
          {{ t('tools.common.download') }}
        </button>
      </div>
      <div class="tool-grid tool-grid--preview">
        <div class="tool-field">
          <label>{{ t('tools.base64.preview') }}</label>
          <div class="preview-box">
            <img v-if="previewUrl" :src="previewUrl" alt="" />
            <p v-else class="muted">{{ t('tools.base64.noImage') }}</p>
          </div>
        </div>
        <div class="tool-field">
          <label>Base64</label>
          <textarea v-model="base64Out" rows="14" readonly></textarea>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="tool-actions">
        <label class="file-btn btn ghost">
          <input type="file" accept=".txt,text/plain" @change="onBase64File" />
          {{ t('tools.common.upload') }}
        </label>
        <button class="btn ghost" type="button" @click="decodeBase64">{{ t('tools.base64.decodeBtn') }}</button>
        <button class="btn" type="button" :disabled="!decodedBlob" @click="downloadImage">
          {{ t('tools.base64.saveImage') }}
        </button>
      </div>
      <div class="tool-grid tool-grid--preview">
        <div class="tool-field">
          <label>Base64</label>
          <textarea v-model="base64In" rows="14" :placeholder="t('tools.base64.placeholder')"></textarea>
        </div>
        <div class="tool-field">
          <label>{{ t('tools.base64.preview') }}</label>
          <div class="preview-box">
            <img v-if="decodedPreview" :src="decodedPreview" alt="" />
            <p v-else class="muted">{{ t('tools.base64.noPreview') }}</p>
          </div>
        </div>
      </div>
    </template>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { downloadBlob, downloadText, readFileAsText } from '../../utils/download.js'

const { t } = useLocale()
const mode = ref('encode')
const previewUrl = ref('')
const base64Out = ref('')
const base64In = ref('')
const decodedPreview = ref('')
const decodedBlob = ref(null)
const error = ref('')
const info = ref('')

function onImageUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  error.value = ''
  info.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    previewUrl.value = result
    base64Out.value = result
    info.value = t('tools.base64.okEncode')
  }
  reader.onerror = () => {
    error.value = t('tools.common.readFailed')
  }
  reader.readAsDataURL(file)
}

async function copyBase64() {
  if (!base64Out.value) return
  try {
    await navigator.clipboard.writeText(base64Out.value)
    info.value = t('tools.common.copied')
  } catch {
    error.value = t('tools.common.copyFailed')
  }
}

function downloadBase64() {
  if (!base64Out.value) return
  downloadText(base64Out.value, 'image-base64.txt')
}

async function onBase64File(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  base64In.value = await readFileAsText(file)
  decodeBase64()
}

function normalizeBase64(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  const comma = text.indexOf(',')
  return comma >= 0 ? text.slice(comma + 1) : text
}

function decodeBase64() {
  error.value = ''
  info.value = ''
  decodedPreview.value = ''
  decodedBlob.value = null
  try {
    const payload = normalizeBase64(base64In.value)
    if (!payload) throw new Error(t('tools.base64.empty'))
    const bin = atob(payload)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'image/png' })
    decodedBlob.value = blob
    decodedPreview.value = URL.createObjectURL(blob)
    info.value = t('tools.base64.okDecode')
  } catch (err) {
    error.value = err.message || t('tools.base64.invalid')
  }
}

function downloadImage() {
  if (!decodedBlob.value) return
  downloadBlob(decodedBlob.value, 'decoded-image.png')
}
</script>
