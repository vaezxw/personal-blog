<template>
  <div class="tool-pane">
    <div class="tool-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'toDate' }"
        @click="mode = 'toDate'"
      >
        {{ t('tools.timestamp.toDate') }}
      </button>
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'toTs' }"
        @click="mode = 'toTs'"
      >
        {{ t('tools.timestamp.toTs') }}
      </button>
    </div>

    <div class="tool-actions">
      <button class="btn ghost" type="button" @click="useNow">{{ t('tools.timestamp.now') }}</button>
      <button class="btn" type="button" @click="convert">{{ t('tools.timestamp.convert') }}</button>
      <button class="btn ghost" type="button" :disabled="!output" @click="copyOutput">
        {{ t('tools.common.copy') }}
      </button>
    </div>

    <div class="tool-field">
      <label>{{ t('tools.common.input') }}</label>
      <input
        v-if="mode === 'toTs'"
        v-model="datetimeInput"
        type="datetime-local"
        step="1"
      />
      <input v-else v-model="timestampInput" type="text" :placeholder="t('tools.timestamp.placeholder')" />
    </div>

    <div class="tool-field">
      <label>{{ t('tools.common.output') }}</label>
      <textarea v-model="output" rows="8" readonly></textarea>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const { t } = useLocale()
const mode = ref('toDate')
const timestampInput = ref('')
const datetimeInput = ref('')
const output = ref('')
const error = ref('')
const info = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}

function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function parseTimestamp(raw) {
  const text = String(raw || '').trim()
  if (!text) throw new Error(t('tools.timestamp.empty'))
  if (/^\d+$/.test(text)) {
    const num = Number(text)
    if (!Number.isFinite(num)) throw new Error(t('tools.timestamp.invalid'))
    return text.length >= 13 ? num : num * 1000
  }
  const parsed = Date.parse(text)
  if (Number.isNaN(parsed)) throw new Error(t('tools.timestamp.invalid'))
  return parsed
}

function useNow() {
  error.value = ''
  info.value = ''
  const now = new Date()
  if (mode.value === 'toDate') {
    timestampInput.value = String(now.getTime())
    convert()
  } else {
    datetimeInput.value = toLocalInputValue(now)
    convert()
  }
}

function convert() {
  error.value = ''
  info.value = ''
  try {
    if (mode.value === 'toDate') {
      const ms = parseTimestamp(timestampInput.value)
      const date = new Date(ms)
      output.value = [
        `${t('tools.timestamp.ms')}: ${ms}`,
        `${t('tools.timestamp.seconds')}: ${Math.floor(ms / 1000)}`,
        `${t('tools.timestamp.local')}: ${date.toLocaleString()}`,
        `${t('tools.timestamp.utc')}: ${date.toISOString()}`,
      ].join('\n')
    } else {
      if (!datetimeInput.value) throw new Error(t('tools.timestamp.empty'))
      const ms = new Date(datetimeInput.value).getTime()
      if (Number.isNaN(ms)) throw new Error(t('tools.timestamp.invalid'))
      output.value = [
        `${t('tools.timestamp.ms')}: ${ms}`,
        `${t('tools.timestamp.seconds')}: ${Math.floor(ms / 1000)}`,
        `${t('tools.timestamp.local')}: ${new Date(ms).toLocaleString()}`,
        `${t('tools.timestamp.utc')}: ${new Date(ms).toISOString()}`,
      ].join('\n')
    }
    info.value = t('tools.timestamp.ok')
  } catch (err) {
    output.value = ''
    error.value = err.message || t('tools.timestamp.invalid')
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

<style scoped>
.tool-field input[type='datetime-local'] {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--input-bg);
  color: var(--ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
