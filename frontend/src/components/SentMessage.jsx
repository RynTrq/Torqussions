import React from 'react'

const SentMessage = ({ messageInfo }) => {
  return (
    <div className="w-full flex justify-end px-4 my-2">
      <div
        className="relative max-w-[70%] px-5 py-3 text-sm text-blue-100 wrap-break-words whitespace-pre-wrap
        bg-[#0f141c]/80 border border-[#c9a34a]/40 rounded-lg shadow-[0_0_10px_rgba(201,163,74,0.2)]
        ">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#c9a34a] rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c9a34a] rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#c9a34a] rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#c9a34a] rounded-br-lg" />

        <div style={{fontFamily: "Roboto Slab"}}>
          {messageInfo?.message}
        </div>

        <div className="flex items-center justify-between mt-2">
          
          <div className="text-xs text-[#c9a34a]/70" style={{fontFamily: "Roboto Slab"}}>
            {messageInfo?.sender?.email}
          </div>

          <div className="flex gap-1 ml-3">
            <div className="w-2 h-1 bg-[#c9a34a]/60"></div>
            <div className="w-3 h-1 bg-[#c9a34a]/80"></div>
            <div className="w-4 h-1 bg-[#c9a34a]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SentMessage