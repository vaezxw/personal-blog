<template>
  <article
    ref="rootRef"
    class="resume-sheet"
    :class="{ generating, ready: !generating && !!draft }"
  >
    <div v-if="generating" class="resume-skeleton" aria-hidden="true">
      <div class="sk-line w60"></div>
      <div class="sk-line w40"></div>
      <div class="sk-block"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line w80"></div>
      <div class="scan"></div>
    </div>

    <template v-else-if="draft">
      <header class="sheet-head">
        <div>
          <h1>{{ draft.basics.name }}</h1>
          <p class="role">
            {{ draft.basics.title }}
            <span v-if="draft.basics.location"> · {{ draft.basics.location }}</span>
            <span v-if="draft.basics.years">
              · {{ t('about.yearsExp', { years: draft.basics.years }) }}
            </span>
          </p>
          <p v-if="draft.basics.tagline" class="tagline">{{ draft.basics.tagline }}</p>
        </div>
        <div class="contacts">
          <a v-if="draft.basics.email" :href="`mailto:${draft.basics.email}`">{{ draft.basics.email }}</a>
          <a v-if="draft.basics.github" :href="draft.basics.github" target="_blank" rel="noopener">GitHub</a>
          <a v-if="draft.basics.blog" :href="draft.basics.blog" target="_blank" rel="noopener">Blog</a>
        </div>
      </header>

      <section v-if="draft.basics.education" class="sheet-section">
        <h2>{{ t('about.resumeSecEducation') }}</h2>
        <p>{{ draft.basics.education }}</p>
      </section>

      <section v-if="draft.summary?.length" class="sheet-section">
        <h2>{{ t('about.resumeSecSummary') }}</h2>
        <ul>
          <li v-for="(line, i) in draft.summary" :key="`s-${i}`">{{ line }}</li>
        </ul>
      </section>

      <section v-if="draft.highlights?.length" class="sheet-section">
        <h2>{{ t('about.resumeSecHighlights') }}</h2>
        <div class="hl-grid">
          <div v-for="(h, i) in draft.highlights" :key="`h-${i}`" class="hl">
            <strong>{{ h.value }}</strong>
            <span>{{ h.label }}</span>
          </div>
        </div>
      </section>

      <section v-if="draft.skills?.length" class="sheet-section">
        <h2>{{ t('about.resumeSecSkills') }}</h2>
        <div class="skill-rows">
          <p v-for="(group, i) in draft.skills" :key="`sk-${i}`">
            <strong>{{ group.category }}</strong>
            <span>{{ (group.items || []).join(' / ') }}</span>
          </p>
        </div>
      </section>

      <section v-if="visibleProjects.length" class="sheet-section">
        <h2>{{ t('about.resumeSecProjects') }}</h2>
        <div class="project-list">
          <div
            v-for="(project, index) in draft.projects"
            :key="project.id || `p-${index}`"
            class="project-item"
            :class="{ excluded: project.included === false }"
          >
            <div class="project-top">
              <div>
                <h3>{{ project.name }}</h3>
                <p class="period">{{ project.period }}</p>
              </div>
              <label v-if="editable" class="include-toggle resume-edit-only" data-resume-edit>
                <input
                  type="checkbox"
                  :checked="project.included !== false"
                  @change="toggleProject(index, $event.target.checked)"
                />
                {{ t('about.resumeIncludeProject') }}
              </label>
            </div>
            <p v-if="project.summary" class="project-summary">{{ project.summary }}</p>
            <ul v-if="project.bullets?.length">
              <li v-for="(b, bi) in project.bullets" :key="bi">{{ b }}</li>
            </ul>
            <p v-if="project.tech?.length" class="tech-line">{{ project.tech.join(' · ') }}</p>
          </div>
        </div>
      </section>

      <section v-if="draft.extras?.fromResume?.length" class="sheet-section">
        <h2>{{ t('about.resumeSecExtras') }}</h2>
        <ul>
          <li v-for="(line, i) in draft.extras.fromResume" :key="`e-${i}`">{{ line }}</li>
        </ul>
      </section>
    </template>

    <p v-else class="empty muted">{{ t('about.resumePreviewEmpty') }}</p>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../../composables/useLocale.js'

