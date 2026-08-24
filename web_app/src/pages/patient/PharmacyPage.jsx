import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const DELIVERY_OPTIONS = [
  { id: 'express', label: '⚡ Express Delivery', sub: 'Arrives in 30–45 min', price: 99, badge: 'Fast', badgeColor: '#F59E0B' },
  { id: 'standard', label: '🚚 Standard Delivery', sub: 'Arrives in 2–3 hours', price: 49, badge: 'Save ₹50', badgeColor: '#00D4AA' },
  { id: 'pickup', label: '🏪 Self Pickup', sub: 'Collect from pharmacy', price: 0, badge: 'Free', badgeColor: '#7C3AED' },
]

const SAVED_ADDRESSES = [
  { id: 1, label: '🏠 Home', address: '' },
  { id: 2, label: '💼 Work', address: '' },
]

export default function PharmacyPage() {
  const [tab, setTab] = useState('pharmacies')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [coords, setCoords] = useState(null)
  const [deliveryOption, setDeliveryOption] = useState('standard')
  const [showDeliveryPanel, setShowDeliveryPanel] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchLocation = () => {
    setLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setCoords({ lat, lng })
        try {
          const res = tab === 'pharmacies'
            ? await pharmacyAPI.getNearby(lat, lng)
            : await pharmacyAPI.getHospitals(lat, lng)
          setItems(res.data)
        } catch {
          showToast('Failed to fetch nearby locations', 'error')
        }
        setLoading(false)
      },
      () => {
        setLocationError('Location access denied. Please enable location permissions.')
        setLoading(false)
      }
    )
  }

  useEffect(() => { fetchLocation() }, [tab])

  const call = (phone) => {
    if (!phone) return showToast('No phone number available', 'error')
    window.location.href = `tel:${phone}`
  }

  const directions = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  const ratingStars = (r) => '★'.repeat(Math.floor(r || 0)) + '☆'.repeat(5 - Math.floor(r || 0))

  const selectedDelivery = DELIVERY_OPTIONS.find(d => d.id === deliveryOption)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2A45 60%, #0A3D52 100%)',
        padding: '52px 24px 24px',
        borderRadius: '0 0 32px 32px',
        borderBottom: '1px solid rgba(0,212,170,0.12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 22 }}>🏪 Nearby</h1>
            {coords && (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                📍 Location detected
              </p>
            )}
          </div>
          <button id="refresh-nearby-btn" className="icon-btn" onClick={fetchLocation}>🔄</button>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: 14, padding: 4, display: 'flex',
        }}>
          {[
            { key: 'pharmacies', label: '💊 Pharmacies' },
            { key: 'hospitals', label: '🏥 Hospitals' },
          ].map(t => (
            <button key={t.key} id={`nearby-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: tab === t.key ? 'linear-gradient(135deg, #00D4AA, #00A888)' : 'transparent',
                color: tab === t.key ? '#070D1B' : 'rgba(139,163,199,0.85)',
                transition: 'all 0.2s',
                boxShadow: tab === t.key ? '0 4px 12px rgba(0,212,170,0.35)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* ── Delivery Options Card ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-accent)',
          borderRadius: 20, marginBottom: 14, overflow: 'hidden',
          boxShadow: '0 0 20px rgba(0,212,170,0.06)',
        }}>
          <div
            onClick={() => setShowDeliveryPanel(p => !p)}
            style={{
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, background: 'rgba(0,212,170,0.1)',
                border: '1px solid rgba(0,212,170,0.2)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>🚚</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Delivery Options</div>
                <div style={{ fontSize: 12, color: 'var(--primary)' }}>
                  {selectedDelivery?.label} · {selectedDelivery?.price === 0 ? 'Free' : `₹${selectedDelivery?.price}`}
                </div>
              </div>
            </div>
            <span style={{ color: 'var(--primary)', fontSize: 18, transition: 'transform 0.2s', transform: showDeliveryPanel ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>

          {showDeliveryPanel && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {DELIVERY_OPTIONS.map((opt, i) => (
                <div key={opt.id}
                  onClick={() => setDeliveryOption(opt.id)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: i < DELIVERY_OPTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    background: deliveryOption === opt.id ? 'rgba(0,212,170,0.06)' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `2px solid ${deliveryOption === opt.id ? '#00D4AA' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}>
                      {deliveryOption === opt.id && (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.sub}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                      {opt.price === 0 ? 'Free' : `₹${opt.price}`}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: opt.badgeColor,
                      background: `${opt.badgeColor}18`,
                      border: `1px solid ${opt.badgeColor}30`,
                      padding: '2px 7px', borderRadius: 10,
                    }}>{opt.badge}</span>
                  </div>
                </div>
              ))}

              {/* Delivery address row */}
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deliver to
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SAVED_ADDRESSES.map(addr => (
                    <div key={addr.id} style={{
                      flex: 1, padding: '8px 12px',
                      background: 'var(--bg-card2)', border: '1px solid var(--border)',
                      borderRadius: 10, cursor: 'pointer', fontSize: 12,
                      fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                      onClick={() => navigate('/orders')}>
                      {addr.label}
                    </div>
                  ))}
                  <div style={{
                    flex: 1, padding: '8px 12px',
                    background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
                    borderRadius: 10, cursor: 'pointer', fontSize: 12,
                    fontWeight: 700, color: 'var(--primary)', textAlign: 'center',
                  }}
                    onClick={() => navigate('/checkout', { state: { cart: [] } })}>
                    + New
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Orders shortcut */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 14, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
          onClick={() => navigate('/orders')}
          id="my-orders-shortcut"
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,212,170,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
          <div style={{
            width: 42, height: 42,
            background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>📦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>My Orders</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Track your medicine deliveries</div>
          </div>
          <span style={{ color: 'var(--primary)' }}>›</span>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="loading-center" style={{ minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ marginBottom: 16 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Fetching nearby {tab}...</div>
            </div>
          </div>
        ) : locationError ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span style={{ fontSize: 52 }}>📍</span>
            <h3 style={{ marginTop: 16, marginBottom: 8, color: 'var(--text-primary)' }}>Location Required</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>{locationError}</p>
            <button className="btn btn-primary" onClick={fetchLocation} style={{ borderRadius: 12 }}>
              📍 Enable Location
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => (
              <div key={item.id || i}
                className={`pharmacy-nearby-card${item.is_open ? ' open-glow' : ''}`}
                id={`nearby-item-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.address}</div>
                  </div>
                  <span className={`badge ${item.is_open ? 'badge-green' : 'badge-red'}`}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: item.is_open ? '0 0 6px currentColor' : 'none' }} />
                    {item.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📍 {item.distance_text || `${item.distance_km?.toFixed(1)} km`}
                  </span>
                  <span style={{ fontSize: 12, color: '#F59E0B' }}>
                    {ratingStars(item.rating)} {item.rating}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                    color: item.stock_status === 'In Stock' || item.stock_status === 'High Stock' ? '#00D4AA' : '#F59E0B',
                    background: item.stock_status === 'In Stock' || item.stock_status === 'High Stock' ? 'rgba(0,212,170,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${item.stock_status === 'In Stock' || item.stock_status === 'High Stock' ? 'rgba(0,212,170,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}>
                    {item.stock_status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button id={`call-btn-${i}`} onClick={() => call(item.phone)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                    color: 'var(--primary)', fontWeight: 700, fontSize: 13,
                  }}>
                    📞 Call
                  </button>
                  <button id={`directions-btn-${i}`} onClick={() => directions(item.lat, item.lng)} style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                    color: '#A78BFA', fontWeight: 700, fontSize: 13,
                  }}>
                    🗺️ Directions
                  </button>
                  {item.is_emergency && (
                    <button id={`emergency-btn-${i}`} style={{
                      flex: 1, padding: '9px 0', borderRadius: 10,
                      background: 'rgba(255,75,110,0.1)', border: '1px solid rgba(255,75,110,0.2)',
                      color: 'var(--red)', fontWeight: 700, fontSize: 13,
                    }}
                      onClick={() => window.location.href = 'tel:108'}>
                      🚨 108
                    </button>
                  )}
                </div>
              </div>
            ))}

            {items.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-state-icon">🗺️</div>
                <h3>No {tab} found nearby</h3>
                <p>Try increasing the search radius or refresh</p>
                <button className="btn btn-primary" onClick={fetchLocation} style={{ marginTop: 16, borderRadius: 12 }}>
                  🔄 Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
