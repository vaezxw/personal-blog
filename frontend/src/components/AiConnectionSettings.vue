<template>
  <section class="ai-settings panel" aria-labelledby="ai-settings-title">
    <header class="ai-settings-head">
      <div>
        <p class="eyebrow">{{ t('ai.eyebrow') }}</p>
        <h2 id="ai-settings-title">{{ t('ai.settingsTitle') }}</h2>
        <p class="muted">{{ t('ai.settingsLede') }}</p>
      </div>
      <RouterLink class="btn ghost small" to="/chat">{{ t('ai.openChat') }}</RouterLink>
    </header>

    <p v-if="loadError" class="error" role="alert">{{ loadError }}</p>

    <section class="cursor-relay-card" aria-labelledby="cursor-relay-title">
      <div class="cursor-relay-head">
        <div>
          <div class="ai-connection-title">
            <strong id="cursor-relay-title">{{ t('ai.cursorTitle') }}</strong>
            <span class="cursor-relay-pill" :class="{ active: cursorConfig.enabled }">
              {{ cursorConfig.enabled ? t('ai.cursorEnabled') : t('ai.cursorNotConfigured') }}
            </span>
          </div>
          <p class="muted cursor-relay-lede">{{ t('ai.cursorLede') }}</p>
        </div>
      </div>

      <div class="cursor-relay-grid">
        <label class="ai-field">
          <span>{{ t('ai.cursorRelayUrl') }}</span>
          <input v-model.trim="cursorConfig.relayUrl" :placeholder="DEFAULT_RELAY_URL" inputmode="url" autocomplete="url" />
        </label>
        <label class="ai-field">
          <span>{{ t('ai.cursorModelOptional') }}</span>
          <input v-model.trim="cursorConfig.model" placeholder="Cursor default" autocomplete="off" />
        </label>
        <label class="ai-field ai-field-wide">
          <span>{{ t('ai.cursorToken') }}</span>
          <input v-model="cursorConfig.token" type="password" autocomplete="new-password" :placeholder="t('ai.cursorTokenPlaceholder')" />
        </label>
      </div>

      <p class="muted cursor-relay-hint">
        {{ t('ai.cursorPathHint') }}
        <code>node frontend/tools/cursor-agent-relay.mjs --cli "...agent.cmd"</code>
      </p>
      <p v-if="cursorFeedback" class="ai-feedback" :class="cursorFeedbackKind" role="status">
        {{ cursorFeedback }}
      </p>
      <div class="ai-form-actions">
        <button class="btn ghost" type="button" @click="saveCursorConfig">
          {{ t('ai.cursorSave') }}
        </button>
        <button class="btn" type="button" :disabled="cursorTesting" @click="testCursorRelay">
          {{ cursorTesting ? t('ai.cursorChecking') : t('ai.cursorCheck') }}
        </button>
        <button v-if="cursorConfig.enabled" class="btn ghost" type="button" @click="disableCursorRelay">
          {{ t('ai.cursorDisable') }}
        </button>
      </div>
    </section>

    <div v-if="connections.length" class="ai-connection-list">
      <article
        v-for="connection in connections"
        :key="connection.id"
        class="ai-connection-card"
        :class="{ default: connection.isDefault }"
      >
        <div class="ai-connection-main">
          <div class="ai-connection-title">
            <strong>{{ connection.name }}</strong>
            <span v-if="connection.isDefault" class="ai-default-pill">{{ t('ai.default') }}</span>
          </div>
          <p class="muted ai-connection-model">{{ connection.model }}</p>
          <p class="muted ai-connection-url">{{ connection.baseUrl }}</p>
          <p class="muted ai-connection-key mono">{{ connection.apiKeyMasked }}</p>
          <p v-if="connection.lastTestStatus === 'error'" class="error ai-test-error">
            {{ connection.lastTestError || t('ai.testFailed') }}
          </p>
        </div>
        <div class="ai-connection-actions">
          <button
            v-if="!connection.isDefault"
            class="btn ghost small"
            type="button"
            :disabled="busyId === connection.id"
            @click="setDefault(connection)"
          >
            {{ t('ai.setDefault') }}
          </button>
          <button class="btn ghost small" type="button" @click="editConnection(connection)">
            {{ t('ai.editConfig') }}
          </button>
          <button
            class="btn ghost small danger-text"
            type="button"
            :disabled="busyId === connection.id"
            @click="removeConnection(connection)"
          >
            {{ t('ai.remove') }}
          </button>
        </div>
      </article>
    </div>
    <p v-else-if="!loading" class="muted ai-empty">{{ t('ai.emptyConnections') }}</p>

    <button v-if="!editing" class="btn ai-add-button" type="button" @click="newConnection">
      + {{ t('ai.addConnection') }}
    </button>

    <form v-if="editing" class="ai-connection-form" @submit.prevent="saveConnection">
      <div class="ai-form-head">
        <h3>{{ editing.id ? t('ai.editConnection') : t('ai.addConnection') }}</h3>
        <button class="btn ghost small" type="button" @click="cancelEdit">{{ t('dm.back') }}</button>
      </div>

      <div class="ai-form-grid">
        <label class="ai-field">
          <span>{{ t('ai.preset') }}</span>
          <select v-model="editing.preset" @change="applyPreset">
            <option v-for="preset in presets" :key="preset.id" :value="preset.id">
              {{ preset.name }}
            </option>
            <option value="custom">{{ t('ai.custom') }}</option>
          </select>
        </label>
        <label class="ai-field">
          <span>{{ t('ai.name') }} <small>({{ t('ai.required') }})</small></span>
          <input v-model.trim="editing.name" required maxlength="80" autocomplete="off" />
        </label>
        <label class="ai-field ai-field-wide">
          <span>{{ t('ai.baseUrl') }} <small>({{ t('ai.required') }})</small></span>
          <input
            v-model.trim="editing.baseUrl"
            required
            maxlength="500"
            inputmode="url"
            autocomplete="url"
            placeholder="https://api.example.com/v1"
          />
        </label>
        <label class="ai-field">
          <span>{{ t('ai.modelName') }} <small>({{ t('ai.required') }})</small></span>
          <input v-model.trim="editing.model" required maxlength="200" autocomplete="off" />
        </label>
        <label class="ai-field ai-field-wide">
          <span>{{ t('ai.apiKey') }} <small v-if="!editing.id">({{ t('ai.required') }})</small></span>
          <div class="ai-key-field">
            <input
              v-model="editing.apiKey"
              :type="showKey ? 'text' : 'password'"
              :required="!editing.id"
              maxlength="5000"
              autocomplete="new-password"
              :placeholder="editing.id ? t('ai.keySaved') : 'sk-…'"
            />
            <button
              class="password-toggle"
              type="button"
              :aria-label="showKey ? t('admin.hidePassword') : t('admin.showPassword')"
              @click="showKey = !showKey"
            >
              {{ showKey ? t('admin.hidePassword') : t('admin.showPassword') }}
            </button>
          </div>
        </label>
      </div>

      <p class="muted ai-form-hint">{{ t('ai.keyHint') }}</p>
      <p v-if="formError" class="error" role="alert">{{ formError }}</p>
      <p v-if="feedback" class="ai-feedback" :class="feedbackKind" role="status">{{ feedback }}</p>

      <div class="ai-form-actions">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? t('ai.saving') : t('ai.save') }}
        </button>
        <button
          v-if="editing.id"
          class="btn ghost"
          type="button"
          :disabled="testing"
          @click="testConnection"
        >
          {{ testing ? t('ai.testing') : t('ai.test') }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  createAiConnection,
  deleteAiConnection,
  fetchAiConnections,
  testAiConnection,
  updateAiConnection,
} from '../api.js'
import { useLocale } from '../composables/useLocale.js'
import {
  checkCursorRelay,
  DEFAULT_RELAY_URL,
  getCursorRelayConfig,
  saveCursorRelayConfig,
} from '../utils/cursorAgent.js'
import { AI_PROVIDER_PRESETS } from '../utils/aiProviders.js'

