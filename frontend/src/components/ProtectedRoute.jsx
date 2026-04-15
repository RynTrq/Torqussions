import React, { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { UserContext } from '../context/user-context'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, status } = useContext(UserContext)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="torq-page flex min-h-screen items-center justify-center px-4 py-10">
        <div className="pointer-events-none absolute left-0 top-10 h-64 w-64 rounded-full bg-[rgba(23,121,109,0.1)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[rgba(201,138,48,0.1)] blur-3xl" />

        <div className="torq-shell w-full max-w-md rounded-[1.8rem] p-8 text-center">
          <p className="torq-eyebrow">Torqussions</p>
          <h1 className="torq-heading mt-4 text-3xl">Restoring your session</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--torq-ink-soft)]">
            Checking your account and loading access to your projects.
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}

export default ProtectedRoute
