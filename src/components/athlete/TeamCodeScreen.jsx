import { useState } from 'react'
import { lookupTeamCode, fetchRoster } from '../../lib/athleteApi'

export default function TeamCodeScreen({ onBack, onSuccess }) {
  const [code, setCode]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = code.trim()
    if (!trimmed) { setError('Please enter your team code.'); return }

    setLoading(true)
    try {
      const team = await lookupTeamCode(trimmed)
      if (!team) { setError('Team code not found. Check with your coach and try again.'); return }
      const roster = await fetchRoster(team.id)
      onSuccess({ ...team, roster })
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav>
        <div className="logo">RPM<span>.</span>SG</div>
        <div className="ntag">Athlete Intake</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">Step 1 of 2</div>
          <h2>Enter Your Team Code</h2>
          <p>Your coach provided a team code. Enter it below to find your name on the roster.</p>
          <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: -8, marginBottom: 20 }}>
            ⏱ Takes 10–12 minutes. Must be completed in one sitting — do not close or refresh the page.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="fld">
              <label>Team Code</label>
              <input
                type="text"
                placeholder="Enter your team code"
                value={code}
                onChange={e => setCode(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn bp bfw" type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Find My Team →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
