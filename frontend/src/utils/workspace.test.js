import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatAiModelLabel,
  getAiProviderLabel,
  normalizeFileName,
  normalizeFileTree,
} from './workspace.js'

test('normalizeFileName cleans slashes and rejects traversal', () => {
  assert.equal(normalizeFileName('notes'), 'notes.md')
  assert.equal(normalizeFileName('src\\main.js'), 'src/main.js')
  assert.equal(normalizeFileName('../secret.txt'), '')
})

test('normalizeFileTree preserves valid entries and injects fallback when empty', () => {
  const normalizedTree = normalizeFileTree({
    'src/main.js': {
      file: {
        contents: 'console.log("hi")',
      },
    },
  })

  assert.deepEqual(Object.keys(normalizedTree), ['src/main.js'])
  assert.equal(normalizedTree['src/main.js'].file.language, 'javascript')
  assert.ok(normalizeFileTree(null)['README.md'])
})

test('formatAiModelLabel keeps provider context stable', () => {
  assert.equal(getAiProviderLabel('grok'), 'Grok')
  assert.equal(getAiProviderLabel('groq'), 'Groq')
  assert.equal(
    formatAiModelLabel({ provider: 'grok', model: 'grok-4' }),
    'grok-4',
  )
  assert.equal(
    formatAiModelLabel({ provider: 'groq', model: 'llama-3.3-70b-versatile' }),
    'Groq llama-3.3-70b-versatile',
  )
  assert.equal(
    formatAiModelLabel({ provider: 'gemini', model: 'Gemini 2.5 Flash' }),
    'Gemini 2.5 Flash',
  )
})
