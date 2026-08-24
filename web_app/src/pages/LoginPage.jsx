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
  const isPharmacy = role === 'pharmacy'

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
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 300,
        background: `radial-gradient(circle, ${isPharmacy ? 'rgba(124,58,237,0.08)' : 'rgba(0,212,170,0.08)'} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 14px',
          background: isPharmacy
            ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
            : 'linear-gradient(135deg, #00D4AA, #00A888)',
          borderRadius: 20, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 32,
          boxShadow: `0 8px 28px ${isPharmacy ? 'rgba(124,58,237,0.4)' : 'rgba(0,212,170,0.4)'}`,
        }}>{isPharmacy ? '🏥' : '💊'}</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Welcome to MediNow
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {isPharmacy ? 'Pharmacy Portal' : 'Your smart health companion'}
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isPharmacy ? 'rgba(124,58,237,0.2)' : 'rgba(0,212,170,0.15)'}`,
        borderRadius: 28, padding: 28,
        width: '100%', maxWidth: 420,
        boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 40px ${isPharmacy ? 'rgba(124,58,237,0.08)' : 'rgba(0,212,170,0.08)'}`,
        position: 'relative', zIndex: 1,
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input
                id="login-email" type="email" className="input-field"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
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
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, padding: 4,
              }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
              Forgot Password?
            </Link>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className={`btn ${isPharmacy ? 'btn-purple' : 'btn-primary'} btn-block`}
            disabled={loading}
            style={{ fontSize: 16, padding: '15px 24px', borderRadius: 14, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '⏳ Signing In...' : '🚀 Sign In'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0', color: 'var(--text-muted)' }}>Or continue with</div>

        <button
          id="login-google-btn"
          className="btn btn-outline btn-block"
          style={{ borderRadius: 14, fontSize: 15 }}
          onClick={() => showToast('Google sign-in coming soon!', 'info')}
        >
          <span style={{ fontSize: 18, fontWeight: 800 }}>G</span>
          Sign in with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
          Don't have an account?{' '}
          <Link
            to={`/signup${role !== 'user' ? `?role=${role}` : ''}`}
            style={{ color: 'var(--primary)', fontWeight: 700 }}
          >
            Sign up free
          </Link>
        </p>
      </div>

      <button onClick={() => navigate('/portal')}
        style={{ marginTop: 20, color: 'var(--text-muted)', fontSize: 13, padding: 12, zIndex: 1 }}>
        ← Back to portal selection
      </button>
    </div>
  )
}
