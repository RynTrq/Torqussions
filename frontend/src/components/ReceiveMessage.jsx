import React from 'react'

const ReceiveMessage = ({ messageInfo }) => {
  return (
    <div className="w-full flex justify-start px-4 my-2">

      <div
        className="
          relative max-w-[70%] px-5 py-3 text-sm text-blue-100 wrap-break-words whitespace-pre-wrap
          bg-[#0b1220]/80 border border-[#3ba4ff]/40 rounded-lg shadow-[0_0_10px_rgba(59,164,255,0.2)]
        ">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#3ba4ff] rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#3ba4ff] rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#3ba4ff] rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#3ba4ff] rounded-br-lg" />

        <div style={{ fontFamily: "Roboto Slab" }}>
          {messageInfo?.message}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div 
            className="text-xs text-[#3ba4ff]/70"
            style={{ fontFamily: "Roboto Slab" }}
          >
            {messageInfo?.sender?.email}
          </div>
          <div className="flex gap-1 ml-3">
            <div className="w-2 h-1 bg-[#3ba4ff]/60"></div>
            <div className="w-3 h-1 bg-[#3ba4ff]/80"></div>
            <div className="w-4 h-1 bg-[#3ba4ff]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiveMessage