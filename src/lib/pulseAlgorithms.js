import { ROLE_KEYS } from '../constants'

// ── Practice group builder ────────────────────────────────────
export function buildGroups(scores, numGroups) {
  const buckets = {
    ci:  scores.filter(s => s.social_role === 'Core Influencer').sort((a, b) => b.positive_mentions - a.positive_mentions),
    pol: scores.filter(s => s.social_role === 'Polarizing Figure'),
    iso: scores.filter(s => s.social_role === 'Isolation Risk'),
    rr:  scores.filter(s => s.social_role === 'Rejection Risk').sort((a, b) => b.negative_mentions - a.negative_mentions),
    std: scores.filter(s => !s.social_role || !ROLE_KEYS[s.social_role]),
  }

  const groups = Array.from({ length: numGroups }, (_, i) => ({ id: i + 1, players: [] }))

  function snakeDraft(players) {
    let dir = 1, pos = 0
    players.forEach(p => {
      groups[pos].players.push(p)
      pos += dir
      if (pos >= numGroups) { pos = numGroups - 1; dir = -1 }
      else if (pos < 0)     { pos = 0;             dir = 1  }
    })
  }

  snakeDraft(buckets.ci)
  snakeDraft(buckets.pol)
  snakeDraft(buckets.iso)
  snakeDraft(buckets.std)
  snakeDraft(buckets.rr)

  return groups
}

// ── Rooming pairs builder ─────────────────────────────────────
export function buildRoomingPairs(scores) {
  const CIs  = scores.filter(s => s.social_role === 'Core Influencer')
  const IRs  = scores.filter(s => s.social_role === 'Isolation Risk')
  const RRs  = scores.filter(s => s.social_role === 'Rejection Risk')
  const Pols = scores.filter(s => s.social_role === 'Polarizing Figure')

  const recommended = []
  const caution     = []

  IRs.forEach((ir, i) => {
    const ci = CIs[i % Math.max(CIs.length, 1)]
    if (ci) recommended.push({ a: ci.athlete_name, b: ir.athlete_name, note: 'Stable anchor with player who needs connection' })
  })

  const paired = new Set(recommended.flatMap(p => [p.a, p.b]))
  CIs.filter(ci => !paired.has(ci.athlete_name)).forEach(ci => {
    const std = scores.find(s => !s.social_role && !paired.has(s.athlete_name))
    if (std) {
      recommended.push({ a: ci.athlete_name, b: std.athlete_name, note: 'Positive influence paired with developing player' })
      paired.add(std.athlete_name)
    }
  })

  for (let i = 0; i < RRs.length; i++) {
    for (let j = i + 1; j < RRs.length; j++) {
      caution.push({ a: RRs[i].athlete_name, b: RRs[j].athlete_name, note: 'Both carry high friction — likely to escalate' })
    }
  }

  RRs.forEach(rr => {
    Pols.forEach(pol => {
      caution.push({ a: rr.athlete_name, b: pol.athlete_name, note: 'Friction + polarizing dynamic — high conflict risk' })
    })
  })

  const highFric = scores.filter(s => s.negative_mentions >= 5 && s.social_role !== 'Rejection Risk')
  for (let i = 0; i < highFric.length; i++) {
    for (let j = i + 1; j < highFric.length; j++) {
      caution.push({ a: highFric[i].athlete_name, b: highFric[j].athlete_name, note: 'Both carry elevated friction scores' })
    }
  }

  return { recommended: recommended.slice(0, 8), caution: caution.slice(0, 8) }
}

// ── Player-to-player relationship comparison ──────────────────

const ZONE_ADJACENTS = {
  'Core Influencer':   ['Polarizing Figure', 'Isolation Risk'],
  'Polarizing Figure': ['Core Influencer',   'Rejection Risk'],
  'Rejection Risk':    ['Polarizing Figure', 'Isolation Risk'],
  'Isolation Risk':    ['Core Influencer',   'Rejection Risk'],
}

