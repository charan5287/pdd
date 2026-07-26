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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #EEF2FF 0%, #F5F8FF 100%)',
      padding: 24,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3B5EF8, #1976D2)',
        borderRadius: 24,
        padding: '20px 24px',
        color: 'white',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20, padding: 4 }}>←</button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22 }}>Create Account</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            Join MediNow and manage your health smartly
          </p>
        </div>
      </div>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 44, height: 44, background: '#3B5EF8',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>❤️</div>
          <span style={{ fontSize: 12, color: '#00C896', fontWeight: 700 }}>⚡</span>
        </div>
      </div>

      {/* Form */}
      <div style={{
        background: 'white', borderRadius: 24, padding: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input id="signup-name" className="input-field" placeholder="John Doe"
                value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
          </div>

          {/* Email */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">✉️</span>
              <input id="signup-email" type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* Phone */}
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <div className="input-with-icon">
              <span className="input-icon">📱</span>
              <input id="signup-phone" type="tel" className="input-field" placeholder="+91 98765 43210"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <span className="input-icon">🔒</span>
              <input id="signup-password" type={showPass ? 'text' : 'password'}
                className="input-field" placeholder="Create a strong password"
                value={form.password} onChange={e => set('password', e.target.value)}
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 14 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input id="signup-confirm-password" type="password" className="input-field" placeholder="Confirm your password"
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
          </div>

          {/* Terms */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
            background: '#F5F8FF', borderRadius: 12, padding: 14,
          }}>
            <input type="checkbox" id="signup-terms" checked={form.agreed}
              onChange={e => set('agreed', e.target.checked)}
              style={{ marginTop: 2, accentColor: '#3B5EF8', width: 16, height: 16 }} />
            <span style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
              I agree to the{' '}
              <span style={{ color: '#3B5EF8', fontWeight: 600 }}>Terms & Conditions</span>
              {' '}and{' '}
              <span style={{ color: '#3B5EF8', fontWeight: 600 }}>Privacy Policy</span>
            </span>
          </label>

          <button id="signup-submit-btn" type="submit" className="btn btn-primary btn-block"
            disabled={loading}
            style={{ fontSize: 16, padding: '15px 24px', borderRadius: 14, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? '⏳ Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0' }}>Or sign up with</div>
        <button className="btn btn-outline btn-block" style={{ borderRadius: 14 }}
          onClick={() => {}}>
          <span style={{ fontWeight: 700, color: '#4285F4' }}>G</span>
          Sign up with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#64748B', fontSize: 13 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#3B5EF8', fontWeight: 700 }}>Log in</Link>
        </p>
      </div>

      {/* Features */}
      <div style={{ background: '#EEF2FF', borderRadius: 16, padding: 16, marginTop: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: '#1A1A2E', marginBottom: 10 }}>Join MediNow Today</p>
        {['AI-powered prescription scanning', 'Smart medicine reminders', 'Fast delivery tracking', '24/7 AI health assistant'].map(f => (
          <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#00C896' }}>✅</span>
            <span style={{ fontSize: 13, color: '#64748B' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
