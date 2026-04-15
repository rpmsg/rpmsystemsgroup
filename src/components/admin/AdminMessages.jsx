import { useState, useEffect, useRef } from 'react'
import { fetchAllTeams, getAdminSession } from '../../lib/adminApi'
import { fetchRosterWithMessages, sendMessage, fetchSentMessages } from '../../lib/messagesApi'

const MENTAL_LABELS = { 1: '🔴', 2: '😤', 3: '😐', 4: '🎯', 5: '🟢' }

function timerColor(s) {
  return s >= 150 ? '#e05a4a' : s >= 90 ? '#f0b030' : '#43B878'
}
function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Recording panel ────────────────────────────────────────────
function RecorderPanel({ athlete, practitionerId, teamId, onSent }) {
  const [mode,       setMode]       = useState('idle')   // idle | recording | preview | sent
  const [recordType, setRecordType] = useState(null)     // 'audio' | 'video'
  const [blob,       setBlob]       = useState(null)
  const [blobUrl,    setBlobUrl]    = useState(null)
  const [timer,      setTimer]      = useState(0)
  const [note,       setNote]       = useState('')
  const [error,      setError]      = useState('')
  const [uploading,  setUploading]  = useState(false)
  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const timerRef         = useRef(null)
  const chunksRef        = useRef([])
  const videoLiveRef     = useRef(null)
  const fileInputRef     = useRef(null)

  useEffect(() => () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  }, [blobUrl])

  // Attach live stream to video element after render
  useEffect(() => {
    if (mode === 'recording' && recordType === 'video' && videoLiveRef.current && streamRef.current) {
      videoLiveRef.current.srcObject = streamRef.current
    }
  }, [mode, recordType])

  async function startRecording(type) {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { audio: true, video: { facingMode: 'user' } } : { audio: true }
      )
      streamRef.current = stream

      const mimeTypes = type === 'video'
        ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
      const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || ''

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || (type === 'video' ? 'video/webm' : 'audio/webm') })
        setBlob(b)
        setBlobUrl(URL.createObjectURL(b))
        setMode('preview')
      }
      mr.start(1000)
      mediaRecorderRef.current = mr
      setRecordType(type)
      setTimer(0)
      setMode('recording')

      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev >= 179) { stopRecording(); return 180 }
          return prev + 1
        })
      }, 1000)
    } catch (e) {
      setError(
        e.name === 'NotAllowedError'
          ? 'Microphone/camera access denied. Use file upload instead.'
          : 'Recording not supported on this device. Use file upload instead.'
      )
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  function handleFileSelect(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('audio/') && !f.type.startsWith('video/')) {
      setError('Please select an audio or video file.'); return
    }
    if (f.size > 150 * 1024 * 1024) {
      setError('File must be under 150MB.'); return
    }
    setBlob(f)
    setBlobUrl(URL.createObjectURL(f))
    setRecordType(f.type.startsWith('video/') ? 'video' : 'audio')
    setMode('preview')
    setError('')
  }

  function handleDiscard() {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlob(null); setBlobUrl(null); setRecordType(null)
    setTimer(0); setNote(''); setError('')
    setMode('idle')
  }

  async function handleSend() {
    setError(''); setUploading(true)
    try {
      await sendMessage({
        practitionerId,
        athleteId:       athlete.id,
        teamId,
        file:            blob,
        durationSeconds: timer > 0 ? timer : null,
        note,
      })
      setMode('sent')
      onSent()
    } catch (e) {
      setError(e.message || 'Send failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (mode === 'sent') return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 600, color: 'var(--w)', marginBottom: 4 }}>
        Sent to {athlete.full_name.split(' ')[0]}
      </div>
      <button className="btn bo bsm" onClick={handleDiscard} style={{ marginTop: 12 }}>
        Send Another
      </button>
    </div>
  )

  if (mode === 'idle') return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 12 }}>
        Record or upload a message for {athlete.full_name.split(' ')[0]}:
      </div>
      {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn bo" onClick={() => startRecording('audio')} style={{ flex: 1, minWidth: 120 }}>
          🎙 Record Audio
        </button>
        <button className="btn bo" onClick={() => startRecording('video')} style={{ flex: 1, minWidth: 120 }}>
          📹 Record Video
        </button>
        <button className="btn bo" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, minWidth: 120 }}>
          📎 Upload File
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={handleFileSelect} />
      <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 8 }}>Max 3 min · 150MB · Audio or video</div>
    </div>
  )

  if (mode === 'recording') return (
    <div>
      {recordType === 'video' && (
        <video ref={videoLiveRef} autoPlay muted playsInline
          style={{ width: '100%', maxHeight: 200, borderRadius: 8, background: '#000', display: 'block', marginBottom: 12 }}
        />
      )}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: timerColor(timer), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {fmtTime(timer)}
        </div>
        <div style={{ fontSize: 11, color: timerColor(timer), marginTop: 6 }}>
          {timer >= 150 ? 'Approaching limit — wrap up soon' : timer >= 90 ? 'Good length — consider wrapping up' : 'Recording…'}
        </div>
      </div>
      <button className="btn bdanger bfw" onClick={stopRecording}>⏹ Stop Recording</button>
    </div>
  )

  if (mode === 'preview') return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {recordType === 'video'
          ? <video src={blobUrl} controls style={{ width: '100%', borderRadius: 8, maxHeight: 220 }} />
          : <audio src={blobUrl} controls style={{ width: '100%' }} />
        }
      </div>
      <div className="fld" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12 }}>
          Internal note{' '}
          <span style={{ color: 'var(--mid)', fontWeight: 400 }}>(not visible to athlete)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. focused on pre-conference pressure spike"
          value={note}
          maxLength={200}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn bo" onClick={handleDiscard} style={{ flex: 1 }}>Discard</button>
        <button className="btn bp" onClick={handleSend} disabled={uploading} style={{ flex: 2 }}>
          {uploading ? 'Sending…' : `Send to ${athlete.full_name.split(' ')[0]} →`}
        </button>
      </div>
    </div>
  )

  return null
}

