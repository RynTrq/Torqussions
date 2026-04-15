import React from 'react'

const CODE_BLOCK_PATTERN = /```([\w-]+)?\n?([\s\S]*?)```/g

const buildBlocks = (content = '') => {
  const normalizedContent = typeof content === 'string' ? content : ''
  const blocks = []
  let lastIndex = 0
  CODE_BLOCK_PATTERN.lastIndex = 0
  let match = CODE_BLOCK_PATTERN.exec(normalizedContent)

  while (match) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: normalizedContent.slice(lastIndex, match.index),
      })
    }

    blocks.push({
      type: 'code',
      language: match[1] || '',
      content: match[2]?.replace(/\n$/, '') || '',
    })

    lastIndex = match.index + match[0].length
    match = CODE_BLOCK_PATTERN.exec(normalizedContent)
  }

  if (lastIndex < normalizedContent.length) {
    blocks.push({
      type: 'text',
      content: normalizedContent.slice(lastIndex),
    })
  }

  return blocks.length
    ? blocks
    : [
        {
          type: 'text',
          content: normalizedContent,
        },
      ]
}

const textToneClassMap = {
  ai: 'text-[var(--torq-ink)]',
  cool: 'text-[var(--torq-ink)]',
  warm: 'text-white',
  default: 'text-[var(--torq-ink)]',
}

const codeToneClassMap = {
  ai: 'border-[rgba(17,28,45,0.08)] bg-[#162235] text-white',
  cool: 'border-[rgba(17,28,45,0.08)] bg-[#162235] text-white',
  warm: 'border-white/15 bg-[rgba(255,255,255,0.08)] text-white',
  default: 'border-[rgba(17,28,45,0.08)] bg-[#162235] text-white',
}

const renderTextBlock = (content, tone, keyPrefix) => {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (!paragraphs.length) {
    return null
  }

  return (
    <div className="space-y-3" key={keyPrefix}>
      {paragraphs.map((paragraph, index) => (
        <p
          className={`whitespace-pre-wrap break-words text-[0.95rem] leading-7 ${
            textToneClassMap[tone] || textToneClassMap.default
          }`}
          key={`${keyPrefix}-${index}`}
          style={{ fontFamily: 'IBM Plex Sans' }}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

const renderCodeBlock = ({ content, language }, tone, keyPrefix) => (
  <div className="space-y-2" key={keyPrefix}>
    <div className="flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.26em] text-slate-400">
      <span>{language || 'code'}</span>
      <span>Suggested snippet</span>
    </div>
    <pre
      className={`overflow-x-auto rounded-[1.25rem] border px-4 py-4 text-[0.82rem] leading-6 ${
        codeToneClassMap[tone] || codeToneClassMap.default
      }`}
    >
      <code style={{ fontFamily: 'JetBrains Mono' }}>{content}</code>
    </pre>
  </div>
)

const MessageBody = ({ content, tone = 'default' }) => {
  const blocks = buildBlocks(content)

  return (
    <div className="space-y-4">
      {blocks.map((block, index) =>
        block.type === 'code'
          ? renderCodeBlock(block, tone, `code-${index}`)
          : renderTextBlock(block.content, tone, `text-${index}`),
      )}
    </div>
  )
}

export default MessageBody
