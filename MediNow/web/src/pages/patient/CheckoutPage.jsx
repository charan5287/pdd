import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { pharmacyAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function CheckoutPage() {
  const { state } = useLocation()
  const cart = state?.cart || []
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    address: '',
    phone: user?.phone || '',
  })
  const [placing, setPlacing] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  const total = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0)

  const placeOrder = async () => {
    if (!form.address) return showToast('Please enter delivery address', 'error')
    setPlacing(true)
    setProcessingPayment(true)
    
    // Simulate 2-second payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      const res = await pharmacyAPI.placeOrder({
        user_id: user.id,
        pharmacy_id: 1,
        total_amount: total + 49,
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
      <div style={{ minHeight: '100vh', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="spinner" style={{ width: 48, height: 48, marginBottom: 24 }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Processing Payment...</h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>Please do not close this window</p>
      </div>
    )
  }

  if (orderResult) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F8FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Order Placed!</h2>
        <p style={{ color: '#64748B', marginBottom: 32, textAlign: 'center' }}>
          Your medicines are being prepared
        </p>
        <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, marginBottom: 24 }}>
          {[
            ['Order ID', `#${orderResult.order_id}`],
            ['Estimated Time', orderResult.eta],
            ['Delivery Partner', orderResult.delivery_partner],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ color: '#64748B' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        <button id="track-my-order-btn" className="btn btn-primary" onClick={() => navigate('/orders')}
          style={{ borderRadius: 14, width: '100%', maxWidth: 360, padding: '15px' }}>
          📦 Track My Order
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/home')}
          style={{ borderRadius: 14, width: '100%', maxWidth: 360, padding: '15px', marginTop: 12 }}>
          Back to Home
        </button>
      </div>
    )
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
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>🛒 Checkout</h1>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Order items */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Order Summary</div>
          {cart.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < cart.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Qty: {item.qty} × ₹{item.price}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#1A1A2E' }}>₹{(item.price * item.qty).toFixed(0)}</div>
            </div>
          ))}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid #EEF2FF' }}>
            {[
              ['Subtotal', `₹${total.toFixed(0)}`],
              ['Delivery Fee', '₹49'],
              ['Discount', '₹0'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748B', fontSize: 13 }}>{k}</span>
                <span style={{ fontSize: 13 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #EEF2FF' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#3B5EF8' }}>₹{(total + 49).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery details */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📍 Delivery Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Delivery Address *</label>
              <textarea id="checkout-address" className="input-field"
                placeholder="Enter your full delivery address..."
                rows={3}
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                style={{ resize: 'none' }}
              />
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
          </div>
        </div>

        {/* Payment */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>💳 Payment Method</div>
          {['Cash on Delivery', 'UPI', 'Card'].map((method, i) => (
            <label key={method} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer',
            }}>
              <input type="radio" name="payment" defaultChecked={i === 0}
                style={{ accentColor: '#3B5EF8', width: 16, height: 16 }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{method}</span>
            </label>
          ))}
        </div>

        <button id="place-order-btn"
          className="btn btn-primary btn-block"
          onClick={placeOrder}
          disabled={placing}
          style={{ borderRadius: 14, fontSize: 16, padding: '16px', opacity: placing ? 0.7 : 1 }}>
          {placing ? '⏳ Placing Order...' : `✅ Place Order · ₹${(total + 49).toFixed(0)}`}
        </button>
      </div>
    </div>
  )
}
