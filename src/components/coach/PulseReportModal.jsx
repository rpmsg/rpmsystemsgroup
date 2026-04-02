import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
  BarChart, Bar, LabelList, Legend
} from 'recharts'

const ROLE_COLORS = {
  'Core Influencer':   '#43B878',
  'Rejection Risk':    '#e05a4a',
  'Isolation Risk':    '#9090ff',
  'Polarizing Figure': '#f0b030',
}
const ROLE_KEY = {
  'Core Influencer':   'inf',
  'Rejection Risk':    'rej',
  'Isolation Risk':    'iso',
  'Polarizing Figure': 'pol',
}

const ADMIN_LABELS = {
  1: 'Admin 1 — Start',
  2: 'Admin 2 — Mid',
  3: 'Admin 3 — End',
}
const ADMIN_FULL_LABELS = {
  1: 'Administration 1 — Start of Season (Set 1)',
  2: 'Administration 2 — Mid Season (Set 2)',
  3: 'Administration 3 — End of Season (Set 1)',
}

// ── Scatter label ─────────────────────────────────────────────
function ScatterLabel({ cx, cy, payload }) {
  const first = (payload?.name || '').split(' ')[0]
  if (!cx || !cy || !first) return null
  return (
    <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#888" fontFamily="system-ui">
      {first}
    </text>
  )
}

