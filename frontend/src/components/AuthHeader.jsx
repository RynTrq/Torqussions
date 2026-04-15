import React from 'react'
import { Link } from 'react-router-dom'
import iconProjects from '../assets/icon.png'
import ThemeToggle from './ThemeToggle'

const AuthHeader = () => {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 lg:px-8">
        <Link
          className="torq-shell flex items-center gap-3 rounded-[1.35rem] px-3 py-2.5 transition hover:-translate-y-0.5"
          to="/"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--torq-card-solid)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <img alt="Torqussions" className="h-8 w-8 object-contain" src={iconProjects} />
          </div>
          <div>
            <p className="torq-eyebrow">Torqussions</p>
            <p className="mt-1 text-sm font-medium text-[var(--torq-ink-soft)]">
              Collaborative workspace
            </p>
          </div>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  )
}

export default AuthHeader

