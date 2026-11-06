<template>
  <Teleport to="body">
    <div v-if="open" class="studio-root" role="dialog" aria-modal="true" :aria-label="t('about.resumeStudio')">
      <div class="studio-backdrop" @click="close"></div>
      <div class="studio-panel geek-surface" @click.stop>
        <header class="studio-head">
          <div>
            <p class="eyebrow mono">$ resume.studio</p>
            <h2>{{ t('about.resumeStudio') }}</h2>
            <p class="muted">{{ t('about.resumeStudioHint') }}</p>
          </div>
          <button type="button" class="close-btn" :aria-label="t('about.resumeClose')" @click="close">
            ×
          </button>
        </header>

        <div v-if="!canUse" class="gate">
          <p v-if="!user">{{ t('about.resumeNeedLogin') }}</p>
          <p v-else>{{ t('about.resumeNeedAi') }}</p>
          <div class="gate-actions">
            <RouterLink v-if="!user" class="gate-link" to="/me" @click="close">
              {{ t('about.resumeGoLogin') }}
            </RouterLink>
            <RouterLink v-else class="gate-link" to="/chat" @click="close">
              {{ t('about.resumeGoChat') }}
            </RouterLink>
          </div>
        </div>

        <template v-else>
          <ol class="steps">
            <li :class="{ active: step >= 1, done: step > 1 }">{{ t('about.resumeStepSeed') }}</li>
            <li :class="{ active: step >= 2, done: step > 2 }">{{ t('about.resumeStepUpload') }}</li>
            <li :class="{ active: step >= 3, done: step > 3 }">{{ t('about.resumeStepGenerate') }}</li>
            <li :class="{ active: step >= 4 }">{{ t('about.resumeStepExport') }}</li>
          </ol>

          <div class="studio-body">
            <aside class="studio-side">
              <section class="side-block">
                <h3>{{ t('about.resumeSourceAbout') }}</h3>
                <p class="muted small">
                  {{ t('about.resumeSourceAboutHint', { projects: aboutProjectCount, skills: aboutSkillCount }) }}
                </p>
              </section>

              <section class="side-block">
                <h3>{{ t('about.resumeSourceUpload') }}</h3>
                <ResumeUploadPanel v-model:file="uploadFile" />
                <p class="muted small privacy">{{ t('about.resumePrivacy') }}</p>
              </section>

              <ResumeExportBar
                :has-upload="!!uploadFile"
                :can-export="!!draft"
                :generating="generating"
                :busy="exporting"
                :copied="copied"
                @generate="onGenerate"
                @export-pdf="onExportPdf"
                @export-md="onExportMd"
                @copy-md="onCopyMd"
              />

              <p v-if="statusHint" class="status-hint" :class="{ error: !!error, ok: !error && !!statusHint }">
                {{ statusHint }}
              </p>
              <p v-if="error" class="status-hint error">{{ error }}</p>
              <button
                v-if="needReload"
                type="button"
                class="reload-btn"
                @click="reloadApp"
              >
                {{ t('about.resumeReload') }}
              </button>
            </aside>

            <div class="studio-preview-wrap">
              <ResumePreview
                ref="previewRef"
                v-model:draft="draft"
                :generating="generating"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getStoredUser } from '../../api.js'
import { useLocale } from '../../composables/useLocale.js'
import { hasPermission } from '../../utils/permissions.js'
import {
  buildResumeFromAbout,
  cloneResumeDraft,
  resumeToMarkdown,
} from '../../utils/resumeSchema.js'
import {
  extractResumeText,
  mergeResumeWithAi,
  pickDefaultAiConnection,
} from '../../utils/resumeMerge.js'
import {
  downloadResumeMarkdown,
  exportResumePdfFromElement,
} from '../../utils/resumeExport.js'
import ResumeUploadPanel from './ResumeUploadPanel.vue'
import ResumePreview from './ResumePreview.vue'
import ResumeExportBar from './ResumeExportBar.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])
const { t, locale } = useLocale()

const user = ref(getStoredUser())
const draft = ref(null)
const uploadFile = ref(null)
const generating = ref(false)
const exporting = ref(false)
const copied = ref(false)
const error = ref('')
const needReload = ref(false)
const statusHint = ref('')
const step = ref(1)
const previewRef = ref(null)
const abortController = ref(null)
let copyTimer = 0

const canUse = computed(
  () => !!user.value && hasPermission(user.value, 'ai.chat'),
)

const aboutSeed = computed(() => buildResumeFromAbout(locale.value))
const aboutProjectCount = computed(() => aboutSeed.value.projects?.length || 0)
const aboutSkillCount = computed(() =>
  (aboutSeed.value.skills || []).reduce((sum, group) => sum + (group.items?.length || 0), 0),
)

function syncAuth() {
  user.value = getStoredUser()
}

function close() {
  emit('update:open', false)
}

function seedDraft() {
  draft.value = cloneResumeDraft(buildResumeFromAbout(locale.value))
  step.value = uploadFile.value ? 2 : 1
  statusHint.value = t('about.resumeSeeded')
}

watch(
  () => props.open,
  (open) => {
    syncAuth()
    if (!open) {
      abortController.value?.abort()
      abortController.value = null
      generating.value = false
      return
    }
    error.value = ''
    needReload.value = false
    statusHint.value = ''
    if (canUse.value) seedDraft()
  },
)

watch(locale, () => {
  if (props.open && canUse.value && !generating.value && draft.value?.meta?.source === 'about') {
    seedDraft()
  }
})

watch(uploadFile, (file) => {
  if (file) step.value = Math.max(step.value, 2)
})

function onAuthEvent(event) {
  user.value = event?.detail?.user || getStoredUser()
}

