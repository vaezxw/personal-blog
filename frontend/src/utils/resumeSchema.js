import {
  getCategoryLabels,
  getProfile,
  getProjects,
  getTechStack,
} from '../data/profile.js'

function asString(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function asStringList(value, max = 24) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, max)
}

function asHighlights(value, max = 8) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      label: asString(item?.label),
      value: asString(item?.value),
    }))
    .filter((item) => item.label && item.value)
    .slice(0, max)
}

function asSkills(value, maxGroups = 12, maxItems = 20) {
  if (!Array.isArray(value)) return []
  return value
    .map((group) => ({
      category: asString(group?.category),
      items: asStringList(group?.items, maxItems),
    }))
    .filter((group) => group.category && group.items.length)
    .slice(0, maxGroups)
}

function asProjects(value, max = 16) {
  if (!Array.isArray(value)) return []
  return value
    .map((project) => ({
      id: asString(project?.id) || undefined,
      name: asString(project?.name),
      period: asString(project?.period),
      summary: asString(project?.summary),
      bullets: asStringList(project?.bullets, 8),
      tech: asStringList(project?.tech, 16),
      links: Array.isArray(project?.links)
        ? project.links
            .map((link) => ({
              label: asString(link?.label),
              url: asString(link?.url),
            }))
            .filter((link) => link.label && link.url)
            .slice(0, 4)
        : undefined,
      included: project?.included === false ? false : true,
    }))
    .filter((project) => project.name)
    .slice(0, max)
}

function projectLinks(project) {
  const links = []
  if (project.url) links.push({ label: 'Demo', url: project.url })
  if (project.repo) links.push({ label: 'Repo', url: project.repo })
  if (project.download) links.push({ label: 'Download', url: project.download })
  if (project.plugin) links.push({ label: 'Plugin', url: project.plugin })
  return links
}

export function buildResumeFromAbout(locale = 'zh') {
  const lang = locale === 'en' ? 'en' : 'zh'
  const profile = getProfile(lang)
  const projects = getProjects(lang)
  const techStack = getTechStack(lang)
  const categoryLabels = getCategoryLabels(lang)

  const skillsMap = new Map()
  for (const tech of techStack) {
    const category = categoryLabels[tech.category] || tech.category
    if (!skillsMap.has(category)) skillsMap.set(category, [])
    skillsMap.get(category).push(tech.name)
  }

  return {
    meta: {
      locale: lang,
      generatedAt: new Date().toISOString(),
      source: 'about',
    },
    basics: {
      name: profile.name,
      title: profile.title,
      location: profile.location,
      email: profile.email,
      github: profile.github,
      blog: profile.blog,
      education: profile.education,
      years: profile.years,
      tagline: profile.tagline,
    },
    summary: [...(profile.summary || [])],
    highlights: (profile.highlights || []).map((item) => ({ ...item })),
    skills: [...skillsMap.entries()].map(([category, items]) => ({ category, items })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      period: project.period,
      summary: project.summary,
      bullets: [...(project.bullets || [])],
      tech: (project.tech || [])
        .map((id) => techStack.find((t) => t.id === id)?.name || id)
        .filter(Boolean),
      links: projectLinks(project),
      included: true,
    })),
    extras: {
      fromResume: [],
    },
  }
}

export function cloneResumeDraft(draft) {
  return JSON.parse(JSON.stringify(draft || {}))
}

export function normalizeAiResume(raw, fallbackDraft) {
  const base = cloneResumeDraft(fallbackDraft || buildResumeFromAbout('zh'))
  if (!raw || typeof raw !== 'object') {
    return {
      ...base,
      meta: {
        ...base.meta,
        generatedAt: new Date().toISOString(),
        source: 'about',
      },
    }
  }

  const basicsRaw = raw.basics && typeof raw.basics === 'object' ? raw.basics : {}
  const extrasRaw = raw.extras && typeof raw.extras === 'object' ? raw.extras : {}

  return {
    meta: {
      locale: asString(raw.meta?.locale, base.meta.locale),
      generatedAt: new Date().toISOString(),
      source: 'merged',
    },
    basics: {
      name: asString(basicsRaw.name, base.basics.name),
      title: asString(basicsRaw.title, base.basics.title),
      location: asString(basicsRaw.location, base.basics.location),
      email: asString(basicsRaw.email, base.basics.email),
      github: asString(basicsRaw.github, base.basics.github),
      blog: asString(basicsRaw.blog, base.basics.blog),
      education: asString(basicsRaw.education, base.basics.education),
      years: asString(basicsRaw.years, base.basics.years),
      tagline: asString(basicsRaw.tagline, base.basics.tagline),
    },
    summary: asStringList(raw.summary, 12).length
      ? asStringList(raw.summary, 12)
      : [...base.summary],
    highlights: asHighlights(raw.highlights).length
      ? asHighlights(raw.highlights)
      : [...base.highlights],
    skills: asSkills(raw.skills).length ? asSkills(raw.skills) : [...base.skills],
    projects: asProjects(raw.projects).length
      ? asProjects(raw.projects)
      : cloneResumeDraft(base.projects),
    extras: {
      fromResume: asStringList(extrasRaw.fromResume, 20),
    },
  }
}

