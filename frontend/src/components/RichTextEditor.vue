<template>
  <div class="rte" :class="{ 'rte--dark': isDark }">
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
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { uploadImage } from '../api.js'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  minHeight: { type: String, default: '360px' },
})

const emit = defineEmits(['update:modelValue'])

const { isDark } = useTheme()
const editorRef = shallowRef()

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
        try {
          const { url } = await uploadImage(file)
          insertFn(url, file.name || 'image', url)
        } catch (err) {
          console.error('Image upload failed:', err)
        }
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
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--input-bg);
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

.rte--dark :deep(.w-e-toolbar) {
  background: color-mix(in srgb, var(--input-bg) 92%, #000);
  border-color: var(--line);
}

.rte--dark :deep(.w-e-bar-item button) {
  color: var(--ink);
}

.rte--dark :deep(.w-e-bar-item button:hover) {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.rte--dark :deep(.w-e-bar-divider) {
  background: var(--line);
}

.rte--dark :deep(.w-e-drop-panel),
.rte--dark :deep(.w-e-panel-content-color),
.rte--dark :deep(.w-e-panel-content-emotion) {
  background: var(--input-bg);
  border-color: var(--line);
  color: var(--ink);
}
</style>
