export default function Landing({ onSelect }) {
  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">Athlete Portal</div>
      </nav>

      <div className="hero">
        <div className="eye">RPM Systems Group</div>
        <div className="ht">Stop Spinning.<br /><span>Start Performing.</span></div>
        <div className="hs">The mental performance intake portal for collegiate athletes. Complete your assessment. Build your mental system.</div>

        <div className="cards">
          <div className="card" onClick={() => onSelect('athlete')}>
            <div className="cico">🏃</div>
            <div className="ctit">Athlete Intake</div>
            <div className="cdesc">Complete your Panic Cycle and Social Map assessments. Takes 10–12 minutes.</div>
          </div>
          <div className="card" onClick={() => onSelect('cycle')}>
            <div className="cico">📄</div>
            <div className="ctit">View My Cycle</div>
            <div className="cdesc">Access your personal Panic Cycle document once it has been released by your coach.</div>
          </div>
          <div className="card" onClick={() => onSelect('coach')}>
            <div className="cico">📊</div>
            <div className="ctit">Coach Dashboard</div>
            <div className="cdesc">View team Pulse Report, completion status, and friction analysis.</div>
          </div>
        </div>

        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <button
            onClick={() => onSelect('admin')}
            style={{ fontSize: 11, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Staff Access
          </button>
        </div>
      </div>
    </>
  )
}
