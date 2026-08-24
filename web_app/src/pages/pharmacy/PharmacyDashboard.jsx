import React, { useState, useEffect } from 'react'
import { pharmacyAPI } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const STATUS_MAP = {
  placed:           { label: 'New Order',   color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  processing:       { label: 'Processing',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  out_for_delivery: { label: 'Delivering',  color: '#00D4AA', bg: 'rgba(0,212,170,0.1)' },
  delivered:        { label: 'Delivered',   color: '#00D4AA', bg: 'rgba(0,212,170,0.1)' },
  cancelled:        { label: 'Cancelled',   color: '#FF4B6E', bg: 'rgba(255,75,110,0.1)' },
}

export default function PharmacyDashboard() {
  const [orders, setOrders] = useState([])
  const [pendingPrescriptions, setPendingPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [medForm, setMedForm] = useState({ name: '', price: '', category: 'Pain Relief', stock: '100' })
  const { showToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await pharmacyAPI.getAllOrders()
      setOrders(res.data)
      const presRes = await prescriptionAPI.getPendingReviews()
      setPendingPrescriptions(presRes.data || [])
    } catch { showToast('Failed to load orders or prescriptions', 'error') }
    finally { setLoading(false) }
  }

  const handleVerifyPrescription = async (id, status, notes) => {
    try {
      await prescriptionAPI.verifyPrescription(id, status, notes)
      showToast(`Prescription ${status === 'verified' ? 'Approved & Verified ✅' : 'Flagged ⚠️'}`, 'success')
      load()
    } catch {
      showToast('Failed to update verification status', 'error')
    }
  }

  useEffect(() => { load() }, [])

  const handleAddMedicine = async (e) => {
    e.preventDefault()
    if (!medForm.name.trim() || !medForm.price) {
      showToast('Medicine name and price are required', 'error')
      return
    }
    setAdding(true)
    try {
      await pharmacyAPI.addMedicine({
        name: medForm.name.trim(),
        price: parseFloat(medForm.price),
        category: medForm.category,
        stock: parseInt(medForm.stock || 100),
      })
      showToast(`✅ ${medForm.name} added to stock!`, 'success')
      setShowAddModal(false)
      setMedForm({ name: '', price: '', category: 'Pain Relief', stock: '100' })
    } catch (err) {
      showToast('Failed to add medicine to stock', 'error')
    } finally {
      setAdding(false)
    }
  }

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.date).toDateString() === today)
  const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0)

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: '📦', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
    { label: "Today's",      value: todayOrders.length, icon: '📅', color: '#00D4AA', bg: 'rgba(0,212,170,0.1)', border: 'rgba(0,212,170,0.2)' },
    { label: 'Pending',      value: statusCounts['placed'] || 0, icon: '⏳', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Revenue',      value: `₹${revenue.toFixed(0)}`, icon: '💰', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  ]

  const updateStatus = async (orderId, newStatus) => {
    try {
      await pharmacyAPI.updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      showToast('Status updated!', 'success')
    } catch { showToast('Failed to update status', 'error') }
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 2 }}>
            📊 Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
            ➕ Add Medicine
          </button>
          <button onClick={load} className="icon-btn">🔄</button>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24,
            padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              💊 Add Medicine to Stock
            </h3>
            <form onSubmit={handleAddMedicine} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Medicine Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 650mg"
                  value={medForm.name}
                  onChange={e => setMedForm({ ...medForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="45.00"
                    value={medForm.price}
                    onChange={e => setMedForm({ ...medForm, price: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={medForm.stock}
                    onChange={e => setMedForm({ ...medForm, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Category</label>
                <select
                  value={medForm.category}
                  onChange={e => setMedForm({ ...medForm, category: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                >
                  <option value="Pain Relief">Pain Relief</option>
                  <option value="Gastro">Gastro</option>
                  <option value="Antibiotics">Antibiotics</option>
                  <option value="Heart">Heart</option>
                  <option value="Diabetes">Diabetes</option>
                  <option value="Allergy">Allergy</option>
                  <option value="Vitamins">Vitamins</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={adding} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }}>
                  {adding ? 'Adding...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 20, padding: '18px 16px',
            border: `1px solid ${s.border}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{
              fontWeight: 900, fontSize: 26, color: s.color,
              textShadow: `0 0 16px ${s.color}40`,
              marginBottom: 2,
            }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pharmacist Prescription Verification Queue */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🩺 Pharmacist Prescription Verification Queue
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#B45309', borderRadius: 20, padding: '3px 10px' }}>
            {pendingPrescriptions.filter(p => p.verification_status === 'pending_review').length} Pending
          </span>
        </div>

        {pendingPrescriptions.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No prescriptions currently awaiting verification.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingPrescriptions.slice(0, 5).map(pres => (
              <div key={pres.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                      Prescription #{pres.id} • {pres.patient_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Submitted on {new Date(pres.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: pres.verification_status === 'verified' ? '#DCFCE7' : pres.verification_status === 'flagged' ? '#FEE2E2' : '#FEF3C7',
                    color: pres.verification_status === 'verified' ? '#15803D' : pres.verification_status === 'flagged' ? '#B91C1C' : '#B45309'
                  }}>
                    {pres.verification_status === 'verified' ? '✅ Verified' : pres.verification_status === 'flagged' ? '⚠️ Flagged' : '⏳ Review Required'}
                  </span>
                </div>

                {/* Medicines List */}
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Extracted Medicines ({pres.medicines?.length || 0}):
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {pres.medicines?.map(m => m.display_name || m.name).join(', ') || 'No medicines extracted'}
                  </div>
                </div>

                {/* Verification Actions */}
                {pres.verification_status === 'pending_review' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleVerifyPrescription(pres.id, 'verified', 'Verified and safety approved by licensed pharmacist.')}
                      style={{ flex: 1, padding: '8px 12px', background: '#10B981', color: 'white', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 12 }}>
                      ✅ Approve & Verify
                    </button>
                    <button onClick={() => handleVerifyPrescription(pres.id, 'flagged', 'Dosage or handwriting requires patient clarification.')}
                      style={{ padding: '8px 12px', background: '#EF4444', color: 'white', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 12 }}>
                      ⚠️ Flag Issue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent orders */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Recent Orders</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 20, padding: '3px 10px' }}>
          {orders.length} total
        </span>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.slice(0, 10).map(order => {
            const sInfo = STATUS_MAP[order.status] || { label: order.status, color: '#8BA3C4', bg: 'var(--surface)' }
            return (
              <div key={order.id} id={`admin-order-${order.id}`} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 18, padding: 18,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Order #{order.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(order.date).toLocaleDateString('en-IN')} · ₹{order.total}
                    </div>
                  </div>
                  <span style={{
                    padding: '5px 12px', borderRadius: 20,
                    background: sInfo.bg, color: sInfo.color,
                    fontSize: 12, fontWeight: 700,
                    border: `1px solid ${sInfo.color}30`,
                  }}>{sInfo.label}</span>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>📍</span> {order.address || 'Address not provided'}
                </div>

                {/* Status update actions */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {order.status === 'placed' && (
                      <button id={`process-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'processing')}
                        style={{
                          background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.25)',
                          borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, flex: 1,
                        }}>
                        ⚙️ Process
                      </button>
                    )}
                    {order.status === 'processing' && (
                      <button id={`dispatch-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        style={{
                          background: 'rgba(0,212,170,0.1)', color: 'var(--primary)',
                          border: '1px solid rgba(0,212,170,0.25)',
                          borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, flex: 1,
                        }}>
                        🚚 Dispatch
                      </button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <button id={`deliver-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'delivered')}
                        style={{
                          background: 'rgba(0,212,170,0.1)', color: 'var(--primary)',
                          border: '1px solid rgba(0,212,170,0.25)',
                          borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, flex: 1,
                        }}>
                        ✅ Delivered
                      </button>
                    )}
                    <button id={`cancel-order-${order.id}`}
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      style={{
                        background: 'rgba(255,75,110,0.1)', color: 'var(--red)',
                        border: '1px solid rgba(255,75,110,0.25)',
                        borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700,
                      }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