function mdLabels(locale) {
  if (locale === 'en') {
    return {
      summary: 'Summary',
      highlights: 'Highlights',
      skills: 'Skills',
      projects: 'Projects',
      extras: 'Additional experience',
      education: 'Education',
      contact: 'Contact',
    }
  }
  return {
    summary: '个人摘要',
    highlights: '亮点',
    skills: '技术栈',
    projects: '项目经历',
    extras: '补充经历',
    education: '教育背景',
    contact: '联系方式',
  }
}

export function includedProjects(draft) {
  return (draft?.projects || []).filter((project) => project.included !== false)
}

export function resumeToMarkdown(draft) {
  const locale = draft?.meta?.locale === 'en' ? 'en' : 'zh'
  const labels = mdLabels(locale)
  const basics = draft?.basics || {}
  const lines = []

  lines.push(`# ${basics.name || 'Resume'}`)
  if (basics.title || basics.location || basics.years) {
    lines.push(
      [
        basics.title,
        basics.location,
        basics.years ? (locale === 'en' ? `${basics.years} yrs` : `${basics.years} 年经验`) : '',
      ]
        .filter(Boolean)
        .join(' · '),
    )
  }
  if (basics.tagline) lines.push(`\n> ${basics.tagline}`)

  const contacts = [basics.email, basics.github, basics.blog].filter(Boolean)
  if (contacts.length) {
    lines.push(`\n## ${labels.contact}`)
    lines.push(contacts.join(' · '))
  }
  if (basics.education) {
    lines.push(`\n## ${labels.education}`)
    lines.push(basics.education)
  }

  if (draft?.summary?.length) {
    lines.push(`\n## ${labels.summary}`)
    for (const item of draft.summary) lines.push(`- ${item}`)
  }

  if (draft?.highlights?.length) {
    lines.push(`\n## ${labels.highlights}`)
    for (const item of draft.highlights) lines.push(`- **${item.label}**：${item.value}`)
  }

  if (draft?.skills?.length) {
    lines.push(`\n## ${labels.skills}`)
    for (const group of draft.skills) {
      lines.push(`- **${group.category}**：${(group.items || []).join(' / ')}`)
    }
  }

  const projects = includedProjects(draft)
  if (projects.length) {
    lines.push(`\n## ${labels.projects}`)
    for (const project of projects) {
      const head = [project.name, project.period].filter(Boolean).join(' · ')
      lines.push(`\n### ${head}`)
      if (project.summary) lines.push(project.summary)
      for (const bullet of project.bullets || []) lines.push(`- ${bullet}`)
      if (project.tech?.length) lines.push(`\nTech: ${project.tech.join(', ')}`)
      if (project.links?.length) {
        lines.push(
          project.links.map((link) => `[${link.label}](${link.url})`).join(' · '),
        )
      }
    }
  }

  if (draft?.extras?.fromResume?.length) {
    lines.push(`\n## ${labels.extras}`)
    for (const item of draft.extras.fromResume) lines.push(`- ${item}`)
  }

  return `${lines.join('\n').trim()}\n`
}

export function aboutResumePayload(locale = 'zh') {
  const draft = buildResumeFromAbout(locale)
  return {
    basics: draft.basics,
    summary: draft.summary,
    highlights: draft.highlights,
    skills: draft.skills,
    projects: draft.projects.map((project) => ({
      id: project.id,
      name: project.name,
      period: project.period,
      summary: project.summary,
      bullets: project.bullets,
      tech: project.tech,
    })),
  }
}
