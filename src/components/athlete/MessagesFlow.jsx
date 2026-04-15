import { useState } from 'react'
import { useHome } from '../../HomeContext'
import { lookupWellnessTeam, fetchRosterForWellness } from '../../lib/wellnessApi'
import { fetchAthletePin, setAthletePin } from '../../lib/cycleApi'
import AthleteInbox from './AthleteInbox'

const S = { CODE: 'code', NAME: 'name', PIN: 'pin', INBOX: 'inbox' }

// ── Team code ─────────────────────────────────────────────────
function CodeScreen({ onBack, onSuccess }) {
  const goHome = useHome()
  const [code, setCode]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) { setError('Please enter your team code.'); return }
    setLoading(true); setError('')
    try {
      const team = await lookupWellnessTeam(code)
      if (!team) { setError('Team code not found. Check with your coach.'); return }
      const roster = await fetchRosterForWellness(team.id)
      onSuccess(team, roster)
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Messages</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">Athlete Messages</div>
          <h2>Enter Your Team Code</h2>
          <p>Enter your team code to access your messages.</p>
          <form onSubmit={handleSubmit}>
            <div className="fld">
              <label>Team Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} autoFocus placeholder="Enter your team code" />
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn bp bfw" type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

// ── Name selection ─────────────────────────────────────────────
function NameScreen({ team, roster, onBack, onSelect }) {
  const goHome = useHome()
  const [search, setSearch] = useState('')
  const filtered = roster.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Messages</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">{team.name}</div>
          <h2>Select Your Name</h2>
          <div className="fld" style={{ marginBottom: 16 }}>
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.length === 0
              ? <div style={{ color: 'var(--mid)', fontSize: 13, textAlign: 'center', padding: 24 }}>No athletes found.</div>
              : filtered.map(a => (
                <button
                  key={a.id}
                  className="btn bo bfw"
                  style={{ textAlign: 'left', padding: '10px 14px', fontSize: 14, fontWeight: 500 }}
                  onClick={() => onSelect(a)}
                >
                  {a.full_name}
                </button>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

// ── PIN verify (or create) ─────────────────────────────────────
function PinScreen({ athlete, team, onBack, onVerified }) {
  const goHome = useHome()
  const [existingPin, setExistingPin] = useState(undefined)
  const [pin, setPin]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useState(() => {
    fetchAthletePin(athlete.id, team.id).then(setExistingPin)
  })

  async function handleCreate() {
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return }
    if (pin !== confirm)       { setError('PINs do not match.'); return }
    setSaving(true)
    try { await setAthletePin(athlete.id, team.id, pin); onVerified(pin) }
    catch { setError('Failed to save PIN. Please try again.') }
    finally { setSaving(false) }
  }

  function handleVerify() {
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return }
    if (pin !== existingPin)   { setError('Incorrect PIN. Please try again.'); return }
    onVerified(pin)
  }

  const navBar = (
    <nav>
      <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
      <div className="ntag">Messages</div>
      <button className="btn bo bsm" onClick={onBack}>← Back</button>
    </nav>
  )

  if (existingPin === undefined) return <>{navBar}<div className="cw"><div className="spinner" /></div></>

  const pinInput = (
    <input
      type="password" inputMode="numeric" maxLength={4} placeholder="••••"
      value={pin} autoFocus
      onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
      onKeyDown={e => e.key === 'Enter' && (existingPin ? handleVerify() : null)}
      style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
    />
  )

  if (!existingPin) return (
    <>{navBar}
      <div className="cw">
        <div className="box">
          <h2>Create Your PIN</h2>
          <p>Set a 4-digit PIN to access your messages and wellness check-ins.</p>
          <div className="fld"><label>Choose a PIN</label>{pinInput}</div>
          <div className="fld">
            <label>Confirm PIN</label>
            <input
              type="password" inputMode="numeric" maxLength={4} placeholder="••••"
              value={confirm}
              onChange={e => { setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
            />
          </div>
          {error && <div className="err">{error}</div>}
          <button className="btn bp bfw" onClick={handleCreate} disabled={pin.length < 4 || confirm.length < 4 || saving}>
            {saving ? 'Saving…' : 'Set PIN & Continue →'}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>{navBar}
      <div className="cw">
        <div className="box">
          <h2>Enter Your PIN</h2>
          <p>Welcome back, {athlete.full_name.split(' ')[0]}. Enter your 4-digit PIN to continue.</p>
          <div className="fld"><label>PIN</label>{pinInput}</div>
          {error && <div className="err">{error}</div>}
          <button className="btn bp bfw" onClick={handleVerify} disabled={pin.length < 4} style={{ marginTop: 8 }}>
            Continue →
          </button>
          <p style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', marginTop: 16 }}>
            Forgot your PIN? Contact your administrator to reset it.
          </p>
        </div>
      </div>
    </>
  )
}

// ── Main flow ──────────────────────────────────────────────────
export default function MessagesFlow({ onBack }) {
  const goHome = useHome()
  const [screen,  setScreen]  = useState(S.CODE)
  const [team,    setTeam]    = useState(null)
  const [roster,  setRoster]  = useState([])
  const [athlete, setAthlete] = useState(null)
  const [pin,     setPin]     = useState(null)

  if (screen === S.CODE) return (
    <CodeScreen
      onBack={onBack}
      onSuccess={(t, r) => { setTeam(t); setRoster(r); setScreen(S.NAME) }}
    />
  )

  if (screen === S.NAME) return (
    <NameScreen
      team={team} roster={roster}
      onBack={() => setScreen(S.CODE)}
      onSelect={a => { setAthlete(a); setScreen(S.PIN) }}
    />
  )

  if (screen === S.PIN) return (
    <PinScreen
      athlete={athlete} team={team}
      onBack={() => setScreen(S.NAME)}
      onVerified={p => { setPin(p); setScreen(S.INBOX) }}
    />
  )

  // INBOX
  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Messages</div>
        <button className="btn bo bsm" onClick={() => setScreen(S.NAME)}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box" style={{ maxWidth: 560 }}>
          <div className="tag">{team.name}</div>
          <h2 style={{ marginBottom: 4 }}>Your Messages</h2>
          <p style={{ marginBottom: 24, color: 'var(--mid)', fontSize: 13 }}>
            {athlete.full_name.split(' ')[0]}, messages from your practitioner appear here.
          </p>
          <AthleteInbox athlete={athlete} team={team} pin={pin} />
        </div>
      </div>
    </>
  )
}
