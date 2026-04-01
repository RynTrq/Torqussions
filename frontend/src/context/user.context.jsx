import React, { startTransition, useEffect, useEffectEvent, useState } from 'react'
import axios from '../config/axios'
import { UserContext } from './user-context'

const getStoredToken = () => localStorage.getItem('token')

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(getStoredToken() ? 'loading' : 'guest')

  const hydrateSession = useEffectEvent(async () => {
    const token = getStoredToken()

    if (!token) {
      startTransition(() => {
        setUser(null)
        setStatus('guest')
      })
      return
    }

    setStatus('loading')

    try {
      const { data } = await axios.get('/users/profile')

      startTransition(() => {
        setUser(data.user)
        setStatus('authenticated')
      })
    } catch {
      localStorage.removeItem('token')

      startTransition(() => {
        setUser(null)
        setStatus('guest')
      })
    }
  })

  useEffect(() => {
    void hydrateSession()
  }, [])

  const setSession = ({ user: nextUser, token }) => {
    if (token) {
      localStorage.setItem('token', token)
    }

    startTransition(() => {
      setUser(nextUser)
      setStatus('authenticated')
    })
  }

  const clearSession = async ({ remote = true } = {}) => {
    if (remote && getStoredToken()) {
      try {
        await axios.post('/users/logout')
      } catch {
        // Best-effort logout. Local cleanup still matters if the API is unavailable.
      }
    }

    localStorage.removeItem('token')

    startTransition(() => {
      setUser(null)
      setStatus('guest')
    })
  }

  const refreshProfile = async () => {
    try {
      const { data } = await axios.get('/users/profile')

      startTransition(() => {
        setUser(data.user)
        setStatus('authenticated')
      })

      return data.user
    } catch (error) {
      await clearSession({ remote: false })
      throw error
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        status,
        isAuthenticated: Boolean(user) && status === 'authenticated',
        setSession,
        clearSession,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
