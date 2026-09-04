import { requireUser } from '../_lib/auth.js'
import {
  AI_MAX_CONTEXT_CHARS,
  AI_MAX_MESSAGE_CHARS,
  assertDailyLimit,
  extractAssistantText,
  extractDelta,
  extractUsage,
  getConnection,
  getDefaultConnection,
  insertMessage,
  mapMessage,
  recordUsage,
  requestProvider,
  updateMessage,
  upstreamError,
} from '../_lib/ai.js'
import { corsHeaders, empty, json, readJson } from '../_lib/response.js'
import { newId } from '../_lib/crypto.js'

const AI_MAX_OUTPUT_CHARS = 30_000

function sseEvent(event, payload) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function safeError(error) {
  const message = String(error?.message || error || 'AI request failed')
  if (/AI_CONFIG_ENCRYPTION_KEY/i.test(message)) {
    return { status: 503, code: 'AI_NOT_CONFIGURED', message: 'AI connection encryption is not configured on the server' }
  }
  if (error?.code === 'AI_DAILY_LIMIT') {
    return { status: 429, code: error.code, message: 'Daily AI request limit reached' }
  }
  if (error?.status) return { status: error.status, code: error.code || 'AI_REQUEST_FAILED', message }
  if (/aborted|timeout/i.test(message)) {
    return { status: 504, code: 'AI_TIMEOUT', message: 'Model provider request timed out' }
  }
  return { status: 502, code: error?.code || 'AI_REQUEST_FAILED', message }
}

async function loadConversation(db, userId, id) {
  return db
    .prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first()
}

