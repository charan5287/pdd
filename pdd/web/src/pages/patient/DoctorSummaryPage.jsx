import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

// Simple helper to parse Markdown line by line for clean JSX rendering
function formatMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    let cleanLine = line.trim()
    if (!cleanLine) return <div key={idx} style={{ height: 12 }} />

    // Headings
    if (cleanLine.startsWith('# ')) {
      return <h2 key={idx} style={{ color: '#1A1A2E', fontWeight: 800, fontSize: 20, marginTop: 20, marginBottom: 10 }}>{cleanLine.replace('# ', '')}</h2>
    }
    if (cleanLine.startsWith('## ')) {
      return <h3 key={idx} style={{ color: '#0D47A1', fontWeight: 700, fontSize: 17, marginTop: 16, marginBottom: 8 }}>{cleanLine.replace('## ', '')}</h3>
    }
    if (cleanLine.startsWith('### ')) {
      return <h4 key={idx} style={{ color: '#1976D2', fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 6 }}>{cleanLine.replace('### ', '')}</h4>
    }

    // Bullet points
    if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
      const bulletText = cleanLine.substring(2)
      return (
        <div key={idx} style={{ display: 'flex', gap: 8, margin: '6px 0 6px 12px', alignItems: 'flex-start' }}>
          <span style={{ color: '#3B5EF8', fontSize: 14 }}>•</span>
          <span style={{ color: '#4A4A4A', fontSize: 13, lineHeight: 1.5 }}>
            {parseInlineStyles(bulletText)}
          </span>
        </div>
      )
    }

    // Normal paragraph
    return (
      <p key={idx} style={{ color: '#4A4A4A', fontSize: 14, lineHeight: 1.6, margin: '8px 0' }}>
        {parseInlineStyles(cleanLine)}
      </p>
    )
  })
}

// Parse **bold** tags inline
function parseInlineStyles(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700, color: '#1A1A2E' }}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function DoctorSummaryPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReport = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await aiAPI.getDoctorReport(user.id)
        setReport(res.data?.report || '')
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to generate report. Make sure Gemini API Key is configured.', 'error')
        setReport('# AI Service Error\nUnable to generate report at this time. Please check your connection or AI quota.')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [user?.id])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'MediNow Doctor Visit Summary',
        text: report,
      }).catch(err => console.log(err))
    } else {
      navigator.clipboard.writeText(report)
      showToast('Report copied to clipboard! 📋', 'success')
    }
  }

  return (
    <div style={{ background: '#F5F8FF', minHeight: '100vh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 24px', borderRadius: '0 0 32px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'white', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>←</button>
          <div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>Doctor Visit Summary</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>AI-powered health trends</p>
          </div>
        </div>
        <button id="share-report-btn" onClick={handleShare}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
            padding: '10px 14px', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>
          🔗 Share
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Info Box */}
        <div className="card fade-in" style={{
          background: 'rgba(59, 94, 248, 0.05)', border: '1px solid rgba(59, 94, 248, 0.1)',
          borderRadius: 16, padding: 16, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20
        }}>
          <span style={{ fontSize: 22 }}>✨</span>
          <p style={{ fontSize: 12, color: '#3B5EF8', fontWeight: 500, lineHeight: 1.4, margin: 0 }}>
            This report is generated by AI based on your logged doses and symptoms.
          </p>
        </div>

        {/* Main Report Card */}
        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <div style={{ fontWeight: 600, color: '#64748B', fontSize: 14 }}>
              AI is analyzing your health trends...
            </div>
          </div>
        ) : (
          <div className="card fade-in" style={{ padding: 24, background: 'white', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: 24 }}>
            <div style={{ wordBreak: 'break-word' }}>
              {formatMarkdown(report)}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/adherence')}
          className="btn btn-primary btn-block"
          style={{ borderRadius: 14, padding: 15, fontWeight: 700, fontSize: 15 }}>
          Back to Health Dashboard
        </button>
      </div>
    </div>
  )
}
