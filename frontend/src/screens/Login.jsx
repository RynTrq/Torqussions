import React, { useContext, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import AuthHeader from '../components/AuthHeader'
import TorqScene from '../components/TorqScene'
import { UserContext } from '../context/user-context'

const loginSceneStats = [
  { label: 'Project context', value: 'Attached' },
  { label: 'Invites', value: 'Inbox ready' },
  { label: 'Realtime', value: 'Synced' },
]

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isAuthenticated, setSession, status } = useContext(UserContext)
  const location = useLocation()
  const navigate = useNavigate()

  const redirectPath = location.state?.from?.pathname || '/'

  if (isAuthenticated) {
    return <Navigate replace to={redirectPath} />
  }

  if (status === 'loading') {
    return null
  }

  const submitHandler = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const { data } = await axios.post('/users/login', {
        email,
        password,
      })

      setSession(data)
      navigate(redirectPath, { replace: true })
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          'Login failed. Check your email and password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="torq-page min-h-screen px-4 pb-10 pt-4">
      <div className="pointer-events-none absolute left-[-4rem] top-8 h-72 w-72 rounded-full bg-[rgba(13,156,138,0.16)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-2rem] right-[-2rem] h-80 w-80 rounded-full bg-[rgba(216,140,52,0.14)] blur-3xl" />

      <AuthHeader />

      <div className="mx-auto mt-4 grid w-full max-w-7xl gap-6 lg:grid-cols-[1.06fr,0.94fr]">
        <div className="torq-shell-strong rounded-[2.2rem] p-8 sm:p-10">
          <div className="max-w-2xl">
            <p className="torq-eyebrow">Welcome back</p>
            <h1 className="torq-heading mt-4 text-4xl text-white sm:text-5xl">
              Return to the rooms where work is already in motion.
            </h1>
            <p className="mt-4 text-sm leading-8 text-white/78">
              Torqussions keeps the project conversation, shared files, live previews,
              code execution, and AI-generated drafts inside one responsive workspace.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-semibold text-white">Project memory</p>
              <p className="mt-2 text-sm leading-7 text-white/74">
                Messages and files stay anchored to each room.
              </p>
            </div>
            <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-semibold text-white">AI assist</p>
              <p className="mt-2 text-sm leading-7 text-white/74">
                Use <span className="font-semibold">@ai</span> when you need a draft or prototype.
              </p>
            </div>
            <div className="torq-highlight-card rounded-[1.2rem] border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-semibold text-white">Execution ready</p>
              <p className="mt-2 text-sm leading-7 text-white/74">
                Run supported files without leaving the workspace.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <TorqScene
              badge="Access workspace"
              compact
              description="The new UI keeps the same flow, just with stronger focus, motion, and depth."
              heading="Modern control surfaces, still the same core workflow."
              stats={loginSceneStats}
            />
          </div>
        </div>

        <div className="torq-shell rounded-[2.2rem] p-8 sm:p-10">
          <p className="torq-eyebrow">Login</p>
          <h2 className="torq-heading mt-4 text-3xl sm:text-4xl">Access your account</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            Use the email and password you registered with.
          </p>

          <form className="mt-8 space-y-4" onSubmit={submitHandler}>
            <div>
              <label className="text-sm font-medium text-[var(--torq-ink)]" htmlFor="login-email">
                Email
              </label>
              <input
                className="torq-input mt-2 px-4 py-3 text-sm"
                id="login-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--torq-ink)]"
                htmlFor="login-password"
              >
                Password
              </label>
              <input
                className="torq-input mt-2 px-4 py-3 text-sm"
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
                type="password"
                value={password}
              />
            </div>

            {error ? (
              <div className="torq-danger-panel rounded-[1rem] px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <button
              className="torq-primary-button w-full px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="torq-shell-soft mt-6 rounded-[1.3rem] p-4">
            <p className="text-sm font-semibold text-[var(--torq-ink)]">
              The dashboard now includes a header theme toggle.
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--torq-ink-soft)]">
              Choose light or dark mode and keep the same functionality across the app.
            </p>
          </div>

          <p className="mt-6 text-sm text-[var(--torq-ink-soft)]">
            Don&apos;t have an account?{' '}
            <Link className="font-semibold text-[var(--torq-teal)]" to="/register">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default Login
