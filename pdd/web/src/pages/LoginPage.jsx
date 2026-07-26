import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const role = params.get('role') || 'user'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return showToast('Please fill all fields', 'error')
    setLoading(true)
    try {
      const user = await login(email, password)
      showToast('Welcome back! 👋', 'success')
      if (user.role === 'pharmacy') navigate('/pharmacy')
      else navigate('/home')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Login failed. Check credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EEF2FF 0%, #F5F8FF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 44,
            height: 44,
            background: '#3B5EF8',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}>❤️</div>
          <span style={{ fontSize: 12, color: '#00C896', fontWeight: 700 }}>⚡</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E' }}>Welcome to MediNow</h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>Your smart health companion</p>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <span className="input-icon">🔒</span>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  fontSize: 14,
                  padding: 4,
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Link to="/forgot-password" style={{ color: '#3B5EF8', fontSize: 13, fontWeight: 600 }}>
              Forgot Password?
            </Link>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ fontSize: 16, padding: '15px 24px', borderRadius: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⏳ Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="divider" style={{ margin: '20px 0' }}>Or continue with</div>

        {/* Google Sign In */}
        <button
          id="login-google-btn"
          className="btn btn-outline btn-block"
          style={{ borderRadius: 14, fontSize: 15 }}
          onClick={() => showToast('Google sign-in coming soon!', 'info')}
        >
          <span style={{ fontSize: 18 }}>G</span>
          Sign in with Google
        </button>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 20, color: '#64748B', fontSize: 13 }}>
          Don't have an account?{' '}
          <Link
            to={`/signup${role !== 'user' ? `?role=${role}` : ''}`}
            style={{ color: '#3B5EF8', fontWeight: 700 }}
          >
            Sign up
          </Link>
        </p>
      </div>

      <button
        onClick={() => navigate('/portal')}
        style={{ marginTop: 20, color: '#64748B', fontSize: 13 }}
      >
        ← Back to portal selection
      </button>
    </div>
  )
}
