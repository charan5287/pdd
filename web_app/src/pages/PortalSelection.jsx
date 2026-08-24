import React from 'react'
import { useNavigate } from 'react-router-dom'

const features = [
  { icon: '🤖', text: 'AI-powered prescription scanning' },
  { icon: '⏰', text: 'Smart medicine reminders' },
  { icon: '🚚', text: 'Express delivery tracking' },
  { icon: '📊', text: '24/7 AI health assistant' },
]

export default function PortalSelection() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', top: '10%', left: '20%',
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '10%',
        width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
            borderRadius: 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28,
            boxShadow: '0 8px 24px rgba(0,212,170,0.4)',
          }}>💊</div>
          <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>MediNow</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Choose how you want to continue</p>
      </div>

      {/* Portal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
        {/* Patient */}
        <div
          id="portal-patient-btn"
          className="portal-card patient"
          onClick={() => navigate('/login?role=user')}
        >
          <div style={{
            width: 72, height: 72, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05))',
            border: '1px solid rgba(0,212,170,0.25)',
            borderRadius: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
          }}>👤</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            I'm a Patient
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Manage medicines, scan prescriptions, set reminders & track orders
          </p>
          <div style={{
            marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,212,170,0.12)', borderRadius: 20, padding: '6px 14px',
            color: 'var(--primary)', fontSize: 13, fontWeight: 700,
          }}>
            Continue as Patient →
          </div>
        </div>

        {/* Pharmacy */}
        <div
          id="portal-pharmacy-btn"
          className="portal-card pharmacy"
          onClick={() => navigate('/login?role=pharmacy')}
        >
          <div style={{
            width: 72, height: 72, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
          }}>🏥</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            I'm a Pharmacy
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Manage inventory, process orders & update medicine availability
          </p>
          <div style={{
            marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.12)', borderRadius: 20, padding: '6px 14px',
            color: 'var(--accent)', fontSize: 13, fontWeight: 700,
          }}>
            Continue as Pharmacy →
          </div>
        </div>
      </div>

      {/* Feature list */}
      <div style={{
        marginTop: 32, background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20, padding: '20px 24px',
        width: '100%', maxWidth: 360, position: 'relative', zIndex: 1,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Trusted by thousands
        </p>
        {features.map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{f.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.text}</span>
          </div>
      </div>

      {/* Download Android App */}
      <div style={{
        marginTop: 20,
        textAlign: 'center',
        zIndex: 1,
        width: '100%',
        maxWidth: 360,
      }}>
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/apk`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
            color: '#080F1A',
            textDecoration: 'none',
            padding: '14px 20px',
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(0,212,170,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🤖</span>
          Download Android App (MediNow.apk)
        </a>
      </div>
    </div>
  )
}
