import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSend = async (e) => {
    e.preventDefault()
    if (!email) return showToast('Please enter your email', 'error')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
      showToast('Verification code sent!', 'success')
    }, 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F8FF', padding: 24 }}>
      {/* Blue header */}
      <div style={{
        background: 'linear-gradient(135deg, #3B5EF8, #1565C0)',
        borderRadius: 24, padding: '20px 24px', color: 'white',
        marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20 }}>←</button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22 }}>Forgot Password</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>We'll help you reset your password</p>
        </div>
      </div>

      {/* Icon */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 80, height: 80, background: '#3B5EF8',
          borderRadius: 24, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 36, margin: '0 auto',
        }}>🛡️</div>
      </div>

      {!sent ? (
        <>
          {/* Email form */}
          <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input id="forgot-email" type="email" className="input-field"
                  placeholder="Enter your email address"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>We'll send a verification code to your email</p>
            </div>
          </div>

          {/* What happens next */}
          <div style={{ background: '#EEF2FF', borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 12 }}>What happens next?</p>
            {[
              "You'll receive a 6-digit verification code",
              "Enter the code on the next screen",
              "Create a new password for your account",
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#3B5EF8', fontWeight: 700, fontSize: 14 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: '#64748B' }}>{step}</span>
              </div>
            ))}
          </div>

          <button id="forgot-send-btn" onClick={handleSend} className="btn btn-primary btn-block"
            disabled={loading}
            style={{ borderRadius: 14, fontSize: 16, padding: '15px', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Sending...' : 'Send Verification Code'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#64748B', fontSize: 13 }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#3B5EF8', fontWeight: 700 }}>Log In</Link>
          </p>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>📬</div>
          <h3 style={{ fontWeight: 800, marginBottom: 12 }}>Code Sent!</h3>
          <p style={{ color: '#64748B', marginBottom: 32 }}>
            We sent a verification code to <strong>{email}</strong>.
            Check your inbox and follow the instructions.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-block"
            style={{ borderRadius: 14, fontSize: 16, padding: '15px' }}>
            Back to Login
          </button>
        </div>
      )}
    </div>
  )
}