// ── Main component ─────────────────────────────────────────────
export default function AdminMessages() {
  const [practitionerId, setPractitionerId] = useState(null)
  const [teams,          setTeams]          = useState([])
  const [teamId,         setTeamId]         = useState('')
  const [roster,         setRoster]         = useState([])
  const [sentMessages,   setSentMessages]   = useState([])
  const [loading,        setLoading]        = useState(false)
  const [selected,       setSelected]       = useState(null)

  useEffect(() => {
    getAdminSession().then(a => setPractitionerId(a?.id || null))
    fetchAllTeams().then(t => {
      setTeams(t)
      if (t.length) setTeamId(t[0].id)
    })
  }, [])

  useEffect(() => {
    if (!teamId) return
    setLoading(true)
    setSelected(null)
    Promise.all([fetchRosterWithMessages(teamId), fetchSentMessages(teamId)])
      .then(([r, m]) => { setRoster(r); setSentMessages(m) })
      .finally(() => setLoading(false))
  }, [teamId])

  async function refresh() {
    const [r, m] = await Promise.all([fetchRosterWithMessages(teamId), fetchSentMessages(teamId)])
    setRoster(r)
    setSentMessages(m)
    // Refresh selected athlete's data
    if (selected) setSelected(r.find(a => a.id === selected.id) || null)
  }

  const nameById = {}
  roster.forEach(a => { nameById[a.id] = a.full_name })

  return (
    <div>
      <div className="sh">
        <div className="stit">Practitioner Messages</div>
      </div>

      <div className="fld" style={{ maxWidth: 300, marginBottom: 24 }}>
        <label>Team</label>
        <select value={teamId} onChange={e => setTeamId(e.target.value)}>
          {teams.length === 0 && <option value="">No teams found</option>}
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading ? <div className="spinner" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Athlete list ── */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>
              Select Athlete
            </div>
            {roster.length === 0
              ? <div style={{ color: 'var(--mid)', fontSize: 13 }}>No athletes on this team yet.</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {roster.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        border:     selected?.id === a.id ? '2px solid var(--g)' : '1px solid var(--bdr)',
                        background: selected?.id === a.id ? 'rgba(26,122,74,0.1)' : 'var(--d3)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--w)' }}>{a.full_name}</span>
                        <span style={{ fontSize: 13, letterSpacing: 1 }}>
                          {a.recentCheckins.map((c, i) => c ? MENTAL_LABELS[c.mental_score] : '').join('')}
                        </span>
                      </span>
                      {a.hasUnread && (
                        <span style={{ fontSize: 10, background: '#e05a4a', color: '#fff', borderRadius: 99, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>
                          UNREAD
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )
            }
          </div>

          {/* ── Right panel ── */}
          <div>
            {!selected ? (
              <div style={{ color: 'var(--mid)', fontSize: 13, paddingTop: 32, textAlign: 'center' }}>
                Select an athlete to send a message
              </div>
            ) : (
              <div style={{ background: 'var(--d3)', borderRadius: 12, padding: 20, border: '1px solid var(--bdr)' }}>
                {/* Athlete header + wellness context */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--w)', fontSize: 15, marginBottom: 8 }}>
                    {selected.full_name}
                  </div>
                  {selected.recentCheckins.some(Boolean) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.recentCheckins.map((c, i) => c ? (
                        <div key={i} style={{ fontSize: 11, color: 'var(--mid)', background: 'var(--d2)', borderRadius: 6, padding: '4px 8px' }}>
                          <span style={{ marginRight: 4 }}>{MENTAL_LABELS[c.mental_score]}</span>
                          <span style={{ fontStyle: 'italic' }}>{c.mental_word}</span>
                        </div>
                      ) : null)}
                    </div>
                  )}
                  {selected.hasUnread && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(224,90,74,0.1)', border: '1px solid rgba(224,90,74,0.3)', borderRadius: 6, fontSize: 12, color: '#e05a4a' }}>
                      ⚠️ {selected.full_name.split(' ')[0]} has an unread message already waiting.
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 16 }}>
                  <RecorderPanel
                    key={selected.id}
                    athlete={selected}
                    practitionerId={practitionerId}
                    teamId={teamId}
                    onSent={refresh}
                  />
                </div>
              </div>
            )}

            {/* Sent history */}
            {sentMessages.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 11, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 10 }}>
                  Sent Messages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sentMessages.slice(0, 25).map(m => (
                    <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '8px 12px', background: 'var(--d3)', borderRadius: 6, border: '1px solid var(--bdr)', fontSize: 12 }}>
                      <span style={{ color: 'var(--w)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nameById[m.athlete_id] || '—'}
                      </span>
                      <span style={{ color: 'var(--mid)', whiteSpace: 'nowrap' }}>
                        {new Date(m.sent_at).toLocaleDateString()}
                      </span>
                      <span style={{ color: m.is_read ? '#43B878' : 'var(--mid)', whiteSpace: 'nowrap' }}>
                        {m.is_read ? `Read ${new Date(m.read_at).toLocaleDateString()}` : 'Unread'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
