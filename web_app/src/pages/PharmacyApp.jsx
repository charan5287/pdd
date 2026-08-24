import React from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PharmacyDashboard from './pharmacy/PharmacyDashboard'
import PharmacyOrders from './pharmacy/PharmacyOrders'
import PharmacyProfile from './pharmacy/PharmacyProfile'

const navItems = [
  { path: '/pharmacy/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/pharmacy/orders',    icon: '📦', label: 'Orders' },
  { path: '/pharmacy/profile',   icon: '👤', label: 'Profile' },
]

export default function PharmacyApp() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top header */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
          }}>🏥</div>
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 15 }}>MediNow Pharmacy</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Admin Portal</div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '5px 12px',
        }}>
          <div style={{
            width: 24, height: 24,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'white',
          }}>
            {(user?.fullName || user?.email || 'A')[0].toUpperCase()}
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
            {user?.fullName?.split(' ')[0] || 'Admin'}
          </span>
        </div>
      </div>

      <div style={{ paddingBottom: 84 }}>
        <Routes>
          <Route path="/dashboard" element={<PharmacyDashboard />} />
          <Route path="/orders"    element={<PharmacyOrders />} />
          <Route path="/profile"   element={<PharmacyProfile />} />
          <Route path="*"          element={<Navigate to="/pharmacy/dashboard" replace />} />
        </Routes>
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(7,13,27,0.9)',
        borderTop: '1px solid var(--border)',
        display: 'flex', height: 76,
        backdropFilter: 'blur(24px)',
        zIndex: 100,
      }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button key={item.path} id={`pharma-nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3,
                background: 'transparent',
                color: isActive ? '#7C3AED' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500, fontSize: 10,
                position: 'relative',
              }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 3, background: '#7C3AED',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: '0 0 10px #7C3AED',
                }} />
              )}
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
