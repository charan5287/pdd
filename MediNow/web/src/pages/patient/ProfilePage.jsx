import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

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
    { icon: '📦', label: 'My Orders', path: '/orders' },
    { icon: '📋', label: 'Prescriptions', path: '/prescriptions' },
    { icon: '⏰', label: 'Medicine Reminders', path: '/reminders' },
    { icon: '📊', label: 'Adherence Analytics', path: '/adherence' },
    { icon: '🤖', label: 'AI Assistant', path: '/chat' },
    { icon: '🆘', label: 'Emergency SOS', path: '/emergency' },
  ]

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 48px', borderRadius: '0 0 36px 36px',
        position: 'relative', overflow: 'hidden',
      }}>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, marginBottom: 24 }}>👤 Profile</h1>
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
              {user?.fullName || 'User'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{user?.email}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
              Member since {joinDate}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', marginTop: -8 }}>
        {/* Edit Profile Card */}
        <div className="card fade-in" style={{ marginBottom: 16, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Personal Information</h3>
            <button id="edit-profile-btn"
              onClick={() => editing ? saveProfile() : setEditing(true)}
              style={{
                background: '#EEF2FF', color: '#3B5EF8',
                borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600,
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
                ['👤 Full Name', user?.fullName || 'Not set'],
                ['📧 Email', user?.email || 'Not set'],
                ['📱 Phone', user?.phone || 'Not set'],
                ['🏷️ Role', user?.role === 'pharmacy' ? 'Pharmacy' : 'Patient'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ color: '#64748B', fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Quick Access</h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {menuItems.map((item, i) => (
              <button key={item.path} id={`profile-menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 0', borderBottom: i < menuItems.length - 1 ? '1px solid #F1F5F9' : 'none',
                  color: '#1A1A2E', textAlign: 'left', width: '100%',
                }}>
                <span style={{ fontSize: 20, width: 30, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{item.label}</span>
                <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div className="card" style={{ marginBottom: 16, padding: 16, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, background: '#3B5EF8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>❤️</div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#1A1A2E' }}>MediNow</span>
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>Version 2.0.0 · Web App</div>
          <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
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
