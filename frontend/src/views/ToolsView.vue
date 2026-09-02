<template>
  <section class="tools-page">
    <header class="tools-head panel geek-panel">
      <p class="eyebrow mono">$ toolbox</p>
      <h1>{{ t('tools.title') }}</h1>
      <p class="lede muted">{{ t('tools.lede') }}</p>
    </header>

    <div class="tools-layout panel geek-panel">
      <aside class="tools-nav" role="tablist" :aria-label="t('tools.title')">
        <button
          v-for="item in toolItems"
          :key="item.id"
          type="button"
          role="tab"
          class="tools-nav-btn"
          :class="{ active: activeTool === item.id }"
          :aria-selected="activeTool === item.id"
          @click="activeTool = item.id"
        >
          <strong>{{ item.title }}</strong>
          <span class="muted">{{ item.desc }}</span>
        </button>
      </aside>

      <div class="tools-workspace">
        <h2>{{ activeMeta.title }}</h2>
        <p class="muted tools-workspace-desc">{{ activeMeta.desc }}</p>
        <component :is="activeMeta.component" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import JsonTool from '../components/tools/JsonTool.vue'
import Base64ImageTool from '../components/tools/Base64ImageTool.vue'
import CryptoTool from '../components/tools/CryptoTool.vue'
import UrlTool from '../components/tools/UrlTool.vue'
import TimestampTool from '../components/tools/TimestampTool.vue'
import HashTool from '../components/tools/HashTool.vue'
import Base64TextTool from '../components/tools/Base64TextTool.vue'
import UuidTool from '../components/tools/UuidTool.vue'
import RegexTool from '../components/tools/RegexTool.vue'
import TranslateTool from '../components/tools/TranslateTool.vue'
import { useLocale } from '../composables/useLocale.js'

const DocConvertTool = defineAsyncComponent(() => import('../components/tools/DocConvertTool.vue'))

const { t } = useLocale()
const activeTool = ref('json')

const toolItems = computed(() => [
  {
    id: 'json',
    title: t('tools.json.title'),
    desc: t('tools.json.desc'),
    component: JsonTool,
  },
  {
    id: 'translate',
    title: t('tools.translate.title'),
    desc: t('tools.translate.desc'),
    component: TranslateTool,
  },
  {
    id: 'base64',
    title: t('tools.base64.title'),
    desc: t('tools.base64.desc'),
    component: Base64ImageTool,
  },
  {
    id: 'base64text',
    title: t('tools.base64Text.title'),
    desc: t('tools.base64Text.desc'),
    component: Base64TextTool,
  },
  {
    id: 'crypto',
    title: t('tools.crypto.title'),
    desc: t('tools.crypto.desc'),
    component: CryptoTool,
  },
  {
    id: 'url',
    title: t('tools.url.title'),
    desc: t('tools.url.desc'),
    component: UrlTool,
  },
  {
    id: 'timestamp',
    title: t('tools.timestamp.title'),
    desc: t('tools.timestamp.desc'),
    component: TimestampTool,
  },
  {
    id: 'hash',
    title: t('tools.hash.title'),
    desc: t('tools.hash.desc'),
    component: HashTool,
  },
  {
    id: 'uuid',
    title: t('tools.uuid.title'),
    desc: t('tools.uuid.desc'),
    component: UuidTool,
  },
  {
    id: 'regex',
    title: t('tools.regex.title'),
    desc: t('tools.regex.desc'),
    component: RegexTool,
  },
  {
    id: 'doc',
    title: t('tools.doc.title'),
    desc: t('tools.doc.desc'),
    component: DocConvertTool,
  },
])

const activeMeta = computed(
  () => toolItems.value.find((item) => item.id === activeTool.value) || toolItems.value[0],
)
</script>

<style scoped>
.tools-head {
  margin-bottom: 1rem;
  padding: 1.25rem 1.35rem;
}

.tools-head h1 {
  margin: 0.35rem 0 0.5rem;
}

.tools-head .lede {
  margin: 0;
}

.tools-layout {
  display: grid;
  grid-template-columns: minmax(200px, 250px) minmax(0, 1fr);
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.tools-nav {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
  max-height: min(78vh, 860px);
  overflow-y: auto;
}

.tools-nav-btn {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  color: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.tools-nav-btn:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.tools-nav-btn strong {
  font-size: 0.92rem;
  line-height: 1.3;
}

.tools-nav-btn span {
  font-size: 0.78rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tools-nav-btn.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.tools-workspace {
  padding: 1.1rem 1.25rem 1.35rem;
  min-width: 0;
}

.tools-workspace h2 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
}

.tools-workspace-desc {
  margin: 0 0 1rem;
  font-size: 0.92rem;
}

@media (max-width: 900px) {
  .tools-layout {
    grid-template-columns: 1fr;
  }

  .tools-nav {
    border-right: none;
    border-bottom: 1px solid var(--line);
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: none;
    gap: 0.4rem;
  }

  .tools-nav-btn {
    min-width: 160px;
    flex: 0 0 auto;
  }
}
</style>

<style>
.tools-page .tool-pane {
  display: grid;
  gap: 0.95rem;
}

.tools-page .tool-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 0.85rem;
  padding: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--input-bg) 70%, transparent);
}

