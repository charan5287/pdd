import React from 'react'

const EMERGENCY_NUMBERS = [
  { name: 'Ambulance', number: '108', icon: '🚑', color: '#FF5252', bg: '#FFEBEE' },
  { name: 'Police', number: '100', icon: '👮', color: '#3B5EF8', bg: '#EEF2FF' },
  { name: 'Fire', number: '101', icon: '🚒', color: '#FF9800', bg: '#FFF3E0' },
  { name: 'Disaster', number: '108', icon: '⚠️', color: '#6A1B9A', bg: '#F3E5F5' },
]

const FIRST_AID = [
  {
    title: 'Chest Pain / Heart Attack',
    steps: [
      'Call 108 immediately',
      'Have the person sit or lie down comfortably',
      'Loosen tight clothing',
      'Give aspirin if not allergic (325mg)',
      'Begin CPR if unconscious and not breathing',
    ],
  },
  {
    title: 'Severe Bleeding',
    steps: [
      'Apply firm pressure with a clean cloth',
      'Do not remove the cloth — add more on top',
      'Elevate the injured limb if possible',
      'Call emergency services',
    ],
  },
  {
    title: 'Choking',
    steps: [
      'Encourage them to cough',
      'Give 5 back blows between shoulder blades',
      'Perform Heimlich maneuver if needed',
      'Call 108 if not resolved quickly',
    ],
  },
  {
    title: 'Allergic Reaction',
    steps: [
      'Use EpiPen if available',
      'Call 108 immediately for severe reactions',
      'Have them sit up if breathing is difficult',
      'Loosen tight clothing',
    ],
  },
]

export default function EmergencyPage() {
  const call = (number) => {
    window.location.href = `tel:${number}`
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #FF5252, #D32F2F)',
        padding: '52px 24px 28px', borderRadius: '0 0 32px 32px',
      }}>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>
          🆘 Emergency SOS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
          Quick access to emergency services & first aid
        </p>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Emergency numbers */}
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1A1A2E', marginBottom: 12 }}>
          📞 Emergency Numbers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {EMERGENCY_NUMBERS.map(n => (
            <button key={n.name} id={`emergency-${n.name.toLowerCase()}-btn`}
              onClick={() => call(n.number)}
              style={{
                background: n.bg, borderRadius: 20, padding: '20px 16px',
                textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${n.color}22`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>{n.icon}</div>
              <div style={{ fontWeight: 800, color: n.color, fontSize: 20 }}>{n.number}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{n.name}</div>
            </button>
          ))}
        </div>

        {/* First aid guides */}
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1A1A2E', marginBottom: 12 }}>
          🩺 First Aid Guide
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FIRST_AID.map((guide, i) => {
            const [open, setOpen] = React.useState(false)
            return (
              <div key={i} style={{
                background: 'white', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <button id={`first-aid-${i}`}
                  onClick={() => setOpen(o => !o)}
                  style={{
                    width: '100%', padding: '16px 18px', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    fontWeight: 700, fontSize: 14, color: '#1A1A2E', textAlign: 'left',
                  }}>
                  <span>🚨 {guide.title}</span>
                  <span style={{ color: '#94A3B8', fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ∨
                  </span>
                </button>
                {open && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #F1F5F9' }}>
                    {guide.steps.map((step, j) => (
                      <div key={j} style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <span style={{
                          width: 22, height: 22, background: '#FF5252', borderRadius: '50%',
                          color: 'white', fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{j + 1}</span>
                        <span style={{ fontSize: 13, color: '#1A1A2E', lineHeight: 1.6 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Disclaimer */}
        <div style={{
          background: '#FFF3E0', border: '1px solid rgba(255,152,0,0.3)',
          borderRadius: 14, padding: 14, marginTop: 20, marginBottom: 32,
        }}>
          <div style={{ fontWeight: 700, color: '#B26500', fontSize: 13, marginBottom: 6 }}>⚠️ Disclaimer</div>
          <div style={{ fontSize: 12, color: '#B26500', lineHeight: 1.6 }}>
            This information is for general guidance only. Always call emergency services for life-threatening situations. Do not delay professional medical help.
          </div>
        </div>
      </div>
    </div>
  )
}
