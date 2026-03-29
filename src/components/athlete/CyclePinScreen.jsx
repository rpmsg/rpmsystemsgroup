import { useState, useEffect } from 'react'
import { fetchAthletePin, setAthletePin } from '../../lib/cycleApi'

export default function CyclePinScreen({ athlete, team, onBack, onVerified }) {
  const [existingPin, setExistingPin] = useState(undefined) // undefined = loading
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAthletePin(athlete.id, team.id).then(setExistingPin)
  }, [athlete.id, team.id])

  async function handleSubmit() {
    setError('')
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits.'); return }

    if (existingPin === null) {
      // Creating new PIN
      if (pin !== confirm) { setError('PINs do not match.'); return }
      setLoading(true)
      try {
        await setAthletePin(athlete.id, team.id, pin)
        onVerified()
      } catch {
        setError('Could not save PIN. Please try again.')
      } finally {
        setLoading(false)
      }
    } else {
      // Verifying existing PIN
      if (pin !== existingPin) { setError('Incorrect PIN. Please try again.'); return }
      onVerified()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
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

  const creating = existingPin === null

  return (
    <>
      <nav>
        <div className="logo">RPM<span>.</span>SG</div>
        <div className="ntag">View My Cycle</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="bhed">
            <h2>{creating ? 'Create Your PIN' : 'Enter Your PIN'}</h2>
            <p>
              {creating
                ? 'Set a 4-digit PIN to protect access to your personal cycle. You\'ll use this every time you log in.'
                : `Welcome back, ${athlete.full_name.split(' ')[0]}. Enter your 4-digit PIN to continue.`
              }
            </p>
          </div>

          <div className="fld">
            <label>{creating ? 'New PIN' : 'PIN'}</label>
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

          {creating && (
            <div className="fld">
              <label>Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={handleKey}
                style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
              />
            </div>
          )}

          {error && <div className="err">{error}</div>}

          <button className="btn bp" onClick={handleSubmit} disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Saving…' : creating ? 'Create PIN & Continue' : 'Continue →'}
          </button>

          {!creating && (
            <p style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', marginTop: 16 }}>
              Forgot your PIN? Contact your administrator to reset it.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
