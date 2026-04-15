const FILE_LANGUAGE_MAP = {
  c: 'c',
  cc: 'cpp',
  css: 'css',
  cpp: 'cpp',
  cxx: 'cpp',
  html: 'html',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  md: 'markdown',
  mjs: 'javascript',
  py: 'python',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'text',
}

const FILE_KIND_LABEL_MAP = {
  c: 'C source',
  css: 'Stylesheet',
  cpp: 'C++ source',
  html: 'HTML document',
  java: 'Java source',
  javascript: 'JavaScript',
  json: 'JSON data',
  markdown: 'Markdown doc',
  python: 'Python script',
  text: 'Text file',
  typescript: 'TypeScript',
}

const EXECUTION_RUNTIME_LABELS = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  javascript: 'JavaScript',
  python: 'Python',
}

const AI_PROVIDER_LABELS = {
  gemini: 'Gemini',
  grok: 'Grok',
}

const CODE_EDITING_LANGUAGES = [
  'c',
  'cpp',
  'css',
  'html',
  'java',
  'javascript',
  'json',
  'python',
  'typescript',
]

export const formatRelativeTime = (value) => {
  if (!value) {
    return 'Just now'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  const diffMs = date.getTime() - Date.now()
  const absMs = Math.abs(diffMs)

  if (absMs < 60_000) {
    return 'Just now'
  }

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ]

  for (const [unit, unitMs] of units) {
    if (absMs >= unitMs) {
      return formatter.format(Math.round(diffMs / unitMs), unit)
    }
  }

  return 'Just now'
}

export const formatClockTime = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const formatAbsoluteDate = (value) => {
  if (!value) {
    return 'No recent activity'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No recent activity'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const getUserDisplayName = (user) => {
  if (!user) {
    return 'Unknown user'
  }

  return user.name?.trim() || user.email || 'Unknown user'
}

export const getInitials = (user) => {
  const displayName = getUserDisplayName(user)
  const pieces = displayName.split(/\s+/).filter(Boolean)

  if (!pieces.length) {
    return 'TU'
  }

  return pieces
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || '')
    .join('')
}

export const getMessageContent = (message) =>
  message?.content || message?.message || ''

export const isAiMessage = (message) =>
  message?.type === 'ai' || message?.sender?._id === 'ai'

export const isAiTriggeredDraft = (value = '') => /^@ai\b/i.test(value.trim())

export const extractAiPrompt = (value = '') =>
  value.trim().replace(/^@ai\b/i, '').trim()

export const getFileExtension = (fileName = '') =>
  fileName.split('.').pop()?.toLowerCase() || ''

export const getFileLanguage = (fileName = '') =>
  FILE_LANGUAGE_MAP[getFileExtension(fileName)] || 'text'

export const getExecutionRuntimeLabel = (runtime = '') =>
  EXECUTION_RUNTIME_LABELS[runtime] || runtime || 'Unknown'

export const getFileKindLabel = (fileName = '') =>
  FILE_KIND_LABEL_MAP[getFileLanguage(fileName)] || 'Workspace file'

export const isPreviewableFile = (fileName = '') =>
  ['html', 'css', 'javascript', 'markdown'].includes(getFileLanguage(fileName))

export const getDefaultExecutionRuntime = (fileName = '') => {
  const fileLanguage = getFileLanguage(fileName)

  if (['c', 'cpp', 'java', 'javascript', 'python'].includes(fileLanguage)) {
    return fileLanguage
  }

  return ''
}

export const getExecutionRuntimeOptions = () => [
  { value: 'python', label: getExecutionRuntimeLabel('python') },
  { value: 'javascript', label: getExecutionRuntimeLabel('javascript') },
  { value: 'c', label: getExecutionRuntimeLabel('c') },
  { value: 'cpp', label: getExecutionRuntimeLabel('cpp') },
  { value: 'java', label: getExecutionRuntimeLabel('java') },
]

export const isRunnableFile = (fileName = '') =>
  Boolean(getDefaultExecutionRuntime(fileName))

export const fileMatchesExecutionRuntime = (fileName = '', runtime = '') =>
  getDefaultExecutionRuntime(fileName) === runtime

export const isCodeEditingFile = (fileName = '') =>
  CODE_EDITING_LANGUAGES.includes(getFileLanguage(fileName))

