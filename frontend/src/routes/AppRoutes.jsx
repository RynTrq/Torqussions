import React from 'react'
import {Route, BrowserRouter, Routes} from 'react-router-dom'
import Login from '../screens/Login'
import Signup from '../screens/Signup'
import Home from '../screens/Home'

const AppRoutes = () => {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Signup />} />
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes