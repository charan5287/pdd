import React from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PharmacyDashboard from './pharmacy/PharmacyDashboard'
import PharmacyOrders from './pharmacy/PharmacyOrders'
import PharmacyProfile from './pharmacy/PharmacyProfile'

const navItems = [
  { path: '/pharmacy/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/pharmacy/orders', icon: '📦', label: 'Orders' },
  { path: '/pharmacy/profile', icon: '👤', label: 'Profile' },
]

export default function PharmacyApp() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', background: '#F5F8FF' }}>
      {/* Top header */}
      <div style={{
        background: 'linear-gradient(135deg, #007A5E, #00C896)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'white', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🏥</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>MediNow Pharmacy</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Admin Portal</div>
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
          {user?.fullName?.split(' ')[0] || 'Admin'} ›
        </div>
      </div>

      <div style={{ paddingBottom: 80 }}>
        <Routes>
          <Route path="/dashboard" element={<PharmacyDashboard />} />
          <Route path="/orders" element={<PharmacyOrders />} />
          <Route path="/profile" element={<PharmacyProfile />} />
          <Route path="*" element={<Navigate to="/pharmacy/dashboard" replace />} />
        </Routes>
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #E2E8F0',
        display: 'flex', height: 72,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
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
                background: isActive ? '#E6FFF7' : 'transparent',
                color: isActive ? '#00C896' : '#94A3B8',
                fontWeight: isActive ? 700 : 500, fontSize: 11,
              }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