export const getNewFileStarterContents = (fileName = '') => {
  const fileLanguage = getFileLanguage(fileName)
  const javaClassName = pathToJavaClassName(fileName)

  if (fileLanguage === 'python') {
    return 'print("Hello, world!")\n'
  }

  if (fileLanguage === 'javascript') {
    return 'console.log("Hello, world!")\n'
  }

  if (fileLanguage === 'c') {
    return [
      '#include <stdio.h>',
      '',
      'int main(void) {',
      '    printf("Hello, world!\\n");',
      '    return 0;',
      '}',
      '',
    ].join('\n')
  }

  if (fileLanguage === 'cpp') {
    return [
      '#include <iostream>',
      '',
      'int main() {',
      '    std::cout << "Hello, world!" << std::endl;',
      '    return 0;',
      '}',
      '',
    ].join('\n')
  }

  if (fileLanguage === 'java') {
    return [
      `class ${javaClassName} {`,
      '    public static void main(String[] args) {',
      '        System.out.println("Hello, world!");',
      '    }',
      '}',
      '',
    ].join('\n')
  }

  if (fileLanguage === 'html') {
    return [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `    <title>${fileName}</title>`,
      '  </head>',
      '  <body>',
      '    <main></main>',
      '  </body>',
      '</html>',
      '',
    ].join('\n')
  }

  if (fileLanguage === 'css') {
    return ['body {', '    margin: 0;', '    font-family: sans-serif;', '}', ''].join('\n')
  }

  if (fileLanguage === 'json') {
    return ['{', '  "name": ""', '}', ''].join('\n')
  }

  if (fileLanguage === 'typescript') {
    return 'console.log("Hello, world!")\n'
  }

  return `# ${fileName}\n\nDescribe what belongs in this file.\n`
}

function pathToJavaClassName(fileName = '') {
  const rawBaseName = fileName.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Main'
  const sanitized = rawBaseName.replace(/[^A-Za-z0-9_]/g, '_')
  const withValidPrefix = /^[A-Za-z_]/.test(sanitized) ? sanitized : `Main_${sanitized}`

  return withValidPrefix || 'Main'
}

export const countFileLines = (contents = '') =>
  contents ? contents.split('\n').length : 0

export const countFileWords = (contents = '') =>
  contents.trim() ? contents.trim().split(/\s+/).length : 0

export const normalizeFileName = (rawName) => {
  const trimmed = rawName
    .trim()
    .replace(/\\/g, '/')
    .replace(/\s+/g, '-')
    .replace(/^\.\/+/, '')

  if (!trimmed) {
    return ''
  }

  if (trimmed.includes('..') || trimmed.startsWith('/')) {
    return ''
  }

  return /\.[\w-]+$/i.test(trimmed) ? trimmed : `${trimmed}.md`
}

export const createFileEntry = (fileName, contents = '', extraFileData = {}) => ({
  [fileName]: {
    file: {
      contents,
      language: getFileLanguage(fileName),
      ...extraFileData,
    },
  },
})

export const normalizeFileTree = (fileTree) => {
  if (!fileTree || typeof fileTree !== 'object' || Array.isArray(fileTree)) {
    return {
      ...createFileEntry(
        'README.md',
        '# Workspace\n\nStart shaping the project plan, notes, or code drafts here.\n',
      ),
    }
  }

  const entries = Object.entries(fileTree).reduce((accumulator, [fileName, file]) => {
    const safeFileName = normalizeFileName(fileName)
    const contents =
      typeof file?.file?.contents === 'string' ? file.file.contents : ''

    if (!safeFileName) {
      return accumulator
    }

    accumulator[safeFileName] = {
      file: {
        contents,
        language:
          typeof file?.file?.language === 'string'
            ? file.file.language
            : getFileLanguage(safeFileName),
        updatedAt: file?.file?.updatedAt || undefined,
      },
    }

    return accumulator
  }, {})

  if (!Object.keys(entries).length) {
    return normalizeFileTree(null)
  }

  return entries
}

export const getFirstFileName = (fileTree) => Object.keys(fileTree || {})[0] || ''

export const getMessageWorkspaceUpdate = (message) =>
  message?.metadata?.workspaceUpdate || null

export const getAiProviderLabel = (provider = '') =>
  AI_PROVIDER_LABELS[String(provider || '').trim().toLowerCase()] || 'AI'

export const formatAiModelLabel = ({ provider = '', model = '' } = {}) => {
  const safeProvider = getAiProviderLabel(provider)
  const safeModel = String(model || '').trim()

  if (!safeModel) {
    return safeProvider
  }

  if (safeModel.toLowerCase().startsWith(safeProvider.toLowerCase())) {
    return safeModel
  }

  return `${safeProvider} ${safeModel}`
}

export const getWorkspaceUpdatePreviewEntry = (message) =>
  getMessageWorkspaceUpdate(message)?.preview?.entry || ''

export const getWorkspaceFileDescription = (message, filePath) =>
  getMessageWorkspaceUpdate(message)?.files?.find((file) => file.path === filePath)?.description || ''
