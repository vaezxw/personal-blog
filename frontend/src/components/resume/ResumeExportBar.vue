<template>
  <div class="export-bar">
    <button
      type="button"
      class="primary"
      :disabled="busy || generating"
      @click="$emit('generate')"
    >
      {{ generating ? t('about.resumeGenerating') : generateLabel }}
    </button>
    <button type="button" :disabled="!canExport || busy" @click="$emit('export-pdf')">
      {{ t('about.resumeExportPdf') }}
    </button>
    <button type="button" :disabled="!canExport || busy" @click="$emit('export-md')">
      {{ t('about.resumeExportMd') }}
    </button>
    <button type="button" :disabled="!canExport || busy" @click="$emit('copy-md')">
      {{ copied ? t('about.resumeCopied') : t('about.resumeCopyMd') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  hasUpload: { type: Boolean, default: false },
  canExport: { type: Boolean, default: false },
  generating: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  copied: { type: Boolean, default: false },
})

defineEmits(['generate', 'export-pdf', 'export-md', 'copy-md'])

const { t } = useLocale()

const generateLabel = computed(() =>
  props.hasUpload ? t('about.resumeMerge') : t('about.resumeGenerate'),
)
</script>

<style scoped>
.export-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

button {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 999px;
  padding: 0.42rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

button.primary {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
  color: var(--accent);
}

button:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
