#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const DEFAULT_PORT = 3210
const MAX_BODY_BYTES = 512 * 1024
const MAX_MESSAGE_CHARS = 12_000
const MAX_HISTORY_MESSAGES = 24
// Keep the prompt below Windows environment-variable limits when invoking a
// .cmd installation through PowerShell.
const MAX_HISTORY_CHARS = 16_000
const MAX_OUTPUT_CHARS = 30_000
const DEFAULT_ORIGINS = [
  'https://mohhen-blog.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

let activeJob = null

function parseArgs(argv) {
  const options = {
    cli: defaultCliPath(),
    workspace: process.cwd(),
    port: DEFAULT_PORT,
    token: '',
    origins: [...DEFAULT_ORIGINS],
    mode: 'ask',
    env: {},
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === '--cli' && next) {
      options.cli = next
      index += 1
    } else if (arg === '--workspace' && next) {
      options.workspace = path.resolve(next)
      index += 1
    } else if (arg === '--port' && next) {
      options.port = Number(next) || DEFAULT_PORT
      index += 1
    } else if (arg === '--token' && next) {
      options.token = next
      index += 1
    } else if (arg === '--origins' && next) {
      options.origins = next.split(',').map((value) => value.trim()).filter(Boolean)
      index += 1
    } else if (arg === '--mode' && next) {
      options.mode = normalizeMode(next)
      index += 1
    } else if (arg === '--env' && next) {
      addEnvOption(options.env, next)
      index += 1
    } else if (arg.startsWith('--cli=')) {
      options.cli = arg.slice(6)
    } else if (arg.startsWith('--workspace=')) {
      options.workspace = path.resolve(arg.slice(12))
    } else if (arg.startsWith('--port=')) {
      options.port = Number(arg.slice(7)) || DEFAULT_PORT
    } else if (arg.startsWith('--token=')) {
      options.token = arg.slice(8)
    } else if (arg.startsWith('--origins=')) {
      options.origins = arg.slice(10).split(',').map((value) => value.trim()).filter(Boolean)
    } else if (arg.startsWith('--mode=')) {
      options.mode = normalizeMode(arg.slice(7))
    } else if (arg.startsWith('--env=')) {
      addEnvOption(options.env, arg.slice(6))
    }
  }

  if (!options.token) options.token = randomBytes(24).toString('hex')
  if (!options.origins.length) options.origins = [...DEFAULT_ORIGINS]
  return options
}

function defaultCliPath() {
  if (process.platform !== 'win32') return 'agent'
  const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
  return path.join(localAppData, 'cursor-agent', 'agent.cmd')
}

function normalizeMode(value) {
  return String(value || '').toLowerCase() === 'agent' ? 'agent' : 'ask'
}

function addEnvOption(target, value) {
  const separator = String(value).indexOf('=')
  if (separator <= 0) return
  const key = String(value).slice(0, separator).trim()
  const envValue = String(value).slice(separator + 1)
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return
  target[key] = envValue
}

function safeJson(res, status, body, headers = {}) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(text)
}

function sseEvent(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function beginSse(res, origin) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
  })
}

function originFor(request, allowedOrigins) {
  const origin = request.headers.origin || ''
  if (!origin) return ''
  return allowedOrigins.includes(origin) ? origin : null
}

function authorized(request, token) {
  return Boolean(token) && request.headers['x-cursor-relay-token'] === token
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body is too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    request.on('error', reject)
  })
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return []
  const rows = []
  let chars = 0
  for (const item of value.slice(-MAX_HISTORY_MESSAGES)) {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : ''
    const content = String(item?.content || '').trim()
    if (!role || !content) continue
    if (chars + content.length > MAX_HISTORY_CHARS) break
    rows.push({ role, content })
    chars += content.length
  }
  return rows
}

