<template>
  <article
    ref="rootRef"
    class="resume-sheet"
    :class="{ generating, ready: !generating && !!draft }"
  >
    <div v-if="generating" class="resume-skeleton" aria-hidden="true">
      <div class="sk-banner"></div>
      <div class="sk-line w60"></div>
      <div class="sk-line w40"></div>
      <div class="sk-block"></div>
      <div class="sk-line"></div>
      <div class="sk-line w80"></div>
      <div class="scan"></div>
    </div>

    <template v-else-if="draft">
      <header class="sheet-banner">
        <div class="banner-main">
          <p class="banner-kicker">RESUME</p>
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
        <div class="banner-contacts">
          <a v-if="draft.basics.email" :href="`mailto:${draft.basics.email}`">{{ draft.basics.email }}</a>
          <a v-if="draft.basics.github" :href="draft.basics.github" target="_blank" rel="noopener">GitHub</a>
          <a v-if="draft.basics.blog" :href="draft.basics.blog" target="_blank" rel="noopener">Blog</a>
          <span v-if="draft.basics.education" class="edu">{{ draft.basics.education }}</span>
        </div>
      </header>

      <div class="sheet-body">
        <section v-if="draft.highlights?.length" class="sheet-section">
          <h2><span>{{ t('about.resumeSecHighlights') }}</span></h2>
          <div class="hl-grid">
            <div v-for="(h, i) in draft.highlights" :key="`h-${i}`" class="hl">
              <strong>{{ h.value }}</strong>
              <span>{{ h.label }}</span>
            </div>
          </div>
        </section>

        <section v-if="draft.summary?.length" class="sheet-section">
          <h2><span>{{ t('about.resumeSecSummary') }}</span></h2>
          <ul class="plain-list">
            <li v-for="(line, i) in draft.summary" :key="`s-${i}`">{{ line }}</li>
          </ul>
        </section>

        <section v-if="draft.skills?.length" class="sheet-section">
          <h2><span>{{ t('about.resumeSecSkills') }}</span></h2>
          <div class="skill-groups">
            <div v-for="(group, i) in draft.skills" :key="`sk-${i}`" class="skill-group">
              <p class="skill-cat">{{ group.category }}</p>
              <div class="skill-tags">
                <span v-for="(item, ti) in group.items" :key="`t-${i}-${ti}`" class="tag">{{ item }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="visibleProjects.length" class="sheet-section">
          <h2><span>{{ t('about.resumeSecProjects') }}</span></h2>
          <div class="project-list">
            <div
              v-for="(project, index) in draft.projects"
              :key="project.id || `p-${index}`"
              class="project-item"
              :class="{ excluded: project.included === false }"
            >
              <div class="project-top">
                <div class="project-title-wrap">
                  <h3>{{ project.name }}</h3>
                  <span v-if="project.period" class="period">{{ project.period }}</span>
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
              <ul v-if="project.bullets?.length" class="plain-list">
                <li v-for="(b, bi) in project.bullets" :key="bi">{{ b }}</li>
              </ul>
              <div v-if="project.tech?.length" class="skill-tags tech-tags">
                <span v-for="(tech, ti) in project.tech" :key="`pt-${index}-${ti}`" class="tag soft">{{ tech }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="draft.extras?.fromResume?.length" class="sheet-section">
          <h2><span>{{ t('about.resumeSecExtras') }}</span></h2>
          <ul class="plain-list">
            <li v-for="(line, i) in draft.extras.fromResume" :key="`e-${i}`">{{ line }}</li>
          </ul>
        </section>
      </div>
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
  --rv-ink: #0f172a;
  --rv-muted: #64748b;
  --rv-accent: #0f766e;
  --rv-accent-soft: #ecfdf5;
  --rv-line: #e2e8f0;
  --rv-paper: #ffffff;

  position: relative;
  width: min(100%, 794px);
  margin: 0 auto;
  min-height: 420px;
  padding: 0;
  border-radius: 16px;
  background: var(--rv-paper);
  color: var(--rv-ink);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
  overflow: visible;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
}

.resume-sheet.ready .sheet-body {
  animation: resume-rise 0.4s ease both;
}

.sheet-banner {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1rem;
  padding: 1.35rem 1.4rem 1.25rem;
  background: linear-gradient(135deg, #0f766e 0%, #115e59 55%, #134e4a 100%);
  color: #f8fafc;
  border-radius: 16px 16px 0 0;
}

.banner-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  font-weight: 700;
  opacity: 0.8;
}

.sheet-banner h1 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: 0.02em;
  font-weight: 750;
}