const emit = defineEmits(['saved'])
const { t } = useLocale()
const presets = AI_PROVIDER_PRESETS
const connections = ref([])
const loading = ref(true)
const loadError = ref('')
const formError = ref('')
const feedback = ref('')
const feedbackKind = ref('success')
const saving = ref(false)
const testing = ref(false)
const busyId = ref('')
const showKey = ref(false)
const editing = ref(null)
const cursorConfig = reactive(getCursorRelayConfig())
const cursorTesting = ref(false)
const cursorFeedback = ref('')
const cursorFeedbackKind = ref('success')

function presetFor(connection) {
  return presets.find((preset) => preset.baseUrl === connection.baseUrl)?.id || 'custom'
}

function blankConnection() {
  const preset = presets[0]
  return {
    id: '',
    preset: preset.id,
    name: preset.name,
    baseUrl: preset.baseUrl,
    model: preset.model,
    apiKey: '',
    isDefault: false,
  }
}

async function loadConnections() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await fetchAiConnections()
    connections.value = data.connections || []
  } catch (error) {
    loadError.value = error.message || t('ai.loadFailed')
  } finally {
    loading.value = false
  }
}

function newConnection() {
  editing.value = blankConnection()
  showKey.value = false
  formError.value = ''
  feedback.value = ''
}

