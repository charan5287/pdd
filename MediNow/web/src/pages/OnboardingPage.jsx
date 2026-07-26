import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const slides = [
  {
    icon: '🚚',
    iconBg: '#3B5EF8',
    title: 'Fast Medicine Delivery',
    desc: 'Get your medicines delivered to your doorstep within hours. Track your order in real-time.',
  },
  {
    icon: '🔍',
    iconBg: '#3B5EF8',
    title: 'AI Prescription Scanning',
    desc: 'Simply scan your prescription and our AI will automatically extract and verify medicine details.',
  },
  {
    icon: '🔔',
    iconBg: '#22C55E',
    title: 'Smart Medicine Reminders',
    desc: 'Never miss a dose. Get timely reminders and track your medication adherence effortlessly.',
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const next = () => {
    if (current < slides.length - 1) setCurrent(c => c + 1)
    else navigate('/portal')
  }
  const skip = () => navigate('/portal')

  const slide = slides[current]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      padding: '24px',
    }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={skip} style={{
          color: '#64748B',
          fontSize: 15,
          fontWeight: 500,
          padding: '6px 12px',
          borderRadius: 8,
        }}>
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: '40px 0',
      }}>
        <div style={{
          width: 120,
          height: 120,
          background: slide.iconBg,
          borderRadius: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
          boxShadow: `0 16px 40px ${slide.iconBg}44`,
          animation: 'fadeIn 0.4s ease',
        }}>
          {slide.icon}
        </div>

        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#1A1A2E',
            marginBottom: 16,
            lineHeight: 1.2,
          }}>
            {slide.title}
          </h1>
          <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7 }}>
            {slide.desc}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {slides.map((_, i) => (
          <div key={i} onClick={() => setCurrent(i)} style={{
            height: 8,
            width: i === current ? 28 : 8,
            borderRadius: 4,
            background: i === current ? '#3B5EF8' : '#E2E8F0',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }} />
        ))}
      </div>

      {/* Next / Get Started */}
      <button onClick={next} className="btn btn-primary btn-block" style={{
        fontSize: 16,
        padding: '16px 24px',
        borderRadius: 16,
      }}>
        {current < slides.length - 1 ? (
          <>Next &nbsp;›</>
        ) : (
          <>Get Started &nbsp;›</>
        )}
      </button>
    </div>
  )
}
