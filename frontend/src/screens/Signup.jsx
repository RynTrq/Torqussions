import React, { useContext, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import AuthHeader from '../components/AuthHeader'
import TorqScene from '../components/TorqScene'
import { UserContext } from '../context/user-context'

const signupSceneStats = [
  { label: 'Project rooms', value: 'Instant' },
  { label: 'Team invites', value: 'Built in' },
  { label: 'AI drafting', value: '@ai' },
]

const Signup = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isAuthenticated, setSession, status } = useContext(UserContext)
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate replace to="/" />
  }

  if (status === 'loading') {
    return null
  }

  const submitHandler = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const { data } = await axios.post('/users/register', {
        name,
        email,
        password,
      })

      setSession(data)
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          'Registration failed. Try a different email or a stronger password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="torq-page min-h-screen px-4 pb-10 pt-4">
      <div className="pointer-events-none absolute left-[-3rem] top-16 h-72 w-72 rounded-full bg-[rgba(216,140,52,0.15)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-3rem] right-0 h-80 w-80 rounded-full bg-[rgba(13,156,138,0.14)] blur-3xl" />

      <AuthHeader />

      <div className="mx-auto mt-4 grid w-full max-w-7xl gap-6 lg:grid-cols-[0.98fr,1.02fr]">
        <div className="torq-shell rounded-[2.2rem] p-8 sm:p-10">
          <p className="torq-eyebrow">Create account</p>
          <h1 className="torq-heading mt-4 text-4xl sm:text-5xl">
            Launch your first collaboration room.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--torq-ink-soft)]">
            Create a Torqussions account and start with a premium workspace
            designed for conversation, shared files, execution, preview, and AI-generated help.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="torq-shell-soft torq-highlight-card rounded-[1.2rem] p-4">
              <p className="text-sm font-semibold text-[var(--torq-ink)]">One room per project</p>
              <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
                Keep the work attached to the context instead of scattered across tools.
              </p>
            </div>
            <div className="torq-shell-soft torq-highlight-card rounded-[1.2rem] p-4">
              <p className="text-sm font-semibold text-[var(--torq-ink)]">Live project surfaces</p>
              <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
                Preview layouts, edit files, run code, and invite teammates from one place.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <TorqScene
              badge="Start building"
              compact
              description="The same app functionality, elevated with a stronger interface and a true theme system."
              heading="Fast onboarding, richer UI, cleaner project flow."
              stats={signupSceneStats}
            />
          </div>
        </div>

        <div className="torq-shell-strong rounded-[2.2rem] p-8 sm:p-10">
          <p className="torq-eyebrow">Sign up</p>
          <h2 className="torq-heading mt-4 text-3xl text-white sm:text-4xl">
            Create your account
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/74">
            Get into your workspace in a minute and invite the rest of the team afterward.
          </p>

          <form className="mt-8 space-y-4" onSubmit={submitHandler}>
            <div>
              <label className="text-sm font-medium text-white" htmlFor="signup-name">
                Name
              </label>
              <input
                className="torq-input mt-2 border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45"
                id="signup-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={name}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white" htmlFor="signup-email">
                Email
              </label>
              <input
                className="torq-input mt-2 border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45"
                id="signup-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white" htmlFor="signup-password">
                Password
              </label>
              <input
                className="torq-input mt-2 border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45"
                id="signup-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                type="password"
                value={password}
              />
            </div>

            {error ? (
              <div className="rounded-[1rem] border border-[rgba(255,255,255,0.16)] bg-[rgba(186,53,39,0.22)] px-4 py-3 text-sm text-white">
                {error}
              </div>
            ) : null}

            <button
              className="torq-primary-button w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-white/72">
            Already have an account?{' '}
            <Link className="font-semibold text-white" to="/login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default Signup
