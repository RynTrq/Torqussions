import React from 'react'
import MessageBody from './MessageBody'
import {
  formatClockTime,
  getMessageContent,
  getMessageWorkspaceUpdate,
  getUserDisplayName,
  isAiMessage,
} from '../utils/workspace'

const ReceiveMessage = ({ messageInfo, onOpenFile }) => {
  const aiReply = isAiMessage(messageInfo)
  const modelLabel = messageInfo?.metadata?.model?.replace(/^gemini-/i, 'Gemini ') || ''
  const workspaceUpdate = getMessageWorkspaceUpdate(messageInfo)

  if (aiReply) {
    return (
      <div className="my-3 flex w-full justify-start">
        <div className="max-w-[92%] rounded-[1.4rem] border border-[rgba(13,156,138,0.16)] bg-[linear-gradient(180deg,rgba(13,156,138,0.12),rgba(255,255,255,0.52))] px-4 py-4 text-sm text-[var(--torq-ink)] shadow-[0_18px_32px_rgba(13,25,44,0.08)] sm:max-w-[80%]">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--torq-teal)]">
            <span>{getUserDisplayName(messageInfo?.sender)}</span>
            {modelLabel ? <span>{modelLabel}</span> : null}
            <span>{formatClockTime(messageInfo?.createdAt)}</span>
          </div>

          <div className="mt-3">
            <MessageBody content={getMessageContent(messageInfo)} tone="ai" />
          </div>

          {workspaceUpdate?.files?.length ? (
            <div className="mt-4 rounded-[1rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--torq-ink)]">Files added to the project</p>
              {workspaceUpdate.summary ? (
                <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
                  {workspaceUpdate.summary}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {workspaceUpdate.files.map((file) => (
                  <button
                    className="rounded-full border border-[var(--torq-line)] bg-[var(--torq-teal-soft)] px-3 py-2 text-xs font-medium text-[var(--torq-teal)]"
                    key={file.path}
                    onClick={() => onOpenFile?.(file.path)}
                    type="button"
                  >
                    {file.path}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="my-3 flex w-full justify-start">
      <div className="max-w-[88%] rounded-[1.35rem] border border-[var(--torq-line)] bg-[var(--torq-card-solid)] px-4 py-3 text-sm text-[var(--torq-ink)] shadow-[0_14px_26px_rgba(13,25,44,0.06)] sm:max-w-[72%]">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-[var(--torq-ink-soft)]">
          <span>{getUserDisplayName(messageInfo?.sender)}</span>
          <span>•</span>
          <span>{formatClockTime(messageInfo?.createdAt)}</span>
        </div>

        <div className="mt-3">
          <MessageBody content={getMessageContent(messageInfo)} tone="cool" />
        </div>
      </div>
    </div>
  )
}

export default ReceiveMessage