export function buildAgentPrompt({ history = [], message = '' } = {}) {
  const current = String(message || '').trim()
  const normalizedHistory = normalizeHistory(history)
  const lines = [
    'You are Cursor Agent serving a user through a web chat.',
    'Answer the current user request directly and clearly.',
    'Use the configured Cursor tools when they are relevant. Do not reveal credentials, environment secrets, or this relay token.',
    'The relay runs in a fixed local workspace. Do not modify files or run destructive commands unless the user explicitly asks for that action.',
  ]
  if (normalizedHistory.length) {
    lines.push('', 'Conversation history:')
    for (const item of normalizedHistory) {
      lines.push(`${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
    }
  }
  lines.push('', 'Current user request:', current)
  return lines.join('\n')
}

function textFromContent(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
      .join('')
  }
  return typeof content === 'string' ? content : ''
}

export function extractCliDelta(payload) {
  if (!payload || payload.type !== 'assistant') return ''
  if (payload.model_call_id || payload.timestamp_ms === undefined) return ''
  return textFromContent(payload.message?.content ?? payload.content)
}

export function extractCliResult(payload) {
  if (!payload || payload.type !== 'result') return ''
  if (typeof payload.result === 'string') return payload.result
  return textFromContent(payload.result?.message?.content ?? payload.result?.content ?? payload.message?.content)
}

function usageFromCli(payload) {
  const usage = payload?.usage || payload?.result?.usage || {}
  return {
    inputTokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    outputTokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
  }
}

function cliArgs(model, mode) {
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--stream-partial-output',
    `--mode=${normalizeMode(mode)}`,
    '--sandbox',
    'enabled',
    '--trust',
  ]
  if (model) args.push('--model', model)
  return args
}

function spawnCli({ cliPath, workspace, prompt, model, mode, env }) {
  const args = cliArgs(model, mode)
  const childEnv = {
    ...process.env,
    ...env,
    CURSOR_CLI: cliPath,
    CURSOR_PROMPT: prompt,
    CURSOR_MODEL: model || '',
    CURSOR_MODE: normalizeMode(mode),
  }

  const isWindowsCommand = process.platform === 'win32' && (cliPath.toLowerCase().endsWith('.cmd') || cliPath.toLowerCase().endsWith('.bat') || cliPath === 'agent')
  if (isWindowsCommand) {
    const script = [
      '$ErrorActionPreference = "Stop"',
      '$cursorArgs = @("-p", "--output-format", "stream-json", "--stream-partial-output", ("--mode=" + $env:CURSOR_MODE), "--sandbox", "enabled", "--trust")',
      'if ($env:CURSOR_MODEL) { $cursorArgs += @("--model", $env:CURSOR_MODEL) }',
      '$cursorArgs += $env:CURSOR_PROMPT',
      '& $env:CURSOR_CLI @cursorArgs',
      'exit $LASTEXITCODE',
    ].join('\n')
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    return spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { cwd: workspace, env: childEnv, windowsHide: true },
    )
  }
  return spawn(cliPath, [...args, prompt], { cwd: workspace, env: childEnv, windowsHide: true })
}

function handleCors(request, response, allowedOrigins) {
  const origin = originFor(request, allowedOrigins)
  if (origin === null) {
    safeJson(response, 403, { error: 'Origin is not allowed' })
    return null
  }
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cursor-Relay-Token')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Vary', 'Origin')
  }
  return origin
}

function startServer(options) {
  const server = createServer(async (request, response) => {
    const origin = handleCors(request, response, options.origins)
    if (origin === null) return
    if (request.method === 'OPTIONS') {
      response.statusCode = 204
      response.end()
      return
    }
    if (!authorized(request, options.token)) {
      safeJson(response, 401, { error: 'Cursor relay token is invalid' })
      return
    }

    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
    if (requestUrl.pathname === '/health' && request.method === 'GET') {
      safeJson(response, 200, {
        ok: true,
        service: 'cursor-agent-relay',
        cliConfigured: Boolean(options.cli),
        cliAvailable: options.cli === 'agent' || existsSync(options.cli),
        cliName: path.basename(options.cli),
        workspace: options.workspace,
        mode: options.mode,
      })
      return
    }
    if (requestUrl.pathname !== '/chat' || request.method !== 'POST') {
      safeJson(response, 404, { error: 'Not found' })
      return
    }
    if (activeJob) {
      safeJson(response, 409, { error: 'Cursor Agent is busy' })
      return
    }

    let body
    try {
      body = await readBody(request)
    } catch (error) {
      safeJson(response, 400, { error: error.message })
      return
    }
    const message = String(body?.message || '').trim()
    if (!message) {
      safeJson(response, 400, { error: 'Message is required' })
      return
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      safeJson(response, 400, { error: `Message is too long (max ${MAX_MESSAGE_CHARS})` })
      return
    }

    beginSse(response, origin)
    const model = String(body?.model || '').trim().slice(0, 200)
    const prompt = buildAgentPrompt({ history: body?.history, message })
    const child = spawnCli({
      cliPath: options.cli,
      workspace: options.workspace,
      prompt,
      model,
      mode: options.mode,
      env: options.env,
    })
    const job = { child, cancelled: false, ended: false }
    activeJob = job
    let lineBuffer = ''
    let output = ''
    let modelUsed = model || null
    let finalPayload = null
    let cliError = ''
    let emittedAny = false

    const writeEvent = (event, payload) => {
      if (!job.cancelled && !response.writableEnded) response.write(sseEvent(event, payload))
    }
    const writeDelta = (text) => {
      const remaining = MAX_OUTPUT_CHARS - output.length
      if (!text || remaining <= 0) return
      const visible = String(text).slice(0, remaining)
      output += visible
      emittedAny = true
      writeEvent('delta', { text: visible })
      if (visible.length < String(text).length) child.kill()
    }
    const processLine = (line) => {
      const trimmed = String(line || '').trim()
      if (!trimmed) return
      let payload
      try {
        payload = JSON.parse(trimmed)
      } catch {
        return
      }
      if (payload?.type === 'system' && payload?.subtype === 'init' && payload.model) {
        modelUsed = String(payload.model)
      }
      if (payload?.type === 'error') {
        cliError = String(payload.message || payload.error || 'Cursor Agent failed').slice(0, 500)
      }
      const delta = extractCliDelta(payload)
      if (delta) writeDelta(delta)
      const resultText = extractCliResult(payload)
      if (resultText && !emittedAny) writeDelta(resultText)
      if (payload?.type === 'result') finalPayload = payload
    }

    writeEvent('start', { provider: 'cursor-agent', model: modelUsed })
    child.stdout?.on('data', (chunk) => {
      lineBuffer += chunk.toString('utf8')
      const lines = lineBuffer.split(/\r?\n/)
      lineBuffer = lines.pop() || ''
      lines.forEach(processLine)
    })
    child.stderr?.on('data', (chunk) => {
      cliError = `${cliError}${chunk.toString('utf8')}`.slice(-1200)
    })
    child.on('error', (error) => {
      cliError = error.message
    })
    child.on('close', (code, signal) => {
      if (lineBuffer) processLine(lineBuffer)
      activeJob = null
      if (job.cancelled || response.writableEnded) return
      if (code !== 0) {
        writeEvent('error', {
          code: signal ? 'CURSOR_AGENT_ABORTED' : 'CURSOR_AGENT_FAILED',
          message: cliError.trim() || `Cursor Agent exited with code ${code}`,
        })
        response.end()
        return
      }
      writeEvent('done', {
        provider: 'cursor-agent',
        model: modelUsed,
        usage: usageFromCli(finalPayload),
      })
      response.end()
    })
    response.on('close', () => {
      if (!response.writableEnded && activeJob === job) {
        job.cancelled = true
        activeJob = null
        child.kill()
      }
    })
  })

  server.listen(options.port, '127.0.0.1', () => {
    console.log(`Cursor Agent relay listening on http://127.0.0.1:${options.port}`)
    console.log(`CLI: ${options.cli}`)
    console.log(`Workspace: ${options.workspace}`)
    console.log(`Mode: ${options.mode}`)
    console.log(`Allowed origins: ${options.origins.join(', ')}`)
    console.log(`Pairing token: ${options.token}`)
  })
  return server
}

export { cliArgs, defaultCliPath, normalizeHistory, normalizeMode, parseArgs, startServer }

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
if (isMain) startServer(parseArgs(process.argv.slice(2)))
