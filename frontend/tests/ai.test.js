import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractAssistantText,
  extractDelta,
  maskApiKey,
  normalizeBaseUrl,
} from '../functions/api/_lib/ai.js'
import { decryptSecret, encryptSecret } from '../functions/api/_lib/secretBox.js'

test('normalizes OpenAI-compatible Base URLs', () => {
  assert.equal(normalizeBaseUrl('https://api.example.com/v1/'), 'https://api.example.com/v1')
  assert.equal(
    normalizeBaseUrl('https://api.example.com/v1/chat/completions'),
    'https://api.example.com/v1',
  )
})

test('rejects non-public or non-HTTPS endpoints', () => {
  assert.throws(() => normalizeBaseUrl('http://api.example.com/v1'), /HTTPS/)
  assert.throws(() => normalizeBaseUrl('https://localhost:11434/v1'), /private network/)
  assert.throws(() => normalizeBaseUrl('https://192.168.1.10/v1'), /private network/)
})

test('masks API keys without exposing their prefix', () => {
  assert.equal(maskApiKey('sk-sensitive-1234'), '••••••••1234')
  assert.equal(maskApiKey('abc'), '••••')
})

test('encrypts and decrypts API keys with authenticated encryption', async () => {
  const encrypted = await encryptSecret('unit-test-secret', 'sk-sensitive-value')
  assert.notEqual(encrypted.ciphertext, 'sk-sensitive-value')
  assert.equal(
    await decryptSecret('unit-test-secret', encrypted.ciphertext, encrypted.iv),
    'sk-sensitive-value',
  )
  await assert.rejects(
    () => decryptSecret('wrong-secret', encrypted.ciphertext, encrypted.iv),
  )
})

test('extracts common OpenAI-compatible response shapes', () => {
  assert.equal(
    extractDelta({ choices: [{ delta: { content: 'hello' } }] }),
    'hello',
  )
  assert.equal(
    extractAssistantText({ choices: [{ message: { content: [{ text: 'a' }, { text: 'b' }] } }] }),
    'ab',
  )
})

