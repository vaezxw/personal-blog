<template>
  <div class="rte" :class="{ uploading: uploadBusy }">
    <div class="rte-toolbar-wrap">
      <Toolbar
        :editor="editorRef"
        :default-config="toolbarConfig"
        mode="default"
      />
    </div>
    <div class="rte-body-wrap">
      <Editor
        :model-value="modelValue"
        :default-config="editorConfig"
        mode="default"
        @update:model-value="onChange"
        @on-created="onCreated"
      />
    </div>
    <div
      v-if="uploadBusy"
      class="rte-upload-mask"
      role="status"
      aria-live="polite"
    >
      <span class="rte-spinner" aria-hidden="true"></span>
      <p>{{ uploadMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { uploadImage, uploadVideo } from '../api.js'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  minHeight: { type: String, default: '360px' },
})

const emit = defineEmits(['update:modelValue'])
const { t } = useLocale()

const editorRef = shallowRef()
const uploadCount = ref(0)
const uploadKind = ref('image')
const uploadBusy = computed(() => uploadCount.value > 0)

const uploadMessage = computed(() =>
  uploadKind.value === 'video' ? t('admin.editorUploadingVideo') : t('admin.editorUploadingImage'),
)

async function withUploadBusy(kind, task) {
  uploadKind.value = kind
  uploadCount.value += 1
  try {
    await task()
  } finally {
    uploadCount.value = Math.max(0, uploadCount.value - 1)
  }
}

const toolbarConfig = {
  excludeKeys: ['fullScreen'],
}

const editorConfig = computed(() => ({
  placeholder: props.placeholder,
  autoFocus: false,
  scroll: true,
  MENU_CONF: {
    uploadImage: {
      maxFileSize: 5 * 1024 * 1024,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      async customUpload(file, insertFn) {
        await withUploadBusy('image', async () => {
          try {
            const { url } = await uploadImage(file)
            insertFn(url, file.name || 'image', url)
          } catch (err) {
            console.error('Image upload failed:', err)
          }
        })
      },
    },
    uploadVideo: {
      maxFileSize: 50 * 1024 * 1024,
      allowedFileTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      async customUpload(file, insertFn) {
        await withUploadBusy('video', async () => {
          try {
            const { url } = await uploadVideo(file)
            insertFn(url, '')
          } catch (err) {
            console.error('Video upload failed:', err)
          }
        })
      },
    },
  },
}))

function onCreated(editor) {
  editorRef.value = editor
}

function onChange(html) {
  emit('update:modelValue', html)
}

watch(
  () => props.modelValue,
  (next, prev) => {
    const editor = editorRef.value
    if (!editor) return
    if (next === prev) return
    if (next === editor.getHtml()) return
    editor.setHtml(next || '')
  },
)

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor) editor.destroy()
})
</script>

<style scoped>
.rte {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--input-bg);
}

.rte.uploading {
  pointer-events: none;
}

.rte-toolbar-wrap {
  border-bottom: 1px solid var(--line);
}

.rte-body-wrap :deep(.w-e-text-container) {
  min-height: v-bind(minHeight);
  background: var(--input-bg);
  color: var(--ink);
}

.rte-body-wrap :deep(.w-e-text-placeholder) {
  color: var(--muted);
  font-style: normal;
}

.rte-upload-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-content: center;
  gap: 0.65rem;
  justify-items: center;
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  color: var(--ink);
  text-align: center;
  padding: 1rem;
}

.rte-upload-mask p {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.rte-spinner {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  border: 2.5px solid color-mix(in srgb, var(--accent) 25%, var(--line));
  border-top-color: var(--accent);
  animation: rte-spin 0.75s linear infinite;
}

@keyframes rte-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rte-spinner {
    animation: none;
    border-top-color: var(--accent);
    opacity: 0.85;
  }
}
</style>