function saveCursorConfig() {
  try {
    const saved = saveCursorRelayConfig({ ...cursorConfig, enabled: true })
    Object.assign(cursorConfig, saved)
    cursorFeedback.value = t('ai.cursorSaved')
    cursorFeedbackKind.value = 'success'
    window.dispatchEvent(new CustomEvent('mohhen-cursor-relay-change'))
  } catch (error) {
    cursorFeedback.value = error.message || t('ai.cursorSetupFailed')
    cursorFeedbackKind.value = 'error'
  }
}

async function testCursorRelay() {
  cursorTesting.value = true
  cursorFeedback.value = ''
  try {
    const saved = saveCursorRelayConfig({ ...cursorConfig, enabled: true })
    const info = await checkCursorRelay(saved)
    Object.assign(cursorConfig, saved)
    cursorFeedback.value = t('ai.cursorConnected', { cli: info.cliName || 'agent' })
    cursorFeedbackKind.value = 'success'
    window.dispatchEvent(new CustomEvent('mohhen-cursor-relay-change'))
  } catch (error) {
    cursorFeedback.value = error.message || t('ai.cursorSetupFailed')
    cursorFeedbackKind.value = 'error'
  } finally {
    cursorTesting.value = false
  }
}

function disableCursorRelay() {
  const saved = saveCursorRelayConfig({ ...cursorConfig, enabled: false })
  Object.assign(cursorConfig, saved)
  cursorFeedback.value = t('ai.cursorDisabled')
  cursorFeedbackKind.value = 'success'
  window.dispatchEvent(new CustomEvent('mohhen-cursor-relay-change'))
}

function editConnection(connection) {
  editing.value = {
    id: connection.id,
    preset: presetFor(connection),
    name: connection.name,
    baseUrl: connection.baseUrl,
    model: connection.model,
    apiKey: '',
    isDefault: connection.isDefault,
  }
  showKey.value = false
  formError.value = ''
  feedback.value = ''
}

function cancelEdit() {
  editing.value = null
  formError.value = ''
  feedback.value = ''
}

function applyPreset() {
  const preset = presets.find((item) => item.id === editing.value?.preset)
  if (!preset) return
  editing.value.name = preset.name
  editing.value.baseUrl = preset.baseUrl
  editing.value.model = preset.model
}

async function saveConnection() {
  if (!editing.value) return
  saving.value = true
  formError.value = ''
  feedback.value = ''
  try {
    const body = {
      name: editing.value.name,
      baseUrl: editing.value.baseUrl,
      model: editing.value.model,
      isDefault: editing.value.isDefault,
    }
    if (editing.value.apiKey.trim()) body.apiKey = editing.value.apiKey.trim()
    const data = editing.value.id
      ? await updateAiConnection(editing.value.id, body)
      : await createAiConnection({ ...body, apiKey: editing.value.apiKey.trim() })
    feedback.value = t('ai.saved')
    feedbackKind.value = 'success'
    await loadConnections()
    editing.value = {
      ...editing.value,
      id: data.connection.id,
      apiKey: '',
      isDefault: data.connection.isDefault,
    }
    emit('saved', data.connection)
  } catch (error) {
    formError.value = error.message || t('ai.loadFailed')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!editing.value?.id) return
  testing.value = true
  formError.value = ''
  feedback.value = ''
  try {
    await testAiConnection(editing.value.id)
    feedback.value = t('ai.tested')
    feedbackKind.value = 'success'
    await loadConnections()
  } catch (error) {
    formError.value = error.message || t('ai.testFailed')
    feedbackKind.value = 'error'
  } finally {
    testing.value = false
  }
}

async function setDefault(connection) {
  busyId.value = connection.id
  try {
    await updateAiConnection(connection.id, { isDefault: true })
    await loadConnections()
  } catch (error) {
    loadError.value = error.message || t('ai.loadFailed')
  } finally {
    busyId.value = ''
  }
}

