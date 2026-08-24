import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { smartAPI } from '../../api/client'

function AdherenceRing({ score }) {
  const r = 44, cx = 55, cy = 55, strokeW = 10
  const circumference = 2 * Math.PI * r
  const dash = (score / 100) * circumference
  const color = score >= 80 ? '#00D4AA' : score >= 60 ? '#F59E0B' : '#FF4B6E'

  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
      />
      <text x="55" y="50" textAnchor="middle" fill={color} fontSize="20" fontWeight="800">{score}%</text>
      <text x="55" y="66" textAnchor="middle" fill="#4A6480" fontSize="10">Score</text>
    </svg>
  )
}

export default function HomePage({ inventory, adherence, refills, expiries, loading, onRefresh }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const greetIcon = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'
  const name = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  const score = adherence?.adherence_score || 0
  const riskLevel = adherence?.risk_level || 'N/A'
  const riskColor = adherence?.risk_color === 'green' ? '#00D4AA' : adherence?.risk_color === 'orange' ? '#F59E0B' : '#FF4B6E'

  const handleTakeDose = async (med) => {
    try {
      await smartAPI.takeDose(user.id, med.medicine_name)
      showToast(`✅ ${med.medicine_name} marked as taken`, 'success')
      onRefresh()
    } catch {
      showToast('Failed to log dose', 'error')
    }
  }

  const quickActions = [
    { icon: '📷', title: 'Scan Rx', sub: 'Upload prescription', bg: 'rgba(0,212,170,0.1)', fg: '#00D4AA', border: 'rgba(0,212,170,0.2)', path: '/scan' },
    { icon: '📊', title: 'Adherence', sub: 'View analytics', bg: 'rgba(245,158,11,0.1)', fg: '#F59E0B', border: 'rgba(245,158,11,0.2)', path: '/adherence' },
    { icon: '⏰', title: 'Reminders', sub: 'Manage schedule', bg: 'rgba(124,58,237,0.1)', fg: '#7C3AED', border: 'rgba(124,58,237,0.2)', path: '/reminders' },
    { icon: '🤖', title: 'AI Assistant', sub: 'Ask health questions', bg: 'rgba(0,100,200,0.1)', fg: '#60A5FA', border: 'rgba(96,165,250,0.2)', path: '/chat' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ─── Header ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2A45 60%, #0A3D52 100%)',
        padding: '52px 24px 36px',
        borderRadius: '0 0 32px 32px',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid rgba(0,212,170,0.12)',
      }}>
        {/* Decorative glows */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #00D4AA, #00A888)',
              borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
              boxShadow: '0 4px 12px rgba(0,212,170,0.4)',
            }}>💊</div>
            <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 18 }}>MediNow</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="icon-btn" onClick={() => navigate('/reminders')} id="header-reminders-btn">⏰</button>
            <button className="icon-btn" onClick={() => navigate('/chat')} id="header-chat-btn">🤖</button>
          </div>
        </div>

        <div style={{ marginTop: 24, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{greetIcon}</span>
            <p style={{ color: 'rgba(139,163,199,0.9)', fontSize: 14, margin: 0 }}>{greeting}</p>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 900, marginBottom: 6 }}>
            Hello, {name}! 👋
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
              borderRadius: 20, padding: '5px 12px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
              <span style={{ color: '#00D4AA', fontSize: 12, fontWeight: 700 }}>{inventory.length} medicines tracked</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px', marginTop: -16 }}>
        {/* ─── Adherence Hero ─── */}
        <div className="card fade-in" onClick={() => navigate('/adherence')}
          style={{ marginBottom: 16, cursor: 'pointer', padding: 20, borderColor: 'rgba(0,212,170,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>Adherence Overview</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 30 days</span>
            </div>
            <span style={{ color: 'var(--primary)', fontSize: 18 }}>›</span>
          </div>
          {loading ? (
            <div className="loading-center" style={{ minHeight: 100 }}><div className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <AdherenceRing score={score} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Risk Level', riskLevel, riskColor],
                  ['Doses Taken', adherence?.doses_taken ?? 0, '#00D4AA'],
                  ['Doses Skipped', adherence?.doses_skipped ?? 0, '#FF4B6E'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}</span>
                  </div>
                ))}
                <div style={{
                  background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                  borderRadius: 20, padding: '5px 10px',
                  fontSize: 11, color: 'var(--primary)', fontWeight: 700, width: 'fit-content',
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
            width: 48, height: 48, background: 'rgba(255,255,255,0.15)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🆘</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Emergency SOS</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Ambulance · Hospital · Quick Dial</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 20 }}>›</span>
        </div>

        {/* ─── Alerts ─── */}
        {(refills.length > 0 || expiries.length > 0) && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">⚠️ Alerts</span>
            </div>
            {refills.slice(0, 2).map((a, i) => (
              <div key={i} className="alert-card orange">
                <span style={{ fontSize: 20 }}>🔄</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 13 }}>Refill Needed</div>
                  <div style={{ color: 'rgba(245,158,11,0.8)', fontSize: 12 }}>{a.medicine_name}: {a.message}</div>
                </div>
              </div>
            ))}
            {expiries.slice(0, 2).map((a, i) => (
              <div key={i} className="alert-card red">
                <span style={{ fontSize: 20 }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#FF4B6E', fontSize: 13 }}>Expires Soon</div>
                  <div style={{ color: 'rgba(255,75,110,0.8)', fontSize: 12 }}>{a.medicine_name} expires in {a.days_until_expiry} days</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── AI Insights ─── */}
        {adherence?.insights?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-header">
              <span className="section-title">🤖 AI Insights</span>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(92,33,185,0.05))',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 20, padding: 20,
              boxShadow: '0 0 20px rgba(124,58,237,0.1)',
            }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#A78BFA', fontSize: 14 }}>AI Health Insights</div>
                  <div style={{ fontSize: 11, color: 'rgba(167,139,250,0.7)' }}>Based on your 30-day data</div>
                </div>
              </div>
              {adherence.insights.slice(0, 2).map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#7C3AED', fontSize: 14 }}>•</span>
                  <span style={{ fontSize: 13, color: '#C4B5FD', lineHeight: 1.5 }}>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Quick Actions ─── */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title">⚡ Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {quickActions.map(item => (
              <div key={item.path} className="quick-action-card" onClick={() => navigate(item.path)}
                id={`quick-action-${item.title.toLowerCase().replace(/ /g, '-')}`}
                style={{ background: item.bg, borderColor: item.border }}>
                <div className="quick-action-icon" style={{ background: `${item.fg}18`, border: `1px solid ${item.fg}30` }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
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
              <span className="section-title">💊 Today's Medicines</span>
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
                    <div className="med-icon" style={{
                      background: isLow ? 'rgba(255,75,110,0.1)' : 'rgba(0,212,170,0.1)',
                      border: `1px solid ${isLow ? 'rgba(255,75,110,0.2)' : 'rgba(0,212,170,0.2)'}`,
                    }}>
                      <span style={{ fontSize: 22 }}>{isLow ? '⚠️' : '💊'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{med.medicine_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{qty} left · {daily}/day · {daysLeft} days</div>
                      <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: isLow ? 'linear-gradient(90deg, #CC2244, #FF4B6E)' : 'linear-gradient(90deg, #00A888, #00D4AA)',
                          width: `${Math.min(100, (qty / 30) * 100)}%`,
                          transition: 'width 0.5s ease',
                          boxShadow: `0 0 6px ${isLow ? 'rgba(255,75,110,0.4)' : 'rgba(0,212,170,0.4)'}`,
                        }} />
                      </div>
                    </div>
                    <button onClick={() => handleTakeDose(med)} style={{
                      background: 'rgba(0,212,170,0.12)', color: 'var(--primary)',
                      border: '1px solid rgba(0,212,170,0.25)',
                      borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.2s',
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
              <span className="section-title">📈 This Week</span>
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
            <button className="btn btn-primary" onClick={() => navigate('/scan')}
              style={{ marginTop: 20, borderRadius: 12 }}>
              📷 Scan Prescription
            </button>
          </div>
        )}

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}
