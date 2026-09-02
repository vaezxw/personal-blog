<template>
  <div class="tool-pane">
    <div class="tool-toolbar">
      <label class="tool-control tool-control--grow">
        <span>{{ t('tools.crypto.password') }}</span>
        <input v-model="password" type="password" autocomplete="off" />
      </label>
      <div class="tool-actions">
        <button class="btn ghost" type="button" @click="encrypt">{{ t('tools.crypto.encrypt') }}</button>
        <button class="btn ghost" type="button" @click="decrypt">{{ t('tools.crypto.decrypt') }}</button>
        <button class="btn" type="button" :disabled="!output" @click="downloadResult">
          {{ t('tools.common.download') }}
        </button>
      </div>
    </div>
    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea v-model="input" rows="14" :placeholder="t('tools.crypto.placeholder')"></textarea>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea v-model="output" rows="14" readonly></textarea>
      </div>
    </div>
    <p class="muted tool-note">{{ t('tools.crypto.note') }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { decryptText, encryptText } from '../../utils/cryptoTool.js'
import { downloadText } from '../../utils/download.js'

const { t } = useLocale()
const password = ref('')
const input = ref('')
const output = ref('')
const error = ref('')
const info = ref('')

async function encrypt() {
  error.value = ''
  info.value = ''
  try {
    output.value = await encryptText(input.value, password.value)
    info.value = t('tools.crypto.okEncrypt')
  } catch (err) {
    error.value = err.message || t('tools.crypto.failed')
  }
}

async function decrypt() {
  error.value = ''
  info.value = ''
  try {
    output.value = await decryptText(input.value, password.value)
    info.value = t('tools.crypto.okDecrypt')
  } catch {
    error.value = t('tools.crypto.badPassword')
  }
}

function downloadResult() {
  if (!output.value) return
  downloadText(output.value, 'crypto-result.txt')
}
</script>
