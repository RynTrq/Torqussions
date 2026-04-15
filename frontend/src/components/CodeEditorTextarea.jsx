import React from 'react'
import Editor from '@monaco-editor/react'
import { useTheme } from '../context/theme.context'
import { getFileLanguage } from '../utils/workspace'

const getEditorOptions = (codeMode) => ({
  automaticLayout: true,
  bracketPairColorization: {
    enabled: true,
  },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  fontFamily: 'JetBrains Mono, monospace',
  fontLigatures: true,
  fontSize: 14,
  formatOnPaste: codeMode,
  formatOnType: codeMode,
  guides: {
    bracketPairs: codeMode,
    highlightActiveIndentation: codeMode,
    indentation: codeMode,
  },
  lineDecorationsWidth: 12,
  lineHeight: 24,
  minimap: {
    enabled: codeMode,
  },
  padding: {
    bottom: 20,
    top: 20,
  },
  renderLineHighlight: 'gutter',
  roundedSelection: false,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  suggest: {
    preview: true,
    showWords: true,
  },
  tabCompletion: 'on',
  tabSize: 2,
  wordWrap: 'on',
})

const CodeEditorTextarea = ({ codeMode = false, fileName = '', onChange, value }) => {
  const { isDark } = useTheme()
  const language = getFileLanguage(fileName)

  return (
    <div className="torq-editor-surface min-h-[24rem] flex-1 overflow-hidden">
      <Editor
        height="100%"
        language={language === 'text' && codeMode ? 'plaintext' : language}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={getEditorOptions(codeMode)}
        path={fileName || 'workspace.txt'}
        theme={isDark ? 'vs-dark' : 'vs'}
        value={value}
      />
    </div>
  )
}

export default CodeEditorTextarea
