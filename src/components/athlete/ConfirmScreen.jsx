export default function ConfirmScreen({ team, athlete, pc, onHome }) {
  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">Complete</div>
        <span />
      </nav>
      <div className="cfwrap">
        <div className="ico">✅</div>
        <h2>Assessment Complete</h2>
        <p>Your responses have been saved. Your RPM practitioner will walk you through your results in your next session.</p>

        <div className="cfcard">
          <h4>Your Submission</h4>
          <div className="cfrow"><span>Athlete</span><span>{athlete.full_name}</span></div>
          <div className="cfrow"><span>Team</span><span>{team.name}</span></div>
          <div className="cfrow"><span>Panic Cycle</span><span style={{ color: 'var(--gl)' }}>✓ Complete</span></div>
          <div className="cfrow"><span>Social Map</span><span style={{ color: 'var(--gl)' }}>✓ Complete</span></div>
        </div>

        {pc && (
          <div className="cfcard" style={{ marginTop: 16, maxWidth: 360 }}>
            <h4>Your Panic Cycle — A Quick Look</h4>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>
              Based on your responses, your cycle typically starts with{' '}
              <strong style={{ color: 'var(--w)' }}>{(pc.q1_trigger || 'a high-pressure situation').toLowerCase()}</strong>,
              which triggers{' '}
              <strong style={{ color: 'var(--w)' }}>{(pc.q3_emotions || 'anxiety').toLowerCase()}</strong>.
              Your body responds with{' '}
              <strong style={{ color: 'var(--w)' }}>{(pc.q6_body_response || 'physical tension').toLowerCase()}</strong>,
              leading you to{' '}
              <strong style={{ color: 'var(--w)' }}>{(pc.q8_behavior || 'withdraw').toLowerCase()}</strong>.
            </p>
          </div>
        )}

        <button className="btn bo" style={{ marginTop: 24 }} onClick={onHome}>← Return to Home</button>
      </div>
    </>
  )
}
