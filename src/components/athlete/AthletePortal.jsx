import { useState, useEffect } from 'react'
import { useHome } from '../../HomeContext'
import { lookupTeamCode, fetchRoster, fetchCompletedAthleteIds } from '../../lib/athleteApi'
import { fetchAthletePin, setAthletePin } from '../../lib/cycleApi'
import { fetchAthleteUnreadCount } from '../../lib/messagesApi'
import AthleteFlow from './AthleteFlow'
import WellnessScreen from './WellnessScreen'
import AthleteInbox from './AthleteInbox'
import CycleDocumentScreen from './CycleDocumentScreen'

const STORAGE_KEY = 'rpm_athlete_session'
const ADMIN_LABELS = { 1: 'Athlete Intake', 2: 'Mid-Season Assessment', 3: 'Final Assessment' }
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const S = {
  RESTORING: 'restoring', CODE: 'code', NAME: 'name', PIN: 'pin',
  DASHBOARD: 'dashboard', INTAKE: 'intake', CYCLE: 'cycle',
  WELLNESS: 'wellness', WELLNESS_DONE: 'wellness_done', MESSAGES: 'messages',
}

function saveSession(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadSession()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null } }
function clearSession() { localStorage.removeItem(STORAGE_KEY) }

// ── Code screen ───────────────────────────────────────────────
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
      const team = await lookupTeamCode(code)
      if (!team) { setError('Team code not found. Check with your coach.'); return }
      const roster = await fetchRoster(team.id)
      onSuccess(team, roster)
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Athlete Portal</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">Sign In</div>
          <h2>Enter Your Team Code</h2>
          <p>Enter your team code to access your athlete portal.</p>
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

