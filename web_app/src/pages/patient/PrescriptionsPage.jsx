import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { prescriptionAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    prescriptionAPI.getHistory(user.id)
      .then(res => setPrescriptions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20 }}>←</button>
            <div>
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>📋 Prescriptions</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Your prescription history</p>
            </div>
          </div>
          <button id="scan-new-prescription-btn" className="icon-btn"
            onClick={() => navigate('/scan')}>📷</button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Scan shortcut */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF, #D0DBFD)',
          borderRadius: 20, padding: 20, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
        }} onClick={() => navigate('/scan')}>
          <div style={{ fontSize: 40 }}>📷</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Scan New Prescription</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>AI will extract medicines automatically</div>
          </div>
          <span style={{ color: '#3B5EF8', fontSize: 20 }}>›</span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No prescriptions yet</h3>
            <p>Scan your first prescription using the camera button above</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {prescriptions.map((rx, i) => {
              const date = new Date(rx.created_at)
              const isActive = (Date.now() - date.getTime()) < 30 * 24 * 60 * 60 * 1000
              return (
                <div key={rx.id} className="card" id={`prescription-${rx.id}`}
                  style={{ cursor: 'pointer', padding: 18 }}
                  onClick={() => setSelected(rx)}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, background: '#EEF2FF', borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>📋</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>
                        Prescription #{rx.id}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        📅 {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        💊 {rx.medicines?.length || 0} medicine{rx.medicines?.length !== 1 ? 's' : ''} detected
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}>
                      {isActive ? 'Active' : 'Expired'}
                    </span>
                  </div>

                  {rx.medicines?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {rx.medicines.slice(0, 3).map((m, j) => (
                        <span key={j} style={{
                          background: '#F5F8FF', border: '1px solid #E2E8F0',
                          borderRadius: 8, padding: '3px 10px', fontSize: 11, color: '#64748B',
                        }}>
                          {m.display_name || m.name}
                        </span>
                      ))}
                      {rx.medicines.length > 3 && (
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>+{rx.medicines.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Prescription detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Prescription #{selected.id}</h3>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ fontSize: 20, color: '#94A3B8' }}>✕</button>
            </div>

            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#1A1A2E' }}>
              Prescribed Medicines
            </div>
            {selected.medicines?.map((med, i) => (
              <div key={i} style={{
                background: '#F5F8FF', borderRadius: 14, padding: 14, marginBottom: 10,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 36, height: 36, background: '#3B5EF8', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>
                    {med.display_name || med.name}
                  </div>
                  {med.dosage && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>💊 {med.dosage}</div>
                  )}
                  {med.frequency && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>🕐 {med.frequency}</div>
                  )}
                  {med.instructions && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>📋 {med.instructions}</div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1, borderRadius: 12 }}
                onClick={() => { navigate('/scan'); setSelected(null) }}>
                📷 Scan Again
              </button>
              <button id="close-prescription-btn"
                className="btn btn-primary" style={{ flex: 1, borderRadius: 12 }}
                onClick={() => setSelected(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
