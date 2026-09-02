<template>
  <section class="about about-page">
    <div class="terminal-bar">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
      <code class="terminal-title">~/profile/zhuxiaowang — bash</code>
    </div>

    <div class="about-hero panel geek-panel">
      <p class="eyebrow mono">$ whoami</p>
      <h1>{{ profile.name }}</h1>
      <p class="role-line">
        <span class="mono prompt">&gt;</span>
        {{ profile.title }} · {{ profile.location }} ·
        {{ t('about.yearsExp', { years: profile.years }) }}
      </p>
      <p class="lede">{{ profile.tagline }}</p>
      <ul class="summary-list">
        <li v-for="(line, i) in profile.summary" :key="i">{{ line }}</li>
      </ul>
      <div class="stat-row">
        <div v-for="h in profile.highlights" :key="h.label" class="stat">
          <span class="stat-value mono">{{ h.value }}</span>
          <span class="stat-label">{{ h.label }}</span>
        </div>
      </div>
      <div class="link-row">
        <a :href="`mailto:${profile.email}`" class="chip-link">{{ profile.email }}</a>
        <a :href="profile.github" target="_blank" rel="noopener" class="chip-link">GitHub</a>
        <a :href="profile.blog" target="_blank" rel="noopener" class="chip-link">Blog</a>
      </div>
      <p class="edu muted mono">{{ profile.education }}</p>
    </div>

    <div class="stack-section panel geek-panel">
      <div class="section-head">
        <h2><span class="mono prompt">#</span> tech.stack</h2>
        <p class="muted">{{ t('about.stackHint') }}</p>
      </div>

      <div class="filter-bar">
        <button
          v-for="(label, key) in categoryLabels"
          :key="key"
          type="button"
          class="filter-btn"
          :class="{ active: activeCategory === key }"
          @click="toggleCategory(key)"
        >
          {{ label }}
        </button>
        <button type="button" class="filter-btn ghost" @click="clearSelection">
          {{ t('about.reset') }}
        </button>
      </div>

      <div class="tech-grid" ref="techGridRef">
        <a
          v-for="tech in filteredTech"
          :key="tech.id"
          :href="tech.url"
          target="_blank"
          rel="noopener"
          class="tech-node"
          :class="{
            active: selectedTech === tech.id,
            linked: linkedTechIds.has(tech.id) && selectedProject,
            dim: shouldDimTech(tech.id),
          }"
          :style="{ '--node-color': tech.color }"
          @click.prevent="selectTech(tech.id, $event)"
        >
          <span class="tech-dot"></span>
          <span class="tech-name">{{ tech.name }}</span>
          <span class="tech-cat mono">{{ categoryLabels[tech.category] }}</span>
        </a>
      </div>

      <p v-if="selectedTech" class="relation-hint mono">
        <span class="prompt">↳</span>
        {{ t('about.related', { tech: selectedTechName, count: linkedProjects.length }) }}
        <button type="button" class="inline-link" @click="clearHighlight">
          {{ t('about.clearFilter') }}
        </button>
      </p>
    </div>

    <div class="projects-section">
      <div class="section-head">
        <h2><span class="mono prompt">#</span> projects.log</h2>
        <p class="muted">{{ t('about.projectsHint') }}</p>
      </div>

      <div class="project-grid">
        <article
          v-for="project in projects"
          :key="project.id"
          class="project-card geek-panel"
          :class="{
            active: selectedProject === project.id,
            linked: linkedProjectIds.has(project.id) && selectedTech,
            dim: shouldDimProject(project.id),
          }"
          @click="selectProject(project.id)"
        >
          <header class="project-head">
            <h3>{{ project.name }}</h3>
            <span class="period mono">{{ project.period }}</span>
          </header>
          <p class="project-summary">{{ project.summary }}</p>
          <ul class="project-bullets">
            <li v-for="(b, i) in project.bullets" :key="i">{{ b }}</li>
          </ul>
          <div class="project-tech">
            <button
              v-for="tid in project.tech"
              :key="tid"
              type="button"
              class="mini-tech"
              :style="{ '--node-color': techById[tid]?.color }"
              @click.stop="selectTech(tid)"
            >
              {{ techById[tid]?.name || tid }}
            </button>
          </div>
          <div v-if="project.url || project.repo || project.plugin" class="project-links">
            <a
              v-if="project.plugin"
              :href="project.plugin"
              target="_blank"
              rel="noopener"
              @click.stop
            >{{ t('about.plugin') }}</a>
            <a
              v-if="project.url"
              :href="project.url"
              target="_blank"
              rel="noopener"
              @click.stop
            >{{ t('about.visit') }}</a>
            <a
              v-if="project.repo"
              :href="project.repo"
              target="_blank"
              rel="noopener"
              @click.stop
            >{{ t('about.source') }}</a>
          </div>
        </article>
      </div>
    </div>

  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useLocale } from '../composables/useLocale.js'

const {
  t,
  profile,
  projects,
  categoryLabels,
  techStack,
  projectsForTech,
  techForProject,
} = useLocale()

const selectedTech = ref('')
const selectedProject = ref('')
const activeCategory = ref('')

const techById = computed(() =>
  Object.fromEntries(techStack.value.map((item) => [item.id, item])),
)

const filteredTech = computed(() => {
  if (!activeCategory.value) return techStack.value
  return techStack.value.filter((item) => item.category === activeCategory.value)
})

const linkedProjects = computed(() =>
  selectedTech.value ? projectsForTech(selectedTech.value) : [],
)

const linkedProjectIds = computed(() => new Set(linkedProjects.value.map((p) => p.id)))

const linkedTechIds = computed(() => {
  if (!selectedProject.value) return new Set()
  return new Set(techForProject(selectedProject.value).map((item) => item.id))
})

