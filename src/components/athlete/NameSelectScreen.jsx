import { useState } from 'react'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function NameSelectScreen({ team, onBack, onSelect }) {
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState('')

  const roster = team.roster || []

  function handleSelect(athlete) {
    if (athlete.status === 'complete') return
    setSelected(athlete)
    setError('')
  }

  function handleConfirm() {
    if (!selected) { setError('Please select your name to continue.'); return }
    onSelect(selected)
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">Athlete Intake</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
        <div className="box" style={{ maxWidth: 560 }}>
          <div className="tag">Step 2 of 2</div>
          <h2>Select Your Name</h2>
          <p>Team: {team.name} — tap your name below.</p>

          {roster.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 16 }}>
              Your coach needs to add you to the roster before you can begin.
            </p>
          ) : (
            <div className="rg" style={{ marginTop: 16 }}>
              {roster.map(r => {
                const done = r.status === 'complete'
                const isSel = selected?.id === r.id
                return (
                  <div
                    key={r.id}
                    className={`ri${isSel ? ' sel' : ''}${done ? ' done' : ''}`}
                    onClick={() => handleSelect(r)}
                    title={done ? 'Already submitted' : ''}
                  >
                    <div className="av">{initials(r.full_name)}</div>
                    {r.full_name}
                    {done && <span style={{ fontSize: 10, color: 'var(--gl)', marginLeft: 4 }}>✓</span>}
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--mid)', marginTop: 14 }}>
            Don't see your name? Your coach needs to add you to the roster before you can begin.
          </p>

          {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}

          <button
            className="btn bp bfw"
            style={{ marginTop: 16, opacity: selected ? 1 : 0.4, pointerEvents: selected ? 'auto' : 'none' }}
            onClick={handleConfirm}
          >
            This is me →
          </button>
        </div>
      </div>
    </>
  )
}