if (typeof window !== 'undefined') {
  window.addEventListener('mohhen-auth-change', onAuthEvent)
  window.addEventListener('storage', syncAuth)
}

onBeforeUnmount(() => {
  abortController.value?.abort()
  if (typeof window !== 'undefined') {
    window.removeEventListener('mohhen-auth-change', onAuthEvent)
    window.removeEventListener('storage', syncAuth)
  }
  if (copyTimer) window.clearTimeout(copyTimer)
})

async function onGenerate() {
  if (!canUse.value || generating.value) return
  error.value = ''
  statusHint.value = ''
  generating.value = true
  step.value = 3
  abortController.value?.abort()
  abortController.value = new AbortController()

  try {
    if (!uploadFile.value) {
      draft.value = cloneResumeDraft(buildResumeFromAbout(locale.value))
      statusHint.value = t('about.resumeGeneratedLocal')
      step.value = 4
      return
    }

    statusHint.value = t('about.resumeParsing')
    const { text } = await extractResumeText(uploadFile.value)
    const connection = await pickDefaultAiConnection()
    if (!connection?.id) {
      error.value = t('about.resumeNoConnection')
      draft.value = cloneResumeDraft(buildResumeFromAbout(locale.value))
      draft.value.extras = {
        fromResume: text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 12),
      }
      step.value = 4
      return
    }

    statusHint.value = t('about.resumeMerging')
    const result = await mergeResumeWithAi({
      locale: locale.value,
      resumeText: text,
      connectionId: connection.id,
      signal: abortController.value.signal,
    })
    draft.value = result.draft
    statusHint.value = result.usedAi
      ? t('about.resumeMerged')
      : t('about.resumeMergeFallback')
    step.value = 4
  } catch (err) {
    if (err?.name === 'AbortError') return
    const code = String(err?.message || err || '')
    if (code === 'unsupported') error.value = t('about.resumeUnsupported')
    else if (code === 'empty') error.value = t('about.resumeEmptyExtract')
    else if (err?.code === 'AI_NO_CONNECTION') error.value = t('about.resumeNoConnection')
    else error.value = err?.message || t('about.resumeGenerateFailed')
    if (!draft.value) seedDraft()
  } finally {
    generating.value = false
    abortController.value = null
  }
}

function reloadApp() {
  window.location.reload()
}

async function onExportPdf() {
  if (!draft.value || exporting.value) return
  exporting.value = true
  error.value = ''
  needReload.value = false
  try {
    const el = previewRef.value?.rootRef
    await exportResumePdfFromElement(el, draft.value)
    statusHint.value = t('about.resumePdfDone')
    step.value = 4
  } catch (err) {
    const msg = String(err?.message || '')
    const chunkFailed =
      err?.code === 'CHUNK_LOAD_FAILED' ||
      /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(
        msg,
      )
    if (chunkFailed) {
      error.value = t('about.resumePdfChunkFailed')
      needReload.value = true
    } else if (/unsupported color function|color-mix|parse.*color/i.test(msg)) {
      error.value = t('about.resumePdfColorFailed')
    } else {
      error.value = msg || t('about.resumePdfFailed')
    }
  } finally {
    exporting.value = false
  }
}

function onExportMd() {
  if (!draft.value) return
  downloadResumeMarkdown(draft.value)
  statusHint.value = t('about.resumeMdDone')
  step.value = 4
}

async function onCopyMd() {
  if (!draft.value) return
  try {
    await navigator.clipboard.writeText(resumeToMarkdown(draft.value))
    copied.value = true
    statusHint.value = t('about.resumeCopied')
    if (copyTimer) window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    error.value = t('about.resumeCopyFailed')
  }
}
</script>

<style scoped>
.studio-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.studio-backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, #020617 62%, transparent);
  backdrop-filter: blur(4px);
  animation: fade-in 0.2s ease;
}

.studio-panel {
  position: relative;
  width: min(1120px, 100%);
  max-height: min(92vh, 980px);
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow);
  padding: 1.1rem 1.15rem 1.25rem;
  animation: panel-in 0.28s ease;
}

.studio-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 0.85rem;
}

.studio-head h2 {
  margin: 0.15rem 0 0.25rem;
}

.eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 0.8rem;
}

.close-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  font-size: 1.25rem;
  cursor: pointer;
}

.close-btn:hover {
  color: var(--ink);
  border-color: var(--accent);
}

.gate {
  padding: 2rem 1rem;
  text-align: center;
}

.gate-actions {
  margin-top: 0.85rem;
}

.gate-link {
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
}

.steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  margin: 0 0 1rem;
  padding: 0;
}

.steps li {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.4rem 0.55rem;
  text-align: center;
  font-size: 0.78rem;
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
}

.steps li.active {
  color: var(--ink);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
}

.steps li.done {
  color: var(--accent);
}

.steps li.done::after {
  content: ' ✓';
}

.studio-body {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.studio-side {
  display: grid;
  gap: 0.85rem;
}

.side-block h3 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
}

.small {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
}

.privacy {
  margin-top: 0.55rem;
}

.studio-preview-wrap {
  min-width: 0;
  overflow: auto;
  padding: 0.35rem;
  max-height: min(74vh, 860px);
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 42%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.65), transparent 30%);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.status-hint {
  margin: 0;
  font-size: 0.85rem;
}

.status-hint.ok {
  color: var(--accent);
}

.status-hint.error {
  color: #ef4444;
}

.reload-btn {
  justify-self: start;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--accent);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-weight: 650;
  cursor: pointer;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .studio-body {
    grid-template-columns: 1fr;
  }

  .steps {
    grid-template-columns: 1fr 1fr;
  }

  .studio-preview-wrap {
    max-height: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .studio-backdrop,
  .studio-panel {
    animation: none;
  }
}
</style>