.tools-page .tool-toolbar .tool-actions {
  margin-left: auto;
}

.tools-page .tool-toolbar .tool-actions:only-child {
  margin-left: 0;
}

.tools-page .tool-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.tools-page .tool-control {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.tools-page .tool-control > span,
.tools-page .tool-control > .tool-control-label {
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
  line-height: 1.2;
}

.tools-page .tool-control select,
.tools-page .tool-control input[type='text'],
.tools-page .tool-control input[type='password'],
.tools-page .tool-control input[type='datetime-local'],
.tools-page .tool-control input:not([type]) {
  width: auto;
  min-width: 8.5rem;
  max-width: 100%;
}

.tools-page .tool-control--wide select,
.tools-page .tool-control--wide input {
  min-width: 12rem;
}

.tools-page .tool-control--grow {
  flex: 1 1 220px;
}

.tools-page .tool-control--grow input,
.tools-page .tool-control--grow select {
  width: 100%;
  min-width: 0;
}

.tools-page .tool-check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.55rem;
  padding: 0 0.15rem;
  font-size: 0.9rem;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.tools-page .tool-check input {
  width: auto;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.tools-page select,
.tools-page .tool-select {
  appearance: none;
  -webkit-appearance: none;
  width: auto;
  min-height: 2.55rem;
  padding: 0.55rem 2.2rem 0.55rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background-color: var(--input-bg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236b7280' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8rem center;
  background-size: 12px 8px;
  color: var(--ink);
  font: inherit;
  line-height: 1.3;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

html.dark .tools-page select,
html.dark .tools-page .tool-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2394a3b8' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.tools-page select:hover,
.tools-page .tool-select:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
}

.tools-page select:focus,
.tools-page .tool-select:focus,
.tools-page select:focus-visible,
.tools-page .tool-select:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.tools-page .tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.tools-page .tool-grid--preview {
  align-items: start;
}

.tools-page .tool-field {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.tools-page .tool-field > label,
.tools-page .tool-field > span.label {
  font-size: 0.84rem;
  color: var(--muted);
}

.tools-page .tool-field textarea,
.tools-page .tool-field input[type='text'],
.tools-page .tool-field input[type='password'],
.tools-page .tool-field input[type='datetime-local'],
.tools-page .tool-field input:not([type]) {
  width: 100%;
}

.tools-page .tool-field textarea {
  min-height: 260px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
}

.tools-page .tool-field input[type='text'],
.tools-page .tool-field input[type='password'],
.tools-page .tool-field input[type='datetime-local'],
.tools-page .tool-field input:not([type]),
.tools-page .tool-control input[type='text'],
.tools-page .tool-control input[type='password'],
.tools-page .tool-control input[type='datetime-local'],
.tools-page .tool-control input:not([type]) {
  min-height: 2.55rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--input-bg);
  color: var(--ink);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.tools-page .tool-field input:focus,
.tools-page .tool-control input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.tools-page .tool-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.22rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--input-bg) 80%, transparent);
  width: fit-content;
  max-width: 100%;
}

.tools-page .tool-tabs button {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s ease, background 0.15s ease;
}

.tools-page .tool-tabs button:hover {
  color: var(--ink);
}

.tools-page .tool-tabs button.active {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.tools-page .preview-box {
  min-height: 260px;
  border: 1px dashed var(--line);
  border-radius: 12px;
  display: grid;
  place-items: center;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--input-bg) 90%, transparent);
}

.tools-page .preview-box img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.tools-page .file-btn {
  position: relative;
  overflow: hidden;
  margin: 0;
  min-height: 2.55rem;
  display: inline-flex;
  align-items: center;
}

.tools-page .file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
}

.tools-page .tool-note {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
}

.tools-page .tool-feedback {
  display: grid;
  gap: 0.35rem;
}

@media (max-width: 900px) {
  .tools-page .tool-grid {
    grid-template-columns: 1fr;
  }

  .tools-page .tool-actions {
    margin-left: 0;
    width: 100%;
  }

  .tools-page .tool-control,
  .tools-page .tool-control--wide {
    flex: 1 1 140px;
  }

  .tools-page .tool-control select,
  .tools-page .tool-control input,
  .tools-page .tool-control--wide select,
  .tools-page .tool-control--wide input {
    width: 100%;
    min-width: 0;
  }
}
</style>