// ── Grouping algorithm ────────────────────────────────────────
function buildGroups(scores, numGroups) {
  const buckets = {
    ci:  scores.filter(s => s.social_role === 'Core Influencer').sort((a, b) => b.positive_mentions - a.positive_mentions),
    pol: scores.filter(s => s.social_role === 'Polarizing Figure'),
    iso: scores.filter(s => s.social_role === 'Isolation Risk'),
    rr:  scores.filter(s => s.social_role === 'Rejection Risk').sort((a, b) => b.negative_mentions - a.negative_mentions),
    std: scores.filter(s => !s.social_role || !ROLE_KEY[s.social_role]),
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

// ── Rooming pairs algorithm ───────────────────────────────────
function buildRoomingPairs(scores) {
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

// ── Comparison helpers ────────────────────────────────────────
function cohesionScore(scores) {
  if (!scores?.length) return 0
  return Math.round(scores.reduce((s, a) => s + a.positive_mentions, 0) / scores.length * 10) / 10
}

function trendArrow(aVal, bVal) {
  const diff = bVal - aVal
  if (diff >= 2)  return { symbol: '↑', color: '#43B878' }
  if (diff <= -2) return { symbol: '↓', color: '#e05a4a' }
  return { symbol: '→', color: '#888' }
}

function buildComparisonRows(scoresA, scoresB) {
  const allNames = [...new Set([
    ...(scoresA || []).map(s => s.athlete_name),
    ...(scoresB || []).map(s => s.athlete_name),
  ])].sort()

  const mapA = Object.fromEntries((scoresA || []).map(s => [s.athlete_name, s]))
  const mapB = Object.fromEntries((scoresB || []).map(s => [s.athlete_name, s]))

  return allNames.map(name => {
    const a = mapA[name] || null
    const b = mapB[name] || null
    const posArrow  = a && b ? trendArrow(a.positive_mentions, b.positive_mentions) : null
    const negArrow  = a && b ? trendArrow(b.negative_mentions, a.negative_mentions) : null // lower neg is better
    const roleChanged = a && b && a.social_role !== b.social_role
    return { name, a, b, posArrow, negArrow, roleChanged }
  })
}

// ── Main modal ────────────────────────────────────────────────
export default function PulseReportModal({ team, scores: defaultScores, scoresByAdmin, availableAdmins, roster, onClose }) {
  const currentAdmin  = team.current_administration || 1
  const initialAdmin  = availableAdmins?.includes(currentAdmin)
    ? currentAdmin
    : (availableAdmins?.[availableAdmins.length - 1] ?? 1)

  const [viewMode, setViewMode]       = useState('single')
  const [selectedAdmin, setSelectedAdmin] = useState(initialAdmin)
  const [compareA, setCompareA]       = useState(availableAdmins?.[0] ?? 1)
  const [compareB, setCompareB]       = useState(availableAdmins?.[availableAdmins.length - 1] ?? 1)
  const [numGroups, setNumGroups]     = useState(() => Math.min(6, Math.max(3, Math.ceil((defaultScores?.length || 0) / 5))))

  // Active scores for single view
  const scores = (scoresByAdmin?.[selectedAdmin]) || defaultScores || []

  const complete = roster.filter(r => r.status === 'complete').length
  const pending  = roster.length - complete
  const coreInf  = scores.filter(s => s.social_role === 'Core Influencer').length
  const friction = scores.filter(s => s.negative_mentions >= 8).length
  const today    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const sortedNeg = [...scores].sort((a, b) => b.negative_mentions - a.negative_mentions)

  const suggestions = []
  if (sortedNeg[0]?.negative_mentions > 0)
    suggestions.push(`${sortedNeg[0].athlete_name} — Friction score is a significant outlier (−${sortedNeg[0].negative_mentions}). Consider a private 1:1 conversation before drawing conclusions.`)
  if (sortedNeg[1]?.negative_mentions > 0)
    suggestions.push(`${sortedNeg[1].athlete_name}${sortedNeg[2]?.negative_mentions > 0 ? ' & ' + sortedNeg[2].athlete_name : ''} — Elevated friction with limited peer support. Understanding the source may reveal fixable dynamics.`)
  const isoCount = scores.filter(s => s.social_role === 'Isolation Risk').length
  if (isoCount > 0)
    suggestions.push(`${isoCount} Isolation Risk player${isoCount > 1 ? 's' : ''} — Intentional grouping with Core Influencers in training and travel may help build connection naturally.`)
  if (!suggestions.length)
    suggestions.push('No significant friction patterns detected. Team dynamics look healthy based on current data.')

  const scatterData = scores.map(s => ({ name: s.athlete_name, x: s.positive_mentions, y: s.negative_mentions, role: s.social_role }))
  const avgPos = scores.reduce((sum, s) => sum + s.positive_mentions, 0) / (scores.length || 1)
  const avgNeg = scores.reduce((sum, s) => sum + s.negative_mentions, 0) / (scores.length || 1)

  const ZONE_ROWS = [
    { label: 'Core Influencer',   color: '#43B878', desc: 'High positive · Low friction'  },
    { label: 'Rejection Risk',    color: '#e05a4a', desc: 'Low positive · High friction'   },
    { label: 'Isolation Risk',    color: '#9090ff', desc: 'Low positive · Low friction'    },
    { label: 'Polarizing Figure', color: '#f0b030', desc: 'High positive · High friction'  },
  ]

  const barData = [...scores]
    .sort((a, b) => b.positive_mentions - a.positive_mentions)
    .slice(0, 16)
    .map(s => ({ name: s.athlete_name.split(' ')[0], Positive: s.positive_mentions, Friction: s.negative_mentions }))
    .reverse()

  const groups = buildGroups(scores, numGroups)
  const { recommended, caution } = buildRoomingPairs(scores)

  // ── Comparison view data ───────────────────────────────────
  const scoresA       = scoresByAdmin?.[compareA] || []
  const scoresB       = scoresByAdmin?.[compareB] || []
  const compRows      = buildComparisonRows(scoresA, scoresB)
  const cohesionA     = cohesionScore(scoresA)
  const cohesionB     = cohesionScore(scoresB)
  const cohesionArrow = trendArrow(cohesionA, cohesionB)

  function roleCounts(s) {
    return {
      ci:  s.filter(x => x.social_role === 'Core Influencer').length,
      pol: s.filter(x => x.social_role === 'Polarizing Figure').length,
      iso: s.filter(x => x.social_role === 'Isolation Risk').length,
      rr:  s.filter(x => x.social_role === 'Rejection Risk').length,
      fric: s.filter(x => x.negative_mentions >= 8).length,
    }
  }
  const rcA = roleCounts(scoresA)
  const rcB = roleCounts(scoresB)

  const hasMultipleAdmins = (availableAdmins?.length || 0) > 1

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.print-report) { display: none !important; }
          .print-report { display: block !important; position: static !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .modal-overlay { position: static !important; background: white !important; }
          .modal { max-width: 100% !important; max-height: none !important; box-shadow: none !important; border: none !important; background: white !important; color: black !important; }
          .cct { color: #555 !important; }
          svg text { fill: #333 !important; }
        }
      `}</style>

      <div className="modal-overlay on print-report" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

          <div className="modal-head">
            <div>
              <h3>📊 Pulse Report — {team.name}</h3>
              <p>{team.season || 'Current Season'} · {complete}/{roster.length} athletes complete · {today}</p>
            </div>
            <button className="modal-close no-print" onClick={onClose}>✕</button>
          </div>

          {/* ── Administration controls ── */}
          <div className="no-print" style={{ padding: '10px 24px', borderBottom: '1px solid var(--bdr)', background: 'var(--d2)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setViewMode('single')}
                style={{
                  padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid var(--bdr)',
                  background: viewMode === 'single' ? 'var(--g)' : 'var(--d4)',
                  color: viewMode === 'single' ? '#fff' : 'var(--mid)',
                }}
              >
                Single View
              </button>
              {hasMultipleAdmins && (
                <button
                  onClick={() => setViewMode('compare')}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid var(--bdr)',
                    background: viewMode === 'compare' ? 'var(--g)' : 'var(--d4)',
                    color: viewMode === 'compare' ? '#fff' : 'var(--mid)',
                  }}
                >
                  Compare Administrations
                </button>
              )}
            </div>

            {viewMode === 'single' && availableAdmins?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--mid)' }}>Viewing:</span>
                <select
                  value={selectedAdmin}
                  onChange={e => setSelectedAdmin(Number(e.target.value))}
                  style={{ background: 'var(--d4)', color: 'var(--w)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}
                >
                  {availableAdmins.map(n => (
                    <option key={n} value={n}>{ADMIN_LABELS[n]}</option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'compare' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={compareA}
                  onChange={e => setCompareA(Number(e.target.value))}
                  style={{ background: 'var(--d4)', color: 'var(--w)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}
                >
                  {availableAdmins.map(n => <option key={n} value={n}>{ADMIN_LABELS[n]}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--mid)' }}>vs</span>
                <select
                  value={compareB}
                  onChange={e => setCompareB(Number(e.target.value))}
                  style={{ background: 'var(--d4)', color: 'var(--w)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}
                >
                  {availableAdmins.map(n => <option key={n} value={n}>{ADMIN_LABELS[n]}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

            {/* ══════════════════════════════════════════════════
                SINGLE VIEW
            ══════════════════════════════════════════════════ */}
            {viewMode === 'single' && (
              <>
                {/* ── Executive Summary ── */}
                <div style={{ marginBottom: 28 }}>
                  <div className="cct">
                    Executive Summary
                    {availableAdmins?.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--mid)', marginLeft: 8, fontWeight: 400 }}>
                        {ADMIN_FULL_LABELS[selectedAdmin]}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { v: complete, l: 'Complete',        c: '#43B878' },
                      { v: pending,  l: 'Pending',          c: '#888'    },
                      { v: coreInf,  l: 'Core Influencers', c: '#43B878' },
                      { v: friction, l: 'Friction Flags',   c: '#e05a4a' },
                    ].map(s => (
                      <div key={s.l} style={{ background: 'var(--d3)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#43B878', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Top Positive Influencers</div>
                      {scores.slice(0, 5).map(s => (
                        <div key={s.athlete_name} style={{ fontSize: 12, color: 'var(--mid)', padding: '3px 0', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.athlete_name}</span>
                          <span style={{ color: '#43B878', fontWeight: 600 }}>+{s.positive_mentions}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#e05a4a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Friction Flags</div>
                      {sortedNeg.filter(s => s.negative_mentions > 0).slice(0, 5).map(s => (
                        <div key={s.athlete_name} style={{ fontSize: 12, color: 'var(--mid)', padding: '3px 0', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.athlete_name}</span>
                          <span style={{ color: '#e05a4a', fontWeight: 600 }}>−{s.negative_mentions}</span>
                        </div>
                      ))}
                      {sortedNeg.filter(s => s.negative_mentions > 0).length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--mid)' }}>No friction flags.</div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Coaching Actions</div>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, padding: '6px 0', borderBottom: '1px solid var(--bdr)' }}>
                      {i + 1}. {s}
                    </div>
                  ))}
                </div>

                {/* ── Chart 1: Risk Zone Scatter ── */}
                <div style={{ marginBottom: 28 }}>
                  <div className="cct">Chart 1 — Team Risk Zone Analysis</div>
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 12 }}>
                    Players plotted by positive nominations (x) vs. friction (y). Reference lines mark team averages.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {ZONE_ROWS.map(z => (
                      <div key={z.label} style={{ background: 'var(--d3)', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: z.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w)' }}>{z.label}</span>
                          <span style={{ fontSize: 10, color: 'var(--mid)', marginLeft: 6 }}>{z.desc}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: z.color }}>
                          {scores.filter(s => s.social_role === z.label).length}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="x" name="Positive" type="number" label={{ value: 'Positive Nominations →', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#888' }} tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis dataKey="y" name="Friction" type="number" label={{ value: 'Friction →', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#888' }} tick={{ fontSize: 10, fill: '#888' }} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ payload }) => {
                          if (!payload?.length) return null
                          const d = payload[0].payload
                          return (
                            <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
                              <div style={{ color: '#43B878' }}>+{d.x} positive</div>
                              <div style={{ color: '#e05a4a' }}>−{d.y} friction</div>
                              <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{d.role}</div>
                            </div>
                          )
                        }}
                      />
                      <ReferenceLine x={Math.round(avgPos)} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'avg', fontSize: 9, fill: '#888' }} />
                      <ReferenceLine y={Math.round(avgNeg)} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'avg', fontSize: 9, fill: '#888' }} />
                      <Scatter data={scatterData} label={ScatterLabel}>
                        {scatterData.map((entry, i) => (
                          <Cell key={i} fill={ROLE_COLORS[entry.role] || '#888'} fillOpacity={0.85} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Chart 2: Influence & Friction Bars ── */}
                <div style={{ marginBottom: 28 }}>
                  <div className="cct">Chart 2 — Player Influence &amp; Friction Breakdown</div>
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 12 }}>
                    Green = positive nominations received. Orange = friction nominations received.
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(260, barData.length * 28)}>
                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#888' }} />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: '#ccc' }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 12 }}
                        labelStyle={{ color: 'var(--w)', fontWeight: 600 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                      <Bar dataKey="Positive" fill="#1d8f5a" radius={[0, 3, 3, 0]}>
                        <LabelList dataKey="Positive" position="right" style={{ fontSize: 10, fill: '#888' }} />
                      </Bar>
                      <Bar dataKey="Friction" fill="#b05e00" radius={[0, 3, 3, 0]}>
                        <LabelList dataKey="Friction" position="right" style={{ fontSize: 10, fill: '#888' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Chart 3: Grouping Intelligence ── */}
                <div style={{ marginBottom: 16 }}>
                  <div className="cct">Chart 3 — Practice &amp; Rooming Intelligence</div>
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 16 }}>
                    Groups are balanced by social role — Core Influencers anchored across groups, Rejection Risk players separated.
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--w)', textTransform: 'uppercase', letterSpacing: 1 }}>Suggested Practice Groups</div>
                      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--mid)' }}>Groups:</span>
                        {[3,4,5,6].map(n => (
                          <button
                            key={n}
                            onClick={() => setNumGroups(n)}
                            style={{
                              padding: '2px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                              background: numGroups === n ? 'var(--g)' : 'var(--d4)',
                              color: numGroups === n ? '#fff' : 'var(--mid)',
                              border: '1px solid var(--bdr)',
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(numGroups, 3)}, 1fr)`, gap: 10 }}>
                      {groups.map(g => (
                        <div key={g.id} style={{ background: 'var(--d3)', borderRadius: 8, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            Group {g.id}
                          </div>
                          {g.players.map(p => {
                            const color = ROLE_COLORS[p.social_role] || 'var(--mid)'
                            return (
                              <div key={p.athlete_name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid var(--bdr)' }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: 'var(--w)' }}>{p.athlete_name}</span>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
                      {Object.entries(ROLE_COLORS).map(([role, color]) => (
                        <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--mid)' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                          {role}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#43B878', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>✓ Recommended Pairs</div>
                      {recommended.length === 0
                        ? <div style={{ fontSize: 12, color: 'var(--mid)' }}>No specific pairings flagged.</div>
                        : recommended.map((p, i) => (
                          <div key={i} style={{ background: 'var(--d3)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: 'var(--w)', fontWeight: 500 }}>{p.a} + {p.b}</div>
                            <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>{p.note}</div>
                          </div>
                        ))
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#e05a4a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>⚠ Use Caution</div>
                      {caution.length === 0
                        ? <div style={{ fontSize: 12, color: 'var(--mid)' }}>No high-risk pairings identified.</div>
                        : caution.map((p, i) => (
                          <div key={i} style={{ background: 'var(--d3)', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, color: 'var(--w)', fontWeight: 500 }}>{p.a} + {p.b}</div>
                            <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>{p.note}</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--mid)', padding: '12px 0', borderTop: '1px solid var(--bdr)', marginTop: 16 }}>
                  🔒 Confidential — Coaching staff only. Groupings are algorithmically generated from social role data. Individual nomination responses are never exposed.
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                COMPARISON VIEW
            ══════════════════════════════════════════════════ */}
            {viewMode === 'compare' && (
              <>
                {compareA === compareB ? (
                  <div style={{ textAlign: 'center', color: 'var(--mid)', fontSize: 13, padding: '40px 0' }}>
                    Select two different administrations to compare.
                  </div>
                ) : (
                  <>
                    {/* ── Team Level Comparison ── */}
                    <div style={{ marginBottom: 28 }}>
                      <div className="cct">Team Level Comparison</div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 16 }}>
                        {compareA === 1 && compareB === 3
                          ? 'Start vs. End of season — identical question sets.'
                          : `${ADMIN_LABELS[compareA]} vs ${ADMIN_LABELS[compareB]}`}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                        {[
                          { label: 'Avg Cohesion', a: cohesionA, b: cohesionB, higherBetter: true, format: v => v.toFixed(1) },
                          { label: 'Core Influencers', a: rcA.ci,  b: rcB.ci,  higherBetter: true,  format: v => v },
                          { label: 'Friction Flags',   a: rcA.fric, b: rcB.fric, higherBetter: false, format: v => v },
                          { label: 'Rejection Risk',   a: rcA.rr,  b: rcB.rr,  higherBetter: false, format: v => v },
                          { label: 'Isolation Risk',   a: rcA.iso, b: rcB.iso,  higherBetter: false, format: v => v },
                          { label: 'Polarizing',       a: rcA.pol, b: rcB.pol,  higherBetter: null,  format: v => v },
                        ].map(m => {
                          const arrow = trendArrow(m.a, m.b)
                          const improved = m.higherBetter === true  ? m.b > m.a
                                         : m.higherBetter === false ? m.b < m.a
                                         : false
                          return (
                            <div key={m.label} style={{ background: 'var(--d3)', borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{m.label}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--mid)' }}>{m.format(m.a)}</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: arrow.color }}>{arrow.symbol}</span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: improved ? '#43B878' : m.b !== m.a ? '#e05a4a' : 'var(--mid)' }}>{m.format(m.b)}</span>
                              </div>
                              <div style={{ fontSize: 9, color: 'var(--mid)', marginTop: 4 }}>
                                {ADMIN_LABELS[compareA]} → {ADMIN_LABELS[compareB]}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* ── Individual Level Comparison ── */}
                    <div style={{ marginBottom: 16 }}>
                      <div className="cct">Individual Level Comparison</div>
                      <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 12 }}>
                        ↑ improved &nbsp;·&nbsp; ↓ declined &nbsp;·&nbsp; → stable (within 1 nomination)
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--bdr)' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--mid)', fontWeight: 600 }}>Athlete</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--mid)', fontWeight: 600 }} colSpan={3}>{ADMIN_LABELS[compareA]}</th>
                              <th style={{ padding: '6px 4px' }} />
                              <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--mid)', fontWeight: 600 }} colSpan={3}>{ADMIN_LABELS[compareB]}</th>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--bdr)' }}>
                              <th style={{ padding: '4px 8px' }} />
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: 'var(--mid)' }}>Role</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: '#43B878' }}>+Pos</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: '#e05a4a' }}>−Fric</th>
                              <th style={{ padding: '4px 4px' }} />
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: 'var(--mid)' }}>Role</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: '#43B878' }}>+Pos</th>
                              <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, color: '#e05a4a' }}>−Fric</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compRows.map(row => {
                              const pa = row.posArrow
                              const na = row.negArrow
                              return (
                                <tr key={row.name} style={{ borderBottom: '1px solid var(--bdr)' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 500, color: 'var(--w)', whiteSpace: 'nowrap' }}>
                                    {row.name}
                                    {row.roleChanged && (
                                      <span style={{ fontSize: 9, background: '#f0b030', color: '#000', borderRadius: 3, padding: '1px 4px', marginLeft: 6 }}>Role Change</span>
                                    )}
                                  </td>
                                  {/* Admin A */}
                                  <td style={{ textAlign: 'center', padding: '6px 6px' }}>
                                    {row.a ? (
                                      <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: ROLE_COLORS[row.a.social_role] + '28', color: ROLE_COLORS[row.a.social_role] || 'var(--mid)' }}>
                                        {row.a.social_role?.split(' ')[0] || '—'}
                                      </span>
                                    ) : <span style={{ color: 'var(--mid)' }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 6px', color: '#43B878', fontWeight: 600 }}>
                                    {row.a ? `+${row.a.positive_mentions}` : '—'}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 6px', color: '#e05a4a', fontWeight: 600 }}>
                                    {row.a ? `−${row.a.negative_mentions}` : '—'}
                                  </td>
                                  {/* Trend arrows */}
                                  <td style={{ textAlign: 'center', padding: '6px 6px' }}>
                                    {pa && (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: pa.color }} title="Positive nominations">{pa.symbol}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: na.color }} title="Friction">{na.symbol}</span>
                                      </div>
                                    )}
                                  </td>
                                  {/* Admin B */}
                                  <td style={{ textAlign: 'center', padding: '6px 6px' }}>
                                    {row.b ? (
                                      <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: ROLE_COLORS[row.b.social_role] + '28', color: ROLE_COLORS[row.b.social_role] || 'var(--mid)' }}>
                                        {row.b.social_role?.split(' ')[0] || '—'}
                                      </span>
                                    ) : <span style={{ color: 'var(--mid)' }}>—</span>}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 6px', color: '#43B878', fontWeight: 600 }}>
                                    {row.b ? `+${row.b.positive_mentions}` : '—'}
                                  </td>
                                  <td style={{ textAlign: 'center', padding: '6px 6px', color: '#e05a4a', fontWeight: 600 }}>
                                    {row.b ? `−${row.b.negative_mentions}` : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 12, lineHeight: 1.6 }}>
                        Role abbreviations: Core = Core Influencer · Rejection = Rejection Risk · Isolation = Isolation Risk · Polarizing = Polarizing Figure
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--mid)', padding: '12px 0', borderTop: '1px solid var(--bdr)', marginTop: 16 }}>
                      🔒 Confidential — Coaching staff only. Individual nomination responses are never exposed.
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="modal-foot no-print">
            <p style={{ fontSize: 11, color: 'var(--mid)' }}>Charts generated live from team data</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn bo" onClick={onClose}>Close</button>
              <button className="btn bp" onClick={() => window.print()}>🖨 Print / Save PDF</button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
