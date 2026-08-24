import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { pharmacyAPI, smartAPI } from '../../api/client'

const CATEGORIES = ['All', 'Pain Relief', 'Antibiotics', 'Gastro', 'Heart', 'Diabetes', 'Allergy', 'Vitamins', 'Herbal']

export default function MedicinesPage({ inventory, onRefresh }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ medicine_name: '', quantity: 10, daily_dosage: 1 })
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchMedicines = useCallback(async (q) => {
    setLoading(true)
    try {
      const res = await pharmacyAPI.searchMedicines(q)
      setMedicines(res.data)
    } catch {
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchMedicines(search), 400)
    return () => clearTimeout(timer)
  }, [search, fetchMedicines])

  const filtered = category === 'All' ? medicines : medicines.filter(m => m.category === category)

  const addToCart = (med) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === med.id)
      if (exists) return prev.map(i => i.id === med.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...med, qty: 1 }]
    })
    showToast(`${med.name} added to cart 🛒`, 'success')
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const addToInventory = async () => {
    if (!addForm.medicine_name) return showToast('Enter medicine name', 'error')
    try {
      await smartAPI.addToInventory({ user_id: user.id, ...addForm })
      showToast('Medicine added to inventory!', 'success')
      setShowAddModal(false)
      setAddForm({ medicine_name: '', quantity: 10, daily_dosage: 1 })
      onRefresh()
    } catch {
      showToast('Failed to add medicine', 'error')
    }
  }

  const stockColor = (s) => s === 'High' ? '#00D4AA' : s === 'Medium' ? '#F59E0B' : '#FF4B6E'
  const stockBg   = (s) => s === 'High' ? 'rgba(0,212,170,0.1)' : s === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(255,75,110,0.1)'
  const stockBorder = (s) => s === 'High' ? 'rgba(0,212,170,0.2)' : s === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(255,75,110,0.2)'

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 900 }}>💊 Medicines</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="add-inventory-btn" onClick={() => setShowAddModal(true)}
              className="icon-btn" title="Add to Inventory">➕</button>
            <button id="view-cart-btn" onClick={() => setShowCart(true)}
              className="icon-btn" style={{ position: 'relative' }}>
              🛒
              {cart.length > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'linear-gradient(135deg, #FF4B6E, #CC2244)',
                  color: 'white', borderRadius: '50%', width: 18, height: 18,
                  fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, boxShadow: '0 0 8px rgba(255,75,110,0.5)',
                }}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input id="medicine-search" className="input-field"
            style={{ paddingLeft: 40, borderRadius: 14, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
            placeholder="Search medicines, generics..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} id={`cat-${cat.toLowerCase()}`}
              onClick={() => setCategory(cat)}
              className={`chip${category === cat ? ' active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Your Inventory Section */}
        {inventory.length > 0 && !search && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <span className="section-title">📦 Your Inventory</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 20, padding: '2px 10px' }}>
                {inventory.length} items
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inventory.map(med => {
                const daysLeft = Math.floor((med.quantity_remaining || 0) / (med.daily_dosage || 1))
                const isLow = daysLeft <= 3
                return (
                  <div key={med.id} className="medicine-card">
                    <div className="med-icon" style={{
                      background: isLow ? 'rgba(255,75,110,0.1)' : 'rgba(0,212,170,0.1)',
                      border: `1px solid ${isLow ? 'rgba(255,75,110,0.2)' : 'rgba(0,212,170,0.2)'}`,
                    }}>
                      <span style={{ fontSize: 22 }}>{isLow ? '⚠️' : '💊'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{med.medicine_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {med.quantity_remaining} left · {daysLeft} days supply
                      </div>
                    </div>
                    {isLow && <span className="badge badge-red">Low</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Medicine Catalog */}
        <div className="section-header">
          <span className="section-title">🏪 Browse Medicines</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 20, padding: '2px 10px' }}>
            {filtered.length} items
          </span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try a different search term or category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(med => (
              <div key={med.id} className="medicine-card"
                onClick={() => setSelected(med)}
                id={`med-card-${med.id}`}>
                <div className="med-icon" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.15)' }}>
                  <span style={{ fontSize: 22 }}>💊</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{med.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.generic} · {med.dosage}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>₹{med.price}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: stockBg(med.stock), color: stockColor(med.stock),
                    border: `1px solid ${stockBorder(med.stock)}`,
                  }}>{med.stock}</span>
                  <button id={`add-cart-${med.id}`}
                    onClick={e => { e.stopPropagation(); addToCart(med) }}
                    style={{
                      background: 'linear-gradient(135deg, #00D4AA, #00A888)',
                      color: '#070D1B', borderRadius: 8,
                      padding: '5px 12px', fontSize: 12, fontWeight: 800,
                      boxShadow: '0 2px 10px rgba(0,212,170,0.3)',
                    }}>
                    + Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cart.length > 0 && (
        <button id="checkout-fab"
          onClick={() => navigate('/checkout', { state: { cart } })}
          style={{
            position: 'fixed', bottom: 92, right: 20,
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
            color: '#070D1B', borderRadius: 18,
            padding: '13px 22px', fontSize: 14, fontWeight: 800,
            boxShadow: '0 8px 28px rgba(0,212,170,0.5)',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 100,
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
          🛒 Checkout ({cartCount}) · ₹{cartTotal.toFixed(0)}
        </button>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="modal-overlay" onClick={() => setShowCart(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">🛒 Cart ({cartCount} items)</h3>
              <button onClick={() => setShowCart(false)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
            </div>
            {cart.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                <h3>Cart is empty</h3>
              </div>
            ) : (
              <>
                {cart.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qty: {item.qty} × ₹{item.price}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{(item.price * item.qty).toFixed(0)}</span>
                      <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--red)', fontSize: 16 }}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--primary)' }}>₹{cartTotal.toFixed(0)}</span>
                </div>
                <button className="btn btn-primary btn-block" style={{ borderRadius: 14 }}
                  onClick={() => { setShowCart(false); navigate('/checkout', { state: { cart } }) }}>
                  Proceed to Checkout →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Medicine Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.15)',
                borderRadius: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'center',
              }}>
                <span style={{ fontSize: 40 }}>💊</span>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.generic}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>₹{selected.price}</div>
                </div>
              </div>
              {[
                ['Category', selected.category],
                ['Dosage', selected.dosage],
                ['Stock', selected.stock],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{k}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
              <button id="add-to-cart-modal-btn"
                className="btn btn-primary btn-block" style={{ borderRadius: 14 }}
                onClick={() => { addToCart(selected); setSelected(null) }}>
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Inventory Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Add to Inventory</h3>
              <button onClick={() => setShowAddModal(false)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Medicine Name *</label>
                <input className="input-field" placeholder="e.g., Paracetamol"
                  value={addForm.medicine_name}
                  onChange={e => setAddForm(f => ({ ...f, medicine_name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Quantity *</label>
                <input type="number" className="input-field" placeholder="10"
                  value={addForm.quantity}
                  onChange={e => setAddForm(f => ({ ...f, quantity: +e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Daily Dosage *</label>
                <input type="number" className="input-field" placeholder="1"
                  value={addForm.daily_dosage}
                  onChange={e => setAddForm(f => ({ ...f, daily_dosage: +e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1, borderRadius: 12 }}
                  onClick={() => setShowAddModal(false)}>Cancel</button>
                <button id="confirm-add-inventory-btn"
                  className="btn btn-primary" style={{ flex: 1, borderRadius: 12 }}
                  onClick={addToInventory}>Add Medicine</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
