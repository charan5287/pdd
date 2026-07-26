import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import BottomNav, { SideNav } from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { smartAPI } from '../api/client'

// Pages
import HomePage from './patient/HomePage'
import MedicinesPage from './patient/MedicinesPage'
import ScanPage from './patient/ScanPage'
import PharmacyPage from './patient/PharmacyPage'
import ProfilePage from './patient/ProfilePage'
import RemindersPage from './patient/RemindersPage'
import AdherencePage from './patient/AdherencePage'
import OrdersPage from './patient/OrdersPage'
import PrescriptionsPage from './patient/PrescriptionsPage'
import ChatPage from './patient/ChatPage'
import EmergencyPage from './patient/EmergencyPage'
import CheckoutPage from './patient/CheckoutPage'
import DoctorSummaryPage from './patient/DoctorSummaryPage'

export default function PatientApp() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState([])
  const [adherence, setAdherence] = useState(null)
  const [refills, setRefills] = useState([])
  const [expiries, setExpiries] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [inv, adh, ref, exp] = await Promise.all([
        smartAPI.getInventory(user.id),
        smartAPI.getAdherence(user.id),
        smartAPI.getRefills(user.id),
        smartAPI.getExpiries(user.id),
      ])
      setInventory(inv.data || [])
      setAdherence(adh.data)
      setRefills(ref.data?.to_refill || [])
      setExpiries(exp.data || [])
    } catch (e) {
      console.error('Failed to load dashboard data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [user?.id])

  const sharedProps = { inventory, adherence, refills, expiries, loading, onRefresh: loadData }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Desktop sidebar */}
      <SideNav />

      {/* Main content */}
      <div style={{ flex: 1, paddingBottom: 72 }}>
        <Routes>
          <Route path="/home" element={<HomePage {...sharedProps} />} />
          <Route path="/medicines" element={<MedicinesPage inventory={inventory} onRefresh={loadData} />} />
          <Route path="/scan" element={<ScanPage onRefresh={loadData} />} />
          <Route path="/pharmacy" element={<PharmacyPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/adherence" element={<AdherencePage adherence={adherence} />} />
          <Route path="/doctor-summary" element={<DoctorSummaryPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/prescriptions" element={<PrescriptionsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
