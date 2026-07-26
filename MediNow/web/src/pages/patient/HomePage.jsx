import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { smartAPI } from '../../api/client'

function AdherenceRing({ score }) {
  const r = 44, cx = 55, cy = 55, strokeW = 10
  const circumference = 2 * Math.PI * r
  const dash = (score / 100) * circumference
  const color = score >= 80 ? '#00C896' : score >= 60 ? '#FF9800' : '#FF5252'

  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF2FF" strokeWidth={strokeW} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="20" fontWeight="800">{score}%</text>
      <text x="55" y="66" textAnchor="middle" fill="#94A3B8" fontSize="10">Score</text>
    </svg>
  )
}

export default function HomePage({ inventory, adherence, refills, expiries, loading, onRefresh }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const name = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const score = adherence?.adherence_score || 0
  const riskLevel = adherence?.risk_level || 'N/A'
  const riskColor = adherence?.risk_color === 'green' ? '#00C896' : adherence?.risk_color === 'orange' ? '#FF9800' : '#FF5252'

  const handleTakeDose = async (med) => {
    try {
      await smartAPI.takeDose(user.id, med.medicine_name)
      showToast(`✅ ${med.medicine_name} marked as taken`, 'success')
      onRefresh()
    } catch {
      showToast('Failed to log dose', 'error')
    }
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* ─── Header ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 32px',
        borderRadius: '0 0 36px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, background: 'rgba(255,255,255,0.06)', borderRadius: '50%'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'white', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>❤️</div>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>MediConnect</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={() => navigate('/reminders')} id="header-reminders-btn">⏰</button>
            <button className="icon-btn" onClick={() => navigate('/chat')} id="header-chat-btn">🤖</button>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800 }}>
            {greeting}, {name} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4 }}>
            {inventory.length} medicines tracked • Stay on schedule
          </p>
        </div>
      </div>

      <div style={{ padding: '0 20px', marginTop: -20 }}>
        {/* ─── Adherence Hero Card ─── */}
        <div className="card fade-in" onClick={() => navigate('/adherence')}
          style={{ marginBottom: 16, cursor: 'pointer', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E' }}>Adherence Overview</h3>
            <span style={{ color: '#94A3B8', fontSize: 14 }}>›</span>
          </div>
          {loading ? (
            <div className="loading-center" style={{ minHeight: 100 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <AdherenceRing score={score} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Risk Level', riskLevel, riskColor],
                  ['Doses Taken', adherence?.doses_taken ?? 0, '#00C896'],
                  ['Doses Skipped', adherence?.doses_skipped ?? 0, '#FF5252'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
                <div style={{
                  background: '#EEF2FF', borderRadius: 20, padding: '6px 12px',
                  fontSize: 11, color: '#3B5EF8', fontWeight: 700, width: 'fit-content',
                }}>
                  View Full Analytics →
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Emergency SOS ─── */}
        <div className="emergency-card fade-in" onClick={() => navigate('/emergency')}
          style={{ marginBottom: 16 }} id="emergency-sos-btn">
          <div style={{
            width: 48, height: 48, background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Emergency SOS</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Ambulance, Hospital, Quick Dial</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>›</span>
        </div>

        {/* ─── Alerts ─── */}
        {(refills.length > 0 || expiries.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">⚠️ Alerts</span>
            </div>
            {refills.slice(0, 2).map((a, i) => (
              <div key={i} className="alert-card orange" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🔄</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#B26500', fontSize: 13 }}>Refill Needed</div>
                  <div style={{ color: 'rgba(178,101,0,0.8)', fontSize: 12 }}>{a.medicine_name}: {a.message}</div>
                </div>
              </div>
            ))}
            {expiries.slice(0, 2).map((a, i) => (
              <div key={i} className="alert-card red" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#C62828', fontSize: 13 }}>Expires Soon</div>
                  <div style={{ color: 'rgba(198,40,40,0.8)', fontSize: 12 }}>{a.medicine_name} expires in {a.days_until_expiry} days</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── AI Insights ─── */}
        {adherence?.insights?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">AI Insights</span>
            </div>
            <div className="card" style={{
              background: 'linear-gradient(135deg, #F3E5F5, #EDE7F6)',
              border: '1px solid rgba(106,27,154,0.1)',
              padding: 20,
            }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#6A1B9A', fontSize: 14 }}>AI Health Insights</div>
                  <div style={{ fontSize: 11, color: '#AB47BC' }}>Based on your 30-day data</div>
                </div>
              </div>
              {adherence.insights.slice(0, 2).map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#9C27B0', fontSize: 14 }}>•</span>
                  <span style={{ fontSize: 13, color: '#4A148C', lineHeight: 1.5 }}>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title">Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '📷', title: 'Scan Rx', sub: 'Upload prescription', bg: '#EEF2FF', fg: '#3B5EF8', path: '/scan' },
              { icon: '📊', title: 'Adherence', sub: 'View analytics', bg: '#E8F5E9', fg: '#2E7D32', path: '/adherence' },
              { icon: '⏰', title: 'Reminders', sub: 'Manage schedule', bg: '#FFF3E0', fg: '#E65100', path: '/reminders' },
              { icon: '🤖', title: 'AI Assistant', sub: 'Ask health questions', bg: '#F3E5F5', fg: '#6A1B9A', path: '/chat' },
            ].map(item => (
              <div key={item.path} className="quick-action-card" onClick={() => navigate(item.path)}
                id={`quick-action-${item.title.toLowerCase().replace(' ', '-')}`}
                style={{ background: item.bg }}>
                <div className="quick-action-icon" style={{ background: item.fg }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                </div>
                <div>
                  <div className="quick-action-title">{item.title}</div>
                  <div className="quick-action-sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Today's Medicines ─── */}
        {inventory.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">Today's Medicines</span>
              <span className="section-link" onClick={() => navigate('/medicines')}>View All</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inventory.slice(0, 3).map(med => {
                const qty = med.quantity_remaining || 0
                const daily = med.daily_dosage || 1
                const daysLeft = Math.floor(qty / daily)
                const isLow = daysLeft <= 3
                return (
                  <div key={med.id} className="medicine-card" style={{ padding: '14px 16px' }}>
                    <div className="med-icon" style={{ background: isLow ? '#FFEBEE' : '#EEF2FF' }}>
                      <span style={{ fontSize: 22 }}>💊</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#1A1A2E' }}>{med.medicine_name}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{qty} left · {daily}/day · {daysLeft} days</div>
                      <div style={{ marginTop: 6, height: 4, background: '#EEF2FF', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: isLow ? '#FF5252' : '#3B5EF8',
                          width: `${Math.min(100, (qty / 30) * 100)}%`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                    <button onClick={() => handleTakeDose(med)}
                      style={{
                        background: '#EEF2FF', color: '#3B5EF8', borderRadius: 10,
                        padding: '6px 12px', fontSize: 12, fontWeight: 600,
                      }}>
                      Take
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── Weekly Chart ─── */}
        {adherence?.weekly_data?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="section-header">
              <span className="section-title">This Week's Progress</span>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div className="weekly-chart">
                {adherence.weekly_data.map((d, i) => (
                  <div key={i} className="weekly-bar-wrap">
                    <div className={`weekly-bar${d.percentage === 0 ? ' missed' : ''}`}
                      style={{ height: `${Math.max(6, d.percentage * 0.7)}px` }} />
                    <div className="weekly-day">{d.day}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && inventory.length === 0 && (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state-icon">💊</div>
            <h3>No medicines tracked yet</h3>
            <p>Scan a prescription or add medicines to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/scan')} style={{ marginTop: 20, borderRadius: 12 }}>
              📷 Scan Prescription
            </button>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
