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
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.tools-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 90%, transparent);
}

.tools-nav-btn {
  display: grid;
  gap: 0.2rem;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  cursor: pointer;
  color: inherit;
}

.tools-nav-btn strong {
  font-size: 0.95rem;
}

.tools-nav-btn span {
  font-size: 0.82rem;
  line-height: 1.45;
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

@media (max-width: 820px) {
  .tools-layout {
    grid-template-columns: 1fr;
  }

  .tools-nav {
    border-right: none;
    border-bottom: 1px solid var(--line);
    flex-direction: row;
    overflow-x: auto;
  }

  .tools-nav-btn {
    min-width: 180px;
  }
}
</style>

<style>
.tools-page .tool-pane {
  display: grid;
  gap: 0.85rem;
}

.tools-page .tool-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
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
  gap: 0.35rem;
}

.tools-page .tool-field.inline {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-right: 0.25rem;
}

.tools-page .tool-field.inline input,
.tools-page .tool-field.inline select {
  min-width: 11rem;
}

.tools-page .tool-field textarea,
.tools-page .tool-field input,
.tools-page .tool-field select {
  width: 100%;
}

.tools-page .tool-field textarea {
  min-height: 280px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88rem;
}

.tools-page .tool-tabs {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.2rem;
  border: 1px solid var(--line);
  border-radius: 999px;
}

.tools-page .tool-tabs button {
  border: none;
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.32rem 0.85rem;
  cursor: pointer;
}

.tools-page .tool-tabs button.active {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.tools-page .preview-box {
  min-height: 280px;
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
}

.tools-page .file-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.tools-page .tool-note {
  margin: 0;
  font-size: 0.88rem;
}

@media (max-width: 820px) {
  .tools-page .tool-grid {
    grid-template-columns: 1fr;
  }
}
</style>
