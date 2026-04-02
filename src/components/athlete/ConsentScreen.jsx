import { useState } from 'react'
import { useHome } from '../../HomeContext'

export default function ConsentScreen({ team, athlete, onBack, onProceed }) {
  const goHome = useHome()
  const [checked, setChecked] = useState(false)
  const [error, setError]     = useState('')

  function handleProceed() {
    if (!checked) { setError('Please check the box above to confirm your consent before continuing.'); return }
    onProceed()
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36,cursor:'pointer'}} onClick={goHome} />
        <div className="ntag">Before You Begin</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box" style={{ maxWidth: 520 }}>
          <div style={{ background: 'rgba(29,143,90,.12)', border: '1px solid rgba(29,143,90,.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
            ✓ Joined as <strong>{athlete.full_name}</strong> &nbsp;·&nbsp; Team: <strong>{team.name}</strong>
          </div>
          <div className="tag">Confidentiality &amp; Consent</div>
          <h2>Before You Begin</h2>
          <p>Please read the following carefully before starting your assessment.</p>
          <div className="consent-box">
            <p>
              Your responses to this assessment are <strong style={{ color: 'var(--w)' }}>confidential</strong>.<br /><br />
              Your <strong style={{ color: 'var(--w)' }}>Panic Cycle</strong> answers will only be seen by your RPM practitioner — never by your coaches.<br /><br />
              Your <strong style={{ color: 'var(--w)' }}>Social Map</strong> answers will only be used in anonymous team-level reports. Your individual responses will never be shared with your coaches.<br /><br />
              Your data is stored securely and permanently deleted two years after your program season ends. You may request deletion at any time.
            </p>
          </div>
          <label className="consent-check">
            <input type="checkbox" checked={checked} onChange={e => { setChecked(e.target.checked); setError('') }} />
            <span>I have read and understood how my data will be used, and I consent to my responses being collected and stored as described above.</span>
          </label>
          {error && <div className="err">{error}</div>}
          <button
            className="btn bp bfw"
            style={{ opacity: checked ? 1 : 0.4, pointerEvents: checked ? 'auto' : 'none' }}
            onClick={handleProceed}
          >
            Begin Assessment →
          </button>
        </div>
      </div>
    </>
  )
}
