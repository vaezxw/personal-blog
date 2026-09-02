<template>
  <div class="tool-pane">
    <div class="tool-toolbar">
      <div class="tool-actions">
        <label class="file-btn btn ghost">
          <input type="file" accept=".json,application/json" @change="onUpload" />
          {{ t('tools.common.upload') }}
        </label>
        <button class="btn ghost" type="button" @click="formatJson">{{ t('tools.json.format') }}</button>
        <button class="btn ghost" type="button" @click="minifyJson">{{ t('tools.json.minify') }}</button>
        <button class="btn" type="button" :disabled="!output" @click="downloadResult">
          {{ t('tools.common.download') }}
        </button>
      </div>
    </div>
    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea v-model="input" rows="14" :placeholder="t('tools.json.placeholder')"></textarea>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea v-model="output" rows="14" readonly :placeholder="t('tools.common.outputHint')"></textarea>
      </div>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { downloadText, readFileAsText } from '../../utils/download.js'

const { t } = useLocale()
const input = ref('')
const output = ref('')
const error = ref('')
const info = ref('')

function parseInput() {
  error.value = ''
  return JSON.parse(input.value)
}

function formatJson() {
  info.value = ''
  try {
    output.value = JSON.stringify(parseInput(), null, 2)
    info.value = t('tools.json.okFormat')
  } catch (err) {
    error.value = err.message || t('tools.json.invalid')
    output.value = ''
  }
}

function minifyJson() {
  info.value = ''
  try {
    output.value = JSON.stringify(parseInput())
    info.value = t('tools.json.okMinify')
  } catch (err) {
    error.value = err.message || t('tools.json.invalid')
    output.value = ''
  }
}

async function onUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    input.value = await readFileAsText(file)
    formatJson()
  } catch {
    error.value = t('tools.common.readFailed')
  }
}

function downloadResult() {
  if (!output.value) return
  downloadText(output.value, 'formatted.json', 'application/json;charset=utf-8')
}
</script>
