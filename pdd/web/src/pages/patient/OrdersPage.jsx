import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  placed: { label: 'Order Placed', color: '#3B5EF8', bg: '#EEF2FF' },
  processing: { label: 'Processing', color: '#FF9800', bg: '#FFF3E0' },
  out_for_delivery: { label: 'Out for Delivery', color: '#3B5EF8', bg: '#EEF2FF' },
  delivered: { label: 'Delivered', color: '#00C896', bg: '#E6FFF7' },
  cancelled: { label: 'Cancelled', color: '#FF5252', bg: '#FFEBEE' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    pharmacyAPI.getUserOrders(user.id)
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.id])

  const trackingSteps = (status) => {
    const steps = ['placed', 'processing', 'out_for_delivery', 'delivered']
    const idx = steps.indexOf(status)
    return steps.map((s, i) => ({
      key: s,
      label: STATUS_MAP[s]?.label || s,
      done: i <= idx,
      current: i === idx,
    }))
  }

  const parseItems = (itemsStr) => {
    try {
      const parsed = typeof itemsStr === 'string' ? JSON.parse(itemsStr.replace(/'/g, '"')) : itemsStr
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20 }}>←</button>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>📦 My Orders</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{orders.length} orders total</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Browse medicines and place your first order</p>
            <button className="btn btn-primary" onClick={() => navigate('/medicines')}
              style={{ marginTop: 20, borderRadius: 12 }}>
              💊 Browse Medicines
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(order => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#64748B', bg: '#F1F5F9' }
              const items = parseItems(order.items)
              const orderDate = new Date(order.date)
              return (
                <div key={order.id} className="order-card"
                  id={`order-${order.id}`}
                  onClick={() => setSelectedOrder(order)}>
                  <div className="order-card-header">
                    <div>
                      <div className="order-id">Order #{order.id}</div>
                      <div className="order-date">
                        {orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
                    🏪 {order.pharmacy_name}
                  </div>

                  {items.length > 0 && (
                    <div style={{ fontSize: 13, color: '#1A1A2E', marginBottom: 10 }}>
                      {items.slice(0, 2).map((item, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {typeof item === 'object' ? item.name : item}
                        </span>
                      ))}
                      {items.length > 2 && <span style={{ color: '#94A3B8' }}> +{items.length - 2} more</span>}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, color: '#1A1A2E', fontSize: 16 }}>₹{order.total}</div>
                    <button id={`track-order-${order.id}`}
                      onClick={e => { e.stopPropagation(); setSelectedOrder(order) }}
                      style={{
                        background: '#EEF2FF', color: '#3B5EF8',
                        borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                      }}>
                      Track →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Order tracking modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Order #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ fontSize: 20, color: '#94A3B8' }}>✕</button>
            </div>

            {/* Tracking timeline */}
            {selectedOrder.status !== 'cancelled' && (
              <div style={{ marginBottom: 20 }}>
                {trackingSteps(selectedOrder.status).map((step, i) => (
                  <div key={step.key} style={{ display: 'flex', gap: 12, marginBottom: i < 3 ? 0 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: step.done ? '#3B5EF8' : '#EEF2FF',
                        border: step.current ? '3px solid #3B5EF8' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: step.done ? 'white' : '#94A3B8', fontWeight: 700,
                      }}>
                        {step.done ? '✓' : '○'}
                      </div>
                      {i < 3 && (
                        <div style={{
                          width: 2, height: 28,
                          background: step.done ? '#3B5EF8' : '#EEF2FF',
                          margin: '2px 0',
                        }} />
                      )}
                    </div>
                    <div style={{ paddingTop: 2, paddingBottom: 16 }}>
                      <div style={{
                        fontWeight: step.current ? 700 : 500, fontSize: 14,
                        color: step.done ? '#1A1A2E' : '#94A3B8',
                      }}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delivery partner */}
            {selectedOrder.partner && (
              <div style={{
                background: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Delivery Partner</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedOrder.partner}</div>
                </div>
                <button onClick={() => window.location.href = `tel:${selectedOrder.partner_phone}`}
                  style={{ background: '#3B5EF8', color: 'white', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
                  📞 Call
                </button>
              </div>
            )}

            {/* Order details */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Pharmacy</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedOrder.pharmacy_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Address</span>
                <span style={{ fontWeight: 600, fontSize: 14, maxWidth: 200, textAlign: 'right' }}>{selectedOrder.address}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#3B5EF8' }}>₹{selectedOrder.total}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