const selectedTechName = computed(
  () => techById.value[selectedTech.value]?.name || selectedTech.value,
)

function selectTech(id, event) {
  if (event?.metaKey || event?.ctrlKey) {
    window.open(techById.value[id]?.url, '_blank', 'noopener')
    return
  }
  selectedProject.value = ''
  selectedTech.value = selectedTech.value === id ? '' : id
}

function selectProject(id) {
  selectedTech.value = ''
  selectedProject.value = selectedProject.value === id ? '' : id
}

function toggleCategory(key) {
  activeCategory.value = activeCategory.value === key ? '' : key
}

function clearSelection() {
  selectedTech.value = ''
  selectedProject.value = ''
  activeCategory.value = ''
}

function clearHighlight() {
  selectedTech.value = ''
  selectedProject.value = ''
}

function onDocumentClick(event) {
  if (!selectedTech.value && !selectedProject.value) return
  const el = event.target
  if (!(el instanceof Element)) return
  if (
    el.closest('.project-card') ||
    el.closest('.tech-node') ||
    el.closest('.filter-btn') ||
    el.closest('.inline-link') ||
    el.closest('.mini-tech') ||
    el.closest('.lang-toggle') ||
    el.closest('.theme-toggle')
  ) {
    return
  }
  clearHighlight()
}

function shouldDimTech(techId) {
  if (selectedProject.value) {
    return !linkedTechIds.value.has(techId)
  }
  if (selectedTech.value) {
    return techId !== selectedTech.value
  }
  return false
}

function shouldDimProject(projectId) {
  if (selectedTech.value) {
    return !linkedProjectIds.value.has(projectId)
  }
  if (selectedProject.value) {
    return projectId !== selectedProject.value
  }
  return false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.about-page {
  max-width: 1080px;
  margin: 0 auto;
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.85rem;
  background: #0f172a;
  border-radius: 10px 10px 0 0;
  border: 1px solid #1e293b;
  border-bottom: none;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.red { background: #ef4444; }
.dot.yellow { background: #eab308; }
.dot.green { background: #22c55e; }

.terminal-title {
  margin-left: 0.5rem;
  color: #94a3b8;
  font-size: 0.78rem;
}

.mono {
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
}

.prompt {
  color: var(--accent);
}

.geek-panel {
  background: var(--panel-grad);
  border: 1px solid var(--line);
  border-radius: 0 0 14px 14px;
  box-shadow: var(--shadow);
  padding: 1.35rem 1.4rem;
  margin-bottom: 1.5rem;
}

.about-hero.geek-panel {
  border-radius: 0 0 14px 14px;
  margin-top: 0;
}

.about-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 2.6rem);
  margin: 0.2rem 0 0.5rem;
}

.role-line {
  color: var(--muted);
  margin: 0 0 1rem;
}

.summary-list {
  margin: 0 0 1.25rem;
  padding-left: 1.1rem;
  color: var(--prose-ink);
}

.summary-list li + li {
  margin-top: 0.45rem;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat {
  padding: 0.65rem 0.75rem;
  border: 1px dashed var(--line);
  border-radius: 10px;
  background: var(--stat-bg);
}

.stat-value {
  display: block;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--muted);
}

.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.chip-link {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  text-decoration: none;
  font-size: 0.88rem;
  background: var(--chip-bg);
}

.chip-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.edu {
  margin: 0;
  font-size: 0.85rem;
}

.section-head {
  margin-bottom: 1rem;
}

.section-head h2 {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.filter-btn {
  border: 1px solid var(--line);
  background: var(--chip-bg);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.filter-btn.active,
.filter-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-btn.ghost {
  margin-left: auto;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.65rem;
}

.tech-node {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.65rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--node-bg);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s;
  position: relative;
  overflow: hidden;
}

.tech-node::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--node-color, var(--accent));
  opacity: 0.85;
}

.tech-node:hover {
  border-color: var(--node-color, var(--accent));
  transform: translateY(-1px);
}

.tech-node.active {
  border-color: var(--node-color, var(--accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--node-color, var(--accent)) 25%, transparent);
}

.tech-node.linked {
  border-color: var(--node-color, var(--accent));
  background: color-mix(in srgb, var(--node-color, var(--accent)) 8%, var(--mini-mix));
}

.tech-node.dim,
.project-card.dim {
  opacity: 0.38;
}

.tech-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--node-color, var(--accent));
}

.tech-name {
  font-weight: 600;
  font-size: 0.92rem;
}

.tech-cat {
  font-size: 0.68rem;
  color: var(--muted);
}

.relation-hint {
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.inline-link {
  border: none;
  background: none;
  color: var(--accent);
  text-decoration: underline;
  padding: 0;
  margin-left: 0.35rem;
  cursor: pointer;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.project-card {
  padding: 1.1rem 1.15rem;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
}

.project-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.18);
}

.project-card.linked {
  border-color: var(--accent);
}

.project-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.project-head h3 {
  margin: 0;
  font-size: 1.05rem;
  font-family: var(--font-display);
}

.period {
  font-size: 0.72rem;
  color: var(--muted);
  white-space: nowrap;
}

.project-summary {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
  color: var(--prose-ink);
}

.project-bullets {
  margin: 0 0 0.85rem;
  padding-left: 1rem;
  font-size: 0.86rem;
  color: var(--muted);
}

.project-bullets li + li {
  margin-top: 0.25rem;
}

.project-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
}

.mini-tech {
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--node-color, #64748b) 10%, var(--mini-mix));
  border-left: 3px solid var(--node-color, var(--accent));
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;
}

.mini-tech:hover {
  border-color: var(--node-color, var(--accent));
}

.project-links {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.project-links a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

@media (max-width: 640px) {
  .filter-btn.ghost {
    margin-left: 0;
  }
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
