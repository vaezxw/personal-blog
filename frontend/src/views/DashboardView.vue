<template>
  <section class="dash" v-if="data">
    <header class="dash-hero panel">
      <div class="dash-identity">
        <div class="dash-avatar" aria-hidden="true">
          <img v-if="data.user.avatarUrl" :src="data.user.avatarUrl" alt="" />
          <template v-else>{{ avatarLetter }}</template>
        </div>
        <div>
          <p class="eyebrow mono">{{ t('dash.eyebrow') }}</p>
          <h1>{{ t('dash.title', { user: data.user.username }) }}</h1>
          <p class="muted">{{ t('dash.lede') }}</p>
        </div>
      </div>
      <div class="dash-actions">
        <RouterLink class="btn ghost" :to="{ name: 'user', params: { username } }">
          {{ t('dash.backProfile') }}
        </RouterLink>
        <button class="btn ghost" type="button" :disabled="loading" @click="load">
          {{ t('admin.refresh') }}
        </button>
      </div>
    </header>

    <div class="kpi-grid">
      <div v-for="k in kpis" :key="k.key" class="kpi-card" :style="{ '--kpi': k.color }">
        <span class="kpi-label">{{ k.label }}</span>
        <strong class="kpi-value mono">{{ formatNum(k.value) }}</strong>
        <span class="kpi-glow" aria-hidden="true"></span>
      </div>
    </div>

    <article class="panel heat-panel" v-if="heatmapWeeks.length">
      <div class="chart-head">
        <h2>{{ t('dash.heatTitle') }}</h2>
        <p class="muted">{{ t('dash.heatLede') }}</p>
      </div>
      <div class="heat-scroll">
        <div
          class="heat-board"
          :style="{ '--weeks': String(heatmapWeeks.length || 53) }"
        >
          <div class="heat-corner" aria-hidden="true"></div>
          <div class="heat-months" aria-hidden="true">
            <div
              v-for="(m, i) in heatmapMonths"
              :key="`${m.key}-${i}`"
              class="heat-month-slot"
              :style="{ gridColumn: `span ${m.span}` }"
            >
              <span v-if="m.show">{{ m.label }}</span>
            </div>
          </div>
          <div class="heat-dows" aria-hidden="true">
            <span v-for="(d, i) in dowLabels" :key="i">{{ d }}</span>
          </div>
          <div class="heat-weeks">
            <div v-for="(week, wi) in heatmapWeeks" :key="`w-${wi}`" class="heat-week">
              <template v-for="dow in 7" :key="`${wi}-${dow}`">
                <button
                  v-if="week[dow - 1]"
                  type="button"
                  class="heat-cell"
                  :class="`lv-${week[dow - 1].level}`"
                  :title="heatTip(week[dow - 1])"
                ></button>
                <span v-else class="heat-cell heat-empty" aria-hidden="true"></span>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="heat-legend">
        <span class="muted">{{ t('dash.heatLess') }}</span>
        <span class="heat-cell lv-0"></span>
        <span class="heat-cell lv-1"></span>
        <span class="heat-cell lv-2"></span>
        <span class="heat-cell lv-3"></span>
        <span class="heat-cell lv-4"></span>
        <span class="muted">{{ t('dash.heatMore') }}</span>
        <span class="muted heat-total">
          {{ t('dash.heatTotal', { count: data.summary.postCount || 0 }) }}
        </span>
      </div>
    </article>

    <div class="chart-grid">
      <article class="chart-panel panel">
        <div class="chart-head">
          <h2>{{ t('dash.trendTitle') }}</h2>
          <p class="muted">{{ t('dash.trendLede') }}</p>
        </div>
        <div class="chart-wrap">
          <canvas ref="trendRef"></canvas>
        </div>
      </article>

      <article class="chart-panel panel">
        <div class="chart-head">
          <h2>{{ t('dash.mixTitle') }}</h2>
          <p class="muted">{{ t('dash.mixLede') }}</p>
        </div>
        <div class="chart-wrap doughnut">
          <canvas ref="mixRef"></canvas>
        </div>
      </article>

      <article class="chart-panel panel">
        <div class="chart-head">
          <h2>{{ t('dash.postsTitle') }}</h2>
          <p class="muted">{{ t('dash.postsLede') }}</p>
        </div>
        <div class="chart-wrap">
          <canvas ref="postsRef"></canvas>
        </div>
      </article>

      <article class="chart-panel panel">
        <div class="chart-head">
          <h2>{{ t('dash.topTitle') }}</h2>
          <p class="muted">{{ t('dash.topLede') }}</p>
        </div>
        <div class="chart-wrap">
          <canvas ref="topRef"></canvas>
        </div>
      </article>
    </div>

    <article class="panel top-table" v-if="data.series.topPosts?.length">
      <h2>{{ t('dash.tableTitle') }}</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{{ t('dash.colTitle') }}</th>
              <th>{{ t('admin.statsViews') }}</th>
              <th>{{ t('admin.statsLikes') }}</th>
              <th>{{ t('admin.statsFavorites') }}</th>
              <th>{{ t('admin.statsComments') }}</th>
              <th>{{ t('admin.statsHeat') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in data.series.topPosts" :key="p.slug">
              <td>
                <RouterLink :to="{ name: 'post', params: { slug: p.slug } }">{{ p.title }}</RouterLink>
              </td>
              <td class="mono">{{ p.views }}</td>
              <td class="mono">{{ p.likes }}</td>
              <td class="mono">{{ p.favorites || 0 }}</td>
              <td class="mono">{{ p.comments }}</td>
              <td class="mono heat">{{ p.heat }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>

  <p v-else-if="loading" class="muted">{{ t('home.loading') }}</p>
  <p v-else class="error">{{ error || t('dash.missing') }}</p>
</template>

<script setup>
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fetchUserDashboard } from '../api'
import { useLocale } from '../composables/useLocale.js'
import { useTheme } from '../composables/useTheme.js'

Chart.register(
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
)

const props = defineProps({
  username: { type: String, required: true },
})

const { t, isEn } = useLocale()
const { isDark } = useTheme()

const loading = ref(true)
const error = ref('')
const data = ref(null)
const trendRef = ref(null)
const mixRef = ref(null)
const postsRef = ref(null)
const topRef = ref(null)

let trendChart = null
let mixChart = null
let postsChart = null
let topChart = null

const avatarLetter = computed(() => (data.value?.user?.username || '?').slice(0, 1).toUpperCase())

const dowLabels = computed(() =>
  isEn.value ? ['', 'Mon', '', 'Wed', '', 'Fri', ''] : ['', '一', '', '三', '', '五', ''],
)

const monthNames = computed(() =>
  isEn.value
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
)

/** weeks[weekIndex][dow] = cell | null, always length 7 (Sun..Sat) */
const heatmapWeeks = computed(() => {
  const cells = data.value?.series?.postHeatmap?.cells || []
  if (!cells.length) return []

  const weeks = []
  let current = Array(7).fill(null)
  for (const cell of cells) {
    current[cell.dow] = cell
    if (cell.dow === 6) {
      weeks.push(current)
      current = Array(7).fill(null)
    }
  }
  // trailing partial week (not ended on Saturday yet)
  if (current.some(Boolean)) weeks.push(current)
  return weeks
})

/** Month bands aligned to week columns; hide label when span is too narrow to avoid overlap. */
const heatmapMonths = computed(() => {
  const weeks = heatmapWeeks.value
  if (!weeks.length) return []

  const bands = []
  for (let i = 0; i < weeks.length; i++) {
    const first = weeks[i].find(Boolean)
    if (!first?.date) continue
    const key = first.date.slice(0, 7)
    const last = bands[bands.length - 1]
    if (last && last.key === key) {
      last.span += 1
    } else {
      const monthIdx = Number(key.slice(5, 7)) - 1
      bands.push({
        key,
        label: monthNames.value[monthIdx] || key,
        span: 1,
        show: false,
      })
    }
  }

  for (const band of bands) {
    // Need ~2+ week columns for "8月"/"Sep" to not collide with the next label
    band.show = band.span >= 2
  }
  return bands
})

function heatTip(cell) {
  return t('dash.heatTip', { date: cell.date, count: cell.value || 0 })
}

const kpis = computed(() => {
  const s = data.value?.summary || {}
  return [
    { key: 'heat', label: t('admin.statsHeat'), value: s.heat || 0, color: '#2dd4bf' },
    { key: 'views', label: t('admin.statsViews'), value: s.viewCount || 0, color: '#38bdf8' },
    { key: 'likes', label: t('admin.statsLikes'), value: s.likeCount || 0, color: '#fb7185' },
    { key: 'favorites', label: t('admin.statsFavorites'), value: s.favoriteCount || 0, color: '#f59e0b' },
    { key: 'comments', label: t('admin.statsComments'), value: s.commentCount || 0, color: '#a78bfa' },
    { key: 'posts', label: t('admin.statsPosts'), value: s.postCount || 0, color: '#34d399' },
    { key: 'followers', label: t('user.followers'), value: s.followerCount || 0, color: '#fbbf24' },
  ]
})

function formatNum(n) {
  return new Intl.NumberFormat(isEn.value ? 'en-US' : 'zh-CN').format(Number(n || 0))
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function chartColors() {
  const ink = cssVar('--ink', '#e8eef7')
  const muted = cssVar('--muted', '#94a3b8')
  const line = cssVar('--line', '#2a3548')
  return { ink, muted, line, grid: isDark.value ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.08)' }
}

function destroyCharts() {
  trendChart?.destroy()
  mixChart?.destroy()
  postsChart?.destroy()
  topChart?.destroy()
  trendChart = mixChart = postsChart = topChart = null
}

function shortLabel(text, max = 10) {
  const s = String(text || '')
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function renderCharts() {
  if (!data.value) return
  destroyCharts()
  const c = chartColors()
  const series = data.value.series
  const labels = series.likes30d.map((x) => x.date.slice(5))

  if (trendRef.value) {
    trendChart = new Chart(trendRef.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: t('admin.statsLikes'),
            data: series.likes30d.map((x) => x.value),
            borderColor: '#fb7185',
            backgroundColor: 'rgba(251,113,133,0.18)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: t('admin.statsFavorites'),
            data: (series.favorites30d || []).map((x) => x.value),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.14)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: t('admin.statsComments'),
            data: series.comments30d.map((x) => x.value),
            borderColor: '#2dd4bf',
            backgroundColor: 'rgba(45,212,191,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: t('user.followers'),
            data: series.followers30d.map((x) => x.value),
            borderColor: '#fbbf24',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
            borderDash: [5, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: c.muted, boxWidth: 10, usePointStyle: true },
          },
          tooltip: { backgroundColor: isDark.value ? '#0f172a' : '#111827' },
        },
        scales: {
          x: {
            ticks: { color: c.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { color: c.grid },
          },
          y: {
            beginAtZero: true,
            ticks: { color: c.muted, precision: 0 },
            grid: { color: c.grid },
          },
        },
      },
    })
  }

  if (mixRef.value) {
    const mixLabels = {
      views: t('admin.statsViews'),
      likes: t('admin.statsLikes'),
      favorites: t('admin.statsFavorites'),
      comments: t('admin.statsComments'),
      clicks: t('admin.statsClicks'),
    }
    mixChart = new Chart(mixRef.value, {
      type: 'doughnut',
      data: {
        labels: series.mix.map((x) => mixLabels[x.key] || x.key),
        datasets: [
          {
            data: series.mix.map((x) => x.value),
            backgroundColor: ['#38bdf8', '#fb7185', '#f59e0b', '#a78bfa', '#34d399'],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: c.muted, boxWidth: 10, usePointStyle: true },
          },
        },
      },
    })
  }

  if (postsRef.value) {
    postsChart = new Chart(postsRef.value, {
      type: 'bar',
      data: {
        labels: series.postsByMonth.map((x) => x.month),
        datasets: [
          {
            label: t('admin.statsPosts'),
            data: series.postsByMonth.map((x) => x.value),
            backgroundColor: (ctx) => {
              const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220)
              g.addColorStop(0, 'rgba(45,212,191,0.9)')
              g.addColorStop(1, 'rgba(56,189,248,0.25)')
              return g
            },
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: c.muted }, grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { color: c.muted, precision: 0 },
            grid: { color: c.grid },
          },
        },
      },
    })
  }

  if (topRef.value) {
    const tops = series.topPosts || []
    topChart = new Chart(topRef.value, {
      type: 'bar',
      data: {
        labels: tops.map((p) => shortLabel(p.title, isEn.value ? 14 : 8)),
        datasets: [
          {
            label: t('admin.statsHeat'),
            data: tops.map((p) => p.heat),
            backgroundColor: 'rgba(251,113,133,0.75)',
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: t('admin.statsViews'),
            data: tops.map((p) => p.views),
            backgroundColor: 'rgba(56,189,248,0.55)',
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: c.muted, boxWidth: 10, usePointStyle: true },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: c.muted, precision: 0 },
            grid: { color: c.grid },
          },
          y: { ticks: { color: c.ink }, grid: { display: false } },
        },
      },
    })
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchUserDashboard(props.username)
    await nextTick()
    renderCharts()
  } catch (err) {
    data.value = null
    destroyCharts()
    error.value = err.message || t('dash.missing')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.username,
  () => load(),
)

