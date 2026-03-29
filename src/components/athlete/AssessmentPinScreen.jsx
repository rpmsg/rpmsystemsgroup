import { useState } from 'react'
import { setAthletePin } from '../../lib/cycleApi'

export default function AssessmentPinScreen({ athlete, team, onPinSet }) {
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!/^\d{4}$/.test(pin))  { setError('PIN must be exactly 4 digits.'); return }
    if (pin !== confirm)        { setError('PINs do not match.'); return }
    setLoading(true)
    try {
      await setAthletePin(athlete.id, team.id, pin)
      onPinSet()
    } catch {
      setError('Could not save PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">Assessment Complete</div>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">ALMOST DONE</div>
          <h2>Create Your PIN</h2>
          <p>
            Set a 4-digit PIN to access your personal cycle document when it's ready.
            You'll need this every time you use "View My Cycle."
          </p>

          <div className="fld">
            <label>New PIN</label>
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

          {error && <div className="err">{error}</div>}

          <button
            className="btn bp bfw"
            onClick={handleSubmit}
            disabled={loading || pin.length < 4 || confirm.length < 4}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Saving…' : 'Set PIN & Continue →'}
          </button>
        </div>
      </div>
    </>
  )
}
