import React, { useState, useEffect, useRef } from 'react'
import { aiAPI } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

function MarkdownText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        return part
      })}
    </span>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: "Hello! I'm MediNow Pro, your AI health assistant. I can answer questions about your medicines, symptoms, health tips, and more. How can I help you today? 😊",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef()
  const { user } = useAuth()

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))

    try {
      const res = await aiAPI.chat(userMsg, history, user?.id)
      setMessages(prev => [...prev, { role: 'bot', content: res.data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm having trouble connecting right now. Please check your internet and try again. For emergencies, call 108. *AI only. Consult a doctor.*",
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const quickReplies = [
    "What medicines am I taking?",
    "What should I do for a fever?",
    "Explain my adherence score",
    "Can I take Paracetamol with Ibuprofen?",
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F8FF' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D47A1, #1976D2, #42A5F5)',
        padding: '52px 24px 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, background: 'rgba(255,255,255,0.2)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🤖</div>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>MediNow Pro AI</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-block', width: 7, height: 7, background: '#00C896',
                borderRadius: '50%',
              }} />
              Always here for you
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            {msg.role === 'bot' && (
              <div style={{
                width: 32, height: 32, background: '#EEF2FF', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end',
              }}>🤖</div>
            )}
            <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
              {msg.content.split('\n').map((line, j) => (
                <div key={j}>{line ? <MarkdownText text={line} /> : <br />}</div>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{
              width: 32, height: 32, background: '#EEF2FF', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>🤖</div>
            <div className="chat-bubble bot" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, background: '#94A3B8', borderRadius: '50%',
                    animation: `bounce 1.2s ease infinite ${i * 0.15}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick replies */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {quickReplies.map((q, i) => (
            <button key={i}
              id={`quick-reply-${i}`}
              onClick={() => { setInput(q); }}
              style={{
                padding: '8px 14px', borderRadius: 20,
                background: 'white', border: '1.5px solid #E2E8F0',
                color: '#3B5EF8', fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
              }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px 24px',
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          id="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about symptoms, medicines, health tips..."
          rows={1}
          style={{
            flex: 1, borderRadius: 14, border: '1.5px solid #E2E8F0',
            padding: '12px 16px', fontSize: 14, outline: 'none', resize: 'none',
            maxHeight: 120, fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#3B5EF8'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
        <button id="chat-send-btn"
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: input.trim() ? '#3B5EF8' : '#E2E8F0',
            color: input.trim() ? 'white' : '#94A3B8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'all 0.2s', flexShrink: 0,
          }}>
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  )
}
