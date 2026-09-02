<template>
  <div class="tool-pane">
    <div class="tool-actions">
      <label class="tool-field inline">
        <span>{{ t('tools.uuid.count') }}</span>
        <select v-model.number="count">
          <option v-for="n in counts" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="uppercase" type="checkbox" />
        {{ t('tools.uuid.uppercase') }}
      </label>
      <button class="btn" type="button" @click="generate">{{ t('tools.uuid.generate') }}</button>
      <button class="btn ghost" type="button" :disabled="!output" @click="copyOutput">
        {{ t('tools.common.copy') }}
      </button>
      <button class="btn ghost" type="button" :disabled="!output" @click="downloadOutput">
        {{ t('tools.common.download') }}
      </button>
    </div>

    <div class="tool-field">
      <label>{{ t('tools.common.output') }}</label>
      <textarea v-model="output" rows="14" readonly :placeholder="t('tools.uuid.placeholder')"></textarea>
    </div>
    <p class="muted tool-note">{{ t('tools.uuid.note') }}</p>
    <p v-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { downloadText } from '../../utils/download.js'

const { t } = useLocale()
const counts = [1, 5, 10, 20, 50]
const count = ref(5)
const uppercase = ref(false)
const output = ref('')
const info = ref('')

function formatUuid(value) {
  return uppercase.value ? value.toUpperCase() : value
}

function generate() {
  const list = Array.from({ length: count.value }, () => formatUuid(crypto.randomUUID()))
  output.value = list.join('\n')
  info.value = t('tools.uuid.ok', { count: list.length })
}

async function copyOutput() {
  if (!output.value) return
  try {
    await navigator.clipboard.writeText(output.value)
    info.value = t('tools.common.copied')
  } catch {
    info.value = ''
  }
}

function downloadOutput() {
  if (!output.value) return
  downloadText(output.value, 'uuids.txt')
}
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.92rem;
  color: var(--muted);
}
</style>
