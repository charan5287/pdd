import React from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    icon: '🤖',
    title: 'AI-Powered Health',
    subtitle: 'Scan prescriptions instantly with our AI engine — no manual entry needed',
    gradient: 'linear-gradient(135deg, #00D4AA22, #00A88808)',
    glow: '#00D4AA',
  },
  {
    icon: '⏰',
    title: 'Smart Reminders',
    subtitle: 'Never miss a dose. Intelligent scheduling adapts to your routine',
    gradient: 'linear-gradient(135deg, #7C3AED22, #5B21B608)',
    glow: '#7C3AED',
  },
  {
    icon: '🚚',
    title: 'Express Delivery',
    subtitle: 'Medicines at your door in 30 minutes. Track in real-time',
    gradient: 'linear-gradient(135deg, #F59E0B22, #D9770608)',
    glow: '#F59E0B',
  },
  {
    icon: '📊',
    title: 'Health Analytics',
    subtitle: 'Deep insights into your adherence. Share reports with your doctor',
    gradient: 'linear-gradient(135deg, #FF4B6E22, #CC224408)',
    glow: '#FF4B6E',
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = React.useState(0)
  const navigate = useNavigate()
  const slide = slides[current]

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
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: `radial-gradient(circle, ${slide.glow}18 0%, transparent 70%)`,
        borderRadius: '50%', transition: 'background 0.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, #00D4AA, #00A888)',
          borderRadius: 24, margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, boxShadow: '0 8px 32px rgba(0,212,170,0.4)',
          animation: 'float 3s ease-in-out infinite',
        }}>💊</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>MediNow</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Your Smart Health Companion</p>
      </div>

      {/* Slide Card */}
      <div key={current} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 32, padding: '40px 32px',
        width: '100%', maxWidth: 380,
        textAlign: 'center',
        animation: 'fadeIn 0.4s ease',
        position: 'relative', zIndex: 1,
        boxShadow: `0 0 40px ${slide.glow}15, 0 8px 40px rgba(0,0,0,0.4)`,
        borderColor: `${slide.glow}30`,
      }}>
        <div style={{
          width: 96, height: 96,
          background: slide.gradient,
          borderRadius: 28, margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
          border: `1px solid ${slide.glow}30`,
        }}>{slide.icon}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          {slide.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
          {slide.subtitle}
        </p>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, margin: '28px 0', zIndex: 1 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{
            width: i === current ? 28 : 8, height: 8,
            borderRadius: 4,
            background: i === current ? 'var(--primary)' : 'var(--surface)',
            transition: 'all 0.3s ease',
            boxShadow: i === current ? '0 0 10px rgba(0,212,170,0.5)' : 'none',
          }} />
        ))}
      </div>

      {/* Actions */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 1 }}>
        {current < slides.length - 1 ? (
          <>
            <button className="btn btn-primary btn-block" style={{ borderRadius: 16, fontSize: 16, padding: 16 }}
              onClick={() => setCurrent(c => c + 1)}>
              Next →
            </button>
            <button onClick={() => navigate('/portal')}
              style={{ color: 'var(--text-muted)', fontSize: 14, padding: 12 }}>
              Skip to App
            </button>
          </>
        ) : (
          <>
            <button id="onboarding-get-started" className="btn btn-primary btn-block"
              style={{ borderRadius: 16, fontSize: 16, padding: 16 }}
              onClick={() => navigate('/portal')}>
              🚀 Get Started
            </button>
            <button onClick={() => navigate('/login')}
              style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 12 }}>
              Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign In</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
