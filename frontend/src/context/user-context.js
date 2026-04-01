import { createContext } from 'react'

export const UserContext = createContext({
  user: null,
  status: 'loading',
  isAuthenticated: false,
  setSession: () => {},
  clearSession: async () => {},
  refreshProfile: async () => null,
})
