import React, { useEffect, useState } from 'react'
import {
  buildWorkspacePreviewDocument,
  buildWorkspacePreviewModel,
  WORKSPACE_PREVIEW_MESSAGE_SOURCE,
} from '../utils/workspace-preview'

const consoleToneMap = {
  error: 'border-[rgba(186,53,39,0.16)] bg-[var(--torq-danger-soft)] text-[#c4473a]',
  info: 'border-[var(--torq-line)] bg-[var(--torq-card-solid)] text-[var(--torq-ink)]',
  log: 'border-[var(--torq-line)] bg-[var(--torq-card-solid)] text-[var(--torq-ink)]',
  warn: 'border-[rgba(216,140,52,0.16)] bg-[var(--torq-amber-soft)] text-[var(--torq-amber)]',
}

const WorkspacePreviewPanel = ({
  activeFile,
  fileTree,
  onFileSelect,
  preferredEntry = '',
}) => {
  const previewModel = buildWorkspacePreviewModel({
    fileTree,
    activeFile,
    preferredEntry,
  })
  const candidateDocument = buildWorkspacePreviewDocument(previewModel)

  const [executedDocument, setExecutedDocument] = useState(candidateDocument)
  const [previewStatus, setPreviewStatus] = useState(
    previewModel.runnable ? 'loading' : 'unsupported',
  )
  const [consoleLines, setConsoleLines] = useState([])

  const hasPendingChanges =
    previewModel.runnable && candidateDocument && candidateDocument !== executedDocument

  useEffect(() => {
    const handleWindowMessage = (event) => {
      if (event.data?.source !== WORKSPACE_PREVIEW_MESSAGE_SOURCE) {
        return
      }

      if (event.data.type === 'ready') {
        setPreviewStatus('ready')
        return
      }

      if (event.data.type === 'console') {
        setConsoleLines((currentLines) => [
          ...currentLines,
          {
            level: event.data.level || 'log',
            content: Array.isArray(event.data.lines)
              ? event.data.lines.join(' ')
              : '',
          },
        ])
        return
      }

      if (event.data.type === 'error') {
        setPreviewStatus('error')
        setConsoleLines((currentLines) => [
          ...currentLines,
          {
            level: 'error',
            content: [event.data.message, event.data.stack].filter(Boolean).join('\n'),
          },
        ])
      }
    }

    window.addEventListener('message', handleWindowMessage)

    return () => {
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [])

  const runPreview = () => {
    if (!previewModel.runnable || !candidateDocument) {
      return
    }

    setConsoleLines([])
    setPreviewStatus('loading')
    setExecutedDocument(candidateDocument)
  }

  return (
    <section className="torq-shell torq-panel-rise overflow-hidden rounded-[1.8rem]">
      <div className="flex flex-col gap-4 border-b border-[var(--torq-line)] px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="torq-eyebrow">Preview</p>
          <h3 className="torq-heading mt-3 text-3xl">Live preview</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            Open a previewable file and review the output right inside the project.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`torq-badge ${previewStatus === 'ready' ? 'torq-badge-live' : 'torq-badge-neutral'}`}>
            {previewStatus}
          </span>
          {previewModel.entryFile ? (
            <button
              className="torq-secondary-button px-4 py-2 text-sm font-medium"
              onClick={() => onFileSelect(previewModel.entryFile)}
              type="button"
            >
              Open file
            </button>
          ) : null}
        </div>
      </div>

      {!previewModel.runnable ? (
        <div className="px-6 py-12 text-center">
          <p className="torq-eyebrow">Nothing to preview yet</p>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            {previewModel.reason ||
              'Open an HTML, CSS, JavaScript, or Markdown file, or ask AI to generate something you can preview.'}
          </p>
        </div>
      ) : (
        <div className="grid xl:grid-cols-[1.2fr,0.8fr]">
          <div className="border-b border-[var(--torq-line)] p-5 xl:border-b-0 xl:border-r">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-[var(--torq-ink-soft)]">
                Entry:{' '}
                <span className="font-semibold text-[var(--torq-ink)]">
                  {previewModel.entryFile}
                </span>
              </p>

              <button
                className="torq-primary-button px-4 py-2 text-sm font-semibold"
                onClick={runPreview}
                type="button"
              >
                {hasPendingChanges ? 'Run latest changes' : 'Run preview'}
              </button>
            </div>

            <div className="torq-console overflow-hidden rounded-[1.35rem]">
              <div className="torq-browser-chrome flex items-center gap-2 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2f]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-xs uppercase tracking-[0.16em] text-white/60">
                  Preview
                </span>
              </div>

              <div className="h-[30rem] overflow-hidden bg-white">
                {executedDocument ? (
                  <iframe
                    className="h-full w-full"
                    key={`${previewModel.entryFile || 'preview'}-${executedDocument.length}`}
                    sandbox="allow-scripts"
                    srcDoc={executedDocument}
                    title="Workspace preview"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="torq-eyebrow">Console</p>
            <div className="mt-4 space-y-3">
              {consoleLines.length ? (
                consoleLines.map((line, index) => (
                  <div
                    className={`rounded-[1rem] border px-4 py-3 text-sm leading-7 ${
                      consoleToneMap[line.level] || consoleToneMap.log
                    }`}
                    key={`${line.level}-${index}`}
                  >
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words">
                      <code style={{ fontFamily: 'JetBrains Mono' }}>{line.content}</code>
                    </pre>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-4 text-sm leading-7 text-[var(--torq-ink-soft)]">
                  Console output will appear here after you run the preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default WorkspacePreviewPanel
