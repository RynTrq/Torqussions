import React, { useEffect, useRef } from 'react'
import SentMessage from './SentMessage'
import ReceiveMessage from './ReceiveMessage'
import { isAiTriggeredDraft } from '../utils/workspace'

const Chats = ({
  assistantInfo,
  assistantStatus,
  draftMessage,
  isSending,
  messages,
  onDraftMessageChange,
  onInsertPromptExample,
  onOpenFile,
  onSendMessage,
  projectName,
  sendError,
  socketConnected,
  userId,
}) => {
  const messagesEndRef = useRef(null)
  const trigger = assistantInfo?.trigger || '@ai'
  const isAiDraft = isAiTriggeredDraft(draftMessage)
  const promptExamples = [
    `${trigger} summarize the latest blockers`,
    `${trigger} draft a clearer README intro`,
    `${trigger} create a simple landing page`,
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <section className="torq-shell torq-panel-rise flex min-h-[38rem] flex-col rounded-[1.9rem] overflow-hidden">
      <div className="border-b border-[var(--torq-line)] bg-[linear-gradient(135deg,rgba(13,156,138,0.08),rgba(255,255,255,0))] px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="torq-eyebrow">Discussion</p>
            <h2 className="torq-heading mt-3 text-3xl">Project chat</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--torq-ink-soft)]">
              Share updates with the team or start a message with {trigger} when
              you want AI help for {projectName}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className={`torq-badge ${socketConnected ? 'torq-badge-live' : 'torq-badge-warn'}`}>
              {socketConnected ? 'Live sync' : 'Offline mode'}
            </div>
            <div className={`torq-badge ${assistantInfo?.configured ? 'torq-badge-live' : 'torq-badge-warn'}`}>
              {assistantInfo?.configured ? 'AI available' : 'AI unavailable'}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {promptExamples.map((example) => (
            <button
              className="rounded-full border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-3 py-2 text-xs font-medium text-[var(--torq-ink-soft)] transition hover:border-[rgba(13,156,138,0.22)] hover:text-[var(--torq-teal)]"
              key={example}
              onClick={() => onInsertPromptExample(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[rgba(255,255,255,0.22)] px-5 py-5">
        {assistantStatus === 'thinking' ? (
          <div className="mb-4 rounded-[1.1rem] border border-[rgba(13,156,138,0.16)] bg-[var(--torq-teal-soft)] px-4 py-3 text-sm text-[var(--torq-teal)]">
            Torq AI is working on a reply.
          </div>
        ) : null}

        {messages.length ? (
          messages.map((message) =>
            message.sender?._id === userId ? (
              <SentMessage
                key={message._id || `${message.createdAt}-${message.content}`}
                messageInfo={message}
              />
            ) : (
              <ReceiveMessage
                key={message._id || `${message.createdAt}-${message.content}`}
                messageInfo={message}
                onOpenFile={onOpenFile}
              />
            ),
          )
        ) : (
          <div className="flex h-full min-h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-6 text-center">
            <div>
              <p className="torq-eyebrow">No messages yet</p>
              <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
                Start with a quick update, a question, or an AI request.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--torq-line)] px-5 py-5">
        <form className="space-y-3" onSubmit={onSendMessage}>
          <textarea
            className={`torq-textarea min-h-[7.5rem] px-4 py-4 text-sm leading-7 ${
              isAiDraft ? 'border-[rgba(13,156,138,0.28)] bg-[var(--torq-teal-soft)]' : ''
            }`}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            placeholder={`Write a message, or start with ${trigger} to ask AI for help...`}
            value={draftMessage}
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="torq-shell-soft rounded-[1rem] px-4 py-3 text-sm text-[var(--torq-ink-soft)]">
              {isAiDraft
                ? 'This will be sent as an AI request.'
                : 'Messages are saved automatically in this project.'}
            </div>

            <button
              className="torq-primary-button px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending || !draftMessage.trim()}
              type="submit"
            >
              {isSending ? 'Sending...' : isAiDraft ? 'Ask AI' : 'Send message'}
            </button>
          </div>

          {sendError ? (
            <div className="torq-danger-panel rounded-[1rem] px-4 py-3 text-sm">
              {sendError}
            </div>
          ) : null}
        </form>
      </div>
    </section>
  )
}

export default Chats
