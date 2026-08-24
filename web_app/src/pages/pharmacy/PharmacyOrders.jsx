import React, { useState, useEffect } from 'react'
import { pharmacyAPI } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const STATUS_MAP = {
  placed: { label: 'New', color: '#3B5EF8', bg: '#EEF2FF' },
  processing: { label: 'Processing', color: '#FF9800', bg: '#FFF3E0' },
  out_for_delivery: { label: 'Out for Delivery', color: '#3B5EF8', bg: '#EEF2FF' },
  delivered: { label: 'Delivered', color: '#00C896', bg: '#E6FFF7' },
  cancelled: { label: 'Cancelled', color: '#FF5252', bg: '#FFEBEE' },
}

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { showToast } = useToast()

  useEffect(() => {
    pharmacyAPI.getAllOrders()
      .then(r => setOrders(r.data))
      .catch(() => showToast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const updateStatus = async (orderId, status) => {
    try {
      await pharmacyAPI.updateOrderStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      showToast('Order updated!', 'success')
    } catch { showToast('Failed to update', 'error') }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E', marginBottom: 16 }}>
        📦 All Orders
      </h2>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'placed', label: 'New' },
          { key: 'processing', label: 'Processing' },
          { key: 'out_for_delivery', label: 'Delivering' },
          { key: 'delivered', label: 'Delivered' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map(f => (
          <button key={f.key} id={`filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              fontWeight: 600, fontSize: 12, flexShrink: 0,
              background: filter === f.key ? '#00C896' : 'white',
              color: filter === f.key ? 'white' : '#64748B',
              border: `1.5px solid ${filter === f.key ? '#00C896' : '#E2E8F0'}`,
              transition: 'all 0.2s',
            }}>
            {f.label} {filter === f.key && `(${filtered.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders in this category</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => {
            const sInfo = STATUS_MAP[order.status] || { label: order.status, color: '#64748B', bg: '#F1F5F9' }
            const parseItems = (s) => {
              try { return JSON.parse(s.replace(/'/g, '"')) } catch { return [] }
            }
            const items = parseItems(order.items || '[]')

            return (
              <div key={order.id} id={`orders-list-${order.id}`} style={{
                background: 'white', borderRadius: 16, padding: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${sInfo.color}`,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Order #{order.id}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {new Date(order.date).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 8, background: sInfo.bg, color: sInfo.color, fontSize: 12, fontWeight: 600 }}>
                    {sInfo.label}
                  </span>
                </div>

                {/* Items */}
                {items.length > 0 && (
                  <div style={{ fontSize: 13, color: '#1A1A2E', marginBottom: 8 }}>
                    {items.slice(0, 2).map((i, j) => (
                      <span key={j}>{j > 0 && ', '}{typeof i === 'object' ? `${i.name} ×${i.qty}` : i}</span>
                    ))}
                    {items.length > 2 && <span style={{ color: '#94A3B8' }}> +{items.length - 2} more</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>📍 {order.address}</span>
                  <span style={{ fontWeight: 800, color: '#00C896' }}>₹{order.total}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {order.status === 'placed' && (
                    <button id={`accept-order-${order.id}`}
                      onClick={() => updateStatus(order.id, 'processing')}
                      style={{ flex: 1, background: '#E6FFF7', color: '#007A5E', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                      ✅ Accept & Process
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button id={`dispatch-order-list-${order.id}`}
                      onClick={() => updateStatus(order.id, 'out_for_delivery')}
                      style={{ flex: 1, background: '#EEF2FF', color: '#3B5EF8', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                      🚚 Mark Dispatched
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button id={`delivered-order-list-${order.id}`}
                      onClick={() => updateStatus(order.id, 'delivered')}
                      style={{ flex: 1, background: '#E6FFF7', color: '#007A5E', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                      📦 Mark Delivered
                    </button>
                  )}
                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <button id={`cancel-order-list-${order.id}`}
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      style={{ background: '#FFEBEE', color: '#C62828', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