watch([isDark, isEn], async () => {
  if (!data.value) return
  await nextTick()
  renderCharts()
})

onMounted(load)
onBeforeUnmount(destroyCharts)
</script>

<style scoped>
.dash {
  animation: rise 0.55s ease both;
}

.dash-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
}

.dash-hero::before {
  content: '';
  position: absolute;
  inset: auto -10% -40% auto;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%);
  pointer-events: none;
}

.dash-identity {
  display: flex;
  gap: 0.95rem;
  align-items: center;
  position: relative;
}

.dash-avatar {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 16px;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--stat-bg);
  border: 1px solid var(--line);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}

.dash-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dash-hero h1 {
  margin: 0.15rem 0 0.35rem;
  font-size: clamp(1.55rem, 3.5vw, 2.1rem);
}

.dash-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  position: relative;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.kpi-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0.85rem 0.9rem;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(8px);
  animation: rise 0.6s ease both;
}

.kpi-card:nth-child(2) {
  animation-delay: 0.04s;
}
.kpi-card:nth-child(3) {
  animation-delay: 0.08s;
}
.kpi-card:nth-child(4) {
  animation-delay: 0.12s;
}
.kpi-card:nth-child(5) {
  animation-delay: 0.16s;
}
.kpi-card:nth-child(6) {
  animation-delay: 0.2s;
}

