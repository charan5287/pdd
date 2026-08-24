import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SignUpPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', agreed: false })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const role = params.get('role') || 'user'

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password || !form.phone)
      return showToast('Please fill all required fields', 'error')
    if (form.password !== form.confirmPassword)
      return showToast('Passwords do not match', 'error')
    if (!form.agreed)
      return showToast('Please agree to Terms & Conditions', 'error')
    if (form.password.length < 6)
      return showToast('Password must be at least 6 characters', 'error')

    setLoading(true)
    try {
      const user = await register(form.fullName, form.email, form.password, form.phone, role)
      showToast('Account created! Welcome 🎉', 'success')
      if (user.role === 'pharmacy') navigate('/pharmacy')
      else navigate('/home')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24, position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300,
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20, padding: '18px 20px',
        marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', zIndex: 1,
      }}>
        <button onClick={() => navigate(-1)} style={{
          color: 'var(--text-primary)', fontSize: 20, padding: 4,
          background: 'var(--surface)', borderRadius: 10, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Join MediNow and manage your health</p>
        </div>
      </div>

      {/* Form */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,212,170,0.12)',
        borderRadius: 24, padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        position: 'relative', zIndex: 1,
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input id="signup-name" className="input-field" placeholder="John Doe"
                value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input id="signup-email" type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <div className="input-with-icon">
              <span className="input-icon">📱</span>
              <input id="signup-phone" type="tel" className="input-field" placeholder="+91 98765 43210"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <span className="input-icon">🔒</span>
              <input id="signup-password" type={showPass ? 'text' : 'password'}
                className="input-field" placeholder="Create a strong password"
                value={form.password} onChange={e => set('password', e.target.value)}
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14,
              }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input id="signup-confirm-password" type="password" className="input-field"
                placeholder="Confirm your password"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
          </div>

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
            background: 'var(--bg-card2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14,
          }}>
            <input type="checkbox" id="signup-terms" checked={form.agreed}
              onChange={e => set('agreed', e.target.checked)}
              style={{ marginTop: 2, accentColor: '#00D4AA', width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              I agree to the{' '}
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms & Conditions</span>
              {' '}and{' '}
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</span>
            </span>
          </label>

          <button id="signup-submit-btn" type="submit" className="btn btn-primary btn-block"
            disabled={loading}
            style={{ fontSize: 16, padding: '15px 24px', borderRadius: 14, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0' }}>Or sign up with</div>
        <button className="btn btn-outline btn-block" style={{ borderRadius: 14 }}
          onClick={() => showToast('Google sign-up coming soon!', 'info')}>
          <span style={{ fontWeight: 700 }}>G</span>
          Sign up with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
