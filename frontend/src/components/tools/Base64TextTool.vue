<template>
  <div class="tool-pane">
    <div class="tool-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'encode' }"
        @click="mode = 'encode'"
      >
        {{ t('tools.base64Text.encode') }}
      </button>
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'decode' }"
        @click="mode = 'decode'"
      >
        {{ t('tools.base64Text.decode') }}
      </button>
    </div>

    <div class="tool-actions">
      <button class="btn ghost" type="button" @click="run">{{ t('tools.base64Text.run') }}</button>
      <button class="btn" type="button" :disabled="!output" @click="copyOutput">
        {{ t('tools.common.copy') }}
      </button>
      <button class="btn ghost" type="button" :disabled="!output" @click="downloadOutput">
        {{ t('tools.common.download') }}
      </button>
    </div>

    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea v-model="input" rows="12" :placeholder="t('tools.base64Text.placeholder')"></textarea>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea v-model="output" rows="12" readonly></textarea>
      </div>
    </div>
    <p class="muted tool-note">{{ t('tools.base64Text.note') }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { decodeBase64Text, encodeBase64Text } from '../../utils/base64Text.js'
import { downloadText } from '../../utils/download.js'

const { t } = useLocale()
const mode = ref('encode')
const input = ref('')
const output = ref('')
const error = ref('')
const info = ref('')

function run() {
  error.value = ''
  info.value = ''
  try {
    output.value =
      mode.value === 'encode' ? encodeBase64Text(input.value) : decodeBase64Text(input.value)
    info.value =
      mode.value === 'encode' ? t('tools.base64Text.okEncode') : t('tools.base64Text.okDecode')
  } catch {
    error.value = t('tools.base64Text.invalid')
    output.value = ''
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

function downloadOutput() {
  if (!output.value) return
  const name = mode.value === 'encode' ? 'encoded-base64.txt' : 'decoded.txt'
  downloadText(output.value, name)
}
</script>
