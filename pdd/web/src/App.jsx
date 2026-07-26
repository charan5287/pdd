import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

// Pages
import OnboardingPage from './pages/OnboardingPage'
import PortalSelection from './pages/PortalSelection'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// Patient app
import PatientApp from './pages/PatientApp'

// Pharmacy admin
import PharmacyApp from './pages/PharmacyApp'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/onboarding" replace />
  if (user.role === 'pharmacy') return <Navigate to="/pharmacy" replace />
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="app-container">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/portal" element={<PortalSelection />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Patient routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <PatientApp />
                </ProtectedRoute>
              } />

              {/* Pharmacy admin routes */}
              <Route path="/pharmacy/*" element={
                <ProtectedRoute role="pharmacy">
                  <PharmacyApp />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
