import { useState, useEffect } from 'react'
import { fetchAthletePin } from '../../lib/cycleApi'

export default function CyclePinScreen({ athlete, team, onBack, onVerified }) {
  const [existingPin, setExistingPin] = useState(undefined) // undefined = loading
  const [pin, setPin]   = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAthletePin(athlete.id, team.id).then(setExistingPin)
  }, [athlete.id, team.id])

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleSubmit() {
    setError('')
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return }
    if (pin !== existingPin)  { setError('Incorrect PIN. Please try again.'); return }
    onVerified()
  }

  if (existingPin === undefined) {
    return (
      <>
        <nav>
          <div className="logo">RPM<span>.</span>SG</div>
          <div className="ntag">View My Cycle</div>
        </nav>
        <div className="cw"><div className="spinner" /></div>
      </>
    )
  }

  // No PIN means athlete hasn't completed their assessment yet
  if (existingPin === null) {
    return (
      <>
        <nav>
          <div className="logo">RPM<span>.</span>SG</div>
          <div className="ntag">View My Cycle</div>
          <button className="btn bo bsm" onClick={onBack}>← Back</button>
        </nav>
        <div className="cw">
          <div className="box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2 style={{ marginBottom: 12 }}>Assessment Required</h2>
            <p>
              You need to complete your panic cycle assessment before you can access this section.
              Your PIN is created at the end of the assessment.
            </p>
            <button className="btn bo bfw" onClick={onBack} style={{ marginTop: 8 }}>← Go Back</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <nav>
        <div className="logo">RPM<span>.</span>SG</div>
        <div className="ntag">View My Cycle</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <h2>Enter Your PIN</h2>
          <p>Welcome back, {athlete.full_name.split(' ')[0]}. Enter your 4-digit PIN to continue.</p>

          <div className="fld">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={handleKey}
              autoFocus
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
            />
          </div>

          {error && <div className="err">{error}</div>}

          <button
            className="btn bp bfw"
            onClick={handleSubmit}
            disabled={pin.length < 4}
            style={{ marginTop: 8 }}
          >
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
