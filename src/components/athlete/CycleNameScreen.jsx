export default function CycleNameScreen({ team, onBack, onSelect }) {
  const roster = team.roster || []

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
            <h2>Select Your Name</h2>
            <p>{team.name}</p>
          </div>
          <div className="rg">
            {roster.map(r => (
              <div
                key={r.id}
                className="ri"
                onClick={() => onSelect(r)}
                style={{ cursor: 'pointer' }}
              >
                <div className="av">{r.full_name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                <div>{r.full_name}</div>
                {r.status === 'complete' && (
                  <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gl)' }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
