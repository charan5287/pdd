import React, { useState, useEffect } from 'react'
import { smartAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night']
const SLOT_TIMES = { Morning: ['06:00','07:00','08:00','09:00','10:00'], Afternoon: ['12:00','13:00','14:00'], Evening: ['17:00','18:00','19:00'], Night: ['20:00','21:00','22:00'] }
const SLOT_ICONS  = { Morning: '🌅', Afternoon: '☀️', Evening: '🌇', Night: '🌙' }
const SLOT_COLORS = { Morning: '#F59E0B', Afternoon: '#60A5FA', Evening: '#7C3AED', Night: '#00D4AA' }

function getSlot(time) {
  const h = parseInt(time?.split(':')[0] || '8', 10)
  if (h < 11) return 'Morning'
  if (h < 16) return 'Afternoon'
  if (h < 20) return 'Evening'
  return 'Night'
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ medicine_name: '', dosage: '1 dose', time: '08:00' })
  const { user } = useAuth()
  const { showToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await smartAPI.getReminders(user.id)
      setReminders(res.data)
    } catch { showToast('Failed to load reminders', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user.id])

  const toggleReminder = async (id) => {
    try {
      await smartAPI.toggleReminder(id)
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r))
    } catch { showToast('Failed to toggle reminder', 'error') }
  }

  const deleteReminder = async (id) => {
    try {
      await smartAPI.deleteReminder(id)
      setReminders(prev => prev.filter(r => r.id !== id))
      showToast('Reminder deleted', 'success')
    } catch { showToast('Failed to delete reminder', 'error') }
  }

  const saveReminder = async () => {
    if (!form.medicine_name) return showToast('Enter medicine name', 'error')
    try {
      await smartAPI.saveReminder({ user_id: user.id, ...form })
      showToast('Reminder saved! 🔔', 'success')
      setShowModal(false)
      setForm({ medicine_name: '', dosage: '1 dose', time: '08:00' })
      load()
    } catch { showToast('Failed to save reminder', 'error') }
  }

  const active = reminders.filter(r => r.is_active)
  const taken  = reminders.filter(r => r.last_taken && new Date(r.last_taken).toDateString() === new Date().toDateString())
  const adherencePct = active.length > 0 ? Math.round((taken.length / active.length) * 100) : 0
  const adherenceColor = adherencePct >= 80 ? '#00D4AA' : adherencePct >= 60 ? '#F59E0B' : '#FF4B6E'

  const grouped = TIME_SLOTS.reduce((acc, slot) => {
    acc[slot] = reminders.filter(r => getSlot(r.time) === slot)
    return acc
  }, {})

  const days = ['M','T','W','T','F','S','S']
  const weeklyData = [100, 100, 100, adherencePct, 0, 0, 0]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2A45 60%, #0A3D52 100%)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
        borderBottom: '1px solid rgba(0,212,170,0.12)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 22 }}>⏰ Reminders</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Today's medication schedule</p>
          </div>
          <button id="add-reminder-btn" className="icon-btn" onClick={() => setShowModal(true)}>➕</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Adherence Card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Today's Adherence</span>
            <span style={{ fontWeight: 900, fontSize: 24, color: adherenceColor, textShadow: `0 0 12px ${adherenceColor}50` }}>
              {adherencePct}%
            </span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{
              width: `${adherencePct}%`,
              background: `linear-gradient(90deg, ${adherenceColor}aa, ${adherenceColor})`,
            }} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{taken.length} of {active.length} doses taken</div>
        </div>

        {/* Weekly progress */}
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>📅 This Week</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {days.map((day, i) => {
              const pct = weeklyData[i]
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    background: pct === 100 ? 'linear-gradient(135deg, #00D4AA, #00A888)' : pct > 0 ? 'rgba(0,212,170,0.15)' : 'var(--surface)',
                    borderRadius: 10, padding: '9px 0',
                    color: pct === 100 ? '#070D1B' : pct > 0 ? '#00D4AA' : 'var(--text-muted)',
                    fontWeight: 800, fontSize: 11,
                    boxShadow: pct === 100 ? '0 0 10px rgba(0,212,170,0.35)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    <div style={{ fontSize: 9, marginBottom: 2 }}>{day}</div>
                    <div>{pct > 0 ? `${pct}%` : '–'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : reminders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No reminders yet</h3>
            <p>Add your first medicine reminder to stay on track</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 20, borderRadius: 12 }}>
              ➕ Add Reminder
            </button>
          </div>
        ) : (
          TIME_SLOTS.map(slot => {
            const slotReminders = grouped[slot]
            if (slotReminders.length === 0) return null
            return (
              <div key={slot} style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  padding: '10px 14px',
                  background: `rgba(${slot === 'Morning' ? '245,158,11' : slot === 'Afternoon' ? '96,165,250' : slot === 'Evening' ? '124,58,237' : '0,212,170'},0.08)`,
                  border: `1px solid ${SLOT_COLORS[slot]}25`,
                  borderRadius: 12,
                }}>
                  <span style={{ fontSize: 18 }}>{SLOT_ICONS[slot]}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: SLOT_COLORS[slot] }}>{slot}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    {slotReminders.length} medicine{slotReminders.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slotReminders.map(r => {
                    const isTaken = r.last_taken && new Date(r.last_taken).toDateString() === new Date().toDateString()
                    return (
                      <div key={r.id} className={`reminder-item${isTaken ? ' taken' : ''}`}
                        id={`reminder-${r.id}`}>
                        <div
                          className={`reminder-check${isTaken ? ' checked' : ''}`}
                          onClick={() => toggleReminder(r.id)}>
                          {isTaken && <span style={{ fontSize: 14 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600, fontSize: 14, color: isTaken ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: isTaken ? 'line-through' : 'none',
                          }}>
                            💊 {r.medicine_name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.dosage} · {r.time}</div>
                        </div>
                        {isTaken ? (
                          <span className="badge badge-green">✓ Taken</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button id={`toggle-reminder-${r.id}`}
                              onClick={() => toggleReminder(r.id)}
                              style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: r.is_active ? 'rgba(0,212,170,0.1)' : 'var(--surface)',
                                color: r.is_active ? 'var(--primary)' : 'var(--text-muted)',
                                border: `1px solid ${r.is_active ? 'rgba(0,212,170,0.2)' : 'var(--border)'}`,
                              }}>
                              {r.is_active ? 'Active' : 'Off'}
                            </button>
                            <button id={`delete-reminder-${r.id}`}
                              onClick={() => deleteReminder(r.id)}
                              style={{
                                padding: '5px 8px', borderRadius: 8, fontSize: 11,
                                background: 'rgba(255,75,110,0.1)', color: 'var(--red)',
                                border: '1px solid rgba(255,75,110,0.2)',
                              }}>
                              🗑
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Reminder Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⏰ Add Reminder</h3>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Medicine Name *</label>
                <input id="reminder-medicine-name" className="input-field" placeholder="e.g., Paracetamol 500mg"
                  value={form.medicine_name}
                  onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Dosage</label>
                <input id="reminder-dosage" className="input-field" placeholder="e.g., 1 tablet"
                  value={form.dosage}
                  onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Time</label>
                <input id="reminder-time" type="time" className="input-field"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Presets
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[{ t: '08:00', l: '🌅 Morning' }, { t: '12:00', l: '☀️ Noon' }, { t: '18:00', l: '🌇 Evening' }, { t: '22:00', l: '🌙 Night' }].map(({ t, l }) => (
                    <button key={t}
                      onClick={() => setForm(f => ({ ...f, time: t }))}
                      style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: form.time === t ? 'linear-gradient(135deg, #00D4AA, #00A888)' : 'var(--surface)',
                        color: form.time === t ? '#070D1B' : 'var(--text-secondary)',
                        border: `1px solid ${form.time === t ? 'transparent' : 'var(--border)'}`,
                        boxShadow: form.time === t ? '0 4px 12px rgba(0,212,170,0.3)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1, borderRadius: 12 }}
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button id="save-reminder-btn"
                  className="btn btn-primary" style={{ flex: 1, borderRadius: 12 }}
                  onClick={saveReminder}>🔔 Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
