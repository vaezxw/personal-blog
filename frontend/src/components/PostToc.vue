<template>
  <aside v-if="rows.length" class="post-toc" :aria-label="t('post.toc')">
    <div class="post-toc-head">
      <strong>{{ t('post.toc') }}</strong>
      <button
        type="button"
        class="post-toc-icon-btn"
        :title="t('post.tocHide')"
        :aria-label="t('post.tocHide')"
        @click="emit('hide')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 6 9 12l6 6"
          />
        </svg>
      </button>
    </div>

    <nav class="post-toc-nav">
      <ul class="post-toc-list">
        <li
          v-for="row in visibleRows"
          :key="row.id"
          class="post-toc-item"
          :class="`lv-${row.level}`"
        >
          <div class="post-toc-row" :style="{ paddingLeft: `${(row.depth || 0) * 0.7}rem` }">
            <button
              v-if="row.hasChildren"
              type="button"
              class="post-toc-twist"
              :class="{ open: !collapsed.has(row.id) }"
              :aria-expanded="!collapsed.has(row.id)"
              :aria-label="collapsed.has(row.id) ? t('post.tocExpand') : t('post.tocCollapse')"
              @click="toggle(row.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m9 6 6 6-6 6"
                />
              </svg>
            </button>
            <span v-else class="post-toc-twist spacer" aria-hidden="true"></span>
            <button
              type="button"
              class="post-toc-link"
              :class="{ active: activeId === row.id }"
              @click="onNavigate(row.id)"
            >
              {{ row.text }}
            </button>
          </div>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLocale } from '../composables/useLocale.js'

const props = defineProps({
  tree: { type: Array, default: () => [] },
  contentRoot: { type: Object, default: null },
})

const emit = defineEmits(['hide', 'navigate'])

const { t } = useLocale()
const activeId = ref('')
const collapsed = ref(new Set())
let observer = null

/** Flatten tree → rows with depth + hasChildren */
const rows = computed(() => {
  const out = []
  const walk = (nodes, depth, parentId) => {
    for (const n of nodes || []) {
      out.push({
        id: n.id,
        text: n.text,
        level: n.level,
        depth,
        parentId,
        hasChildren: Boolean(n.children?.length),
      })
      if (n.children?.length) walk(n.children, depth + 1, n.id)
    }
  }
  walk(props.tree, 0, null)
  return out
})

const visibleRows = computed(() => {
  const hidden = new Set()
  for (const row of rows.value) {
    if (row.parentId && (collapsed.value.has(row.parentId) || hidden.has(row.parentId))) {
      hidden.add(row.id)
    }
  }
  return rows.value.filter((r) => !hidden.has(r.id))
})

const flatIds = computed(() => rows.value.map((r) => r.id))

function toggle(id) {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

function onNavigate(id) {
  emit('navigate', id)
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
  try {
    history.replaceState(null, '', `#${encodeURIComponent(id)}`)
  } catch {
    /* ignore */
  }
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

function setupObserver() {
  disconnectObserver()
  if (!flatIds.value.length) return
  const elements = flatIds.value.map((id) => document.getElementById(id)).filter(Boolean)
  if (!elements.length) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]?.target?.id) activeId.value = visible[0].target.id
    },
    { rootMargin: '-12% 0px -70% 0px', threshold: [0, 1] },
  )
  for (const el of elements) observer.observe(el)
}

watch(
  () => [props.tree, props.contentRoot],
  () => {
    requestAnimationFrame(setupObserver)
  },
  { deep: true },
)

onMounted(() => requestAnimationFrame(setupObserver))
onUnmounted(disconnectObserver)
</script>

<style scoped>
.post-toc-nav {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.post-toc-nav::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
