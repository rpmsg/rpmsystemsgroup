import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchAthleteMessages, getSignedMessageUrl } from '../../lib/messagesApi'

function formatDur(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function AthleteInbox({ athlete, team, pin }) {
  const [messages,    setMessages]    = useState(null)
  const [playing,     setPlaying]     = useState(null)  // { id, url, mediaType }
  const [loadingPlay, setLoadingPlay] = useState(null)
  const [error,       setError]       = useState('')

  async function loadMessages() {
    try {
      const msgs = await fetchAthleteMessages(athlete.id, team.id)
      setMessages(msgs)
    } catch { /* keep existing if reload fails */ }
  }

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`inbox-${athlete.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'message_notifications',
        filter: `athlete_id=eq.${athlete.id}`,
      }, loadMessages)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [athlete.id, team.id])

  async function handlePlay(msg) {
    if (playing?.id === msg.id) { setPlaying(null); return }
    setError('')
    setLoadingPlay(msg.id)
    try {
      const url = await getSignedMessageUrl(athlete.id, team.id, msg.id, pin)
      setPlaying({ id: msg.id, url, mediaType: msg.media_type })
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
      ))
    } catch (e) {
      setError(e.message || 'Could not load message. Please try again.')
    } finally {
      setLoadingPlay(null)
    }
  }

  if (messages === null) return <div className="spinner" style={{ margin: '40px auto' }} />

  const unread = messages.filter(m => !m.is_read).length

  return (
    <div>
      {unread > 0 && (
        <div style={{ marginBottom: 20, padding: '10px 16px', background: 'rgba(26,122,74,0.12)', border: '1px solid rgba(67,184,120,0.4)', borderRadius: 8, fontSize: 13, color: '#43B878', fontWeight: 600 }}>
          {unread} unread message{unread !== 1 ? 's' : ''}
        </div>
      )}

      {messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mid)', fontSize: 13 }}>
          No messages yet. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              padding: '14px 16px', borderRadius: 8,
              background: msg.is_read ? 'var(--d3)' : 'rgba(26,122,74,0.08)',
              border: msg.is_read ? '1px solid var(--bdr)' : '1px solid rgba(67,184,120,0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {!msg.is_read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#43B878', flexShrink: 0, display: 'inline-block' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--w)' }}>
                      Message from your practitioner
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                      {new Date(msg.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {msg.duration_seconds ? ` · ${formatDur(msg.duration_seconds)}` : ''}
                      {msg.is_read && msg.read_at ? ` · Read ${new Date(msg.read_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  className="btn bp bsm"
                  onClick={() => handlePlay(msg)}
                  disabled={loadingPlay === msg.id}
                  style={{ flexShrink: 0 }}
                >
                  {loadingPlay === msg.id ? '…' : playing?.id === msg.id ? '⏹ Close' : '▶ Play'}
                </button>
              </div>

              {playing?.id === msg.id && (
                <div style={{ marginTop: 12 }}>
                  {playing.mediaType === 'video' ? (
                    <video src={playing.url} controls autoPlay playsInline
                      style={{ width: '100%', borderRadius: 8, maxHeight: 280 }}
                    />
                  ) : (
                    <audio src={playing.url} controls autoPlay style={{ width: '100%' }} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  )
}