const props = defineProps({
  draft: { type: Object, default: null },
  generating: { type: Boolean, default: false },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:draft'])
const { t } = useLocale()
const rootRef = ref(null)

const visibleProjects = computed(() =>
  (props.draft?.projects || []).filter((p) => p.included !== false),
)

function toggleProject(index, included) {
  if (!props.draft) return
  const next = {
    ...props.draft,
    projects: props.draft.projects.map((project, i) =>
      i === index ? { ...project, included: !!included } : project,
    ),
  }
  emit('update:draft', next)
}

defineExpose({ rootRef })
</script>

<style scoped>
.resume-sheet {
  position: relative;
  width: min(100%, 794px);
  margin: 0 auto;
  min-height: 420px;
  padding: 1.6rem 1.55rem 1.8rem;
  border-radius: 16px;
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #0f172a;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  overflow: hidden;
}

.resume-sheet.ready > *:not(.resume-skeleton) {
  animation: resume-rise 0.45s ease both;
}

.resume-sheet.ready .sheet-section:nth-child(2) { animation-delay: 0.04s; }
.resume-sheet.ready .sheet-section:nth-child(3) { animation-delay: 0.08s; }
.resume-sheet.ready .sheet-section:nth-child(4) { animation-delay: 0.12s; }
.resume-sheet.ready .sheet-section:nth-child(5) { animation-delay: 0.16s; }
.resume-sheet.ready .sheet-section:nth-child(6) { animation-delay: 0.2s; }

.sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.95rem;
  border-bottom: 2px solid #0f766e;
  margin-bottom: 1rem;
}

.sheet-head h1 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: 0.02em;
}

.role {
  margin: 0.35rem 0 0;
  color: #334155;
  font-weight: 600;
}

.tagline {
  margin: 0.55rem 0 0;
  color: #475569;
  line-height: 1.55;
}

.contacts {
  display: grid;
  gap: 0.25rem;
  justify-items: end;
  font-size: 0.82rem;
}

.contacts a {
  color: #0f766e;
  text-decoration: none;
  font-weight: 600;
}

.sheet-section {
  margin-top: 1rem;
}

.sheet-section h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
  color: #0f766e;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sheet-section ul {
  margin: 0;
  padding-left: 1.1rem;
}

.sheet-section li {
  margin: 0.25rem 0;
  line-height: 1.55;
}

.hl-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.hl {
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: #f8fafc;
}

.hl strong {
  display: block;
  color: #0f766e;
}

.hl span {
  font-size: 0.8rem;
  color: #64748b;
}

.skill-rows {
  display: grid;
  gap: 0.35rem;
}

.skill-rows p {
  margin: 0;
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0.55rem;
  font-size: 0.9rem;
}

.project-list {
  display: grid;
  gap: 0.85rem;
}

.project-item {
  padding: 0.65rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  transition: opacity 0.2s ease;
}

.project-item.excluded {
  opacity: 0.45;
}

.project-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.project-top h3 {
  margin: 0;
  font-size: 1rem;
}

.period {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

.project-summary {
  margin: 0.4rem 0 0.25rem;
  color: #334155;
  line-height: 1.5;
}

.tech-line {
  margin: 0.4rem 0 0;
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 600;
}

.include-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: #64748b;
  white-space: nowrap;
}

.empty {
  margin: 4rem 0;
  text-align: center;
}

.resume-skeleton {
  position: relative;
  display: grid;
  gap: 0.65rem;
  min-height: 360px;
  overflow: hidden;
}

.sk-line,
.sk-block {
  border-radius: 8px;
  background: linear-gradient(90deg, #e2e8f0, #f1f5f9, #e2e8f0);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

.sk-line { height: 14px; }
.sk-block { height: 72px; margin: 0.4rem 0; }
.w40 { width: 40%; }
.w60 { width: 60%; }
.w80 { width: 80%; }

.scan {
  position: absolute;
  inset: 0 auto 0 0;
  width: 35%;
  background: linear-gradient(90deg, transparent, rgba(15, 118, 110, 0.12), transparent);
  animation: scan 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes scan {
  0% { transform: translateX(-20%); }
  100% { transform: translateX(280%); }
}

@keyframes resume-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 720px) {
  .sheet-head,
  .project-top,
  .skill-rows p {
    display: grid;
    grid-template-columns: 1fr;
  }

  .contacts {
    justify-items: start;
  }

  .hl-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-sheet.ready > *:not(.resume-skeleton),
  .sk-line,
  .sk-block,
  .scan {
    animation: none;
  }
}
</style>
