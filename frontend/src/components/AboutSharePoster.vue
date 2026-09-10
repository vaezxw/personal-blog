<template>
  <div ref="rootRef" class="about-poster" aria-hidden="true">
    <div class="poster-bar">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
      <span class="poster-bar-title">~/profile — share.png</span>
    </div>

    <header class="poster-hero">
      <p class="poster-kicker">{{ t('share.posterKicker') }}</p>
      <h1>{{ profile.name }}</h1>
      <p class="poster-role">
        {{ profile.title }} · {{ profile.location }} ·
        {{ t('about.yearsExp', { years: profile.years }) }}
      </p>
      <p class="poster-tagline">{{ profile.tagline }}</p>
      <ul class="poster-summary">
        <li v-for="(line, i) in profile.summary" :key="i">{{ line }}</li>
      </ul>
      <div class="poster-stats">
        <div v-for="h in profile.highlights" :key="h.label" class="poster-stat">
          <strong>{{ h.value }}</strong>
          <span>{{ h.label }}</span>
        </div>
      </div>
    </header>

    <section class="poster-block">
      <h2># tech.stack</h2>
      <div class="poster-tech">
        <span
          v-for="tech in techStack"
          :key="tech.id"
          class="poster-chip"
          :style="{ borderLeftColor: tech.color }"
        >
          {{ tech.name }}
        </span>
      </div>
    </section>

    <section class="poster-block">
      <h2># projects.log</h2>
      <article v-for="project in projects" :key="project.id" class="poster-project">
        <div class="poster-project-head">
          <h3>{{ project.name }}</h3>
          <span>{{ project.period }}</span>
        </div>
        <p>{{ project.summary }}</p>
        <ul v-if="detailMode === 'detailed' && project.bullets?.length" class="poster-bullets">
          <li v-for="(b, i) in project.bullets" :key="i">{{ b }}</li>
        </ul>
        <div class="poster-tech">
          <span
            v-for="tid in project.tech"
            :key="tid"
            class="poster-chip mini"
            :style="{ borderLeftColor: techById[tid]?.color || '#2dd4bf' }"
          >
            {{ techById[tid]?.name || tid }}
          </span>
        </div>
      </article>
    </section>

    <footer class="poster-foot">
      <div class="poster-qr" v-if="qrSrc">
        <img :src="qrSrc" alt="" width="132" height="132" />
      </div>
      <div class="poster-cta">
        <strong>{{ t('share.posterScan') }}</strong>
        <p>{{ t('share.posterFooter') }}</p>
        <code>{{ pageUrl }}</code>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../composables/useLocale.js'

defineProps({
  qrSrc: { type: String, default: '' },
  pageUrl: { type: String, default: '' },
  detailMode: {
    type: String,
    default: 'compact',
    validator: (v) => v === 'compact' || v === 'detailed',
  },
})

const { t, profile, projects, techStack } = useLocale()
const rootRef = ref(null)

const techById = computed(() =>
  Object.fromEntries(techStack.value.map((item) => [item.id, item])),
)

defineExpose({
  getEl: () => rootRef.value,
})
</script>

<style scoped>
.about-poster {
  width: 750px;
  box-sizing: border-box;
  padding: 0 0 28px;
  color: #e8eef7;
  background: #0b1220;
  font-family: 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  line-height: 1.55;
}

.poster-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.red { background: #ef4444; }
.dot.yellow { background: #eab308; }
.dot.green { background: #22c55e; }

.poster-bar-title {
  margin-left: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-family: ui-monospace, Consolas, monospace;
}

.poster-hero,
.poster-block {
  padding: 22px 28px 0;
}

.poster-kicker {
  margin: 0 0 8px;
  color: #2dd4bf;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.poster-hero h1 {
  margin: 0 0 8px;
  font-size: 42px;
  line-height: 1.15;
  font-family: Georgia, 'Times New Roman', serif;
}

.poster-role,
.poster-tagline {
  margin: 0 0 12px;
  color: #94a3b8;
}

.poster-tagline {
  color: #cbd5e1;
  font-size: 16px;
}

.poster-summary {
  margin: 0 0 16px;
  padding-left: 18px;
  color: #cbd5e1;
}

.poster-summary li + li {
  margin-top: 6px;
}

.poster-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.poster-stat {
  flex: 1 1 140px;
  padding: 10px 12px;
  border: 1px dashed #2a3548;
  border-radius: 10px;
  background: #111827;
}

.poster-stat strong {
  display: block;
  color: #2dd4bf;
  font-size: 15px;
}

.poster-stat span {
  color: #94a3b8;
  font-size: 12px;
}

.poster-block h2 {
  margin: 0 0 12px;
  font-size: 18px;
  font-family: ui-monospace, Consolas, monospace;
  color: #2dd4bf;
}

.poster-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.poster-chip {
  display: inline-block;
  padding: 5px 10px 5px 8px;
  border: 1px solid #2a3548;
  border-left: 3px solid #2dd4bf;
  border-radius: 6px;
  background: #111827;
  font-size: 12px;
}

.poster-chip.mini {
  font-size: 11px;
  padding: 3px 8px 3px 7px;
}

.poster-project {
  padding: 14px 0;
  border-top: 1px solid #1e293b;
}

.poster-project-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.poster-project-head h3 {
  margin: 0;
  font-size: 17px;
}

.poster-project-head span {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
  font-family: ui-monospace, Consolas, monospace;
}

.poster-project p {
  margin: 0 0 10px;
  color: #cbd5e1;
  font-size: 14px;
}

.poster-bullets {
  margin: 0 0 10px;
  padding-left: 18px;
  color: #94a3b8;
  font-size: 13px;
}

.poster-bullets li + li {
  margin-top: 5px;
}

.poster-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 28px 0;
  padding: 18px;
  border: 1px solid #1e293b;
  border-radius: 14px;
  background: #111827;
}

.poster-qr img {
  display: block;
  width: 132px;
  height: 132px;
  border-radius: 10px;
  background: #fff;
  padding: 6px;
  box-sizing: border-box;
}

.poster-cta strong {
  display: block;
  margin-bottom: 4px;
}

.poster-cta p {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 13px;
}

.poster-cta code {
  color: #2dd4bf;
  font-size: 13px;
  word-break: break-all;
}
</style>
