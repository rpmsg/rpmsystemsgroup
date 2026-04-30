import { useState, useEffect } from 'react'
import { fetchTeamWellnessCheckins } from '../../lib/wellnessApi'
import {
  calculateFrictionProximity,
  calculateCohesionScore,
  determineRelationshipType,
} from '../../lib/pulseAlgorithms'
import { ROLE_KEYS, ROLE_COLORS } from '../../constants'

const ROLE_SUMMARIES = {
  'Core Influencer': (name, pos) =>
    `${name} is one of the team's Core Influencers, receiving positive mentions from a high number of teammates (${pos} nominations) relative to the team average. ` +
    `They carry low friction, meaning peers rarely identify them as a source of tension or disconnection. ` +
    `Athletes like ${name.split(' ')[0]} tend to set the emotional tone — their mindset on a given day can ripple through the group. ` +
    `Leverage their influence intentionally: pair them with athletes who are struggling and look to them to model composure under pressure.`,

  'Rejection Risk': (name, pos, neg) =>
    `${name} is currently flagged as a Rejection Risk — they have above-average friction (−${neg} nominations) while receiving below-average peer support. ` +
    `This combination often indicates an athlete who is perceived negatively but lacks the relational buffer of strong peer connections. ` +
    `This does not necessarily mean they are the source of the problem — they may be reacting to something in the environment. ` +
    `A private, non-confrontational 1:1 is recommended before making any judgements or decisions about their role.`,

  'Isolation Risk': (name) =>
    `${name} shows an Isolation Risk pattern — they receive few positive nominations and low friction, meaning teammates are largely neutral toward them rather than positively or negatively engaged. ` +
    `This is often the most overlooked pattern on a team: the athlete who is present but not truly connected. ` +
    `Left unaddressed, isolation tends to deepen over a season and can affect both performance and retention. ` +
    `Consider intentional pairing strategies in practice groupings and travel arrangements to build natural connection.`,

  'Polarizing Figure': (name, pos, neg) =>
    `${name} is a Polarizing Figure — they receive strong positive nominations (${pos}) but also carry notable friction (−${neg}). ` +
    `This pattern is common among high-energy or outspoken athletes who generate both loyalty and tension depending on the relationship. ` +
    `They have clear influence on the team, but that influence is not universally positive. ` +
    `Understanding who they have friction with — and why — is the key coaching question here.`,
}

const RELATIONSHIP_COPY = {
  'Strong Alignment': {
    interpretation: 'Both players occupy strong positive positions in the team network with minimal friction. They likely operate as informal anchors for team culture. Pairing them in leadership moments or high-pressure situations could amplify team stability.',
    action: 'Consider pairing these athletes in leadership roles or high-pressure training scenarios.',
  },
  'Complementary': {
    interpretation: 'These players occupy different social positions but show no friction between them. The more connected player may serve as a natural bridge for the other into the broader team network. Intentional pairing in training could strengthen both players.',
    action: 'Intentional grouping in practice and travel could help build a stronger connection between these players.',
  },
  'Tension Risk': {
    interpretation: 'These players sit in different zones of the team network with some friction proximity. They may not naturally gravitate toward each other. Monitoring their interactions in high-stress moments is recommended before assuming compatibility.',
    action: 'Monitor this pairing in high-stress situations. Individual check-ins before structured interaction recommended.',
  },
  'Friction Risk': {
    interpretation: 'There is elevated friction proximity between these players. Direct pairing in high-pressure situations may compound existing team tension. Individual check-ins with each player before any structured interaction is advised.',
    action: 'Avoid high-pressure pairing until individual check-ins have been completed with both athletes.',
  },
}

// Quadrant dot position (CSS left/top %) per zone.
// X-axis = support (right = high), Y-axis = friction (top = high).
const ZONE_DOT = {
  'Core Influencer':   { left: '72%', top: '70%' },
  'Polarizing Figure': { left: '72%', top: '28%' },
  'Rejection Risk':    { left: '28%', top: '28%' },
  'Isolation Risk':    { left: '28%', top: '70%' },
}

function wellnessColor(score) {
  if (score >= 7) return 'var(--gl)'
  if (score >= 4) return '#f0b030'
  return 'var(--rl)'
}

function ZoneQuadrant({ role }) {
  const dot = ZONE_DOT[role]
  const color = ROLE_COLORS[role] || 'var(--mid)'
  return (
    <div style={{ position: 'relative', width: 52, height: 52, background: 'var(--d3)', borderRadius: 4, border: '1px solid var(--bdr)', flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--bdr)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--bdr)' }} />
      {dot && (
        <div style={{
          position: 'absolute', left: dot.left, top: dot.top,
          transform: 'translate(-50%,-50%)',
          width: 9, height: 9, borderRadius: '50%', background: color,
          boxShadow: `0 0 4px ${color}88`,
        }} />
      )}
    </div>
  )
}

function PlayerCard({ playerScore, athleteName, wellness }) {
  const name = athleteName || playerScore.athlete_name
  const role = playerScore.social_role || 'Unknown'
  const roleKey = ROLE_KEYS[role] || 'non'
  const pos = playerScore.positive_mentions || 0
  const neg = playerScore.negative_mentions || 0
  const negColor = neg >= 8 ? 'var(--rl)' : neg >= 4 ? '#f0b030' : 'var(--mid)'

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--d4)', borderRadius: 8, padding: '14px 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--w)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      <div style={{ marginBottom: 12 }}><span className={`rtag ${roleKey}`}>{role}</span></div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gl)' }}>{pos}</div>
          <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1 }}>POS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: negColor }}>{neg > 0 ? `−${neg}` : '0'}</div>
          <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1 }}>FRIC</div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Zone</div>
        <ZoneQuadrant role={role} />
      </div>

      <div>
        <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Wellness</div>
        {wellness ? (
          <div style={{ fontSize: 11, lineHeight: 1.7 }}>
            <span style={{ color: wellnessColor(wellness.mental_score) }}>M: {wellness.mental_score}</span>
            {'  ·  '}
            <span style={{ color: wellnessColor(wellness.physical_score) }}>P: {wellness.physical_score}</span>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--mid)' }}>No data</div>
        )}
      </div>
    </div>
  )
}

