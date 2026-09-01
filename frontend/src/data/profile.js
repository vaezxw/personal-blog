/** 个人档案数据：技术栈 ↔ 项目 双向关联，供 About 页交互展示 */

export const profile = {
  name: '朱晓旺',
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
    '业余维护本博客「墨痕」：Vue 3 + Cloudflare D1 + Pages Functions，国内可直连部署。',
  ],
  highlights: [
    { label: '多项目并行', value: '6+ 产品线' },
    { label: '跨端交付', value: 'Web / App / H5' },
    { label: '组件沉淀', value: 'uni PDF 插件库' },
    { label: '工程化', value: 'Jenkins · GitLab' },
  ],
}

export const techStack = [
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
  { id: 'gis', name: 'GIS 地图', category: 'viz', url: 'https://openlayers.org/', color: '#0f766e' },
  { id: 'pdfjs', name: 'PDF.js', category: 'media', url: 'https://mozilla.github.io/pdf.js/', color: '#ff7139' },
  { id: 'pdflib', name: 'pdf-lib', category: 'media', url: 'https://pdf-lib.js.org/', color: '#e53e3e' },
  { id: 'canvas', name: 'Canvas', category: 'media', url: 'https://developer.mozilla.org/docs/Web/API/Canvas_API', color: '#06b6d4' },
  { id: 'mqtt', name: 'MQTT / IoT', category: 'iot', url: 'https://mqtt.org/', color: '#6366f1' },
  { id: 'd1', name: 'Cloudflare D1', category: 'infra', url: 'https://developers.cloudflare.com/d1/', color: '#f38020' },
  { id: 'pages', name: 'Pages Functions', category: 'infra', url: 'https://developers.cloudflare.com/pages/', color: '#f38020' },
  { id: 'jenkins', name: 'Jenkins', category: 'ops', url: 'https://www.jenkins.io/', color: '#d33833' },
  { id: 'git', name: 'Git / GitLab', category: 'ops', url: 'https://about.gitlab.com/', color: '#fc6d26' },
  { id: 'scss', name: 'SCSS', category: 'style', url: 'https://sass-lang.com/', color: '#cc6699' },
  { id: 'nginx', name: 'Nginx', category: 'ops', url: 'https://nginx.org/', color: '#009639' },
]

export const projects = [
  {
    id: 'mohhen',
    name: '墨痕 · 个人博客',
    period: '2026',
    url: 'https://mohhen-blog.pages.dev',
    repo: 'https://github.com/vaezxw/personal-blog',
    tech: ['vue3', 'vite', 'd1', 'pages', 'js'],
    summary: 'Vue 3 个人博客，Cloudflare D1 持久化，多用户 JWT + httpOnly Cookie，评论与国内外网部署实践。',
    bullets: [
      'Pages Functions + D1 替代内存 API，支持注册登录与作者权限',
      'Cloudflare Pages 国内直连，对比 Vercel 部署踩坑记录',
      'Markdown 文章、管理后台、评论模块',
    ],
  },
  {
    id: 'device-lifecycle',
    name: '设备生命周期管理',
    period: '2026',
    tech: ['vue3', 'ts', 'vite', 'element-plus', 'git'],
    summary: '企业设备申购、验收、台账、维修养护、报废/闲置、知识库等全流程 B 端系统。',
    bullets: [
      '独立落地申购/验收/台账/批量导入/安装拆除等模块',
      '冒烟回归：权限、导入导出、登录态、部门-执行人联动、表单校验',
      '路由守卫、请求拦截层、字典标准化与 Vite 分包优化',
    ],
  },
  {
    id: 'revenue30',
    name: '营收管理系统',
    period: '2026',
    tech: ['vue3', 'ts', 'element-plus', 'echarts', 'pdfjs', 'nginx', 'jenkins'],
    summary: '燃气行业营收核心系统：档案、报表、限购、开户审核、流量计详情、告警配置等。',
    bullets: [
      '报表后台下载任务（20 万级导出）与进度列表',
      '24h 抄表流量计详情：4G/BBT 双协议，表格/图表双视图',
      '声速告警全局+档案自定义、IC 卡限购读卡提示等业务规则',
      'PDF.js Nginx/360 浏览器兼容方案沉淀',
    ],
  },
  {
    id: 'contract-sign',
    name: '三端网签合同',
    period: '2026',
    tech: ['vue3', 'uniapp', 'pdfjs', 'pdflib', 'canvas', 'git'],
    summary: 'Web + App + H5 合同预览、签名落点、扫码签署全链路；封装 uni PDF 插件库。',
    bullets: [
      'pdfjs-dist + pdf-lib + Canvas2d 画板，解决图层冲突与透明导出',
      '二维码加密 + token 联调，H5 外网扫码签署',
      '签名坐标归一化，插件库封装供多端复用',
    ],
  },
  {
    id: 'workbench-app',
    name: '智慧工单 / 安检 App',
    period: '2026',
    tech: ['uniapp', 'canvas', 'pdfjs', 'vant'],
    summary: '移动端智慧工作台：安检、工单、简易开户、基表抄表、审核时间线等能力。',
    bullets: [
      '安检/工单/我的模块 UI 重构与体验统一',
      '审核时间线、二维码/PDF/视频能力、隐患等级展示',
      '安检发票：PC 可视化模板 → App 打印机绑定 → TSPL/云打印',
    ],
  },
  {
    id: 'scada',
    name: 'SCADA 工业流程图',
    period: '2026',
    tech: ['vue3', 'mqtt', 'js'],
    summary: '工业流程图可视化：IoT 平台图标搭建、监测点位置调整与 MQTT 数据联调。',
    bullets: [
      '工业流程图搭建与监测点展示优化',
      '监测点排序与 MQTT 新增点位数据联调',
    ],
  },
  {
    id: 'grid-platform',
    name: '网格化智慧运营平台',
    period: '2023 — 2025',
    tech: ['vue2', 'element-ui', 'vant', 'echarts', 'gis', 'scss'],
    summary: '大屏 + PC + H5 城市数据运营平台，GIS 打点、人员定位、图表与大屏适配组件沉淀。',
    bullets: [
      'GIS 地图容器自适应与人员签到签退',
      'ECharts 大屏 2K/4K/8K 适配组件复用',
      'H5 rem/vw 适配与 Intersection Observer 懒加载',
    ],
  },
  {
    id: 'gov-oa',
    name: '政务 OA / 区块链可视化',
    period: '2022',
    tech: ['vue2', 'element-ui', 'echarts', 'pdfjs', 'scss'],
    summary: '行政 OA 与区块链数据可视化：动态路由、富文本、PDF 分片预览、图表大屏。',
    bullets: [
      'Vuex 权限菜单与动态路由',
      'PDF.js 大文件分片按需加载',
      'wangEditor 富文本封装与 ECharts 请求层统一',
    ],
  },
]

export const categoryLabels = {
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

/** 根据选中 tech id 返回关联项目 */
export function projectsForTech(techId) {
  return projects.filter((p) => p.tech.includes(techId))
}

/** 根据选中 project id 返回关联 tech 对象 */
export function techForProject(projectId) {
  const project = projects.find((p) => p.id === projectId)
  if (!project) return []
  return techStack.filter((t) => project.tech.includes(t.id))
}
