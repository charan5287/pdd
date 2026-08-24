import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function PharmacyProfile() {
  const { user, logout, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' })

  const handleLogout = () => {
    logout()
    navigate('/onboarding')
  }

  const saveProfile = () => {
    updateUser(form)
    setEditing(false)
    showToast('Pharmacy profile updated!', 'success')
  }

  const avatarLetter = (user?.fullName || user?.email || 'P')[0].toUpperCase()
  const joinDate = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #007A5E, #00C896)',
        padding: '52px 24px 48px', borderRadius: '0 0 36px 36px',
        position: 'relative', overflow: 'hidden',
      }}>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 24 }}>👤 Pharmacy Profile</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 72, height: 72, background: 'rgba(255,255,255,0.25)',
            borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 800, color: 'white',
            border: '3px solid rgba(255,255,255,0.5)',
          }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>
              {user?.fullName || 'Pharmacy Owner'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{user?.email}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Partner since {joinDate}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', marginTop: -8 }}>
        {/* Profile Info Card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Partner Details</h3>
            <button id="edit-profile-btn"
              onClick={() => editing ? saveProfile() : setEditing(true)}
              style={{
                background: '#E6FFF7', color: '#007A5E',
                borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer'
              }}>
              {editing ? '💾 Save' : '✏️ Edit'}
            </button>
          </div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input className="input-field" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input className="input-field" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Email (read only)</label>
                <input className="input-field" value={user?.email || ''} disabled
                  style={{ background: '#F8FAFC', color: '#94A3B8' }} />
              </div>
            </div>
          ) : (
            <div>
              {[
                ['👤 Owner Name', user?.fullName || 'Not set'],
                ['📧 Registered Email', user?.email || 'Not set'],
                ['📱 Contact Phone', user?.phone || 'Not set'],
                ['🏷️ Role Account', 'Pharmacy Admin'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B', fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions / Navigation */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button id="pharmacy-action-dashboard"
              onClick={() => navigate('/pharmacy/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 0', borderBottom: '1px solid #F1F5F9',
                color: '#1A1A2E', textAlign: 'left', width: '100%',
                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer'
              }}>
              <span style={{ fontSize: 20, width: 30, textAlign: 'center' }}>📊</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>Manage Inventory & Stats</span>
              <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
            </button>
            <button id="pharmacy-action-orders"
              onClick={() => navigate('/pharmacy/orders')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 0', borderBottom: 'none',
                color: '#1A1A2E', textAlign: 'left', width: '100%',
                background: 'none', border: 'none', cursor: 'pointer'
              }}>
              <span style={{ fontSize: 20, width: 30, textAlign: 'center' }}>📦</span>
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>Incoming Orders</span>
              <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="card" style={{ marginBottom: 16, padding: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: '#00C896', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏥</div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#1A1A2E' }}>MediNow Portal</span>
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>Version 2.0.0 · Pharmacy Web Admin</div>
          <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
            Built with ❤️ for pharmacy partners
          </div>
        </div>

        {/* Logout */}
        <button id="logout-btn"
          className="btn btn-danger btn-block"
          onClick={handleLogout}
          style={{ borderRadius: 14, padding: '15px', fontSize: 15, marginBottom: 32, cursor: 'pointer', background: '#FF5252', color: 'white', border: 'none', fontWeight: 600 }}>
          🚪 Sign Out Partner Account
        </button>
      </div>
    </div>
  )
}
