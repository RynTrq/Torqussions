import { getFileLanguage } from './workspace'

export const WORKSPACE_PREVIEW_MESSAGE_SOURCE = 'torq-preview'

const HTML_ENTRY_CANDIDATES = ['index.html', 'app.html', 'preview.html', 'demo.html']
const CSS_ENTRY_CANDIDATES = ['styles.css', 'style.css', 'index.css', 'app.css']
const JS_ENTRY_CANDIDATES = ['app.js', 'main.js', 'script.js', 'index.js']

const PREVIEW_BRIDGE_SCRIPT = `
(() => {
  const SOURCE = '${WORKSPACE_PREVIEW_MESSAGE_SOURCE}';

  const safeSerialize = (value) => {
    try {
      if (typeof value === 'string') {
        return value;
      }

      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const emit = (type, payload = {}) => {
    window.parent.postMessage(
      {
        source: SOURCE,
        type,
        ...payload,
      },
      '*',
    );
  };

  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const original = console[level].bind(console);

    console[level] = (...args) => {
      emit('console', {
        level,
        lines: args.map(safeSerialize),
      });

      original(...args);
    };
  });

  window.addEventListener('error', (event) => {
    emit('error', {
      message: event.message || 'Unknown preview error',
      stack: event.error?.stack || '',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    emit('error', {
      message:
        event.reason?.message ||
        (typeof event.reason === 'string' ? event.reason : 'Unhandled promise rejection'),
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    emit('ready');
  });
})();
`

const MARKDOWN_BASE_STYLES = `
  :root {
    color-scheme: light;
    font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at top left, rgba(23, 121, 109, 0.12), transparent 30%),
      radial-gradient(circle at 100% 0%, rgba(201, 138, 48, 0.12), transparent 24%),
      linear-gradient(180deg, #f7f2ea 0%, #eef4f5 100%);
    color: #162235;
  }

  body {
    margin: 0;
    min-height: 100vh;
    padding: 2.5rem;
  }

  .markdown-shell {
    max-width: 780px;
    margin: 0 auto;
    border: 1px solid rgba(17, 28, 45, 0.08);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.88);
    padding: 2rem;
    box-shadow: 0 24px 70px rgba(23, 34, 51, 0.1);
    backdrop-filter: blur(18px);
  }

  h1, h2, h3, h4 {
    font-family: 'Sora', 'Segoe UI', sans-serif;
    margin-top: 0;
    color: #162235;
  }

  p, li {
    line-height: 1.75;
    color: #4f5d6c;
  }

  code, pre {
    font-family: 'JetBrains Mono', 'SFMono-Regular', monospace;
  }

  pre {
    overflow: auto;
    border-radius: 18px;
    padding: 1rem;
    background: #162235;
    border: 1px solid rgba(17, 28, 45, 0.08);
    color: white;
  }

  ul {
    padding-left: 1.2rem;
  }
`

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const escapeInlineScript = (value = '') => value.replace(/<\/script/gi, '<\\/script')

const normalizeAssetReference = (value = '') =>
  value.trim().replace(/^\.\/+/, '').replace(/^\//, '')

const unique = (values) => Array.from(new Set(values.filter(Boolean)))

const readFileContents = (fileTree, path) =>
  typeof fileTree?.[path]?.file?.contents === 'string'
    ? fileTree[path].file.contents
    : ''

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractAttributeMatches = (value, pattern) => {
  const matches = []
  let match = pattern.exec(value)

  while (match) {
    matches.push(normalizeAssetReference(match[1] || ''))
    match = pattern.exec(value)
  }

  pattern.lastIndex = 0
  return unique(matches)
}

const removeLocalAssetReferences = (html, paths, tagType) => {
  return paths.reduce((nextHtml, path) => {
    const escapedPath = escapeRegExp(path)

    if (tagType === 'style') {
      return nextHtml.replace(
        new RegExp(
          `<link\\b[^>]*href=["'](?:\\./)?${escapedPath}["'][^>]*>`,
          'gi',
        ),
        '',
      )
    }

    return nextHtml.replace(
      new RegExp(
        `<script\\b[^>]*src=["'](?:\\./)?${escapedPath}["'][^>]*>\\s*<\\/script>`,
        'gi',
      ),
      '',
    )
  }, html)
}

const injectIntoHead = (html, markup) => {
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${markup}\n</head>`)
  }

  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}\n<head>\n${markup}\n</head>`)
  }

  return `<head>\n${markup}\n</head>\n${html}`
}

const injectBeforeBodyEnd = (html, markup) => {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${markup}\n</body>`)
  }

  return `${html}\n${markup}`
}

const markdownToHtml = (markdown = '') => {
  const lines = markdown.split('\n')
  const blocks = []
  let listItems = []

  const flushList = () => {
    if (!listItems.length) {
      return
    }

    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`)
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(escapeHtml(trimmed.slice(2)))
      continue
    }

    flushList()

    if (/^###\s+/.test(trimmed)) {
      blocks.push(`<h3>${escapeHtml(trimmed.replace(/^###\s+/, ''))}</h3>`)
      continue
    }

    if (/^##\s+/.test(trimmed)) {
      blocks.push(`<h2>${escapeHtml(trimmed.replace(/^##\s+/, ''))}</h2>`)
      continue
    }

    if (/^#\s+/.test(trimmed)) {
      blocks.push(`<h1>${escapeHtml(trimmed.replace(/^#\s+/, ''))}</h1>`)
      continue
    }

    blocks.push(`<p>${escapeHtml(trimmed)}</p>`)
  }

  flushList()

  return blocks.join('\n')
}

