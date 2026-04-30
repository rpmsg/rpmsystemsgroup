import { useState } from 'react'
import { useHome } from '../../HomeContext'

export default function CycleNameScreen({ onBack, onContinue, initialName = '' }) {
  const goHome = useHome()
  const [name, setName] = useState(initialName)

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onContinue(name.trim())
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Performance Cycle</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">Step 0 of 3</div>
          <h2>Name Your Cycle</h2>
          <p>Give this cycle a name that describes when you'll use it. Be specific — the best cycles are built around a real situation.</p>

          <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 6 }}>Examples</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Game Day', 'After a Mistake', 'Facing My Rival', 'Pressure Situations', 'Coming Off the Bench'].map(ex => (
                <button key={ex} onClick={() => setName(ex)}
                  style={{ padding: '4px 10px', borderRadius: 20, background: 'var(--d4)', border: '1px solid var(--bdr)', color: 'var(--mid)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="fld">
              <label>Cycle Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Game Day"
                autoFocus
                maxLength={60}
              />
            </div>
            <button className="btn bp bfw" type="submit" disabled={!name.trim()}>
              Continue → Step 1
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
