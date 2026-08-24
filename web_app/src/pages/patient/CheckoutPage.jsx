import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const DELIVERY_TYPES = [
  { id: 'express',  icon: '⚡', label: 'Express Delivery', eta: '30–45 min', price: 99 },
  { id: 'standard',icon: '🚚', label: 'Standard Delivery', eta: '2–3 hours', price: 49 },
  { id: 'pickup',  icon: '🏪', label: 'Self Pickup', eta: 'Ready in 20 min', price: 0 },
]

const PAYMENT_METHODS = [
  { id: 'cod', icon: '💵', label: 'Cash on Delivery', sub: 'Pay when received' },
  { id: 'upi', icon: '📱', label: 'UPI Payment', sub: 'GPay, PhonePe, Paytm' },
  { id: 'card',icon: '💳', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay' },
]

export default function CheckoutPage() {
  const { state } = useLocation()
  const cart = state?.cart || []
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [deliveryType, setDeliveryType] = useState('standard')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [form, setForm] = useState({
    address: '',
    landmark: '',
    phone: user?.phone || '',
    instructions: '',
  })
  const [placing, setPlacing] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)

  const selectedDelivery = DELIVERY_TYPES.find(d => d.id === deliveryType)
  const subtotal = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0)
  const deliveryFee = selectedDelivery?.price || 0
  const total = subtotal + deliveryFee

  const detectLocation = () => {
    setUseCurrentLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}` }))
        showToast('📍 Location detected!', 'success')
      },
      () => {
        showToast('Could not detect location', 'error')
        setUseCurrentLocation(false)
      }
    )
  }

  const placeOrder = async () => {
    if (!form.address && deliveryType !== 'pickup') return showToast('Please enter delivery address', 'error')
    setPlacing(true)
    setProcessingPayment(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    try {
      const res = await pharmacyAPI.placeOrder({
        user_id: user.id,
        pharmacy_id: 1,
        total_amount: total,
        address: form.address,
        phone: form.phone,
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      })
      setOrderResult(res.data)
      showToast('Payment Successful! Order Placed! 🎉', 'success')
    } catch {
      showToast('Failed to place order', 'error')
    } finally {
      setPlacing(false)
      setProcessingPayment(false)
    }
  }

  if (processingPayment) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, margin: '0 auto 24px',
          background: 'rgba(0,212,170,0.1)', border: '2px solid rgba(0,212,170,0.3)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Processing Payment...</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Please do not close this window</p>
        <div style={{
          marginTop: 24, background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Your payment is encrypted & secure</span>
        </div>
      </div>
    )
  }

  if (orderResult) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          width: 100, height: 100, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05))',
          border: '2px solid rgba(0,212,170,0.3)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48, boxShadow: '0 0 40px rgba(0,212,170,0.3)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}>🎉</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>Order Placed!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, textAlign: 'center', lineHeight: 1.6 }}>
          Your medicines are being prepared for delivery
        </p>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.2)',
          borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, marginBottom: 20,
          boxShadow: '0 0 30px rgba(0,212,170,0.08)',
        }}>
          {[
            ['Order ID', `#${orderResult.order_id}`],
            ['Estimated Time', orderResult.eta],
            ['Delivery Partner', orderResult.delivery_partner],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{k}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>
        <button id="track-my-order-btn" className="btn btn-primary"
          onClick={() => navigate('/orders')}
          style={{ borderRadius: 16, width: '100%', maxWidth: 380, padding: '15px', fontSize: 15 }}>
          📦 Track My Order
        </button>
        <button className="btn btn-outline"
          onClick={() => navigate('/home')}
          style={{ borderRadius: 16, width: '100%', maxWidth: 380, padding: '15px', marginTop: 10 }}>
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2A45 60%, #0A3D52 100%)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
        borderBottom: '1px solid rgba(0,212,170,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{
            color: 'var(--text-primary)', fontSize: 20,
            background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)',
            borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
          <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 22 }}>🛒 Checkout</h1>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Order Summary */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>📋 Order Summary</div>
          {cart.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.qty} × ₹{item.price}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>₹{(item.price * item.qty).toFixed(0)}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--border)' }}>
            {[
              ['Subtotal', `₹${subtotal.toFixed(0)}`],
              ['Delivery Fee', deliveryFee === 0 ? '🎉 Free' : `₹${deliveryFee}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{k}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--primary)', textShadow: '0 0 12px rgba(0,212,170,0.3)' }}>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Type */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>🚚 Delivery Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DELIVERY_TYPES.map(dt => (
              <div key={dt.id}
                onClick={() => setDeliveryType(dt.id)}
                style={{
                  background: deliveryType === dt.id ? 'rgba(0,212,170,0.08)' : 'var(--bg-card)',
                  border: `1.5px solid ${deliveryType === dt.id ? 'rgba(0,212,170,0.3)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: deliveryType === dt.id ? '0 0 16px rgba(0,212,170,0.1)' : 'none',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${deliveryType === dt.id ? '#00D4AA' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {deliveryType === dt.id && (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {dt.icon} {dt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dt.eta}</div>
                  </div>
                </div>
                <div style={{
                  fontWeight: 800, fontSize: 15,
                  color: dt.price === 0 ? 'var(--primary)' : 'var(--text-primary)',
                }}>
                  {dt.price === 0 ? 'Free' : `₹${dt.price}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        {deliveryType !== 'pickup' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>
              📍 Delivery Address
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Current location button */}
              <button
                onClick={detectLocation}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
                  borderRadius: 12, padding: '11px 16px',
                  color: 'var(--primary)', fontWeight: 700, fontSize: 14,
                  transition: 'all 0.2s',
                }}>
                <span style={{ fontSize: 18 }}>📍</span>
                Use my current location
              </button>

              <div className="input-group">
                <label className="input-label">Full Address *</label>
                <textarea id="checkout-address" className="input-field"
                  placeholder="House no, Street, Area, City, Pincode..."
                  rows={3}
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Landmark (Optional)</label>
                <input className="input-field"
                  placeholder="Near hospital, opposite park..."
                  value={form.landmark}
                  onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <div className="input-with-icon">
                  <span className="input-icon">📱</span>
                  <input id="checkout-phone" type="tel" className="input-field"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Delivery Instructions (Optional)</label>
                <input className="input-field"
                  placeholder="Ring doorbell, leave at door..."
                  value={form.instructions}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>💳 Payment Method</div>
          {PAYMENT_METHODS.map((method, i) => (
            <div key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 0', borderBottom: i < PAYMENT_METHODS.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${paymentMethod === method.id ? '#00D4AA' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {paymentMethod === method.id && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 6px #00D4AA' }} />
                )}
              </div>
              <span style={{ fontSize: 20 }}>{method.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{method.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{method.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Your payment is 256-bit encrypted & secure</span>
        </div>

        <button id="place-order-btn"
          className="btn btn-primary btn-block"
          onClick={placeOrder}
          disabled={placing}
          style={{ borderRadius: 16, fontSize: 16, padding: '16px', opacity: placing ? 0.7 : 1, marginBottom: 8 }}>
          {placing ? '⏳ Placing Order...' : `✅ Place Order · ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  )
}
