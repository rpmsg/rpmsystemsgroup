import { useState, useEffect } from 'react'
import { fetchTeamWellnessCheckins } from '../../lib/wellnessApi'

const MENTAL_EMOJI = { 1: '🔴', 2: '😤', 3: '😐', 4: '🎯', 5: '🟢' }
const MENTAL_TEXT  = { 1: 'Spinning', 2: 'Fighting It', 3: 'Steady', 4: 'Dialed In', 5: 'Clear Headed' }

function mentalColor(n) {
  return n >= 4 ? '#43B878' : n === 3 ? '#f0b030' : '#e05a4a'
}
function physColor(n) {
  return n >= 7 ? '#43B878' : n >= 4 ? '#f0b030' : '#e05a4a'
}
function fmtDate(w) {
  return new Date(w + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Athlete history modal ─────────────────────────────────────
function AthleteHistoryModal({ athlete, checkins, onClose }) {
  const rows = checkins
    .filter(c => c.athlete_id === athlete.id)
    .sort((a, b) => b.week_date.localeCompare(a.week_date))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 12,
        padding: 28, maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 4 }}>{athlete.full_name}</h3>
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>Wellness history — {rows.length} check-ins</div>
          </div>
          <button className="btn bo bsm" onClick={onClose}>✕ Close</button>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', fontSize: 13, padding: '32px 0' }}>
            No check-ins recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((c, i) => {
              const mc = mentalColor(c.mental_score)
              return (
                <div key={i} style={{
                  background: mc + '12',
                  borderRadius: 10,
                  padding: '14px 16px',
                  border: `1px solid ${mc}33`,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 10, fontWeight: 600 }}>
                    Week of {fmtDate(c.week_date)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Mental</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ fontSize: 18 }}>{MENTAL_EMOJI[c.mental_score]}</span>
                        <span style={{ color: mc, fontWeight: 700, fontSize: 13 }}>
                          {MENTAL_TEXT[c.mental_score]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid)' }}>
                        {c.mental_score}/5{c.mental_word ? ` · "${c.mental_word}"` : ''}
                      </div>
                      {c.mental_score <= 2 && (
                        <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 4, fontWeight: 600 }}>⚠ Flagged</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Physical</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ color: physColor(c.physical_score), fontWeight: 700, fontSize: 22 }}>
                          {c.physical_score}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--mid)' }}>/10</span>
                      </div>
                      {c.physical_score <= 3 && (
                        <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 4, fontWeight: 600 }}>⚠ Flagged</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Check-in card (table cell) ────────────────────────────────
