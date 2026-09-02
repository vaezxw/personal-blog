<template>
  <div class="tool-pane">
    <div class="tool-toolbar">
      <div class="tool-actions">
        <label class="tool-control">
          <span>{{ t('tools.translate.from') }}</span>
          <select v-model="fromLang">
            <option value="auto">{{ t('tools.translate.auto') }}</option>
            <option value="zh-CN">{{ t('tools.translate.zh') }}</option>
            <option value="en">{{ t('tools.translate.en') }}</option>
          </select>
        </label>
        <button class="btn ghost" type="button" :title="t('tools.translate.swap')" @click="swapLang">
          ⇄
        </button>
        <label class="tool-control">
          <span>{{ t('tools.translate.to') }}</span>
          <select v-model="toLang">
            <option value="zh-CN">{{ t('tools.translate.zh') }}</option>
            <option value="en">{{ t('tools.translate.en') }}</option>
          </select>
        </label>
        <button class="btn" type="button" :disabled="busy || !input.trim()" @click="runTranslate">
          {{ busy ? t('tools.translate.working') : t('tools.translate.run') }}
        </button>
        <button class="btn ghost" type="button" :disabled="!output" @click="copyOutput">
          {{ t('tools.common.copy') }}
        </button>
      </div>
    </div>

    <div class="tool-grid">
      <div class="tool-field">
        <label>{{ t('tools.common.input') }}</label>
        <textarea
          v-model="input"
          rows="12"
          :placeholder="t('tools.translate.placeholder')"
          maxlength="4500"
        ></textarea>
        <p class="muted tool-note">{{ t('tools.translate.limit', { count: input.length }) }}</p>
      </div>
      <div class="tool-field">
        <label>{{ t('tools.common.output') }}</label>
        <textarea
          v-model="output"
          rows="12"
          readonly
          :placeholder="t('tools.common.outputHint')"
        ></textarea>
      </div>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="info" class="ok">{{ info }}</p>
    <p class="muted tool-note">{{ t('tools.translate.note') }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { translateText } from '../../api.js'
import { useLocale } from '../../composables/useLocale.js'

const { t } = useLocale()
const input = ref('')
const output = ref('')
const fromLang = ref('auto')
const toLang = ref('en')
const busy = ref(false)
const error = ref('')
const info = ref('')

function swapLang() {
  if (fromLang.value === 'auto') {
    fromLang.value = toLang.value
    toLang.value = toLang.value === 'en' ? 'zh-CN' : 'en'
    return
  }
  const nextFrom = toLang.value
  const nextTo = fromLang.value === 'auto' ? 'en' : fromLang.value
  fromLang.value = nextFrom
  toLang.value = nextTo
  if (output.value && input.value) {
    const tmp = input.value
    input.value = output.value
    output.value = tmp
  }
}

async function runTranslate() {
  error.value = ''
  info.value = ''
  const text = input.value.trim()
  if (!text) return
  busy.value = true
  try {
    const data = await translateText({
      text,
      from: fromLang.value,
      to: toLang.value,
    })
    output.value = data.text || ''
    info.value = t('tools.translate.ok', {
      from: data.detected || fromLang.value,
      to: data.to || toLang.value,
    })
  } catch (err) {
    error.value = err.message || t('tools.translate.failed')
    output.value = ''
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
