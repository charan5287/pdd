import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PortalSelection() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F8FF 0%, #EEF2FF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
        }}>
          <div style={{
            width: 52,
            height: 52,
            background: '#3B5EF8',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
          }}>
            ❤️
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#1A1A2E' }}>MediNow</span>
        </div>
        <p style={{ color: '#64748B', fontSize: 15 }}>Choose how you want to continue</p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 340 }}>
        {/* Patient */}
        <div
          className="portal-card patient"
          onClick={() => navigate('/login?role=user')}
          id="portal-patient-btn"
          style={{
            background: 'linear-gradient(135deg, #EEF2FF, #D8E2FF)',
            borderRadius: 24,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B5EF8'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,94,248,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>👤</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>I'm a Patient</h3>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            Manage medicines, scan prescriptions, set reminders & track orders
          </p>
        </div>

        {/* Pharmacy */}
        <div
          className="portal-card pharmacy"
          onClick={() => navigate('/login?role=pharmacy')}
          id="portal-pharmacy-btn"
          style={{
            background: 'linear-gradient(135deg, #E6FFF7, #CCFFE8)',
            borderRadius: 24,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px solid transparent',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00C896'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,200,150,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏥</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>I'm a Pharmacy</h3>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
            Manage inventory, process orders & update medicine availability
          </p>
        </div>
      </div>

      {/* Footer features */}
      <div style={{
        marginTop: 40,
        background: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 340,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 12 }}>
          Join MediNow Today
        </p>
        {[
          'AI-powered prescription scanning',
          'Smart medicine reminders',
          'Fast delivery tracking',
          '24/7 AI health assistant',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#00C896', fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, color: '#64748B' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
