import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/home',      icon: '🏠', label: 'Home' },
  { path: '/medicines', icon: '💊', label: 'Meds' },
  { path: '/scan',      icon: '📷', label: 'Scan', special: true },
  { path: '/pharmacy',  icon: '🏪', label: 'Nearby' },
  { path: '/profile',   icon: '👤', label: 'Profile' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        if (item.special) {
          return (
            <button
              key={item.path}
              id={`nav-${item.label.toLowerCase()}`}
              className="nav-item scan-btn"
              onClick={() => navigate(item.path)}
            >
              <span style={{ fontSize: 20, fontWeight: 800 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, marginTop: 1, color: '#070D1B' }}>{item.label}</span>
            </button>
          )
        }
        return (
          <button
            key={item.path}
            id={`nav-${item.label.toLowerCase()}`}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function SideNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const allItems = [
    ...navItems,
    { path: '/reminders',    icon: '⏰', label: 'Reminders' },
    { path: '/adherence',    icon: '📊', label: 'Adherence' },
    { path: '/orders',       icon: '📦', label: 'My Orders' },
    { path: '/prescriptions',icon: '📋', label: 'Prescriptions' },
    { path: '/chat',         icon: '🤖', label: 'AI Assistant' },
    { path: '/emergency',    icon: '🆘', label: 'Emergency' },
  ]

  return (
    <aside className="side-drawer">
      <div className="drawer-logo">
        <span style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #00D4AA, #00A888)',
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>💊</span>
        <span>MediNow</span>
      </div>

      {allItems.map(item => {
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            id={`sidenav-${item.label.toLowerCase().replace(/ /g, '-')}`}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </aside>
  )
}
