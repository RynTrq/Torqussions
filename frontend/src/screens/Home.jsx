import React from 'react'
import Header from '../components/Header'
import ProjectList from '../components/ProjectList'
import TorqScene from '../components/TorqScene'

const heroStats = [
  { label: 'Chat + files', value: 'Unified' },
  { label: 'Live preview', value: 'Built in' },
  { label: 'Execution', value: 'Ready' },
]

const Home = () => {
  return (
    <div className="torq-page overflow-hidden pb-12">
      <div className="pointer-events-none fixed left-[-3rem] top-16 h-72 w-72 rounded-full bg-[rgba(13,156,138,0.14)] blur-3xl" />
      <div className="pointer-events-none fixed right-[-2rem] top-28 h-64 w-64 rounded-full bg-[rgba(216,140,52,0.12)] blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-[rgba(13,156,138,0.1)] blur-3xl" />

      <Header
        subtitle="Projects, discussions, shared files, AI generation, preview, and code execution in one responsive workspace."
        title="Torqussions"
      />

      <main className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="torq-shell-strong rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="torq-badge border border-white/12 bg-white/10 text-white">
                Team workspace
              </span>
              <span className="torq-badge border border-white/12 bg-white/10 text-white">
                Light and dark mode
              </span>
            </div>

            <p className="torq-eyebrow mt-6">Interface redesign</p>
            <h2 className="torq-heading mt-4 max-w-3xl text-4xl text-white sm:text-5xl">
              A sharper cockpit for collaboration, previews, and AI-assisted work.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/78">
              Every project feels like a live room instead of a basic dashboard:
              better hierarchy, stronger depth, richer interactions, and faster
              scanning across chat, files, previews, team controls, and execution.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4"
                  key={stat.label}
                >
                  <p className="torq-eyebrow text-white/70">{stat.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <TorqScene
            badge="3D control surface"
            description="Designed to feel like a live collaboration surface instead of a flat admin panel."
            heading="Responsive panels with depth, motion, and focus."
            stats={heroStats}
          />
        </section>

        <ProjectList />
      </main>
    </div>
  )
}

export default Home
