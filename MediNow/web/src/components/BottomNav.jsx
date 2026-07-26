import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/home', icon: '🏠', label: 'Home' },
  { path: '/medicines', icon: '💊', label: 'Medicines' },
  { path: '/scan', icon: '📷', label: 'Scan', special: true },
  { path: '/pharmacy', icon: '🏪', label: 'Pharmacy' },
  { path: '/profile', icon: '👤', label: 'Profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            id={`nav-${item.label.toLowerCase()}`}
            className={`nav-item${isActive ? ' active' : ''}${item.special ? ' scan-btn' : ''}`}
            onClick={() => navigate(item.path)}
            style={item.special ? {
              background: 'linear-gradient(135deg, #0D47A1, #42A5F5)',
              color: 'white',
              borderRadius: 14,
              padding: '10px 14px',
            } : {}}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// Desktop sidebar version
export function SideNav({ onPharmacyToggle }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside className="side-drawer">
      <div className="drawer-logo">
        <span style={{ fontSize: 24 }}>❤️</span>
        MediNow
      </div>
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            id={`sidenav-${item.label.toLowerCase()}`}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
      {/* Extra nav items */}
      {[
        { path: '/reminders', icon: '⏰', label: 'Reminders' },
        { path: '/adherence', icon: '📊', label: 'Adherence' },
        { path: '/orders', icon: '📦', label: 'Orders' },
        { path: '/prescriptions', icon: '📋', label: 'Prescriptions' },
        { path: '/chat', icon: '🤖', label: 'AI Assistant' },
        { path: '/emergency', icon: '🆘', label: 'Emergency' },
      ].map(item => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            id={`sidenav-${item.label.toLowerCase().replace(' ', '-')}`}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </aside>
  )
}
