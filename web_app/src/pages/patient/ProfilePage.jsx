import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const SAVED_ADDRESSES = [
  { id: 1, label: '🏠 Home', address: 'Add home address', saved: false },
  { id: 2, label: '💼 Work', address: 'Add work address', saved: false },
]

export default function ProfilePage() {
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
    showToast('Profile updated!', 'success')
  }

  const avatarLetter = (user?.fullName || user?.email || 'U')[0].toUpperCase()
  const joinDate = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const menuItems = [
    { icon: '📦', label: 'My Orders', path: '/orders', color: '#00D4AA', bg: 'rgba(0,212,170,0.1)' },
    { icon: '📋', label: 'Prescriptions', path: '/prescriptions', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
    { icon: '⏰', label: 'Medicine Reminders', path: '/reminders', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { icon: '📊', label: 'Adherence Analytics', path: '/adherence', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    { icon: '🤖', label: 'AI Assistant', path: '/chat', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
    { icon: '🆘', label: 'Emergency SOS', path: '/emergency', color: '#FF4B6E', bg: 'rgba(255,75,110,0.1)' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0D2A45 60%, #0A3D52 100%)',
        padding: '52px 24px 52px',
        borderRadius: '0 0 32px 32px',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid rgba(0,212,170,0.12)',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)', pointerEvents: 'none',
        }} />
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, marginBottom: 24 }}>👤 Profile</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <div style={{
            width: 76, height: 76,
            background: 'linear-gradient(135deg, #00D4AA, #00A888)',
            borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, fontWeight: 900, color: '#070D1B',
            boxShadow: '0 8px 24px rgba(0,212,170,0.4)',
          }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 20 }}>
              {user?.fullName || 'User'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user?.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                borderRadius: 20, padding: '3px 10px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 5px #00D4AA' }} />
                <span style={{ color: '#00D4AA', fontSize: 11, fontWeight: 700 }}>
                  {user?.role === 'pharmacy' ? 'Pharmacy' : 'Patient'} · Since {joinDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', marginTop: -8 }}>
        {/* Edit Profile Card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Personal Information</h3>
            <button id="edit-profile-btn"
              onClick={() => editing ? saveProfile() : setEditing(true)}
              style={{
                background: editing ? 'linear-gradient(135deg, #00D4AA, #00A888)' : 'rgba(0,212,170,0.1)',
                color: editing ? '#070D1B' : 'var(--primary)',
                border: '1px solid rgba(0,212,170,0.2)',
                borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700,
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
                  style={{ background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              </div>
            </div>
          ) : (
            <div>
              {[
                ['👤 Full Name', user?.fullName || 'Not set'],
                ['📧 Email', user?.email || 'Not set'],
                ['📱 Phone', user?.phone || 'Not set'],
                ['🏷️ Role', user?.role === 'pharmacy' ? 'Pharmacy' : 'Patient'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address Book */}
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>📍 Saved Addresses</h3>
            <button style={{
              background: 'rgba(0,212,170,0.1)', color: 'var(--primary)',
              border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: '5px 12px',
              fontSize: 12, fontWeight: 700,
            }} onClick={() => showToast('Address book coming soon!', 'info')}>
              + Add
            </button>
          </div>
          {SAVED_ADDRESSES.map((addr, i) => (
            <div key={addr.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: i < SAVED_ADDRESSES.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 40, height: 40, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>{addr.label.split(' ')[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{addr.label.split(' ').slice(1).join(' ')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{addr.address}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>

        {/* Quick Navigation */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>Quick Access</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {menuItems.map((item, i) => (
              <button key={item.path} id={`profile-menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 0', borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none',
                  color: 'var(--text-primary)', textAlign: 'left', width: '100%',
                }}>
                <div style={{
                  width: 36, height: 36, background: item.bg, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                }}>{item.icon}</div>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{item.label}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="card" style={{ marginBottom: 16, padding: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg, #00D4AA, #00A888)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 14px rgba(0,212,170,0.35)',
            }}>💊</div>
            <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-primary)' }}>MediNow</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Version 2.0.0 · Web App</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Built with ❤️ for better healthcare
          </div>
        </div>

        {/* Logout */}
        <button id="logout-btn"
          className="btn btn-danger btn-block"
          onClick={handleLogout}
          style={{ borderRadius: 14, padding: '15px', fontSize: 15, marginBottom: 32 }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}