// ── Name screen ───────────────────────────────────────────────
function NameScreen({ team, roster, onBack, onSelect }) {
  const goHome = useHome()
  const [search, setSearch] = useState('')
  const filtered = roster.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Athlete Portal</div>
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
                <button key={a.id} className="btn bo bfw"
                  style={{ textAlign: 'left', padding: '10px 14px', fontSize: 14, fontWeight: 500 }}
                  onClick={() => onSelect(a)}
                >{a.full_name}</button>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

// ── PIN screen (create or verify) ─────────────────────────────
function PinScreen({ athlete, team, onBack, onVerified }) {
  const goHome = useHome()
  const [existingPin, setExistingPin] = useState(undefined)
  const [pin, setPin]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAthletePin(athlete.id, team.id).then(setExistingPin)
  }, [])

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

  const nav = (
    <nav>
      <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
      <div className="ntag">Athlete Portal</div>
      <button className="btn bo bsm" onClick={onBack}>← Back</button>
    </nav>
  )

  if (existingPin === undefined) return <>{nav}<div className="cw"><div className="spinner" /></div></>

  const pinInput = (
    <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
      value={pin} autoFocus
      onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
      onKeyDown={e => e.key === 'Enter' && existingPin && handleVerify()}
      style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
    />
  )

  if (!existingPin) return (
    <>{nav}
      <div className="cw">
        <div className="box">
          <h2>Create Your PIN</h2>
          <p>Set a 4-digit PIN to secure your athlete portal. You'll use this every time you sign in.</p>
          <div className="fld"><label>Choose a PIN</label>{pinInput}</div>
          <div className="fld">
            <label>Confirm PIN</label>
            <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
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
    <>{nav}
      <div className="cw">
        <div className="box">
          <h2>Welcome back, {athlete.full_name.split(' ')[0]}</h2>
          <p>Enter your 4-digit PIN to access your portal.</p>
          <div className="fld"><label>PIN</label>{pinInput}</div>
          {error && <div className="err">{error}</div>}
          <button className="btn bp bfw" onClick={handleVerify} disabled={pin.length < 4} style={{ marginTop: 8 }}>
            Sign In →
          </button>
          <p style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', marginTop: 16 }}>
            Forgot your PIN? Contact your administrator to reset it.
          </p>
        </div>
      </div>
    </>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard({ team, athlete, intakeCompleted, unreadCount, onSelect, onSignOut }) {
  const adminLabel = ADMIN_LABELS[team.current_administration] || 'Assessment'
  const locked = !intakeCompleted

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36 }} />
        <div className="ntag">Athlete Portal</div>
        <button className="btn bo bsm" onClick={onSignOut}>Sign Out</button>
      </nav>
      <div className="cw">
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              {team.name}
            </div>
            <h2 style={{ margin: 0 }}>Hey, {athlete.full_name.split(' ')[0]}</h2>
          </div>

          {locked && (
            <div style={{ padding: '12px 16px', background: 'rgba(240,176,48,0.1)', border: '1px solid rgba(240,176,48,0.3)', borderRadius: 8, fontSize: 13, color: '#f0b030', marginBottom: 20 }}>
              Complete your {adminLabel.toLowerCase()} to unlock all features.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Assessment card */}
            <div
              onClick={() => !intakeCompleted && onSelect(S.INTAKE)}
              style={{
                padding: '18px 20px', borderRadius: 10,
                background: 'var(--d3)',
                border: !intakeCompleted ? '1px solid rgba(67,184,120,0.5)' : '1px solid var(--bdr)',
                cursor: !intakeCompleted ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{adminLabel}</div>
                  <div style={{ fontSize: 12, color: intakeCompleted ? '#43B878' : 'var(--mid)' }}>
                    {intakeCompleted ? '✓ Completed' : 'Required — start here'}
                  </div>
                </div>
                {!intakeCompleted && (
                  <button className="btn bp bsm" onClick={e => { e.stopPropagation(); onSelect(S.INTAKE) }}>
                    Start →
                  </button>
                )}
              </div>
            </div>

            {/* View My Cycle */}
            <div
              onClick={() => !locked && onSelect(S.CYCLE)}
              style={{
                padding: '18px 20px', borderRadius: 10, cursor: locked ? 'default' : 'pointer',
                background: 'var(--d3)', border: '1px solid var(--bdr)', opacity: locked ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>View My Cycle</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {locked ? 'Complete your assessment first' : 'Access your panic cycle document'}
                  </div>
                </div>
                {!locked && (
                  <button className="btn bo bsm" onClick={e => { e.stopPropagation(); onSelect(S.CYCLE) }}>
                    Open →
                  </button>
                )}
              </div>
            </div>

            {/* Weekly Wellness */}
            <div
              onClick={() => !locked && onSelect(S.WELLNESS)}
              style={{
                padding: '18px 20px', borderRadius: 10, cursor: locked ? 'default' : 'pointer',
                background: 'var(--d3)', border: '1px solid var(--bdr)', opacity: locked ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Weekly Wellness</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {locked ? 'Complete your assessment first' : 'Submit your weekly check-in'}
                  </div>
                </div>
                {!locked && (
                  <button className="btn bo bsm" onClick={e => { e.stopPropagation(); onSelect(S.WELLNESS) }}>
                    Check In →
                  </button>
                )}
              </div>
            </div>

            {/* My Messages */}
            <div
              onClick={() => !locked && onSelect(S.MESSAGES)}
              style={{
                padding: '18px 20px', borderRadius: 10, cursor: locked ? 'default' : 'pointer',
                background: 'var(--d3)', border: '1px solid var(--bdr)', opacity: locked ? 0.45 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>My Messages</span>
                    {!locked && unreadCount > 0 && (
                      <span style={{ background: '#43B878', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {locked ? 'Complete your assessment first'
                      : unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
                      : 'Messages from your practitioner'}
                  </div>
                </div>
                {!locked && (
                  <button className="btn bo bsm" onClick={e => { e.stopPropagation(); onSelect(S.MESSAGES) }}>
                    View →
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

// ── Main portal ───────────────────────────────────────────────
export default function AthletePortal({ onBack }) {
  const goHome = useHome()
  const [screen, setScreen]             = useState(S.RESTORING)
  const [team, setTeam]                 = useState(null)
  const [roster, setRoster]             = useState([])
  const [athlete, setAthlete]           = useState(null)
  const [pin, setPin]                   = useState(null)
  const [intakeCompleted, setIntakeCompleted] = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)

  // Try restoring saved session on mount
  useEffect(() => {
    async function restore() {
      const saved = loadSession()
      if (!saved) { setScreen(S.CODE); return }
      try {
        const t = await lookupTeamCode(saved.teamCode)
        if (!t || t.id !== saved.teamId) throw new Error('stale')
        const r = await fetchRoster(t.id)
        const a = r.find(x => x.id === saved.athleteId)
        if (!a) throw new Error('stale')
        const storedPin = await fetchAthletePin(saved.athleteId, t.id)
        if (storedPin !== saved.pin) throw new Error('stale')
        setTeam(t); setRoster(r); setAthlete(a); setPin(saved.pin)
        await refreshDashboard(t, a)
        setScreen(S.DASHBOARD)
      } catch {
        clearSession()
        setScreen(S.CODE)
      }
    }
    restore()
  }, [])

  async function refreshDashboard(t, a) {
    const [completedIds, unread] = await Promise.all([
      fetchCompletedAthleteIds(t.id, t.current_administration),
      fetchAthleteUnreadCount(a.id, t.id),
    ])
    setIntakeCompleted(completedIds.has(a.id))
    setUnreadCount(unread)
  }

  async function handleSignIn(t, r, a, p) {
    setTeam(t); setRoster(r); setAthlete(a); setPin(p)
    saveSession({ teamCode: t.team_code, teamId: t.id, athleteId: a.id, pin: p })
    await refreshDashboard(t, a)
    setScreen(S.DASHBOARD)
  }

  function handleSignOut() {
    clearSession()
    setTeam(null); setRoster([]); setAthlete(null); setPin(null)
    setIntakeCompleted(false); setUnreadCount(0)
    setScreen(S.CODE)
  }

  async function returnToDashboard() {
    await refreshDashboard(team, athlete)
    setScreen(S.DASHBOARD)
  }

  // ── Screens ──────────────────────────────────────────────────

  if (screen === S.RESTORING) return (
    <>
      <nav><img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36 }} /><div className="ntag">Athlete Portal</div></nav>
      <div className="cw"><div className="spinner" /></div>
    </>
  )

  if (screen === S.CODE) return (
    <CodeScreen onBack={onBack}
      onSuccess={(t, r) => { setTeam(t); setRoster(r); setScreen(S.NAME) }}
    />
  )

  if (screen === S.NAME) return (
    <NameScreen team={team} roster={roster}
      onBack={() => setScreen(S.CODE)}
      onSelect={a => { setAthlete(a); setScreen(S.PIN) }}
    />
  )

  if (screen === S.PIN) return (
    <PinScreen athlete={athlete} team={team}
      onBack={() => setScreen(S.NAME)}
      onVerified={p => handleSignIn(team, roster, athlete, p)}
    />
  )

  if (screen === S.DASHBOARD) return (
    <Dashboard
      team={team} athlete={athlete}
      intakeCompleted={intakeCompleted} unreadCount={unreadCount}
      onSelect={setScreen} onSignOut={handleSignOut}
    />
  )

  if (screen === S.INTAKE) return (
    <AthleteFlow
      initialTeam={team} initialAthlete={athlete} skipPin
      onDone={returnToDashboard}
    />
  )

  if (screen === S.CYCLE) return (
    <CycleDocumentScreen athlete={athlete} team={team} onHome={() => setScreen(S.DASHBOARD)} />
  )

  if (screen === S.WELLNESS) return (
    <WellnessScreen
      athlete={athlete} team={team}
      onBack={() => setScreen(S.DASHBOARD)}
      onSubmitted={() => setScreen(S.WELLNESS_DONE)}
    />
  )

  if (screen === S.WELLNESS_DONE) return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36 }} />
        <div className="ntag">Athlete Portal</div>
      </nav>
      <div className="cw">
        <div className="box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2>Check-In Complete</h2>
          <p>
            Thanks {athlete.full_name.split(' ')[0]}! Your wellness check-in has been recorded.
            See you next {DAY_NAMES[team.wellness_reset_day ?? 1]}.
          </p>
          <button className="btn bp bfw" onClick={() => setScreen(S.DASHBOARD)} style={{ marginTop: 16 }}>
            ← Back to Portal
          </button>
        </div>
      </div>
    </>
  )

  if (screen === S.MESSAGES) return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Athlete Portal</div>
        <button className="btn bo bsm" onClick={async () => {
          const count = await fetchAthleteUnreadCount(athlete.id, team.id)
          setUnreadCount(count)
          setScreen(S.DASHBOARD)
        }}>← Back</button>
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
