const ROLE_SUMMARIES = {
  'Core Influencer': (name, pos, neg, total) =>
    `${name} is one of the team's Core Influencers, receiving positive mentions from a high number of teammates (${pos} nominations) relative to the team average. ` +
    `They carry low friction, meaning peers rarely identify them as a source of tension or disconnection. ` +
    `Athletes like ${name.split(' ')[0]} tend to set the emotional tone — their mindset on a given day can ripple through the group. ` +
    `Leverage their influence intentionally: pair them with athletes who are struggling and look to them to model composure under pressure.`,

  'Rejection Risk': (name, pos, neg, total) =>
    `${name} is currently flagged as a Rejection Risk — they have above-average friction (−${neg} nominations) while receiving below-average peer support. ` +
    `This combination often indicates an athlete who is perceived negatively but lacks the relational buffer of strong peer connections. ` +
    `This does not necessarily mean they are the source of the problem — they may be reacting to something in the environment. ` +
    `A private, non-confrontational 1:1 is recommended before making any judgements or decisions about their role.`,

  'Isolation Risk': (name, pos, neg, total) =>
    `${name} shows an Isolation Risk pattern — they receive few positive nominations and low friction, meaning teammates are largely neutral toward them rather than positively or negatively engaged. ` +
    `This is often the most overlooked pattern on a team: the athlete who is present but not truly connected. ` +
    `Left unaddressed, isolation tends to deepen over a season and can affect both performance and retention. ` +
    `Consider intentional pairing strategies in practice groupings and travel arrangements to build natural connection.`,

  'Polarizing Figure': (name, pos, neg, total) =>
    `${name} is a Polarizing Figure — they receive strong positive nominations (${pos}) but also carry notable friction (−${neg}). ` +
    `This pattern is common among high-energy or outspoken athletes who generate both loyalty and tension depending on the relationship. ` +
    `They have clear influence on the team, but that influence is not universally positive. ` +
    `Understanding who they have friction with — and why — is the key coaching question here.`,
}

export default function AthleteModal({ athlete, score, totalAthletes, onClose }) {
  const role    = score.social_role || 'Unknown'
  const pos     = score.positive_mentions || 0
  const neg     = score.negative_mentions || 0
  const done    = athlete.status === 'complete'

  const roleKey = {
    'Core Influencer':   'inf',
    'Rejection Risk':    'rej',
    'Isolation Risk':    'iso',
    'Polarizing Figure': 'pol',
  }[role] || 'non'

  const summary = ROLE_SUMMARIES[role]
    ? ROLE_SUMMARIES[role](athlete.full_name, pos, neg, totalAthletes)
    : `No summary available for ${athlete.full_name}.`

  return (
    <div className="modal-overlay on" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{athlete.full_name}</h3>
            <p><span className={`rtag ${roleKey}`}>{role}</span></p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gl)' }}>{pos}</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 1 }}>POSITIVE</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: neg >= 8 ? 'var(--rl)' : neg >= 4 ? '#f0b030' : 'var(--mid)' }}>{neg > 0 ? `−${neg}` : '0'}</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 1 }}>FRICTION</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: done ? 'var(--gl)' : 'var(--mid)' }}>{done ? '✓' : '○'}</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 1 }}>STATUS</div>
            </div>
          </div>
          <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 10 }}>Social Position Summary</div>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7 }}>{summary}</p>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn bo" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
