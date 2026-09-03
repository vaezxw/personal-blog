/** 个人档案数据：技术栈 ↔ 项目 双向关联（中英双语） */

const profileZh = {
  name: 'VAE',
  title: '前端开发工程师',
  location: '上海',
  email: '2148983461@qq.com',
  github: 'https://github.com/vaezxw',
  blog: 'https://mohhen-blog.pages.dev',
  years: '3+',
  education: '苏州大学应用技术学院 · 物联网工程 · 本科',
  tagline: '把复杂业务拆成可维护的前端模块，把 PDF / 打印 / 跨端签署这类「硬骨头」啃成可复用能力。',
  summary: [
    '3 年前端经验，主攻 Vue 生态与企业级 B 端 / 移动端交付。',
    '参与设备生命周期、营收系统、智慧工单 App、三端合同签署等多线并行开发。',
    '擅长表单-heavy 业务、报表导出、PDF 预览签署、uni-app 跨端、浏览器兼容与 Jenkins 工程化落地。',
    '开源维护 uni-app 合同签署组件库，已发布 DCloud 插件市场（MIT 免费）。',
    '业余维护本博客「墨痕」：Vue 3 + Cloudflare 全栈（D1 / Pages / R2），社交互动与列表缓存优化。',
  ],
  highlights: [
    { label: '多项目并行', value: '6+ 产品线' },
    { label: '跨端交付', value: 'Web / App / H5' },
    { label: '组件沉淀', value: 'uni 签署插件 · 已上架' },
    { label: '工程化', value: 'Jenkins · GitLab' },
  ],
}

const profileEn = {
  name: 'VAE',
  title: 'Frontend Engineer',
  location: 'Shanghai',
  email: '2148983461@qq.com',
  github: 'https://github.com/vaezxw',
  blog: 'https://mohhen-blog.pages.dev',
  years: '3+',
  education: 'Soochow University Applied Technology College · IoT Engineering · B.E.',
  tagline:
    'Turn complex business into maintainable frontend modules — and chew through hard problems like PDF, print, and cross-end signing into reusable capabilities.',
  summary: [
    '3+ years in frontend, focused on the Vue ecosystem and enterprise B-end / mobile delivery.',
    'Shipped in parallel across device lifecycle, revenue systems, field-work apps, and multi-end contract signing.',
    'Comfortable with form-heavy flows, report exports, PDF preview & signing, uni-app, browser quirks, and Jenkins-based delivery.',
    'Maintains an open-source uni-app contract-signing UI kit on the DCloud plugin market (MIT, free).',
    'Side project “Mohhen”: Vue 3 + Cloudflare stack (D1 / Pages / R2), social features, and list/cache perf work.',
  ],
  highlights: [
    { label: 'Parallel delivery', value: '6+ product lines' },
    { label: 'Cross-end', value: 'Web / App / H5' },
    { label: 'Open source', value: 'uni sign plugin · live' },
    { label: 'Engineering', value: 'Jenkins · GitLab' },
  ],
}

