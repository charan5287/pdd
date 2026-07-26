import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { smartAPI } from '../../api/client'

function AdherenceRing({ score, size = 130 }) {
  const r = (size - 14) / 2
  const cx = size / 2, cy = size / 2
  const sw = 12
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#00C896' : score >= 60 ? '#FF9800' : '#FF5252'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF2FF" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="22" fontWeight="800">{score}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94A3B8" fontSize="11">Adherence</text>
    </svg>
  )
}

export default function AdherencePage({ adherence }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [symptom, setSymptom] = useState('')
  const [severity, setSeverity] = useState('Low')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const score = adherence?.adherence_score || 0
  const riskLevel = adherence?.risk_level || 'N/A'
  const riskColor = adherence?.risk_color === 'green' ? '#00C896' : adherence?.risk_color === 'orange' ? '#FF9800' : '#FF5252'
  const medScores = adherence?.medicine_scores || []
  const insights = adherence?.insights || []
  const weekly = adherence?.weekly_data || []

  const handleLogSymptom = async (e) => {
    e.preventDefault()
    if (!symptom.strip()) {
      return showToast('Please enter a symptom name', 'error')
    }

    setSubmitting(true)
    try {
      await smartAPI.saveHealthLog({
        user_id: user.id,
        symptom,
        severity,
        notes
      })
      showToast('Symptom logged successfully! 🤒', 'success')
      setShowModal(false)
      setSymptom('')
      setSeverity('Low')
      setNotes('')
    } catch (err) {
      showToast('Failed to log symptom', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh', position: 'relative', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, margin: 0 }}>📊 Adherence Analytics</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>30-day medication tracking</p>
          </div>
        </div>
        <button id="view-doc-summary-btn" onClick={() => navigate('/doctor-summary')}
          style={{
            background: 'white', border: 'none', borderRadius: 12,
            padding: '10px 14px', color: '#0D47A1', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
          📄 Summary Report
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Main adherence ring card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <AdherenceRing score={score} />
            <div style={{ flex: 1 }}>
              {[
                ['Risk Level', riskLevel, riskColor],
                ['Doses Taken', adherence?.doses_taken ?? 0, '#00C896'],
                ['Doses Skipped', adherence?.doses_skipped ?? 0, '#FF5252'],
                ['Total Logged', adherence?.total_doses_logged ?? 0, '#3B5EF8'],
              ].map(([label, val, color]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #F1F5F9',
                }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly chart */}
        {weekly.length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📅 Weekly Performance</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
              {weekly.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>
                    {d.percentage > 0 ? `${Math.round(d.percentage)}%` : ''}
                  </div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', minHeight: 6,
                    height: `${Math.max(6, d.percentage * 0.8)}px`,
                    background: d.percentage >= 80 ? '#3B5EF8' : d.percentage >= 60 ? '#42A5F5' : d.percentage > 0 ? '#FF9800' : '#EEF2FF',
                    transition: 'height 0.5s ease',
                  }} />
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{d.day}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="card" style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #F3E5F5, #EDE7F6)',
            border: '1px solid rgba(106,27,154,0.1)',
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 24 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, color: '#6A1B9A', fontSize: 15 }}>AI Health Insights</div>
                <div style={{ fontSize: 11, color: '#AB47BC' }}>Personalized behavioral analysis</div>
              </div>
            </div>
            {insights.map((ins, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 14, marginBottom: 8,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ color: '#9C27B0', fontSize: 16, marginTop: 1 }}>💡</span>
                <span style={{ fontSize: 13, color: '#4A148C', lineHeight: 1.6 }}>{ins}</span>
              </div>
            ))}
          </div>
        )}

        {/* Per-medicine scores */}
        {medScores.length > 0 && (
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>💊 Medicine Breakdown</div>
            {medScores.map((med, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{med.name}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{med.days_left}d left</span>
                    <span style={{
                      fontWeight: 700, fontSize: 14,
                      color: med.score >= 80 ? '#00C896' : med.score >= 60 ? '#FF9800' : '#FF5252',
                    }}>
                      {med.score}%
                    </span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill"
                    style={{
                      width: `${med.score}%`,
                      background: med.score >= 80 ? '#00C896' : med.score >= 60 ? '#FF9800' : '#FF5252',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!adherence && (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No data yet</h3>
            <p>Start tracking your doses to see analytics</p>
          </div>
        )}
      </div>

      {/* Floating Action Button for logging symptom */}
      <button id="log-symptom-fab" onClick={() => setShowModal(true)}
        style={{
          position: 'fixed', bottom: 84, right: 20,
          background: '#0D47A1', color: 'white', border: 'none', borderRadius: 30,
          padding: '14px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(13,71,161,0.3)', display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 90
        }}>
        🤒 Log Symptom
      </button>

      {/* Log Symptom Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, zIndex: 1000
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 450, padding: 24, background: 'white', borderRadius: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: '#1A1A2E', margin: 0 }}>Log Symptom / Side Effect</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8' }}>×</button>
            </div>
            <form onSubmit={handleLogSymptom} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Symptom Name</label>
                <input className="input-field" placeholder="e.g. Headache, Nausea, Dizziness"
                  value={symptom} onChange={e => setSymptom(e.target.value)} required />
              </div>

              <div className="input-group">
                <label className="input-label">Severity Level</label>
                <select className="input-field" value={severity} onChange={e => setSeverity(e.target.value)}
                  style={{ appearance: 'auto', background: 'white' }}>
                  <option value="Low">Low (Mild discomfort)</option>
                  <option value="Medium">Medium (Affecting activities)</option>
                  <option value="High">High (Severe pain/disruptive)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Additional Notes</label>
                <textarea className="input-field" placeholder="Describe when it started or details..." rows={3}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'none', padding: '12px' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: 14, background: '#F1F5F9', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 2, padding: 14, background: '#0D47A1', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
                  {submitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