export const findBestPreviewEntry = ({ fileTree, activeFile = '', preferredEntry = '' }) => {
  if (
    preferredEntry &&
    fileTree?.[preferredEntry] &&
    getFileLanguage(preferredEntry) === 'html'
  ) {
    return preferredEntry
  }

  if (activeFile && fileTree?.[activeFile] && getFileLanguage(activeFile) === 'html') {
    return activeFile
  }

  for (const candidate of HTML_ENTRY_CANDIDATES) {
    if (fileTree?.[candidate]) {
      return candidate
    }
  }

  return Object.keys(fileTree || {}).find((fileName) => getFileLanguage(fileName) === 'html') || ''
}

export const buildWorkspacePreviewModel = ({
  fileTree,
  activeFile = '',
  preferredEntry = '',
}) => {
  const entryFile = findBestPreviewEntry({ fileTree, activeFile, preferredEntry })
  const activeLanguage = getFileLanguage(activeFile)

  if (entryFile) {
    let html = readFileContents(fileTree, entryFile) || '<div id="app"></div>'
    const referencedStyles = extractAttributeMatches(
      html,
      /<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    ).filter((path) => fileTree?.[path])
    const referencedScripts = extractAttributeMatches(
      html,
      /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    ).filter((path) => fileTree?.[path])

    html = removeLocalAssetReferences(html, referencedStyles, 'style')
    html = removeLocalAssetReferences(html, referencedScripts, 'script')

    const stylePaths = unique([
      ...referencedStyles,
      ...(activeLanguage === 'css' ? [activeFile] : []),
      ...CSS_ENTRY_CANDIDATES.filter((candidate) => fileTree?.[candidate]),
    ])
    const scriptPaths = unique([
      ...referencedScripts,
      ...(activeLanguage === 'javascript' ? [activeFile] : []),
      ...JS_ENTRY_CANDIDATES.filter((candidate) => fileTree?.[candidate]),
    ])

    return {
      entryFile,
      runnable: true,
      kind: 'bundle',
      html,
      styles: stylePaths.map((path) => ({
        path,
        contents: readFileContents(fileTree, path),
      })),
      scripts: scriptPaths.map((path) => ({
        path,
        contents: readFileContents(fileTree, path),
      })),
      supportingFiles: unique([...stylePaths, ...scriptPaths]),
    }
  }

  if (activeLanguage === 'markdown') {
    return {
      entryFile: activeFile,
      runnable: true,
      kind: 'markdown',
      markdown: readFileContents(fileTree, activeFile),
      supportingFiles: [],
    }
  }

  if (activeLanguage === 'javascript' || activeLanguage === 'css') {
    return {
      entryFile: activeFile,
      runnable: true,
      kind: 'playground',
      html: '<main><div id="app"></div></main>',
      styles: unique([
        ...(activeLanguage === 'css' ? [activeFile] : []),
        ...CSS_ENTRY_CANDIDATES.filter((candidate) => fileTree?.[candidate]),
      ]).map((path) => ({
        path,
        contents: readFileContents(fileTree, path),
      })),
      scripts: unique([
        ...(activeLanguage === 'javascript' ? [activeFile] : []),
        ...JS_ENTRY_CANDIDATES.filter((candidate) => fileTree?.[candidate]),
      ]).map((path) => ({
        path,
        contents: readFileContents(fileTree, path),
      })),
      supportingFiles: [],
    }
  }

  return {
    entryFile: '',
    runnable: false,
    kind: 'unsupported',
    reason:
      activeFile && fileTree?.[activeFile]
        ? 'Open an HTML, CSS, JavaScript, or Markdown file to preview it here.'
        : 'Select a project file to inspect or preview it here.',
  }
}

export const buildWorkspacePreviewDocument = (previewModel) => {
  if (!previewModel?.runnable) {
    return ''
  }

  if (previewModel.kind === 'markdown') {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${MARKDOWN_BASE_STYLES}</style>
    <script>${escapeInlineScript(PREVIEW_BRIDGE_SCRIPT)}</script>
  </head>
  <body>
    <div class="markdown-shell">${markdownToHtml(previewModel.markdown || '')}</div>
  </body>
</html>`
  }

  const stylesMarkup = (previewModel.styles || [])
    .filter((styleFile) => styleFile.contents)
    .map(
      (styleFile) =>
        `<style data-path="${escapeHtml(styleFile.path)}">\n${styleFile.contents}\n</style>`,
    )
    .join('\n')

  const scriptsMarkup = (previewModel.scripts || [])
    .filter((scriptFile) => scriptFile.contents)
    .map(
      (scriptFile) =>
        `<script data-path="${escapeHtml(scriptFile.path)}">\n${escapeInlineScript(
          scriptFile.contents,
        )}\n</script>`,
    )
    .join('\n')

  let documentHtml = previewModel.html || '<div id="app"></div>'

  if (!/<head>/i.test(documentHtml)) {
    documentHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    ${documentHtml}
  </body>
</html>`
  }

  documentHtml = injectIntoHead(
    documentHtml,
    `
      <style>
        body {
          margin: 0;
          font-family: 'IBM Plex Sans', sans-serif;
          min-height: 100vh;
          background: #ffffff;
        }
      </style>
      ${stylesMarkup}
      <script>${escapeInlineScript(PREVIEW_BRIDGE_SCRIPT)}</script>
    `,
  )

  return injectBeforeBodyEnd(documentHtml, scriptsMarkup)
}