.kpi-label {
  display: block;
  color: var(--muted);
  font-size: 0.8rem;
}

.kpi-value {
  display: block;
  margin-top: 0.25rem;
  font-size: 1.35rem;
  color: var(--kpi, var(--accent));
}

.kpi-glow {
  position: absolute;
  right: -20%;
  bottom: -40%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--kpi) 35%, transparent), transparent 70%);
  pointer-events: none;
}

.heat-panel {
  margin-bottom: 0.85rem;
}

.heat-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
  width: 100%;
}

.heat-board {
  --heat-gap: 3px;
  --weeks: 53;
  display: grid;
  grid-template-columns: 1.6rem minmax(0, 1fr);
  grid-template-rows: 1rem auto;
  gap: 0.35rem var(--heat-gap);
  width: 100%;
  min-width: 0;
}

.heat-corner {
  grid-column: 1;
  grid-row: 1;
}

.heat-months {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: repeat(var(--weeks), minmax(0, 1fr));
  gap: var(--heat-gap);
  min-width: 0;
}

.heat-month-slot {
  min-width: 0;
  overflow: hidden;
  height: 1rem;
}

.heat-month-slot span {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1rem;
}

.heat-dows {
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: var(--heat-gap);
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1;
  align-items: center;
  justify-items: start;
}

