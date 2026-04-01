import React from 'react'
import { useNavigate } from 'react-router-dom'

import icon1 from '../assets/Project-Icons/1.png'
import icon2 from '../assets/Project-Icons/2.png'
import icon3 from '../assets/Project-Icons/3.png'
import icon4 from '../assets/Project-Icons/4.png'
import icon5 from '../assets/Project-Icons/5.png'
import icon6 from '../assets/Project-Icons/6.png'
import icon7 from '../assets/Project-Icons/7.png'
import icon8 from '../assets/Project-Icons/8.png'
import icon9 from '../assets/Project-Icons/9.png'
import icon10 from '../assets/Project-Icons/10.png'
import icon11 from '../assets/Project-Icons/11.png'
import icon12 from '../assets/Project-Icons/12.png'
import icon13 from '../assets/Project-Icons/13.png'
import icon14 from '../assets/Project-Icons/14.png'
import icon15 from '../assets/Project-Icons/15.png'
import icon16 from '../assets/Project-Icons/16.png'
import { formatRelativeTime, isPreviewableFile } from '../utils/workspace'

const icons = [
  icon1,
  icon2,
  icon3,
  icon4,
  icon5,
  icon6,
  icon7,
  icon8,
  icon9,
  icon10,
  icon11,
  icon12,
  icon13,
  icon14,
  icon15,
  icon16,
]

const hashProjectId = (value = '') =>
  Array.from(value).reduce(
    (accumulator, character) =>
      character.charCodeAt(0) + ((accumulator << 5) - accumulator),
    0,
  )

const ProjectCard = ({ project }) => {
  const navigate = useNavigate()
  const icon = icons[Math.abs(hashProjectId(project._id || project.name)) % icons.length]
  const previewReady = Object.keys(project.fileTree || {}).some((fileName) =>
    isPreviewableFile(fileName),
  )

  return (
    <button
      className="torq-shell torq-panel-rise group flex h-full min-h-[18rem] w-full flex-col rounded-[1.8rem] p-5 text-left transition duration-200 hover:-translate-y-1.5 hover:shadow-[0_28px_66px_rgba(13,25,44,0.16)]"
      onClick={() =>
        navigate(`/project/${project._id}`, {
          state: { project },
        })
      }
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-[1.15rem] border border-[var(--torq-line)] bg-[linear-gradient(180deg,rgba(13,156,138,0.12),rgba(255,255,255,0.12))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <img alt={`${project.name} icon`} className="h-full w-full object-contain" src={icon} />
          </div>

          <div className="min-w-0">
            <p className="torq-eyebrow">Project room</p>
            <h3 className="torq-heading mt-2 truncate text-2xl">{project.name}</h3>
          </div>
        </div>

        <span className="torq-badge torq-badge-neutral">{project.status || 'active'}</span>
      </div>

      <p className="mt-5 line-clamp-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
        {project.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="torq-badge torq-badge-live">{project.users?.length || 1} people</span>
        <span className="torq-badge torq-badge-neutral">
          {Object.keys(project.fileTree || {}).length} files
        </span>
        {previewReady ? <span className="torq-badge torq-badge-warn">Preview ready</span> : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="torq-highlight-card rounded-[1.15rem] border border-[var(--torq-line)] bg-[rgba(255,255,255,0.42)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--torq-ink-faint)]">
            Last activity
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--torq-ink)]">
            {formatRelativeTime(project.lastActivityAt || project.updatedAt)}
          </p>
        </div>

        <div className="torq-highlight-card rounded-[1.15rem] border border-[var(--torq-line)] bg-[rgba(255,255,255,0.42)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--torq-ink-faint)]">
            Room type
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--torq-ink)]">
            Chat, files, preview
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--torq-line)] pt-5">
        <p className="text-sm text-[var(--torq-ink-soft)]">Open the workspace</p>
        <span className="text-sm font-semibold text-[var(--torq-teal)] transition group-hover:translate-x-1">
          Enter room
        </span>
      </div>
    </button>
  )
}

export default ProjectCard
