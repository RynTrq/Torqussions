import React, { useEffect, useState } from 'react'
import axios from '../config/axios'
import {
  fileMatchesExecutionRuntime,
  getExecutionRuntimeLabel,
  getExecutionRuntimeOptions,
  getFileKindLabel,
} from '../utils/workspace'

const resultToneClassMap = {
  error: 'border-[rgba(186,53,39,0.16)] bg-[var(--torq-danger-soft)] text-[#c4473a]',
  info: 'border-[var(--torq-line)] bg-[var(--torq-card-solid)] text-[var(--torq-ink)]',
  success: 'border-[rgba(13,156,138,0.16)] bg-[var(--torq-teal-soft)] text-[var(--torq-teal)]',
  warn: 'border-[rgba(216,140,52,0.16)] bg-[var(--torq-amber-soft)] text-[var(--torq-amber)]',
}

const CodeExecutionPanel = ({ activeFile, fileTree, onFileSelect, projectId }) => {
  const runtimeOptions = getExecutionRuntimeOptions()
  const fallbackRuntime = runtimeOptions[0]?.value || 'python'
  const [runtime, setRuntime] = useState(fallbackRuntime)
  const [selectedFile, setSelectedFile] = useState('')
  const [stdinValue, setStdinValue] = useState('')
  const [executionStatus, setExecutionStatus] = useState('idle')
  const [executionResult, setExecutionResult] = useState(null)
  const [executionError, setExecutionError] = useState('')

  useEffect(() => {
    const nextRuntime = getExecutionRuntimeOptions().find((option) =>
      fileMatchesExecutionRuntime(activeFile, option.value),
    )?.value

    if (nextRuntime) {
      setRuntime(nextRuntime)
    }
  }, [activeFile])

  const runnableFiles = Object.keys(fileTree || {})
    .sort((left, right) => left.localeCompare(right))
    .filter((fileName) => fileMatchesExecutionRuntime(fileName, runtime))

  useEffect(() => {
    const nextRunnableFiles = Object.keys(fileTree || {})
      .sort((left, right) => left.localeCompare(right))
      .filter((fileName) => fileMatchesExecutionRuntime(fileName, runtime))

    setSelectedFile((currentFile) => {
      if (currentFile && nextRunnableFiles.includes(currentFile)) {
        return currentFile
      }

      if (activeFile && nextRunnableFiles.includes(activeFile)) {
        return activeFile
      }

      return nextRunnableFiles[0] || ''
    })
    setExecutionResult(null)
    setExecutionError('')
  }, [activeFile, fileTree, runtime])

  const handleRunCode = async () => {
    if (!selectedFile) {
      return
    }

    setExecutionStatus('running')
    setExecutionError('')
    setExecutionResult(null)

    try {
      const { data } = await axios.post(`/projects/${projectId}/execute`, {
        entryFile: selectedFile,
        fileTree,
        runtime,
        stdin: stdinValue,
      })

      setExecutionResult(data)
    } catch (requestError) {
      setExecutionError(
        requestError.response?.data?.error ||
          'Execution failed. Check the selected language and try again.',
      )
      setExecutionResult(null)
    } finally {
      setExecutionStatus('idle')
    }
  }

  const resultTone = executionResult
    ? executionResult.success
      ? 'success'
      : executionResult.stage === 'compile'
        ? 'warn'
        : 'error'
    : 'info'

  return (
    <section className="torq-shell torq-panel-rise rounded-[1.8rem] p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--torq-line)] pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="torq-eyebrow">Run code</p>
            <h3 className="torq-heading mt-3 text-3xl">Execute a project file</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Pick a language, choose a matching file, and run it without leaving
              the project.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedFile ? (
              <>
                <span className="torq-badge torq-badge-neutral">{selectedFile}</span>
                <span className="torq-badge torq-badge-neutral">
                  {getFileKindLabel(selectedFile)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {!runnableFiles.length ? (
          <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-4 text-sm text-[var(--torq-ink-soft)]">
            No {getExecutionRuntimeLabel(runtime)} files are available yet. Create one
            with a matching extension or ask AI to generate it.
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.88fr,1.12fr]">
        <div className="space-y-4">
          <div className="torq-shell-soft rounded-[1.3rem] p-4">
            <label
              className="text-sm font-medium text-[var(--torq-ink)]"
              htmlFor="execution-runtime"
            >
              Run as
            </label>
            <select
              className="torq-select mt-2 px-4 py-3 text-sm"
              id="execution-runtime"
              onChange={(event) => setRuntime(event.target.value)}
              value={runtime}
            >
              {runtimeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs leading-6 text-[var(--torq-ink-soft)]">
              Supported runtimes currently available inside the app.
            </p>
          </div>

          <div className="torq-shell-soft rounded-[1.3rem] p-4">
            <p className="text-sm font-medium text-[var(--torq-ink)]">
              Files you can run as {getExecutionRuntimeLabel(runtime)}
            </p>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {runnableFiles.length ? (
                runnableFiles.map((fileName) => {
                  const isSelected = fileName === selectedFile

                  return (
                    <button
                      className={`w-full rounded-[1rem] border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-[rgba(13,156,138,0.2)] bg-[var(--torq-teal-soft)]'
                          : 'border-[var(--torq-line)] bg-[var(--torq-card-solid)]'
                      }`}
                      key={fileName}
                      onClick={() => {
                        setSelectedFile(fileName)
                        onFileSelect?.(fileName)
                      }}
                      type="button"
                    >
                      <p className="truncate text-sm font-semibold text-[var(--torq-ink)]">
                        {fileName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--torq-ink-soft)]">
                        Click to load this file into the runner
                      </p>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-[1rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-4 text-sm text-[var(--torq-ink-soft)]">
                  No files with the correct extension are available for this language.
                </div>
              )}
            </div>
          </div>

          <div className="torq-shell-soft rounded-[1.3rem] p-4">
            <label
              className="text-sm font-medium text-[var(--torq-ink)]"
              htmlFor="execution-stdin"
            >
              Program input
            </label>
            <textarea
              className="torq-textarea mt-2 min-h-36 px-4 py-3 text-sm"
              id="execution-stdin"
              onChange={(event) => setStdinValue(event.target.value)}
              placeholder="Optional input passed to the program's standard input"
              value={stdinValue}
            />
          </div>

          <button
            className="torq-primary-button w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedFile || executionStatus === 'running'}
            onClick={handleRunCode}
            type="button"
          >
            {executionStatus === 'running'
              ? 'Running code...'
              : `Run ${getExecutionRuntimeLabel(runtime)}`}
          </button>
        </div>

        <div className="space-y-4">
          <div
            className={`rounded-[1.2rem] border px-4 py-4 text-sm ${resultToneClassMap[resultTone]}`}
          >
            {executionResult ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">
                  {executionResult.success
                    ? 'Execution finished successfully'
                    : executionResult.stage === 'compile'
                      ? 'Compilation failed'
                      : executionResult.timedOut
                        ? 'Execution timed out'
                        : 'Execution finished with an error'}
                </span>
                <span>Runtime: {getExecutionRuntimeLabel(executionResult.runtime)}</span>
                <span>Exit code: {executionResult.exitCode}</span>
                <span>{executionResult.durationMs} ms</span>
              </div>
            ) : (
              <span>
                Run a file to see compile messages, stdout, and stderr here.
              </span>
            )}
          </div>

          {executionError ? (
            <div className="torq-danger-panel rounded-[1.15rem] px-4 py-4 text-sm">
              {executionError}
            </div>
          ) : null}

          <div className="torq-shell-soft rounded-[1.3rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="torq-eyebrow">Output</p>
              {executionResult?.command ? (
                <span className="text-xs text-[var(--torq-ink-soft)]">
                  {executionResult.command}
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--torq-ink-soft)]">
                  Standard output
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-[var(--torq-ink)]">
                  <code style={{ fontFamily: 'JetBrains Mono' }}>
                    {executionResult?.stdout || 'No output yet.'}
                  </code>
                </pre>
              </div>

              <div className="rounded-[1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--torq-ink-soft)]">
                  Errors and warnings
                </p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-[var(--torq-ink)]">
                  <code style={{ fontFamily: 'JetBrains Mono' }}>
                    {executionResult?.stderr || 'No errors yet.'}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CodeExecutionPanel
