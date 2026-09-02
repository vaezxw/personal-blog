<template>
  <div class="tool-pane">
    <div class="tool-actions">
      <label class="tool-field inline">
        <span>{{ t('tools.hash.algorithm') }}</span>
        <select v-model="algorithm">
          <option v-for="item in algorithms" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="file-btn btn ghost">
        <input type="file" @change="onFile" />
        {{ t('tools.common.upload') }}
      </label>
      <button class="btn" type="button" :disabled="busy" @click="runHash">
        {{ busy ? t('tools.hash.running') : t('tools.hash.run') }}
      </button>
      <button class="btn ghost" type="button" :disabled="!output" @click="copyOutput">
        {{ t('tools.common.copy') }}
      </button>
    </div>

    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea v-model="input" rows="12" :placeholder="t('tools.hash.placeholder')"></textarea>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea v-model="output" rows="12" readonly></textarea>
      </div>
    </div>

    <p v-if="fileName" class="muted">{{ t('tools.hash.fileSelected', { name: fileName }) }}</p>
    <p class="muted tool-note">{{ t('tools.hash.note') }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { digestById, digestFileById, HASH_ALGORITHMS } from '../../utils/hashTool.js'

const { t } = useLocale()
const algorithms = HASH_ALGORITHMS
const algorithm = ref('SHA-256')
const input = ref('')
const output = ref('')
const fileRef = ref(null)
const fileName = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')

function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  fileRef.value = file || null
  fileName.value = file?.name || ''
  if (file) input.value = ''
}

async function runHash() {
  busy.value = true
  error.value = ''
  info.value = ''
  try {
    if (fileRef.value) {
      output.value = await digestFileById(algorithm.value, fileRef.value)
    } else {
      output.value = await digestById(algorithm.value, input.value)
    }
    info.value = t('tools.hash.ok')
  } catch (err) {
    output.value = ''
    error.value = err.message || t('tools.hash.failed')
  } finally {
    busy.value = false
  }
}

async function copyOutput() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    info.value = t('tools.common.copied')
  } catch {
    error.value = t('tools.common.copyFailed')
  }
}
</script>
