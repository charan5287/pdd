import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { authAPI } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('123456')
  const [newPassword, setNewPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSend = async (e) => {
    e.preventDefault()
    if (!email) return showToast('Please enter your email', 'error')
    setLoading(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
      showToast('Verification code sent!', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to send reset code', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!code) return showToast('Please enter verification code', 'error')
    if (!newPassword || newPassword.length < 6) return showToast('Password must be at least 6 characters', 'error')
    setResetting(true)
    try {
      await authAPI.resetPassword(email, code, newPassword)
      showToast('Password reset successfully! Please log in.', 'success')
      navigate('/login')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to reset password', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24, position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 300,
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '18px 20px', marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1,
      }}>
        <button onClick={() => navigate(-1)} style={{
          color: 'var(--text-primary)', fontSize: 20,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)' }}>Forgot Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>We'll help you reset it</p>
        </div>
      </div>

      {/* Icon */}
      <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 84, height: 84,
          background: 'linear-gradient(135deg, #00D4AA, #00A888)',
          borderRadius: 26, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 40, margin: '0 auto',
          boxShadow: '0 8px 28px rgba(0,212,170,0.4)',
        }}>🛡️</div>
      </div>

      {!sent ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.12)',
            borderRadius: 24, padding: 24, marginBottom: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input id="forgot-email" type="email" className="input-field"
                  placeholder="Enter your registered email"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                We'll send a verification code to this email
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)',
            borderRadius: 16, padding: 20, marginBottom: 24,
          }}>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>What happens next?</p>
            {[
              "You'll receive a 6-digit verification code",
              "Enter the code on the next screen",
              "Create a new secure password",
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)', fontWeight: 800, fontSize: 12, flexShrink: 0,
                }}>{i + 1}</div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>

          <button id="forgot-send-btn" onClick={handleSend} className="btn btn-primary btn-block"
            disabled={loading}
            style={{ borderRadius: 14, fontSize: 16, padding: '15px', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Sending...' : '📧 Send Verification Code'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
            Remember your password?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log In</Link>
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.12)',
          borderRadius: 24, padding: 24,
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📬</div>
            <h3 style={{ fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>Code Sent!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--primary)' }}>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Verification Code</label>
              <div className="input-with-icon">
                <span className="input-icon">🔢</span>
                <input id="verification-code" type="text" className="input-field"
                  placeholder="Enter 6-digit code"
                  value={code} onChange={e => setCode(e.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">New Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input id="new-password" type="password" className="input-field"
                  placeholder="Min 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>

            <button id="reset-password-btn" type="submit" className="btn btn-primary btn-block"
              disabled={resetting}
              style={{ borderRadius: 14, fontSize: 16, padding: '15px', opacity: resetting ? 0.7 : 1, marginTop: 8 }}>
              {resetting ? '⏳ Resetting...' : '🔑 Reset Password & Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
            Didn't receive code?{' '}
            <button onClick={() => setSent(false)} style={{ color: 'var(--primary)', fontWeight: 700 }}>Resend</button>
          </p>
        </div>
      )}
    </div>
  )
}
