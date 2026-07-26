import React, { useState, useEffect } from 'react'
import { pharmacyAPI, smartAPI } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export default function PharmacyDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await pharmacyAPI.getAllOrders()
      setOrders(res.data)
    } catch { showToast('Failed to load orders', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.date).toDateString() === today)
  const revenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0)

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: '📦', color: '#3B5EF8', bg: '#EEF2FF' },
    { label: "Today's Orders", value: todayOrders.length, icon: '📅', color: '#00C896', bg: '#E6FFF7' },
    { label: 'Pending', value: statusCounts['placed'] || 0, icon: '⏳', color: '#FF9800', bg: '#FFF3E0' },
    { label: 'Revenue', value: `₹${revenue.toFixed(0)}`, icon: '💰', color: '#6A1B9A', bg: '#F3E5F5' },
  ]

  const STATUS_MAP = {
    placed: { label: 'New Order', color: '#3B5EF8', bg: '#EEF2FF' },
    processing: { label: 'Processing', color: '#FF9800', bg: '#FFF3E0' },
    out_for_delivery: { label: 'Delivering', color: '#00C896', bg: '#E6FFF7' },
    delivered: { label: 'Delivered', color: '#00C896', bg: '#E6FFF7' },
    cancelled: { label: 'Cancelled', color: '#FF5252', bg: '#FFEBEE' },
  }

  const updateStatus = async (orderId, newStatus) => {
    try {
      await pharmacyAPI.updateOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      showToast('Status updated!', 'success')
    } catch { showToast('Failed to update status', 'error') }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginBottom: 20 }}>
        📊 Pharmacy Dashboard
      </h2>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 16, padding: 16,
            border: `1.5px solid ${s.color}22`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ fontWeight: 700, fontSize: 17, color: '#1A1A2E', marginBottom: 12 }}>
        Recent Orders
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
            const sInfo = STATUS_MAP[order.status] || { label: order.status, color: '#64748B', bg: '#F1F5F9' }
            return (
              <div key={order.id} id={`admin-order-${order.id}`} style={{
                background: 'white', borderRadius: 16, padding: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Order #{order.id}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {new Date(order.date).toLocaleDateString('en-IN')} ·
                      ₹{order.total}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: sInfo.bg, color: sInfo.color, fontSize: 12, fontWeight: 600,
                  }}>{sInfo.label}</span>
                </div>

                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                  📍 {order.address || 'Address not provided'}
                </div>

                {/* Status update actions */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {order.status === 'placed' && (
                      <button id={`process-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'processing')}
                        style={{
                          background: '#FFF3E0', color: '#B26500', borderRadius: 8,
                          padding: '6px 14px', fontSize: 12, fontWeight: 600, flex: 1,
                        }}>
                        ⚙️ Process
                      </button>
                    )}
                    {order.status === 'processing' && (
                      <button id={`dispatch-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        style={{
                          background: '#EEF2FF', color: '#3B5EF8', borderRadius: 8,
                          padding: '6px 14px', fontSize: 12, fontWeight: 600, flex: 1,
                        }}>
                        🚚 Dispatch
                      </button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <button id={`deliver-order-${order.id}`}
                        onClick={() => updateStatus(order.id, 'delivered')}
                        style={{
                          background: '#E6FFF7', color: '#007A5E', borderRadius: 8,
                          padding: '6px 14px', fontSize: 12, fontWeight: 600, flex: 1,
                        }}>
                        ✅ Mark Delivered
                      </button>
                    )}
                    <button id={`cancel-order-${order.id}`}
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      style={{
                        background: '#FFEBEE', color: '#C62828', borderRadius: 8,
                        padding: '6px 14px', fontSize: 12, fontWeight: 600,
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
