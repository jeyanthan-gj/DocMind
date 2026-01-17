import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import Login from './pages/Login'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import CompleteProfile from './pages/CompleteProfile'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white text-black font-bold">
      <div className="animate-pulse">DocMind Loading...</div>
    </div>
  )

  if (!user) return <Navigate to="/login" />

  // Redirect to profile completion if name is missing
  if (user && !loading && profile && !profile.full_name && window.location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/chat" />
  }

  return children
}

const AppRoutes = () => {
  const { user, profile } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          user ? (
            profile?.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/chat" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="dark min-h-screen bg-background text-foreground">
          <AppRoutes />
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