async function removeConnection(connection) {
  if (!window.confirm(t('ai.confirmDeleteConnection', { name: connection.name }))) return
  busyId.value = connection.id
  try {
    await deleteAiConnection(connection.id)
    if (editing.value?.id === connection.id) editing.value = null
    await loadConnections()
    feedback.value = t('ai.deleted')
    feedbackKind.value = 'success'
  } catch (error) {
    loadError.value = error.message || t('ai.loadFailed')
  } finally {
    busyId.value = ''
  }
}

onMounted(loadConnections)
</script>

<style scoped>
.ai-settings {
  display: grid;
  gap: 1rem;
}

.ai-settings-head,
.ai-form-head,
.ai-connection-title,
.ai-connection-actions,
.ai-form-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ai-settings-head,
.ai-form-head {
  justify-content: space-between;
  gap: 1rem;
}

.ai-settings-head h2,
.ai-form-head h3 {
  margin: 0.15rem 0 0.25rem;
}

.ai-settings-head p:last-child {
  margin: 0;
  max-width: 52rem;
}

.cursor-relay-card {
  display: grid;
  gap: 0.85rem;
  padding: 0.95rem;
  border: 1px solid color-mix(in srgb, var(--accent) 38%, var(--line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 6%, var(--input-bg));
}

.cursor-relay-head,
.cursor-relay-head .ai-connection-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.cursor-relay-lede,
.cursor-relay-hint {
  margin: 0.28rem 0 0;
  font-size: 0.82rem;
  line-height: 1.5;
}

.cursor-relay-pill {
  padding: 0.12rem 0.42rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.72rem;
}

.cursor-relay-pill.active {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.cursor-relay-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.cursor-relay-grid .ai-field-wide {
  grid-column: span 2;
}

.cursor-relay-hint code {
  display: inline-block;
  max-width: 100%;
  margin-top: 0.35rem;
  padding: 0.18rem 0.35rem;
  overflow-wrap: anywhere;
  border-radius: 5px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--ink);
  font-size: 0.75rem;
}

.ai-connection-list {
  display: grid;
  gap: 0.65rem;
}

.ai-connection-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--input-bg) 72%, transparent);
}

.ai-connection-card.default {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
}

.ai-connection-title strong {
  font-size: 0.98rem;
}

.ai-default-pill {
  padding: 0.12rem 0.42rem;
  border-radius: 999px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 13%, transparent);
  font-size: 0.72rem;
}

.ai-connection-model,
.ai-connection-url,
.ai-connection-key,
.ai-test-error {
  margin: 0.2rem 0 0;
  overflow-wrap: anywhere;
}

.ai-connection-url,
.ai-connection-key {
  font-size: 0.78rem;
}

.ai-connection-actions {
  align-items: flex-start;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ai-empty {
  margin: 0;
  padding: 0.8rem 0;
}

.ai-add-button {
  justify-self: start;
}

.ai-connection-form {
  display: grid;
  gap: 0.85rem;
  padding-top: 0.95rem;
  border-top: 1px solid var(--line);
}

.ai-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.ai-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.ai-field-wide {
  grid-column: span 2;
}

.ai-field > span {
  color: var(--muted);
  font-size: 0.82rem;
}

.ai-field small {
  font-size: 0.75rem;
}

.ai-field input,
.ai-field select {
  min-height: 2.55rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--ink);
}

.ai-field input:focus,
.ai-field select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.ai-key-field {
  position: relative;
}

.ai-key-field input {
  width: 100%;
  padding-right: 2.8rem;
}

.password-toggle {
  position: absolute;
  right: 0.3rem;
  top: 50%;
  width: auto;
  min-width: 2.2rem;
  height: 2.2rem;
  padding: 0 0.3rem;
  transform: translateY(-50%);
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 0.72rem;
  white-space: nowrap;
  cursor: pointer;
}

.ai-form-hint,
.ai-feedback {
  margin: 0;
  font-size: 0.84rem;
}

.ai-feedback.success {
  color: var(--accent);
}

.ai-feedback.error {
  color: var(--danger);
}

.danger-text {
  color: var(--danger);
}

@media (max-width: 680px) {
  .ai-settings-head,
  .ai-connection-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .ai-connection-actions {
    justify-content: flex-start;
  }

  .ai-form-grid {
    grid-template-columns: 1fr;
  }

  .cursor-relay-grid {
    grid-template-columns: 1fr;
  }

  .cursor-relay-grid .ai-field-wide {
    grid-column: auto;
  }

  .ai-field-wide {
    grid-column: auto;
  }
}
</style>
