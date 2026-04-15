import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { ThemeProvider } from './context/theme.context'
import { UserProvider } from './context/user.context'

const App = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </ThemeProvider>
  )
}

export default App
