import React, { useState, useEffect } from 'react'
import { smartAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night']
const SLOT_TIMES = { Morning: ['06:00','07:00','08:00','09:00','10:00'], Afternoon: ['12:00','13:00','14:00'], Evening: ['17:00','18:00','19:00'], Night: ['20:00','21:00','22:00'] }
const SLOT_ICONS = { Morning: '🌅', Afternoon: '☀️', Evening: '🌇', Night: '🌙' }

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

  // Today's adherence
  const active = reminders.filter(r => r.is_active)
  const taken = reminders.filter(r => r.last_taken && new Date(r.last_taken).toDateString() === new Date().toDateString())
  const adherencePct = active.length > 0 ? Math.round((taken.length / active.length) * 100) : 0

  // Group by slot
  const grouped = TIME_SLOTS.reduce((acc, slot) => {
    acc[slot] = reminders.filter(r => getSlot(r.time) === slot)
    return acc
  }, {})

  // Weekly data (mock for now)
  const days = ['M','T','W','T','F','S','S']
  const weeklyData = [100, 100, 100, adherencePct, 0, 0, 0]

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>⏰ Medicine Reminders</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Today's medication schedule</p>
          </div>
          <button id="add-reminder-btn" className="icon-btn" onClick={() => setShowModal(true)}>➕</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Adherence card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Today's Adherence</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: adherencePct >= 80 ? '#00C896' : adherencePct >= 60 ? '#FF9800' : '#3B5EF8' }}>
              {adherencePct}%
            </span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${adherencePct}%`, background: adherencePct >= 80 ? '#00C896' : '#3B5EF8' }} />
          </div>
          <div style={{ fontSize: 13, color: '#64748B' }}>{taken.length} of {active.length} doses taken</div>
        </div>

        {/* Weekly progress */}
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📅 This Week's Progress</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {days.map((day, i) => {
              const pct = weeklyData[i]
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    background: pct === 100 ? '#3B5EF8' : pct === 0 ? '#EEF2FF' : '#E8F5E9',
                    borderRadius: 10, padding: '8px 0',
                    color: pct === 100 ? 'white' : pct === 0 ? '#94A3B8' : '#1A1A2E',
                    fontWeight: 700, fontSize: 11,
                  }}>
                    <div style={{ fontSize: 9, marginBottom: 2 }}>{day}</div>
                    <div>{pct > 0 ? `${pct}` : '-'}{pct > 0 ? '%' : ''}</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>{SLOT_ICONS[slot]}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{slot}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slotReminders.map(r => {
                    const isTaken = r.last_taken && new Date(r.last_taken).toDateString() === new Date().toDateString()
                    return (
                      <div key={r.id} className={`reminder-item${isTaken ? ' taken' : ''}`}
                        id={`reminder-${r.id}`}>
                        <div
                          className={`reminder-check${isTaken ? ' checked' : ''}`}
                          onClick={() => toggleReminder(r.id)}
                        >
                          {isTaken && <span style={{ fontSize: 14 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600, fontSize: 14, color: '#1A1A2E',
                            textDecoration: isTaken ? 'line-through' : 'none',
                          }}>
                            💊 {r.medicine_name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{r.dosage} · {r.time}</div>
                        </div>
                        {isTaken ? (
                          <span className="badge badge-green">Taken</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button id={`toggle-reminder-${r.id}`}
                              onClick={() => toggleReminder(r.id)}
                              style={{
                                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                background: r.is_active ? '#EEF2FF' : '#F1F5F9',
                                color: r.is_active ? '#3B5EF8' : '#94A3B8',
                              }}>
                              {r.is_active ? 'Active' : 'Off'}
                            </button>
                            <button id={`delete-reminder-${r.id}`}
                              onClick={() => deleteReminder(r.id)}
                              style={{
                                padding: '4px 8px', borderRadius: 8, fontSize: 11,
                                background: '#FFEBEE', color: '#C62828',
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
              <button onClick={() => setShowModal(false)} style={{ fontSize: 20, color: '#94A3B8' }}>✕</button>
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
              {/* Quick time presets */}
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>Quick Time Presets</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['08:00','12:00','18:00','22:00'].map(t => (
                    <button key={t}
                      onClick={() => setForm(f => ({ ...f, time: t }))}
                      style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: form.time === t ? '#3B5EF8' : '#EEF2FF',
                        color: form.time === t ? 'white' : '#3B5EF8',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1, borderRadius: 12 }}
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button id="save-reminder-btn"
                  className="btn btn-primary" style={{ flex: 1, borderRadius: 12 }}
                  onClick={saveReminder}>Save Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