const techStackBase = [
  { id: 'vue3', name: 'Vue 3', category: 'core', url: 'https://vuejs.org/', color: '#42b883' },
  { id: 'vue2', name: 'Vue 2', category: 'core', url: 'https://v2.vuejs.org/', color: '#35495e' },
  { id: 'ts', name: 'TypeScript', category: 'core', url: 'https://www.typescriptlang.org/', color: '#3178c6' },
  { id: 'js', name: 'JavaScript', category: 'core', url: 'https://developer.mozilla.org/docs/Web/JavaScript', color: '#f7df1e' },
  { id: 'vite', name: 'Vite', category: 'build', url: 'https://vitejs.dev/', color: '#646cff' },
  { id: 'uniapp', name: 'uni-app', category: 'mobile', url: 'https://uniapp.dcloud.net.cn/', color: '#2b9939' },
  { id: 'element-plus', name: 'Element Plus', category: 'ui', url: 'https://element-plus.org/', color: '#409eff' },
  { id: 'element-ui', name: 'Element UI', category: 'ui', url: 'https://element.eleme.io/', color: '#409eff' },
  { id: 'vant', name: 'Vant', category: 'ui', url: 'https://vant-ui.github.io/vant/', color: '#1989fa' },
  { id: 'echarts', name: 'ECharts', category: 'viz', url: 'https://echarts.apache.org/', color: '#aa344d' },
  {
    id: 'gis',
    name: { zh: 'GIS 地图', en: 'GIS Maps' },
    category: 'viz',
    url: 'https://openlayers.org/',
    color: '#0f766e',
  },
  { id: 'pdfjs', name: 'PDF.js', category: 'media', url: 'https://mozilla.github.io/pdf.js/', color: '#ff7139' },
  { id: 'pdflib', name: 'pdf-lib', category: 'media', url: 'https://pdf-lib.js.org/', color: '#e53e3e' },
  { id: 'canvas', name: 'Canvas', category: 'media', url: 'https://developer.mozilla.org/docs/Web/API/Canvas_API', color: '#06b6d4' },
  { id: 'mqtt', name: 'MQTT / IoT', category: 'iot', url: 'https://mqtt.org/', color: '#6366f1' },
  { id: 'd1', name: 'Cloudflare D1', category: 'infra', url: 'https://developers.cloudflare.com/d1/', color: '#f38020' },
  { id: 'pages', name: 'Pages Functions', category: 'infra', url: 'https://developers.cloudflare.com/pages/', color: '#f38020' },
  { id: 'r2', name: 'Cloudflare R2', category: 'infra', url: 'https://developers.cloudflare.com/r2/', color: '#f38020' },
  { id: 'chartjs', name: 'Chart.js', category: 'viz', url: 'https://www.chartjs.org/', color: '#ff6384' },
  { id: 'jenkins', name: 'Jenkins', category: 'ops', url: 'https://www.jenkins.io/', color: '#d33833' },
  { id: 'git', name: 'Git / GitLab', category: 'ops', url: 'https://about.gitlab.com/', color: '#fc6d26' },
  { id: 'scss', name: 'SCSS', category: 'style', url: 'https://sass-lang.com/', color: '#cc6699' },
  { id: 'nginx', name: 'Nginx', category: 'ops', url: 'https://nginx.org/', color: '#009639' },
  { id: 'python', name: 'Python', category: 'core', url: 'https://www.python.org/', color: '#3776ab' },
  { id: 'playwright', name: 'Playwright', category: 'ops', url: 'https://playwright.dev/python/', color: '#2ead33' },
  { id: 'sqlite', name: 'SQLite', category: 'infra', url: 'https://www.sqlite.org/', color: '#003b57' },
]

