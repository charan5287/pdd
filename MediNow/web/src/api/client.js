import axios from 'axios'

const BASE_URL = 'https://medinow-api.onrender.com'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 120s — AI prescription OCR can take up to 90s across model fallbacks
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  firebaseLogin: (idToken, role, fullName, phone) =>
    api.post('/auth/firebase', { idToken, role, fullName, phone }),
  getMe: () => api.get('/auth/me'),
}

// Smart / Inventory / Adherence
export const smartAPI = {
  getInventory: (userId) => api.get(`/smart/inventory/${userId}`),
  addToInventory: (data) => api.post('/smart/add', data),
  takeDose: (userId, medicineName) => api.post(`/smart/take/${userId}/${medicineName}`),
  logDose: (data) => api.post('/smart/log-dose', data),
  getAdherence: (userId) => api.get(`/smart/adherence/${userId}`),
  getRefills: (userId) => api.get(`/smart/refills/${userId}`),
  getExpiries: (userId) => api.get(`/smart/expiries/${userId}`),
  getReminders: (userId) => api.get(`/smart/reminders/${userId}`),
  saveReminder: (data) => api.post('/smart/reminders', data),
  deleteReminder: (reminderId) => api.delete(`/smart/reminders/${reminderId}`),
  toggleReminder: (reminderId) => api.patch(`/smart/reminders/${reminderId}/toggle`),
  saveHealthLog: (data) => api.post('/smart/health-log', data),
  getHealthLogs: (userId) => api.get(`/smart/health-logs/${userId}`),
}

// Pharmacy / Orders / Medicines
export const pharmacyAPI = {
  getNearby: (lat, lng, radius = 8000) =>
    api.get('/pharmacy/nearby', { params: { lat, lng, radius } }),
  getHospitals: (lat, lng, radius = 8000) =>
    api.get('/pharmacy/hospitals', { params: { lat, lng, radius } }),
  searchMedicines: (query = '') =>
    api.get('/pharmacy/medicines', { params: { query } }),
  placeOrder: (data) => api.post('/pharmacy/order', data),
  getUserOrders: (userId) => api.get(`/pharmacy/orders/${userId}`),
  getAllOrders: () => api.get('/pharmacy/all-orders'),
  updateOrderStatus: (orderId, status) =>
    api.patch(`/pharmacy/order/${orderId}/status`, null, { params: { status } }),
}

// Prescriptions
export const prescriptionAPI = {
  scan: (file, token) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/prescription/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getHistory: (userId) => api.get(`/prescription/history/${userId}`),
}

// AI Chat
export const aiAPI = {
  chat: (message, history = [], userId = null) =>
    api.post('/ai/chat', { message, history, user_id: userId }),
  getDoctorReport: (userId) => api.get(`/ai/doctor-report/${userId}`),
}

export default api
