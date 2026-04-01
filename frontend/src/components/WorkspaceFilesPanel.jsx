import React from 'react'
import CodeEditorTextarea from './CodeEditorTextarea'
import {
  countFileLines,
  countFileWords,
  getFileLanguage,
  getFileKindLabel,
  isCodeEditingFile,
  isPreviewableFile,
} from '../utils/workspace'

const fileAccentMap = {
  c: 'bg-[#519aba]',
  cpp: 'bg-[#649ad2]',
  css: 'bg-[#42a5f5]',
  html: 'bg-[#e37933]',
  java: 'bg-[#cc7832]',
  javascript: 'bg-[#d7ba7d]',
  json: 'bg-[#cbcb41]',
  markdown: 'bg-[#7f8fa6]',
  python: 'bg-[#4ec9b0]',
  text: 'bg-[#8f9db0]',
  typescript: 'bg-[#519aba]',
}

const WorkspaceFilesPanel = ({
  activeFile,
  fileTree,
  newFileName,
  onCreateFile,
  onDeleteFile,
  onFileNameChange,
  onFileSelect,
  onSaveFiles,
  onFileUpdate,
  saveState,
}) => {
  const fileNames = Object.keys(fileTree)
  const currentFileContents = activeFile ? fileTree[activeFile]?.file?.contents || '' : ''
  const wordCount = countFileWords(currentFileContents)
  const lineCount = countFileLines(currentFileContents)
  const isCodeMode = isCodeEditingFile(activeFile)

  return (
    <section className="torq-shell torq-panel-rise overflow-hidden rounded-[1.8rem]">
      <div className="flex flex-col gap-4 border-b border-[var(--torq-line)] px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="torq-eyebrow">Files</p>
          <h3 className="torq-heading mt-3 text-3xl">Project files</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            Open a file, edit it, or add a new one for this project.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="torq-badge torq-badge-neutral">{fileNames.length} files</span>
          <span
            className={`torq-badge ${
              saveState === 'saved' || saveState === 'idle'
                ? 'torq-badge-live'
                : 'torq-badge-warn'
            }`}
          >
            {saveState === 'dirty' ? 'unsaved changes' : saveState}
          </span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[0.92fr,1.08fr]">
        <div className="border-b border-[var(--torq-line)] p-5 xl:border-b-0 xl:border-r">
          <div className="torq-shell-soft rounded-[1.3rem] p-4">
            <label className="torq-eyebrow" htmlFor="new-file-name">
              New file
            </label>
            <div className="mt-3 flex gap-2">
              <input
                className="torq-input px-4 py-3 text-sm"
                id="new-file-name"
                onChange={(event) => onFileNameChange(event.target.value)}
                placeholder="notes.md"
                type="text"
                value={newFileName}
              />
              <button
                className="torq-primary-button px-4 py-3 text-sm font-semibold"
                onClick={onCreateFile}
                type="button"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {fileNames.map((fileName) => {
              const isActive = fileName === activeFile
              const fileLanguage = getFileLanguage(fileName)
              const fileAccent = fileAccentMap[fileLanguage] || fileAccentMap.text

              return (
                <button
                  className={`w-full rounded-[1.15rem] border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-[rgba(13,156,138,0.2)] bg-[var(--torq-teal-soft)] shadow-[0_14px_30px_rgba(13,25,44,0.08)]'
                      : 'border-[var(--torq-line)] bg-[var(--torq-card-solid)]'
                  }`}
                  key={fileName}
                  onClick={() => onFileSelect(fileName)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${fileAccent}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--torq-ink)]">
                          {fileName}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--torq-ink-soft)]">
                          {getFileKindLabel(fileName)}
                        </p>
                      </div>
                    </div>
                    {isPreviewableFile(fileName) ? (
                      <span className="torq-badge torq-badge-neutral">Preview</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-[30rem] flex-col">
          <div className="flex flex-col gap-3 border-b border-[var(--torq-line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="torq-eyebrow">Editing</p>
              <h4 className="mt-2 text-xl font-semibold text-[var(--torq-ink)]">
                {activeFile || 'Select a file'}
              </h4>
              {activeFile ? (
                <p className="mt-2 text-sm text-[var(--torq-ink-soft)]">
                  {lineCount} lines • {wordCount} words
                </p>
              ) : null}
            </div>

            {activeFile ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className="torq-primary-button px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    saveState === 'idle' ||
                    saveState === 'saving' ||
                    saveState === 'saved'
                  }
                  onClick={onSaveFiles}
                  type="button"
                >
                  {saveState === 'saving' ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  className="torq-danger-button px-4 py-2.5 text-sm font-medium"
                  onClick={() => onDeleteFile(activeFile)}
                  type="button"
                >
                  Delete file
                </button>
              </div>
            ) : null}
          </div>

          {activeFile ? (
            <CodeEditorTextarea
              codeMode={isCodeMode}
              fileName={activeFile}
              onChange={onFileUpdate}
              value={currentFileContents}
            />
          ) : (
            <div className="flex min-h-[24rem] flex-1 items-center justify-center px-6 text-center">
              <div>
                <p className="torq-eyebrow">No file selected</p>
                <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
                  Pick a file from the list or add a new one.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default WorkspaceFilesPanel
