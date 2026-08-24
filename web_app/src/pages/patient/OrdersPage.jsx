import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  placed:           { label: 'Order Placed',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   icon: '📋' },
  processing:       { label: 'Processing',        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: '⚙️' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#00D4AA', bg: 'rgba(0,212,170,0.1)',    icon: '🚚' },
  delivered:        { label: 'Delivered',         color: '#00D4AA', bg: 'rgba(0,212,170,0.1)',    icon: '✅' },
  cancelled:        { label: 'Cancelled',         color: '#FF4B6E', bg: 'rgba(255,75,110,0.1)',   icon: '❌' },
}

const TRACKING_STEPS = [
  { key: 'placed',           label: 'Order Placed',       sub: 'Your order has been received',    icon: '📋' },
  { key: 'processing',       label: 'Being Prepared',     sub: 'Pharmacy is preparing your order', icon: '⚙️' },
  { key: 'out_for_delivery', label: 'Out for Delivery',   sub: 'On the way to your address',       icon: '🚚' },
  { key: 'delivered',        label: 'Delivered',          sub: 'Order successfully delivered',      icon: '🎉' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    pharmacyAPI.getUserOrders(user.id)
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.id])

  const parseItems = (itemsStr) => {
    try {
      const parsed = typeof itemsStr === 'string' ? JSON.parse(itemsStr.replace(/'/g, '"')) : itemsStr
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }

  const getStepIndex = (status) => TRACKING_STEPS.findIndex(s => s.key === status)

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'placed', label: 'New' },
    { key: 'processing', label: 'Processing' },
    { key: 'out_for_delivery', label: 'Delivering' },
    { key: 'delivered', label: 'Delivered' },
  ]

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus)

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
          background: 'radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)', pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{
            color: 'var(--text-primary)', fontSize: 20,
            background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
            borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 22 }}>📦 My Orders</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{orders.length} orders total</p>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {filters.map(f => (
            <button key={f.key}
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                fontWeight: 700, fontSize: 12,
                background: filterStatus === f.key ? 'linear-gradient(135deg, #00D4AA, #00A888)' : 'rgba(255,255,255,0.07)',
                color: filterStatus === f.key ? '#070D1B' : 'rgba(139,163,199,0.9)',
                border: filterStatus === f.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: filterStatus === f.key ? '0 4px 12px rgba(0,212,170,0.35)' : 'none',
                transition: 'all 0.2s',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state-icon">📦</div>
            <h3>{filterStatus === 'all' ? 'No orders yet' : `No ${filterStatus} orders`}</h3>
            <p>Browse medicines and place your first order</p>
            <button className="btn btn-primary" onClick={() => navigate('/medicines')}
              style={{ marginTop: 20, borderRadius: 12 }}>
              💊 Browse Medicines
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: '#8BA3C4', bg: 'var(--surface)', icon: '📦' }
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
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 20,
                      background: statusInfo.bg, color: statusInfo.color,
                      fontSize: 12, fontWeight: 700,
                      border: `1px solid ${statusInfo.color}30`,
                    }}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏪</span> {order.pharmacy_name}
                  </div>

                  {items.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {items.slice(0, 2).map((item, i) => (
                        <span key={i}>
                          {i > 0 && ' · '}
                          {typeof item === 'object' ? item.name : item}
                        </span>
                      ))}
                      {items.length > 2 && <span style={{ color: 'var(--text-muted)' }}> +{items.length - 2} more</span>}
                    </div>
                  )}

                  {/* Mini progress bar for active orders */}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 3, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: 'linear-gradient(90deg, #00A888, #00D4AA)',
                          width: `${((getStepIndex(order.status) + 1) / 4) * 100}%`,
                          transition: 'width 0.5s ease',
                          boxShadow: '0 0 8px rgba(0,212,170,0.4)',
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: 18 }}>₹{order.total}</div>
                    <button id={`track-order-${order.id}`}
                      onClick={e => { e.stopPropagation(); setSelectedOrder(order) }}
                      style={{
                        background: 'rgba(0,212,170,0.1)', color: 'var(--primary)',
                        border: '1px solid rgba(0,212,170,0.2)',
                        borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 700,
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
          <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Order #{selectedOrder.id}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(selectedOrder.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Animated Tracking Timeline */}
            {selectedOrder.status !== 'cancelled' && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Delivery Tracking
                </div>
                {TRACKING_STEPS.map((step, i) => {
                  const stepIdx = getStepIndex(selectedOrder.status)
                  const done = i <= stepIdx
                  const current = i === stepIdx
                  return (
                    <div key={step.key} className="timeline-step">
                      <div className="timeline-step-connector">
                        <div className={`timeline-dot ${done ? 'done' : 'pending'}`} style={{
                          animation: current ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                        }}>
                          {done ? (current ? step.icon : '✓') : '○'}
                        </div>
                        {i < TRACKING_STEPS.length - 1 && (
                          <div className={`timeline-line ${done && i < stepIdx ? 'done' : 'pending'}`} />
                        )}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-label" style={{ color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {step.label}
                        </div>
                        <div className="timeline-sub">{step.sub}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Delivery partner */}
            {selectedOrder.partner && (
              <div style={{
                background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)',
                borderRadius: 14, padding: 14, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Delivery Partner</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{selectedOrder.partner}</div>
                </div>
                <button onClick={() => window.location.href = `tel:${selectedOrder.partner_phone}`}
                  style={{
                    background: 'linear-gradient(135deg, #00D4AA, #00A888)',
                    color: '#070D1B', borderRadius: 10, padding: '8px 16px',
                    fontSize: 13, fontWeight: 700,
                  }}>
                  📞 Call
                </button>
              </div>
            )}

            {/* Order details */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {[
                ['Pharmacy', selectedOrder.pharmacy_name, '🏪'],
                ['Delivery Address', selectedOrder.address, '📍'],
                ['Total', `₹${selectedOrder.total}`, '💰'],
              ].map(([k, v, icon]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {icon} {k}
                  </span>
                  <span style={{
                    fontWeight: k === 'Total' ? 900 : 600,
                    fontSize: k === 'Total' ? 18 : 14,
                    color: k === 'Total' ? 'var(--primary)' : 'var(--text-primary)',
                    maxWidth: 180, textAlign: 'right',
                  }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Cancelled info */}
            {selectedOrder.status === 'cancelled' && (
              <div style={{
                background: 'rgba(255,75,110,0.08)', border: '1px solid rgba(255,75,110,0.2)',
                borderRadius: 12, padding: 14, marginTop: 4,
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <span style={{ fontSize: 22 }}>❌</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 14 }}>Order Cancelled</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,75,110,0.7)' }}>Refund will be processed within 3–5 days</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
