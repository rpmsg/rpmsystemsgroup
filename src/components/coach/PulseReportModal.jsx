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

  // Snake-draft a list of players across groups for maximum separation
  function snakeDraft(players) {
    let dir = 1, pos = 0
    players.forEach(p => {
      groups[pos].players.push(p)
      pos += dir
      if (pos >= numGroups) { pos = numGroups - 1; dir = -1 }
      else if (pos < 0)     { pos = 0;             dir = 1  }
    })
  }

  // 1. Core Influencers seeded first — one per group ideally
  snakeDraft(buckets.ci)
  // 2. Polarizing figures — keep separated
  snakeDraft(buckets.pol)
  // 3. Isolation risks — fill in after CIs so they land near them
  snakeDraft(buckets.iso)
  // 4. Standard players
  snakeDraft(buckets.std)
  // 5. Rejection risks last — snake ensures they spread across groups
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

  // Best pairs: CI + IR
  IRs.forEach((ir, i) => {
    const ci = CIs[i % Math.max(CIs.length, 1)]
    if (ci) recommended.push({ a: ci.athlete_name, b: ir.athlete_name, note: 'Stable anchor with player who needs connection' })
  })

  // Good pairs: remaining CIs with lower-score players
  const paired = new Set(recommended.flatMap(p => [p.a, p.b]))
  CIs.filter(ci => !paired.has(ci.athlete_name)).forEach(ci => {
    const std = scores.find(s => !s.social_role && !paired.has(s.athlete_name))
    if (std) {
      recommended.push({ a: ci.athlete_name, b: std.athlete_name, note: 'Positive influence paired with developing player' })
      paired.add(std.athlete_name)
    }
  })

  // Pairs to avoid: RR + RR
  for (let i = 0; i < RRs.length; i++) {
    for (let j = i + 1; j < RRs.length; j++) {
      caution.push({ a: RRs[i].athlete_name, b: RRs[j].athlete_name, note: 'Both carry high friction — likely to escalate' })
    }
  }

  // Pairs to avoid: RR + Polarizing Figure
  RRs.forEach(rr => {
    Pols.forEach(pol => {
      caution.push({ a: rr.athlete_name, b: pol.athlete_name, note: 'Friction + polarizing dynamic — high conflict risk' })
    })
  })

  // Pairs to avoid: two high-friction non-RR players
  const highFric = scores.filter(s => s.negative_mentions >= 5 && s.social_role !== 'Rejection Risk')
  for (let i = 0; i < highFric.length; i++) {
    for (let j = i + 1; j < highFric.length; j++) {
      caution.push({ a: highFric[i].athlete_name, b: highFric[j].athlete_name, note: 'Both carry elevated friction scores' })
    }
  }

  return { recommended: recommended.slice(0, 8), caution: caution.slice(0, 8) }
}

// ── Main modal ────────────────────────────────────────────────
export default function PulseReportModal({ team, scores, roster, onClose }) {
  const [numGroups, setNumGroups] = useState(() => Math.min(6, Math.max(3, Math.ceil(scores.length / 5))))

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

  // ── Chart 1: Risk zone scatter ─────────────────────────────
  const scatterData = scores.map(s => ({ name: s.athlete_name, x: s.positive_mentions, y: s.negative_mentions, role: s.social_role }))
  const avgPos = scores.reduce((sum, s) => sum + s.positive_mentions, 0) / (scores.length || 1)
  const avgNeg = scores.reduce((sum, s) => sum + s.negative_mentions, 0) / (scores.length || 1)

  const ZONE_ROWS = [
    { label: 'Core Influencer',   color: '#43B878', desc: 'High positive · Low friction'  },
    { label: 'Rejection Risk',    color: '#e05a4a', desc: 'Low positive · High friction'   },
    { label: 'Isolation Risk',    color: '#9090ff', desc: 'Low positive · Low friction'    },
    { label: 'Polarizing Figure', color: '#f0b030', desc: 'High positive · High friction'  },
  ]

  // ── Chart 2: Horizontal bars ───────────────────────────────
  const barData = [...scores]
    .sort((a, b) => b.positive_mentions - a.positive_mentions)
    .slice(0, 16)
    .map(s => ({ name: s.athlete_name.split(' ')[0], Positive: s.positive_mentions, Friction: s.negative_mentions }))
    .reverse()

  // ── Chart 3: Grouping intelligence ────────────────────────
  const groups = buildGroups(scores, numGroups)
  const { recommended, caution } = buildRoomingPairs(scores)

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

          <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

            {/* ── Executive Summary ── */}
            <div style={{ marginBottom: 28 }}>
              <div className="cct">Executive Summary</div>
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
                Groups are balanced by social role — Core Influencers anchored across groups, Rejection Risk players separated. Rooming pairs derived from role compatibility only.
              </div>

              {/* Practice Groups */}
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

              {/* Rooming Pairs */}
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