const projectsBase = [
  {
    id: 'mohhen',
    period: '2026',
    url: 'https://mohhen-blog.pages.dev',
    repo: 'https://github.com/vaezxw/personal-blog',
    tech: ['vue3', 'vite', 'd1', 'pages', 'r2', 'chartjs', 'js', 'sqlite'],
    zh: {
      name: '墨痕 · 个人博客',
      summary:
        'Vue 3 + Vite 个人博客全栈：Cloudflare Pages Functions / D1 / R2，多用户社交、创作工作室与数据仪表盘。',
      bullets: [
        '技术栈：Vue 3 Composition API、Vite、Pages Functions、D1（SQLite）、R2 附件、JWT + httpOnly Cookie、Chart.js 仪表盘',
        '产品能力：富文本/Markdown、评论与 @提及、点赞/点踩互斥、收藏、转载来源卡、互关私信分享、通知与邮件摘要',
        '性能优化：列表接口瘦身与 lean enrich、文章/me/首页短 TTL 缓存与请求去重、KeepAlive 软刷新、转载 stash 秒开、发布后预热缓存',
        '工程实践：D1 迁移演进、国内可直连 Cloudflare Pages、中英双语与主题切换',
      ],
    },
    en: {
      name: 'Mohhen · Personal Blog',
      summary:
        'Full-stack Vue 3 + Vite blog on Cloudflare Pages Functions / D1 / R2 — social features, studio, and analytics.',
      bullets: [
        'Stack: Vue 3 Composition API, Vite, Pages Functions, D1 (SQLite), R2 uploads, JWT + httpOnly cookies, Chart.js dashboard',
        'Product: rich text/Markdown, comments & @mentions, like/dislike mutex, favorites, repost source cards, mutual-friend DMs, notifications + email digest',
        'Perf: slim list APIs + lean enrich, short-TTL post/me/home caches with inflight dedupe, KeepAlive soft refresh, repost stash for instant compose, warm cache after publish',
        'Ops: D1 migrations, China-reachable Cloudflare Pages, bilingual UI and theme toggle',
      ],
    },
  },
  {
    id: 'hotel-analyzer',
    period: '2026',
    repo: 'https://github.com/vaezxw/hotel-price-analyzer',
    tech: ['python', 'playwright', 'sqlite'],
    zh: {
      name: '酒店房价采集与分析',
      summary: '个人数据分析工具：Playwright 采集指定城市/酒店房价，SQLite 积累时间序列，导出 Excel 趋势与波动率报表。',
      bullets: [
        '登录态持久化 + 详情页全房型采集，重复日期自动更新落库',
        'CustomTkinter GUI + PyInstaller 打包 exe，支持定时多时段「一条龙」',
        '分析表 / 业务汇总 / 趋势图导出，QQ 邮箱 SMTP 自动发送附件',
      ],
    },
    en: {
      name: 'Hotel Price Collector & Analyzer',
      summary:
        'Personal analytics tool: scrape city/hotel rates with Playwright, store time series in SQLite, export Excel trends and volatility.',
      bullets: [
        'Persisted login + full room-type detail scrape; upsert by date',
        'CustomTkinter GUI + PyInstaller exe; scheduled multi-slot runs',
        'Analysis / business summary / charts; QQ SMTP auto-send',
      ],
    },
  },
  {
    id: 'device-lifecycle',
    period: '2026',
    tech: ['vue3', 'ts', 'vite', 'element-plus', 'git'],
    zh: {
      name: '设备生命周期管理',
      summary: '企业设备申购、验收、台账、维修养护、报废/闲置、知识库等全流程 B 端系统。',
      bullets: [
        '独立落地申购/验收/台账/批量导入/安装拆除等模块',
        '冒烟回归：权限、导入导出、登录态、部门-执行人联动、表单校验',
        '路由守卫、请求拦截层、字典标准化与 Vite 分包优化',
      ],
    },
    en: {
      name: 'Device Lifecycle Management',
      summary:
        'Enterprise B-end system for purchase, acceptance, assets, maintenance, scrap/idle, and knowledge base.',
      bullets: [
        'Owned purchase / acceptance / ledger / bulk import / install-remove modules',
        'Smoke tests: permissions, import/export, session, dept–assignee, validation',
        'Route guards, interceptors, dictionary standards, Vite chunking',
      ],
    },
  },
  {
    id: 'revenue30',
    period: '2026',
    tech: ['vue3', 'ts', 'element-plus', 'echarts', 'pdfjs', 'nginx', 'jenkins'],
    zh: {
      name: '营收管理系统',
      summary: '燃气行业营收核心系统：档案、报表、限购、开户审核、流量计详情、告警配置等。',
      bullets: [
        '报表后台下载任务（20 万级导出）与进度列表',
        '24h 抄表流量计详情：4G/BBT 双协议，表格/图表双视图',
        '声速告警全局+档案自定义、IC 卡限购读卡提示等业务规则',
        'PDF.js Nginx/360 浏览器兼容方案沉淀',
      ],
    },
    en: {
      name: 'Revenue Management System',
      summary:
        'Core gas-industry revenue suite: archives, reports, purchase limits, onboarding review, meter details, alerts.',
      bullets: [
        'Background report jobs (200k+ rows) with progress UI',
        '24h meter details: 4G/BBT dual protocol, table + chart views',
        'Sonic alarm rules and IC-card limit prompts',
        'PDF.js hardening for Nginx / 360 browser quirks',
      ],
    },
  },
  {
    id: 'contract-sign',
    period: '2026',
    tech: ['vue3', 'uniapp', 'pdfjs', 'pdflib', 'canvas', 'git'],
    zh: {
      name: '三端网签合同',
      summary: 'Web + App + H5 合同预览、签名落点、扫码签署全链路；业务沉淀为 uni-app 插件库开源发布。',
      bullets: [
        'pdfjs-dist + pdf-lib + Canvas2d 画板，解决图层冲突与透明导出',
        '二维码加密 + token 联调，H5 外网扫码签署',
        '签名坐标归一化，抽离 SignPad / PdfSignViewer / ContractSign 组件',
      ],
    },
    en: {
      name: 'Multi-end Contract Signing',
      summary:
        'Web + App + H5 contract preview, signature anchors, and QR signing — extracted into an open uni-app plugin.',
      bullets: [
        'pdfjs-dist + pdf-lib + Canvas2d; layer conflicts and transparent PNG export',
        'Encrypted QR + token flow for public H5 signing',
        'Normalized sign coords; SignPad / PdfSignViewer / ContractSign',
      ],
    },
  },
  {
    id: 'contract-sign-ui',
    period: '2026',
    plugin: 'https://ext.dcloud.net.cn/plugin?id=28142',
    tech: ['uniapp', 'pdfjs', 'canvas', 'js'],
    zh: {
      name: '合同签署 PDF 预览画板签署',
      summary:
        'uni-app 插件市场开源免费组件库：App 端 PDF 预览、签署锚点定位、renderjs 横屏画板签名，Vue2 / Vue3 双版本即装即用。',
      bullets: [
        'SignPad 横屏画板（renderjs + Canvas）、PdfSignViewer（PDF.js 预览 + 锚点）、ContractSign 一站式签署',
        '支持 view-only 预览、signed-map 回显、exportPng 透明 PNG 导出；内置 sdk/core 与 platform 适配',
        '兼容 App-Vue / App-NVue、Android 6+；MIT 协议，插件市场免费下载（v0.1.1）',
      ],
    },
    en: {
      name: 'Contract PDF Preview & Sign Pad',
      summary:
        'Free open-source uni-app plugin: App PDF preview, sign anchors, renderjs landscape pad — Vue 2/3 ready.',
      bullets: [
        'SignPad (renderjs + Canvas), PdfSignViewer (PDF.js + anchors), ContractSign all-in-one',
        'view-only, signed-map replay, transparent PNG export; sdk/core + platform adapters',
        'App-Vue / App-NVue, Android 6+; MIT on DCloud market (v0.1.1)',
      ],
    },
  },
  {
    id: 'workbench-app',
    period: '2026',
    tech: ['uniapp', 'canvas', 'pdfjs', 'vant'],
    zh: {
      name: '智慧工单 / 安检 App',
      summary: '移动端智慧工作台：安检、工单、简易开户、基表抄表、审核时间线等能力。',
      bullets: [
        '安检/工单/我的模块 UI 重构与体验统一',
        '审核时间线、二维码/PDF/视频能力、隐患等级展示',
        '安检发票：PC 可视化模板 → App 打印机绑定 → TSPL/云打印',
      ],
    },
    en: {
      name: 'Smart Work Orders / Safety App',
      summary:
        'Mobile workbench for safety checks, tickets, light onboarding, meter reading, and review timelines.',
      bullets: [
        'UI refresh across safety / tickets / profile modules',
        'Review timeline, QR/PDF/video, hazard levels',
        'Safety invoices: PC templates → App printer bind → TSPL/cloud print',
      ],
    },
  },
  {
    id: 'scada',
    period: '2026',
    tech: ['vue3', 'mqtt', 'js'],
    zh: {
      name: 'SCADA 工业流程图',
      summary: '工业流程图可视化：IoT 平台图标搭建、监测点位置调整与 MQTT 数据联调。',
      bullets: [
        '工业流程图搭建与监测点展示优化',
        '监测点排序与 MQTT 新增点位数据联调',
      ],
    },
    en: {
      name: 'SCADA Process Diagrams',
      summary: 'Industrial process visualization: IoT icons, monitor points, and MQTT data wiring.',
      bullets: [
        'Process diagram layout and monitor-point UX',
        'Point ordering and MQTT onboarding for new sensors',
      ],
    },
  },
  {
    id: 'grid-platform',
    period: '2023 — 2025',
    tech: ['vue2', 'element-ui', 'vant', 'echarts', 'gis', 'scss'],
    zh: {
      name: '网格化智慧运营平台',
      summary: '大屏 + PC + H5 城市数据运营平台，GIS 打点、人员定位、图表与大屏适配组件沉淀。',
      bullets: [
        'GIS 地图容器自适应与人员签到签退',
        'ECharts 大屏 2K/4K/8K 适配组件复用',
        'H5 rem/vw 适配与 Intersection Observer 懒加载',
      ],
    },
    en: {
      name: 'Grid Smart Operations Platform',
      summary:
        'City ops platform across big-screen / PC / H5 — GIS pins, staff location, charts, and display adapters.',
      bullets: [
        'Responsive GIS container and check-in / check-out',
        'Reusable ECharts adapters for 2K/4K/8K walls',
        'H5 rem/vw layout and Intersection Observer lazy-load',
      ],
    },
  },
  {
    id: 'gov-oa',
    period: '2022',
    tech: ['vue2', 'element-ui', 'echarts', 'pdfjs', 'scss'],
    zh: {
      name: '政务 OA / 区块链可视化',
      summary: '行政 OA 与区块链数据可视化：动态路由、富文本、PDF 分片预览、图表大屏。',
      bullets: [
        'Vuex 权限菜单与动态路由',
        'PDF.js 大文件分片按需加载',
        'wangEditor 富文本封装与 ECharts 请求层统一',
      ],
    },
    en: {
      name: 'Gov OA / Blockchain Viz',
      summary:
        'Administrative OA and blockchain dashboards: dynamic routes, rich text, chunked PDF preview, chart walls.',
      bullets: [
        'Vuex permission menus and dynamic routing',
        'Chunked on-demand PDF.js for large files',
        'wangEditor wrappers and unified ECharts request layer',
      ],
    },
  },
]

