import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prescriptionAPI, smartAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function ScanPage({ onRefresh }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [adding, setAdding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const pickFile = (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }

  const scan = async () => {
    if (!file) return showToast('Please select an image first', 'error')
    setScanning(true)
    try {
      const res = await prescriptionAPI.scan(file)
      setResult(res.data)
      if (res.data.medicines?.length > 0) {
        showToast(`✅ Found ${res.data.medicines.length} medicine(s)!`, 'success')
      } else {
        showToast('No medicines detected. Try a clearer image.', 'warning')
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Scanning failed. Check your connection.', 'error')
    } finally {
      setScanning(false)
    }
  }

  const addAllToInventory = async () => {
    if (!result?.medicines?.length) return
    setAdding(true)
    try {
      for (const med of result.medicines) {
        await smartAPI.addToInventory({
          user_id: user.id,
          medicine_name: med.display_name || med.name,
          quantity: med.duration_days || 30,
          daily_dosage: med.frequency_per_day || 1,
        })
        // Also save reminders
        for (const time of (med.timings || ['08:00'])) {
          await smartAPI.saveReminder({
            user_id: user.id,
            medicine_name: med.display_name || med.name,
            dosage: med.dosage || '1 dose',
            time,
          })
        }
      }
      showToast('All medicines added to inventory + reminders set! 🎉', 'success')
      onRefresh()
      navigate('/medicines')
    } catch {
      showToast('Failed to add some medicines', 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 28px', borderRadius: '0 0 32px 32px',
      }}>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 6 }}>📷 Scan Prescription</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
          AI-powered prescription analysis
        </p>
      </div>

      <div style={{ padding: '20px 20px' }}>
        {/* Upload zone */}
        <div
          className={`scan-zone${dragging ? ' dragging' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          id="prescription-upload-zone"
          style={{ marginBottom: 16 }}
        >
          {preview ? (
            <img src={preview} alt="Preview" style={{ maxHeight: 220, borderRadius: 12, objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>📋</span>
              <div style={{ fontWeight: 700, color: '#3B5EF8', fontSize: 16 }}>
                Tap to upload or drag & drop
              </div>
              <div style={{ color: '#94A3B8', fontSize: 13 }}>JPG, PNG up to 10MB</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            id="prescription-file-input"
            onChange={e => pickFile(e.target.files[0])} />
        </div>

        {/* Info card */}
        {!result && (
          <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>How it works</div>
            {[
              ['🔍', 'AI reads your prescription image'],
              ['💊', 'Extracts all medicine names & dosages'],
              ['⏰', 'Creates automatic reminders for each medicine'],
              ['📦', 'Adds to your inventory automatically'],
            ].map(([ic, txt]) => (
              <div key={txt} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{ic}</span>
                <span style={{ fontSize: 13, color: '#64748B' }}>{txt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scan Button */}
        {file && !result && (
          <button id="scan-btn"
            className="btn btn-primary btn-block"
            onClick={scan}
            disabled={scanning}
            style={{ borderRadius: 14, fontSize: 16, padding: '15px', marginBottom: 12, opacity: scanning ? 0.7 : 1 }}>
            {scanning ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⏳</span>
                &nbsp;AI Scanning...
              </>
            ) : '🔍 Analyze Prescription'}
          </button>
        )}

        {/* Scanning animation */}
        {scanning && (
          <div style={{
            background: 'white', borderRadius: 16, padding: 24, textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 48, animation: 'bounce 1s infinite', marginBottom: 12 }}>🔬</div>
            <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>Analyzing your prescription...</div>
            <div style={{ color: '#94A3B8', fontSize: 13 }}>AI is reading the handwriting and extracting medicines</div>
            <div style={{ marginTop: 16, height: 4, background: '#EEF2FF', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg, #3B5EF8, #42A5F5)',
                borderRadius: 2, width: '60%',
                animation: 'slide 1.5s ease-in-out infinite alternate',
              }} />
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="fade-in">
            {/* Status */}
            <div style={{
              background: result.medicines?.length > 0 ? '#E6FFF7' : '#FFF3E0',
              borderRadius: 16, padding: 16, marginBottom: 16,
              border: `1px solid ${result.medicines?.length > 0 ? 'rgba(0,200,150,0.3)' : 'rgba(255,152,0,0.3)'}`,
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <span style={{ fontSize: 28 }}>{result.medicines?.length > 0 ? '✅' : '⚠️'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: result.medicines?.length > 0 ? '#007A5E' : '#B26500' }}>
                  {result.status === 'success' ? `Found ${result.medicines.length} medicine(s)` : 'Scan Complete'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{result.message}</div>
              </div>
            </div>

            {/* Medicine list */}
            {result.medicines?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E', marginBottom: 14 }}>
                  💊 Detected Medicines
                </div>
                {result.medicines.map((med, i) => (
                  <div key={i} style={{
                    background: '#F5F8FF', borderRadius: 14, padding: 14, marginBottom: 10,
                    border: '1px solid #EEF2FF',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{med.display_name || med.name}</div>
                      {med.dosage && <span className="badge badge-blue">{med.dosage}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {med.frequency && (
                        <span style={{ fontSize: 12, color: '#64748B' }}>🕐 {med.frequency}</span>
                      )}
                      {med.duration_days && (
                        <span style={{ fontSize: 12, color: '#64748B' }}>📅 {med.duration_days} days</span>
                      )}
                      {med.instructions && (
                        <span style={{ fontSize: 12, color: '#64748B' }}>📋 {med.instructions}</span>
                      )}
                    </div>
                    {med.purpose && (
                      <div style={{ fontSize: 12, color: '#9C27B0', marginTop: 4 }}>Purpose: {med.purpose}</div>
                    )}
                  </div>
                ))}

                <button id="add-all-inventory-btn"
                  className="btn btn-primary btn-block"
                  onClick={addAllToInventory}
                  disabled={adding}
                  style={{ borderRadius: 12, marginTop: 8, opacity: adding ? 0.7 : 1 }}>
                  {adding ? '⏳ Adding...' : '➕ Add All to Inventory & Set Reminders'}
                </button>
              </div>
            )}

            {/* Reset */}
            <button id="scan-again-btn"
              className="btn btn-outline btn-block"
              onClick={() => { setFile(null); setPreview(null); setResult(null) }}
              style={{ borderRadius: 14 }}>
              📷 Scan Another Prescription
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes slide { from { margin-left: 0%; } to { margin-left: 40%; } }
      `}</style>
    </div>
  )
}