.role {
  margin: 0.45rem 0 0;
  font-weight: 600;
  color: #ccfbf1;
}

.tagline {
  margin: 0.55rem 0 0;
  color: rgba(248, 250, 252, 0.88);
  line-height: 1.55;
  font-size: 0.92rem;
}

.banner-contacts {
  display: grid;
  align-content: start;
  gap: 0.4rem;
  justify-items: end;
  font-size: 0.82rem;
}

.banner-contacts a,
.banner-contacts .edu {
  color: #ecfeff;
  text-decoration: none;
  font-weight: 600;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  max-width: 100%;
  overflow-wrap: anywhere;
}

.banner-contacts .edu {
  font-weight: 500;
  opacity: 0.95;
}

.sheet-body {
  padding: 1.15rem 1.4rem 1.5rem;
}

.sheet-section {
  margin-top: 1.05rem;
}

.sheet-section:first-child {
  margin-top: 0;
}

.sheet-section h2 {
  margin: 0 0 0.65rem;
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rv-accent);
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.sheet-section h2 span {
  flex: none;
}

.sheet-section h2::after {
  content: '';
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, #99f6e4, transparent);
}

.plain-list {
  margin: 0;
  padding-left: 1.1rem;
}

.plain-list li {
  margin: 0.28rem 0;
  line-height: 1.55;
  color: #1e293b;
}

.hl-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.hl {
  border: 1px solid var(--rv-line);
  border-radius: 12px;
  padding: 0.6rem 0.65rem;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  text-align: center;
}

.hl strong {
  display: block;
  color: var(--rv-accent);
  font-size: 0.95rem;
}

.hl span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--rv-muted);
}

.skill-groups {
  display: grid;
  gap: 0.55rem;
}

.skill-group {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  gap: 0.55rem;
  align-items: start;
}

.skill-cat {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  background: var(--rv-accent-soft);
  color: #115e59;
  border: 1px solid #99f6e4;
  font-size: 0.76rem;
  font-weight: 650;
  line-height: 1.4;
}

.tag.soft {
  background: #f8fafc;
  color: #334155;
  border-color: var(--rv-line);
  font-weight: 600;
}

.project-list {
  display: grid;
  gap: 0.85rem;
}

.project-item {
  padding: 0.75rem 0 0.85rem;
  border-bottom: 1px dashed var(--rv-line);
}

.project-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.project-item.excluded {
  opacity: 0.4;
}

.project-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.project-title-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem 0.75rem;
}

.project-title-wrap h3 {
  margin: 0;
  font-size: 1.02rem;
  color: var(--rv-ink);
}

.period {
  color: var(--rv-muted);
  font-size: 0.8rem;
  font-weight: 600;
}

.project-summary {
  margin: 0.4rem 0 0.3rem;
  color: #334155;
  line-height: 1.55;
  font-size: 0.92rem;
}

.tech-tags {
  margin-top: 0.45rem;
}

.include-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--rv-muted);
  white-space: nowrap;
}

.empty {
  margin: 4rem 0;
  text-align: center;
  padding: 1rem;
}

.resume-skeleton {
  position: relative;
  display: grid;
  gap: 0.65rem;
  min-height: 360px;
  overflow: hidden;
  padding: 1rem;
}

.sk-banner {
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(90deg, #0f766e, #14b8a6, #0f766e);
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
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
  .sheet-banner,
  .project-top,
  .skill-group,
  .hl-grid {
    grid-template-columns: 1fr;
  }

  .banner-contacts {
    justify-items: start;
  }

  .sheet-banner {
    border-radius: 14px 14px 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-sheet.ready .sheet-body,
  .sk-line,
  .sk-block,
  .sk-banner,
  .scan {
    animation: none;
  }
}
</style>