const categoryLabelsZh = {
  core: '语言 / 框架',
  build: '构建',
  ui: 'UI 组件',
  viz: '可视化',
  media: '文档 / 画布',
  iot: '物联网',
  infra: '云 / 边缘',
  ops: '工程化',
  style: '样式',
  mobile: '跨端',
}

const categoryLabelsEn = {
  core: 'Lang / Framework',
  build: 'Build',
  ui: 'UI Kits',
  viz: 'Visualization',
  media: 'Docs / Canvas',
  iot: 'IoT',
  infra: 'Cloud / Edge',
  ops: 'Engineering',
  style: 'Styling',
  mobile: 'Cross-end',
}

function localizeName(name, locale) {
  if (name && typeof name === 'object') return name[locale] || name.zh || ''
  return name
}

export function getProfile(locale = 'zh') {
  return locale === 'en' ? profileEn : profileZh
}

export function getTechStack(locale = 'zh') {
  return techStackBase.map((t) => ({
    ...t,
    name: localizeName(t.name, locale),
  }))
}

export function getProjects(locale = 'zh') {
  const lang = locale === 'en' ? 'en' : 'zh'
  return projectsBase.map((p) => {
    const text = p[lang] || p.zh
    return {
      id: p.id,
      period: p.period,
      url: p.url,
      repo: p.repo,
      plugin: p.plugin,
      tech: p.tech,
      name: text.name,
      summary: text.summary,
      bullets: text.bullets,
    }
  })
}

export function getCategoryLabels(locale = 'zh') {
  return locale === 'en' ? categoryLabelsEn : categoryLabelsZh
}

/** @deprecated 兼容旧引用，默认中文 */
export const profile = profileZh
export const techStack = getTechStack('zh')
export const projects = getProjects('zh')
export const categoryLabels = categoryLabelsZh

export function projectsForTech(techId, locale = 'zh') {
  return getProjects(locale).filter((p) => p.tech.includes(techId))
}

export function techForProject(projectId, locale = 'zh') {
  const project = getProjects(locale).find((p) => p.id === projectId)
  if (!project) return []
  return getTechStack(locale).filter((t) => project.tech.includes(t.id))
}
