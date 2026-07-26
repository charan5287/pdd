import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useToast } from '../../context/ToastContext'

export default function PharmacyPage() {
  const [tab, setTab] = useState('pharmacies') // pharmacies | hospitals
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [coords, setCoords] = useState(null)
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

  const ratingStars = (r) => '★'.repeat(Math.floor(r)) + '☆'.repeat(5 - Math.floor(r))

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>🏪 Nearby</h1>
          <button id="refresh-nearby-btn" className="icon-btn" onClick={fetchLocation}>🔄</button>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 12, padding: 4,
          display: 'flex',
        }}>
          {[
            { key: 'pharmacies', label: '💊 Pharmacies' },
            { key: 'hospitals', label: '🏥 Hospitals' },
          ].map(t => (
            <button key={t.key} id={`nearby-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? '#3B5EF8' : 'rgba(255,255,255,0.85)',
                transition: 'all 0.2s',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* My Orders shortcut */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 14, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
          onClick={() => navigate('/orders')}
          id="my-orders-shortcut"
        >
          <div style={{
            width: 40, height: 40, background: '#EEF2FF', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>📦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>My Orders</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Track your medicine deliveries</div>
          </div>
          <span style={{ color: '#94A3B8' }}>›</span>
        </div>

        {loading ? (
          <div className="loading-center" style={{ minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ marginBottom: 16 }} />
              <div style={{ color: '#64748B', fontSize: 14 }}>Fetching nearby {tab}...</div>
            </div>
          </div>
        ) : locationError ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span style={{ fontSize: 48 }}>📍</span>
            <h3 style={{ marginTop: 16, marginBottom: 8 }}>Location Required</h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 20 }}>{locationError}</p>
            <button className="btn btn-primary" onClick={fetchLocation} style={{ borderRadius: 12 }}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((item, i) => (
              <div key={item.id || i} className="card" id={`nearby-item-${i}`}
                style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{item.address}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`badge ${item.is_open ? 'badge-green' : 'badge-red'}`}>
                      {item.is_open ? '● Open' : '● Closed'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    📍 {item.distance_text || `${item.distance_km?.toFixed(1)} km`}
                  </span>
                  <span style={{ fontSize: 12, color: '#F59E0B' }}>
                    {ratingStars(item.rating)} {item.rating}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: item.stock_status === 'In Stock' ? '#00C896' : item.stock_status === 'High Stock' ? '#00C896' : '#FF9800'
                  }}>
                    {item.stock_status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button id={`call-btn-${i}`}
                    onClick={() => call(item.phone)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, background: '#E6FFF7',
                      color: '#007A5E', fontWeight: 600, fontSize: 13,
                    }}>
                    📞 Call
                  </button>
                  <button id={`directions-btn-${i}`}
                    onClick={() => directions(item.lat, item.lng)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, background: '#EEF2FF',
                      color: '#3B5EF8', fontWeight: 600, fontSize: 13,
                    }}>
                    🗺️ Directions
                  </button>
                  {item.is_emergency && (
                    <button id={`emergency-btn-${i}`}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10,
                        background: '#FFEBEE', color: '#C62828', fontWeight: 600, fontSize: 13,
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
                <p>Try increasing the search radius</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
