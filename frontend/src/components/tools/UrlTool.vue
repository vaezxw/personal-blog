<template>
  <div class="tool-pane">
    <div class="tool-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'component' }"
        @click="mode = 'component'"
      >
        {{ t('tools.url.component') }}
      </button>
      <button
        type="button"
        role="tab"
        :class="{ active: mode === 'full' }"
        @click="mode = 'full'"
      >
        {{ t('tools.url.full') }}
      </button>
    </div>

    <div class="tool-toolbar">
      <div class="tool-actions">
        <button class="btn ghost" type="button" @click="encode">{{ t('tools.url.encode') }}</button>
        <button class="btn ghost" type="button" @click="decode">{{ t('tools.url.decode') }}</button>
        <button class="btn" type="button" :disabled="!output" @click="copyOutput">
          {{ t('tools.common.copy') }}
        </button>
      </div>
    </div>

    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea v-model="input" rows="12" :placeholder="t('tools.url.placeholder')"></textarea>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea v-model="output" rows="12" readonly></textarea>
      </div>
    </div>
    <p class="muted tool-note">{{ modeHint }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const { t } = useLocale()
const mode = ref('component')
const input = ref('')
const output = ref('')
const error = ref('')
const info = ref('')

const modeHint = computed(() =>
  mode.value === 'component' ? t('tools.url.componentHint') : t('tools.url.fullHint'),
)

function encode() {
  error.value = ''
  info.value = ''
  try {
    output.value =
      mode.value === 'component'
        ? encodeURIComponent(input.value)
        : encodeURI(input.value)
    info.value = t('tools.url.okEncode')
  } catch (err) {
    error.value = err.message || t('tools.url.failed')
  }
}

function decode() {
  error.value = ''
  info.value = ''
  try {
    output.value =
      mode.value === 'component'
        ? decodeURIComponent(input.value)
        : decodeURI(input.value)
    info.value = t('tools.url.okDecode')
  } catch {
    error.value = t('tools.url.badDecode')
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