function CheckinCard({ c }) {
  const mc = mentalColor(c.mental_score)
  const pc = physColor(c.physical_score)
  return (
    <div style={{
      background: mc + '14',
      border: `1px solid ${mc}30`,
      borderRadius: 8,
      padding: '10px 12px',
      minWidth: 120,
    }}>
      {/* Mental */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{MENTAL_EMOJI[c.mental_score]}</span>
        <span style={{ color: mc, fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>
          {c.mental_word || MENTAL_TEXT[c.mental_score]}
        </span>
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: mc + '25', marginBottom: 7 }} />
      {/* Physical */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--mid)', marginRight: 2 }}>body</span>
        <span style={{ color: pc, fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{c.physical_score}</span>
        <span style={{ fontSize: 10, color: 'var(--mid)' }}>/10</span>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────
export default function WellnessTab({ teamId, roster }) {
  const [checkins, setCheckins] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchTeamWellnessCheckins(teamId).then(setCheckins)
  }, [teamId])

  if (checkins === null) return <div className="spinner" style={{ margin: '40px auto' }} />

  if (checkins.length === 0) return (
    <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--mid)', fontSize: 13 }}>
      No wellness check-ins submitted yet.
    </div>
  )

  // 3 most recent distinct week_dates
  const allWeeks = [...new Set(checkins.map(c => c.week_date))].sort().reverse().slice(0, 3)

  // Fast lookup
  const byKey = {}
  checkins.forEach(c => { byKey[`${c.athlete_id}:${c.week_date}`] = c })

  // Flags from the most recent week
  const latestWeek = allWeeks[0]
  const flags = []
  roster.forEach(a => {
    const c = byKey[`${a.id}:${latestWeek}`]
    if (!c) return
    const first = a.full_name.split(' ')[0]
    const dateStr = fmtDate(latestWeek)
    if (c.mental_score <= 2) {
      flags.push({
        icon: '🧠',
        label: `Mental — ${a.full_name} · ${dateStr}`,
        text: `${first} checked in as "${MENTAL_TEXT[c.mental_score]}" (${c.mental_score}/5). Recommended: Schedule a private 1:1 before next session. Use open-ended questions. Do not address in a group setting.`,
      })
    }
    if (c.physical_score <= 3) {
      flags.push({
        icon: '💪',
        label: `Physical — ${a.full_name} · ${dateStr}`,
        text: `${first} rated physical wellness ${c.physical_score}/10. Recommended: Assess for injury or overtraining. Consider modified participation or a rest day. Refer to athletic trainer if concern persists.`,
      })
    }
  })

  return (
    <div>

      {/* ── Flags ── */}
      {flags.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="cct" style={{ marginBottom: 12 }}>Attention Required</div>
          {flags.map((f, i) => (
            <div key={i} style={{ background: 'var(--d3)', border: '1px solid #e05a4a44', borderRadius: 8, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#e05a4a', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {f.icon} {f.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.6 }}>{f.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 12px 10px', color: 'var(--mid)', fontWeight: 600, minWidth: 148 }}>
                Athlete
              </th>
              {allWeeks.map((w, i) => (
                <th key={w} style={{ textAlign: 'left', padding: '4px 8px 10px', color: i === 0 ? 'var(--w)' : 'var(--mid)', fontWeight: 600, minWidth: 148 }}>
                  {fmtDate(w)}{i === 0 ? <span style={{ fontSize: 10, color: 'var(--g)', marginLeft: 6 }}>latest</span> : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map(a => (
              <tr
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(a)}
              >
                <td style={{ padding: '3px 12px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 500, color: 'var(--w)', fontSize: 13 }}>{a.full_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 1 }}>View history ↗</div>
                </td>
                {allWeeks.map(w => {
                  const c = byKey[`${a.id}:${w}`]
                  return (
                    <td key={w} style={{ padding: '3px 8px', verticalAlign: 'middle' }}>
                      {c ? (
                        <CheckinCard c={c} />
                      ) : (
                        <div style={{
                          background: 'var(--d3)', border: '1px solid var(--bdr)',
                          borderRadius: 8, padding: '10px 12px', minWidth: 120,
                          color: 'var(--d4)', fontSize: 13, textAlign: 'center',
                        }}>
                          —
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--d3)', borderRadius: 8, border: '1px solid var(--bdr)' }}>
        <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
          Mental State Key
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
          {[
            { score: 1, label: 'Spinning' },
            { score: 2, label: 'Fighting It' },
            { score: 3, label: 'Steady' },
            { score: 4, label: 'Dialed In' },
            { score: 5, label: 'Clear Headed' },
          ].map(({ score, label }) => (
            <div key={score} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: mentalColor(score) + '20',
                border: `1px solid ${mentalColor(score)}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
              }}>
                {MENTAL_EMOJI[score]}
              </div>
              <span style={{ fontSize: 12, color: mentalColor(score), fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 10 }}>
          Physical score shown as <strong style={{ color: 'var(--w)' }}>body X/10</strong> inside each card &nbsp;·&nbsp; Click any athlete to view full history
        </div>
      </div>

      {selected && (
        <AthleteHistoryModal
          athlete={selected}
          checkins={checkins}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