export default function AthleteModal({ athlete, score, totalAthletes, allScores, nominations, roster, teamId, onClose }) {
  const [compareWith, setCompareWith]     = useState('')
  const [wellnessData, setWellnessData]   = useState(null)
  const [wellnessLoading, setWellnessLoading] = useState(false)

  const role    = score.social_role || 'Unknown'
  const pos     = score.positive_mentions || 0
  const neg     = score.negative_mentions || 0
  const done    = athlete.status === 'complete'
  const roleKey = ROLE_KEYS[role] || 'non'
  const summary = ROLE_SUMMARIES[role]
    ? ROLE_SUMMARIES[role](athlete.full_name, pos, neg, totalAthletes)
    : `No summary available for ${athlete.full_name}.`

  const otherPlayers = (allScores || []).filter(s => s.athlete_name !== athlete.full_name)
  const playerB = compareWith ? (allScores || []).find(s => s.athlete_name === compareWith) : null

  useEffect(() => {
    if (!compareWith || wellnessData !== null || !teamId) return
    setWellnessLoading(true)
    fetchTeamWellnessCheckins(teamId)
      .then(d => setWellnessData(d))
      .catch(() => setWellnessData([]))
      .finally(() => setWellnessLoading(false))
  }, [compareWith, teamId, wellnessData])

  function getWellness(fullName) {
    if (!wellnessData) return null
    const entry = (roster || []).find(r => r.full_name === fullName)
    if (!entry) return null
    return wellnessData.find(w => w.athlete_id === entry.id) || null
  }

  let comparison = null
  if (playerB && !wellnessLoading) {
    const wA = getWellness(athlete.full_name)
    const wB = getWellness(playerB.athlete_name)
    const frictionProximity = calculateFrictionProximity(score, playerB, nominations || [], roster || [], allScores || [])
    const cohesion = calculateCohesionScore(score, playerB, frictionProximity, wA, wB)
    const relationshipType = determineRelationshipType(score, playerB, frictionProximity)
    comparison = { frictionProximity, cohesion, relationshipType, wA, wB }
  }

  const cohesionColor = comparison
    ? comparison.cohesion >= 70 ? 'var(--gl)'
    : comparison.cohesion >= 40 ? '#f0b030'
    : 'var(--rl)'
    : null

  const relCopy = comparison ? RELATIONSHIP_COPY[comparison.relationshipType] : null

  const relTagColor = comparison ? {
    'Strong Alignment': 'var(--gl)',
    'Complementary':    '#9090ff',
    'Tension Risk':     '#f0b030',
    'Friction Risk':    'var(--rl)',
  }[comparison.relationshipType] : null

  return (
    <div className="modal-overlay on" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: compareWith ? 680 : 500 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3>{athlete.full_name}</h3>
            <p><span className={`rtag ${roleKey}`}>{role}</span></p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Social status stats */}
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

          {/* Social position summary */}
          <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 10 }}>Social Position Summary</div>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7 }}>{summary}</p>
          </div>

          {/* Compare with Teammate */}
          {otherPlayers.length > 0 && (
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 10 }}>Compare with Teammate</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={compareWith}
                  onChange={e => setCompareWith(e.target.value)}
                  style={{
                    flex: 1, background: 'var(--d4)', border: '1px solid var(--bdr)',
                    color: compareWith ? 'var(--w)' : 'var(--mid)',
                    borderRadius: 4, padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  <option value="">Select a teammate...</option>
                  {otherPlayers.map(p => (
                    <option key={p.athlete_name} value={p.athlete_name}>{p.athlete_name}</option>
                  ))}
                </select>
                {compareWith && (
                  <button className="btn bo bsm" onClick={() => setCompareWith('')}>Clear</button>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {compareWith && wellnessLoading && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="spinner" />
            </div>
          )}

          {/* Comparison results */}
          {comparison && playerB && (
            <div style={{ marginTop: 20 }}>
              {/* Side-by-side player cards + cohesion score */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                <PlayerCard
                  playerScore={score}
                  athleteName={athlete.full_name}
                  wellness={comparison.wA}
                />

                {/* Cohesion score center */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 72, flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' }}>Cohesion</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: cohesionColor, lineHeight: 1 }}>{comparison.cohesion}</div>
                  <div style={{ fontSize: 9, color: 'var(--mid)' }}>/ 100</div>
                </div>

                <PlayerCard
                  playerScore={playerB}
                  wellness={comparison.wB}
                />
              </div>

              {/* Written summary */}
              <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: relTagColor }}>{comparison.relationshipType}</span>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Cohesion Score</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: cohesionColor }}>{comparison.cohesion} / 100</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Friction Proximity</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: comparison.frictionProximity === 'Low' ? 'var(--gl)' : comparison.frictionProximity === 'Moderate' ? '#f0b030' : 'var(--rl)' }}>
                        {comparison.frictionProximity}
                      </div>
                    </div>
                  </div>
                </div>

                {relCopy && (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.7, marginBottom: 12 }}>{relCopy.interpretation}</p>
                    <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 12 }}>
                      <div style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Suggested Action</div>
                      <p style={{ fontSize: 12, color: 'var(--w)', lineHeight: 1.6 }}>{relCopy.action}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn bo" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
