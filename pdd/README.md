# 🏥 MediNow — AI-Powered Medicine Management App

A full-stack healthcare application with AI prescription scanning, medicine reminders, adherence analytics, and pharmacy ordering.

## 📁 Project Structure

```
pdd/
├── backend/          # FastAPI Python backend (hosted on Render)
├── frontend/         # Flutter mobile app (Android)
└── web/              # React web admin panel (Vite)
```

## 🚀 Features

- 📷 **AI Prescription Scanner** — Gemini Vision OCR reads handwritten prescriptions
- 💊 **Medicine Inventory** — Track doses, expiry dates, and refill alerts
- 🔔 **Smart Reminders** — Scheduled local notifications with "Mark Taken" action
- 📊 **Adherence Analytics** — 30-day score, weekly chart, AI-generated insights
- 🤖 **AI Health Chat** — Medical assistant powered by Gemini
- 🏪 **Pharmacy Finder** — Nearby pharmacies/hospitals via OpenStreetMap
- 🛒 **Medicine Ordering** — Cart, checkout, and real-time Firestore order tracking
- 👨‍⚕️ **Doctor Summary** — AI-generated patient health report for doctor visits
- 🚨 **Emergency Screen** — One-tap call to 108/102/104 + nearest hospitals

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | Flutter (Dart) |
| Backend API | FastAPI + SQLite → Render |
| Authentication | Firebase Auth (Email + Google Sign-In) |
| Database | Cloud Firestore |
| AI Engine | Google Gemini API |
| Maps | OpenStreetMap Overpass API |

## ⚙️ Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY, SECRET_KEY
uvicorn main:app --reload
```

### Flutter App
```bash
cd frontend
flutter pub get
flutter run
# For production build with secure API key:
flutter build apk --dart-define=GEMINI_API_KEY=your_key
```

### Web Admin Panel
```bash
cd web
npm install
npm run dev
```

## 🔑 Environment Variables (backend/.env)

```env
GEMINI_API_KEY=your_gemini_key
SECRET_KEY=your_jwt_secret
PLACES_API_KEY=          # Optional: Google Places API
DATABASE_URL=            # Optional: PostgreSQL for persistent storage
```

## 📱 Download

See [Releases](../../releases) for the latest APK.
