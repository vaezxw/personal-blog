<template>
  <div
    class="resume-upload"
    :class="{ dragover, hasFile: !!file }"
    @dragenter.prevent="onDrag(true)"
    @dragover.prevent="onDrag(true)"
    @dragleave.prevent="onDrag(false)"
    @drop.prevent="onDrop"
  >
    <input
      ref="inputRef"
      class="sr-only"
      type="file"
      accept=".pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
      @change="onPick"
    />

    <template v-if="!file">
      <p class="upload-title">{{ t('about.resumeUploadTitle') }}</p>
      <p class="muted upload-hint">{{ t('about.resumeUploadHint') }}</p>
      <button type="button" class="upload-btn" @click="inputRef?.click()">
        {{ t('about.resumeUploadPick') }}
      </button>
    </template>

    <template v-else>
      <div class="file-row">
        <div>
          <strong>{{ file.name }}</strong>
          <p class="muted">{{ prettySize(file.size) }}</p>
        </div>
        <button type="button" class="clear-btn" @click="clear">
          {{ t('about.resumeUploadClear') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  file: { type: Object, default: null },
})

const emit = defineEmits(['update:file'])
const { t } = useLocale()
const inputRef = ref(null)
const dragover = ref(false)

function prettySize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function onDrag(active) {
  dragover.value = active
}

function acceptFile(next) {
  if (!next) return
  emit('update:file', next)
  dragover.value = false
}

function onDrop(event) {
  dragover.value = false
  const next = event.dataTransfer?.files?.[0]
  acceptFile(next)
}

function onPick(event) {
  const next = event.target?.files?.[0]
  acceptFile(next)
  if (inputRef.value) inputRef.value.value = ''
}

function clear() {
  emit('update:file', null)
}
</script>

<style scoped>
.resume-upload {
  border: 1px dashed color-mix(in srgb, var(--accent) 35%, var(--line));
  border-radius: 14px;
  padding: 1rem;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.resume-upload.dragover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  transform: translateY(-1px);
}

.upload-title {
  margin: 0 0 0.35rem;
  font-weight: 650;
}

.upload-hint {
  margin: 0 0 0.85rem;
  font-size: 0.85rem;
  line-height: 1.5;
}

.upload-btn,
.clear-btn {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.upload-btn:hover,
.clear-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.file-row p {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