.heat-weeks {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-columns: repeat(var(--weeks), minmax(0, 1fr));
  gap: var(--heat-gap);
  min-width: 0;
  width: 100%;
}

.heat-week {
  display: grid;
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: var(--heat-gap);
  min-width: 0;
}

.heat-cell {
  width: 100%;
  aspect-ratio: 1;
  min-width: 0;
  min-height: 0;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  background: color-mix(in srgb, var(--line) 35%, transparent);
  padding: 0;
  cursor: default;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.heat-cell.heat-empty {
  opacity: 0;
  border-color: transparent;
  background: transparent;
  pointer-events: none;
}

button.heat-cell:hover {
  transform: scale(1.15);
  filter: brightness(1.15);
  z-index: 1;
}

.heat-cell.lv-0 {
  background: color-mix(in srgb, var(--line) 28%, transparent);
}
.heat-cell.lv-1 {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
.heat-cell.lv-2 {
  background: color-mix(in srgb, var(--accent) 48%, transparent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}
.heat-cell.lv-3 {
  background: color-mix(in srgb, var(--accent) 72%, transparent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
}
.heat-cell.lv-4 {
  background: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 70%, #000);
}

.heat-legend {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
}

.heat-legend .heat-cell {
  display: inline-block;
  width: 11px;
  height: 11px;
  aspect-ratio: auto;
  flex: 0 0 11px;
}

.heat-total {
  margin-left: auto;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

.chart-panel {
  margin: 0;
  min-width: 0;
}

.chart-head h2 {
  margin: 0 0 0.2rem;
  font-size: 1.05rem;
}

.chart-head p {
  margin: 0 0 0.75rem;
  font-size: 0.88rem;
}

.chart-wrap {
  height: 260px;
  position: relative;
}

.chart-wrap.doughnut {
  height: 260px;
  max-width: 320px;
  margin: 0 auto;
}

.top-table h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

th,
td {
  text-align: left;
  padding: 0.65rem 0.5rem;
  border-bottom: 1px dashed var(--line);
}

th {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.82rem;
}

td.heat {
  color: var(--accent);
  font-weight: 700;
}

@media (max-width: 980px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dash-identity {
    align-items: flex-start;
  }
}
</style>