// Returns 'Low' | 'Moderate' | 'High'
// Nomination data never leaves this function — only the result is returned.
export function calculateFrictionProximity(playerA, playerB, nominations, roster, allScores) {
  const negNoms = nominations.filter(n => n.question_type === 'negative')
  const rosterA = roster.find(r => r.full_name === playerA.athlete_name)
  const rosterB = roster.find(r => r.full_name === playerB.athlete_name)
  const idA = rosterA?.id
  const idB = rosterB?.id
  const nameA = playerA.athlete_name
  const nameB = playerB.athlete_name

  // Handles both UUID and name storage formats for nominee fields
  function nominatesNeg(responderId, responderName, targetId, targetName) {
    return negNoms.some(n =>
      (n.athlete_id === responderId || n.athlete_id === responderName) &&
      (n.nominee_1 === targetId || n.nominee_1 === targetName ||
       n.nominee_2 === targetId || n.nominee_2 === targetName)
    )
  }

  if (nominatesNeg(idA, nameA, idB, nameB) || nominatesNeg(idB, nameB, idA, nameA)) return 'High'

  const avgFriction = allScores.length
    ? allScores.reduce((s, p) => s + (p.negative_mentions || 0), 0) / allScores.length
    : 0
  if ((playerA.negative_mentions || 0) > avgFriction && (playerB.negative_mentions || 0) > avgFriction) return 'Moderate'

  return 'Low'
}

// Returns 0–100
export function calculateCohesionScore(playerA, playerB, frictionProximity, wellnessA, wellnessB) {
  const roleA = playerA.social_role
  const roleB = playerB.social_role

  let zonePoints = 10
  if (roleA === roleB) zonePoints = 40
  else if (ZONE_ADJACENTS[roleA]?.includes(roleB)) zonePoints = 25

  const frictionPoints = frictionProximity === 'Low' ? 30 : frictionProximity === 'Moderate' ? 15 : 0

  const diff = Math.abs((playerA.positive_mentions || 0) - (playerB.positive_mentions || 0))
  const mentionPoints = diff <= 3 ? 20 : diff <= 6 ? 10 : 5

  let wellnessPoints = 0
  if (wellnessA?.mental_score != null && wellnessB?.mental_score != null) {
    const mDiff = Math.abs(wellnessA.mental_score - wellnessB.mental_score)
    wellnessPoints = mDiff <= 2 ? 10 : mDiff <= 4 ? 5 : 0
  }

  return zonePoints + frictionPoints + mentionPoints + wellnessPoints
}

// Returns 'Strong Alignment' | 'Complementary' | 'Tension Risk' | 'Friction Risk'
export function determineRelationshipType(playerA, playerB, frictionProximity) {
  const roleA = playerA.social_role
  const roleB = playerB.social_role
  const sameZone = roleA === roleB
  const posDiff = Math.abs((playerA.positive_mentions || 0) - (playerB.positive_mentions || 0))

  if (frictionProximity === 'High') return 'Friction Risk'
  if (sameZone && frictionProximity === 'Low') return 'Strong Alignment'
  if (!sameZone && frictionProximity === 'Low') return 'Complementary'
  if (!sameZone && frictionProximity === 'Moderate' && posDiff > 6) return 'Tension Risk'
  return 'Tension Risk'
}

// ── Comparison helpers ────────────────────────────────────────
export function cohesionScore(scores) {
  if (!scores?.length) return 0
  return Math.round(scores.reduce((s, a) => s + a.positive_mentions, 0) / scores.length * 10) / 10
}

export function trendArrow(aVal, bVal) {
  const diff = bVal - aVal
  if (diff >= 2)  return { symbol: '↑', color: '#43B878' }
  if (diff <= -2) return { symbol: '↓', color: '#e05a4a' }
  return { symbol: '→', color: '#888' }
}

export function buildComparisonRows(scoresA, scoresB) {
  const allNames = [...new Set([
    ...(scoresA || []).map(s => s.athlete_name),
    ...(scoresB || []).map(s => s.athlete_name),
  ])].sort()

  const mapA = Object.fromEntries((scoresA || []).map(s => [s.athlete_name, s]))
  const mapB = Object.fromEntries((scoresB || []).map(s => [s.athlete_name, s]))

  return allNames.map(name => {
    const a = mapA[name] || null
    const b = mapB[name] || null
    const posArrow   = a && b ? trendArrow(a.positive_mentions, b.positive_mentions) : null
    const negArrow   = a && b ? trendArrow(b.negative_mentions, a.negative_mentions) : null
    const roleChanged = a && b && a.social_role !== b.social_role
    return { name, a, b, posArrow, negArrow, roleChanged }
  })
}