async function createConversation(db, userId, connectionId) {
  const id = newId('aicv')
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO ai_conversations (id, user_id, connection_id, title, created_at, updated_at)
       VALUES (?, ?, ?, 'New chat', ?, ?)`,
    )
    .bind(id, userId, connectionId, now, now)
    .run()
  return { id, user_id: userId, connection_id: connectionId, title: 'New chat' }
}

async function loadHistory(db, conversationId, currentMessage) {
  const { results } = await db
    .prepare(
      `SELECT role, content FROM ai_messages
       WHERE conversation_id = ? AND status = 'complete'
       ORDER BY sequence_no DESC
       LIMIT 100`,
    )
    .bind(conversationId)
    .all()

  const messages = []
  let chars = String(currentMessage || '').length
  for (const row of (results || []).reverse()) {
    const content = String(row.content || '')
    if (!content) continue
    if (chars + content.length > AI_MAX_CONTEXT_CHARS) break
    messages.push({ role: row.role, content })
    chars += content.length
  }
  messages.push({ role: 'user', content: currentMessage })
  return { messages, inputChars: chars }
}

async function readUpstreamError(response) {
  const text = await response.text().catch(() => '')
  let payload = text
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    /* Keep plain upstream text for normalization. */
  }
  return upstreamError(response.status, payload)
}

function parseSseBlocks(buffer) {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.split('\n\n')
  return { blocks: blocks.slice(0, -1), rest: blocks[blocks.length - 1] || '' }
}

function parseSseBlock(block) {
  const lines = block.split('\n')
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
  return { event, data }
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return empty(204)
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const auth = await requireUser(context)
  if (auth.error) return auth.error
  const { user } = auth

  let body
  try {
    body = await readJson(request)
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const text = String(body?.message || '').trim()
  if (!text) return json(400, { error: 'Message is required' })
  if (text.length > AI_MAX_MESSAGE_CHARS) {
    return json(400, { error: `Message too long (max ${AI_MAX_MESSAGE_CHARS})`, code: 'AI_MESSAGE_TOO_LONG' })
  }

  let conversation
  let connection
  try {
    await assertDailyLimit(env.DB, user.id, env)

    if (body?.conversationId) {
      conversation = await loadConversation(env.DB, user.id, String(body.conversationId))
      if (!conversation) return json(404, { error: 'AI conversation not found' })
    }

    if (body?.connectionId) {
      connection = await getConnection(env.DB, user.id, String(body.connectionId))
      if (!connection) return json(404, { error: 'AI connection not found' })
    } else if (conversation?.connection_id) {
      connection = await getConnection(env.DB, user.id, conversation.connection_id)
    }
    if (!connection) connection = await getDefaultConnection(env.DB, user.id)
    if (!connection) return json(400, { error: 'Configure an AI connection first', code: 'AI_NO_CONNECTION' })

    if (!conversation) conversation = await createConversation(env.DB, user.id, connection.id)
    if (conversation.connection_id !== connection.id) {
      await env.DB.prepare(
        'UPDATE ai_conversations SET connection_id = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      )
        .bind(connection.id, new Date().toISOString(), conversation.id, user.id)
        .run()
      conversation.connection_id = connection.id
    }

    const history = await loadHistory(env.DB, conversation.id, text)
    const userMessage = await insertMessage(env.DB, {
      conversationId: conversation.id,
      role: 'user',
      content: text,
    })
    if (conversation.title === 'New chat') {
      const title = text.replace(/\s+/g, ' ').slice(0, 48) || 'New chat'
      await env.DB.prepare(
        'UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      )
        .bind(title, new Date().toISOString(), conversation.id, user.id)
        .run()
    }

    const providerResponse = await requestProvider(
      env,
      connection,
      {
        model: connection.model,
        messages: history.messages,
        stream: true,
      },
      request.signal,
    )
    if (!providerResponse.ok) throw await readUpstreamError(providerResponse)

    const assistantMessage = await insertMessage(env.DB, {
      conversationId: conversation.id,
      role: 'assistant',
      content: '',
      status: 'partial',
    })
    const responseEncoder = new TextEncoder()
    let assistantText = ''
    let finalized = false
    let usage = { inputTokens: 0, outputTokens: 0 }
    let outputChars = 0
    let usageRecorded = false
    const upstreamAborter = new AbortController()
    const abortUpstream = () => upstreamAborter.abort()
    request.signal.addEventListener('abort', abortUpstream, { once: true })

    async function finalize(status, errorCode = null) {
      if (finalized) return
      finalized = true
      await updateMessage(env.DB, assistantMessage.id, assistantText, status, errorCode)
      await env.DB.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(new Date().toISOString(), conversation.id, user.id)
        .run()
      if (!usageRecorded) {
        usageRecorded = true
        await recordUsage(env.DB, user.id, {
          inputChars: history.inputChars,
          outputChars,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        })
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event, payload) => {
          if (!request.signal.aborted) controller.enqueue(responseEncoder.encode(sseEvent(event, payload)))
        }
        const finishPayload = () => ({
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          messageId: assistantMessage.id,
          model: connection.model,
          usage: {
            inputChars: history.inputChars,
            outputChars,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          },
        })

        try {
          send('start', {
            conversationId: conversation.id,
            userMessageId: userMessage.id,
            messageId: assistantMessage.id,
            model: connection.model,
          })

          if (!providerResponse.body) throw new Error('Empty response from model provider')
          const contentType = providerResponse.headers.get('content-type') || ''
          if (!contentType.includes('text/event-stream')) {
            const payload = await providerResponse.json().catch(() => ({}))
            const fullText = extractAssistantText(payload).slice(0, AI_MAX_OUTPUT_CHARS)
            assistantText = fullText
            outputChars = assistantText.length
            usage = extractUsage(payload)
            if (assistantText) send('delta', { text: assistantText })
            await finalize('complete')
            send('done', finishPayload())
            controller.close()
            return
          }

          const reader = providerResponse.body.getReader()
          const cancelReader = () => reader.cancel().catch(() => {})
          request.signal.addEventListener('abort', cancelReader, { once: true })
          const streamDecoder = new TextDecoder()
          let buffer = ''
          let ended = false

          while (!ended) {
            const result = await reader.read()
            if (result.done) break
            buffer += streamDecoder.decode(result.value, { stream: true })
            const parsed = parseSseBlocks(buffer)
            buffer = parsed.rest
            for (const block of parsed.blocks) {
              const parsedEvent = parseSseBlock(block)
              if (!parsedEvent.data || parsedEvent.data === '[DONE]') {
                if (parsedEvent.data === '[DONE]') ended = true
                continue
              }
              let payload
              try {
                payload = JSON.parse(parsedEvent.data)
              } catch {
                continue
              }
              if (payload?.error) throw upstreamError(502, payload)
              const nextUsage = extractUsage(payload)
              if (nextUsage.inputTokens || nextUsage.outputTokens) usage = nextUsage
              const delta = extractDelta(payload)
              if (!delta) continue
              const remaining = AI_MAX_OUTPUT_CHARS - assistantText.length
              if (remaining <= 0) {
                ended = true
                break
              }
              const visible = delta.slice(0, remaining)
              assistantText += visible
              outputChars = assistantText.length
              send('delta', { text: visible })
              if (visible.length < delta.length) ended = true
            }
          }

          if (request.signal.aborted) {
            await finalize('partial', 'CLIENT_ABORTED')
            controller.close()
            return
          }
          await finalize('complete')
          send('done', finishPayload())
          controller.close()
        } catch (error) {
          const normalized = safeError(error)
          const status = assistantText ? 'partial' : 'error'
          await finalize(status, normalized.code)
          if (!request.signal.aborted) {
            send('error', { code: normalized.code, message: normalized.message })
            controller.close()
          } else {
            controller.close()
          }
        } finally {
          request.signal.removeEventListener('abort', abortUpstream)
        }
      },
      cancel() {
        upstreamAborter.abort()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...corsHeaders(),
      },
    })
  } catch (error) {
    const normalized = safeError(error)
    if (conversation?.id && !/AI_NO_CONNECTION|AI conversation not found|AI connection not found/.test(normalized.code)) {
      try {
        await insertMessage(env.DB, {
          conversationId: conversation.id,
          role: 'assistant',
          content: '',
          status: 'error',
          errorCode: normalized.code,
        })
        await env.DB.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ? AND user_id = ?')
          .bind(new Date().toISOString(), conversation.id, user.id)
          .run()
      } catch {
        /* Preserve the provider error even if D1 cannot record it. */
      }
    }
    return json(normalized.status, { error: normalized.message, code: normalized.code })
  }
}
