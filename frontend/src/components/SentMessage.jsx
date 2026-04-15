import React from 'react'
import MessageBody from './MessageBody'
import {
  formatClockTime,
  getMessageContent,
  getUserDisplayName,
  isAiTriggeredDraft,
} from '../utils/workspace'

const SentMessage = ({ messageInfo }) => {
  const isAiPrompt = isAiTriggeredDraft(getMessageContent(messageInfo))

  return (
    <div className="my-3 flex w-full justify-end">
      <div className="max-w-[88%] rounded-[1.35rem] border border-[rgba(13,156,138,0.18)] bg-[linear-gradient(135deg,#11af9c_0%,#087465_100%)] px-4 py-3 text-sm text-white shadow-[0_18px_34px_rgba(8,116,101,0.24)] sm:max-w-[72%]">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-white/72">
          <span>{getUserDisplayName(messageInfo?.sender)}</span>
          <span>•</span>
          <span>{formatClockTime(messageInfo?.createdAt)}</span>
          {isAiPrompt ? (
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[0.6rem]">
              AI prompt
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <MessageBody content={getMessageContent(messageInfo)} tone="warm" />
        </div>
      </div>
    </div>
  )
}

export default SentMessage

