import React from 'react'

const defaultStats = [
  { label: 'Live rooms', value: '24' },
  { label: 'Preview time', value: '0.4s' },
  { label: 'AI assists', value: '1 tap' },
]

const TorqScene = ({
  badge = 'Realtime workspace',
  description = 'Chat, files, previews, and execution flow through one responsive control surface.',
  heading = 'A focused room for momentum.',
  stats = defaultStats,
  compact = false,
}) => {
  const visibleStats = stats.slice(0, 3)

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratioX = (event.clientX - rect.left) / rect.width - 0.5
    const ratioY = (event.clientY - rect.top) / rect.height - 0.5

    event.currentTarget.style.setProperty(
      '--torq-scene-rotate-x',
      `${16 - ratioY * 14}deg`,
    )
    event.currentTarget.style.setProperty(
      '--torq-scene-rotate-y',
      `${-12 + ratioX * 18}deg`,
    )
    event.currentTarget.style.setProperty(
      '--torq-scene-glare-x',
      `${50 + ratioX * 28}%`,
    )
    event.currentTarget.style.setProperty(
      '--torq-scene-glare-y',
      `${18 + ratioY * 20}%`,
    )
  }

  const handlePointerLeave = (event) => {
    event.currentTarget.style.setProperty('--torq-scene-rotate-x', '16deg')
    event.currentTarget.style.setProperty('--torq-scene-rotate-y', '-12deg')
    event.currentTarget.style.setProperty('--torq-scene-glare-x', '50%')
    event.currentTarget.style.setProperty('--torq-scene-glare-y', '18%')
  }

  return (
    <div
      className={`torq-scene ${compact ? 'torq-scene--compact' : ''}`}
      onMouseLeave={handlePointerLeave}
      onMouseMove={handlePointerMove}
    >
      <div className="torq-scene__aura torq-scene__aura--teal" />
      <div className="torq-scene__aura torq-scene__aura--amber" />
      <div className="torq-scene__platform">
        <div className="torq-scene__glare" />
        <div className="torq-scene__grid" />

        <article className="torq-scene-card torq-scene-card--primary">
          <span className="torq-badge torq-badge-live">{badge}</span>
          <h3 className="torq-heading mt-4 text-2xl sm:text-[2rem]">{heading}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            {description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {visibleStats.map((stat) => (
              <div className="torq-scene-stat" key={stat.label}>
                <p className="torq-eyebrow">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--torq-ink)]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="torq-scene-card torq-scene-card--secondary">
          <p className="torq-eyebrow">Workflow</p>
          <div className="mt-4 space-y-3">
            {['Discuss', 'Generate', 'Preview', 'Ship'].map((step, index) => (
              <div className="torq-scene-step" key={step}>
                <span className="torq-scene-step__index">0{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="torq-scene-card torq-scene-card--tertiary">
          <p className="torq-eyebrow">Project stack</p>
          <div className="mt-4 space-y-2">
            {['chat.room', 'workspace.html', 'preview.live', 'runner.exec'].map(
              (item) => (
                <div className="torq-scene-file" key={item}>
                  <span className="torq-scene-file__dot" />
                  <span>{item}</span>
                </div>
              ),
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

export default TorqScene

