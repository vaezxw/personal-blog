<template>
  <div class="tool-pane">
    <div class="tool-toolbar">
      <label class="tool-control tool-control--grow">
        <span>{{ t('tools.regex.pattern') }}</span>
        <input v-model="pattern" type="text" :placeholder="t('tools.regex.patternPlaceholder')" />
      </label>
      <div class="tool-control">
        <span>{{ t('tools.regex.flags') }}</span>
        <div class="flag-row">
          <label v-for="flag in flagOptions" :key="flag" class="tool-check compact">
            <input v-model="flags" type="checkbox" :value="flag" />
            {{ flag }}
          </label>
        </div>
      </div>
      <div class="tool-actions">
        <button class="btn" type="button" @click="runTest">{{ t('tools.regex.test') }}</button>
        <button class="btn ghost" type="button" :disabled="!pattern" @click="runReplace">
          {{ t('tools.regex.replace') }}
        </button>
      </div>
    </div>

    <div class="tool-field">
      <label>{{ t('tools.regex.testText') }}</label>
      <textarea v-model="testText" rows="8" :placeholder="t('tools.regex.testPlaceholder')"></textarea>
    </div>

    <div class="tool-field">
      <label>{{ t('tools.regex.replaceWith') }}</label>
      <input v-model="replaceWith" type="text" :placeholder="t('tools.regex.replacePlaceholder')" />
    </div>

    <div v-if="matches.length" class="regex-summary ok">
      {{ t('tools.regex.matchCount', { count: matches.length }) }}
    </div>

    <ul v-if="matches.length" class="regex-matches">
      <li v-for="(match, index) in matches" :key="index">
        <span class="mono">#{{ index + 1 }}</span>
        <code>{{ match.text }}</code>
        <span class="muted">{{ t('tools.regex.at', { index: match.index }) }}</span>
        <span v-if="match.groups.length" class="muted">
          · {{ t('tools.regex.groups') }}: {{ match.groups.join(', ') }}
        </span>
      </li>
    </ul>

    <div v-if="replaceResult !== null" class="tool-field">
      <label>{{ t('tools.regex.replaceResult') }}</label>
      <textarea v-model="replaceResult" rows="8" readonly></textarea>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const { t } = useLocale()
const pattern = ref('')
const flags = ref(['g'])
const flagOptions = ['g', 'i', 'm', 's', 'u', 'y']
const testText = ref('')
const replaceWith = ref('')
const matches = ref([])
const replaceResult = ref(null)
const error = ref('')

function buildRegex() {
  const flagStr = flags.value.join('')
  return new RegExp(pattern.value, flagStr)
}

function collectMatches(regex, text) {
  const list = []
  if (!flags.value.includes('g')) {
    const match = regex.exec(text)
    if (match) {
      list.push({
        text: match[0],
        index: match.index,
        groups: (match.slice(1) || []).map((g) => String(g)),
      })
    }
    return list
  }
  let match = regex.exec(text)
  while (match) {
    list.push({
      text: match[0],
      index: match.index,
      groups: (match.slice(1) || []).map((g) => String(g)),
    })
    if (match[0] === '') regex.lastIndex += 1
    match = regex.exec(text)
  }
  return list
}

function runTest() {
  error.value = ''
  replaceResult.value = null
  matches.value = []
  if (!pattern.value) {
    error.value = t('tools.regex.noPattern')
    return
  }
  try {
    const regex = buildRegex()
    matches.value = collectMatches(regex, testText.value)
  } catch (err) {
    error.value = err.message || t('tools.regex.invalid')
  }
}

function runReplace() {
  error.value = ''
  if (!pattern.value) {
    error.value = t('tools.regex.noPattern')
    return
  }
  try {
    const regex = buildRegex()
    replaceResult.value = testText.value.replace(regex, replaceWith.value)
    runTest()
  } catch (err) {
    error.value = err.message || t('tools.regex.invalid')
  }
}
</script>

<style scoped>
.flag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.75rem;
  min-height: 2.55rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--input-bg);
}

.tool-check.compact {
  min-height: auto;
  padding: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.regex-summary {
  margin: 0;
  font-size: 0.92rem;
}

.regex-matches {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.regex-matches li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem 0.65rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: color-mix(in srgb, var(--input-bg) 92%, transparent);
}

.regex-matches code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  word-break: break-all;
}
</style>
