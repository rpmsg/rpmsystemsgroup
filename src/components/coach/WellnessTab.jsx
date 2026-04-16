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
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>All wellness check-ins — {rows.length} total</div>
          </div>
          <button className="btn bo bsm" onClick={onClose}>✕ Close</button>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', fontSize: 13, padding: '32px 0' }}>
            No check-ins recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((c, i) => (
              <div key={i} style={{
                background: 'var(--d3)', borderRadius: 8, padding: '12px 16px',
                border: '1px solid var(--bdr)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 10, fontWeight: 600 }}>
                  {fmtDate(c.week_date)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Mental</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{MENTAL_EMOJI[c.mental_score]}</span>
                      <span style={{ color: mentalColor(c.mental_score), fontWeight: 700, fontSize: 14 }}>
                        {MENTAL_TEXT[c.mental_score]}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                      {c.mental_score}/5{c.mental_word ? ` · "${c.mental_word}"` : ''}
                    </div>
                    {c.mental_score <= 2 && (
                      <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 4 }}>
                        ⚠ Flagged
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Physical</div>
                    <div style={{ color: physColor(c.physical_score), fontWeight: 700, fontSize: 14 }}>
                      {c.physical_score}/10
                    </div>
                    {c.physical_score <= 3 && (
                      <div style={{ fontSize: 11, color: '#e05a4a', marginTop: 4 }}>
                        ⚠ Flagged
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--bdr)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--mid)', fontWeight: 600, minWidth: 140 }}>
                Athlete
              </th>
              {allWeeks.map(w => (
                <th key={w} style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--mid)', fontWeight: 600, minWidth: 140 }}>
                  {fmtDate(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map(a => (
              <tr
                key={a.id}
                style={{ borderBottom: '1px solid var(--bdr)', cursor: 'pointer' }}
                onClick={() => setSelected(a)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--d3)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--w)', whiteSpace: 'nowrap' }}>
                  {a.full_name}
                  <span style={{ fontSize: 10, color: 'var(--mid)', marginLeft: 6 }}>↗</span>
                </td>
                {allWeeks.map(w => {
                  const c = byKey[`${a.id}:${w}`]
                  return (
                    <td key={w} style={{ padding: '10px 12px', textAlign: 'left' }}>
                      {c ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {/* Mental row: emoji + submitted word */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15, lineHeight: 1 }}>{MENTAL_EMOJI[c.mental_score]}</span>
                            <span style={{ color: mentalColor(c.mental_score), fontWeight: 600, fontSize: 12 }}>
                              {c.mental_word || '—'}
                            </span>
                          </div>
                          {/* Physical row: number only */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 10, color: 'var(--mid)', lineHeight: 1 }}>phys</span>
                            <span style={{ color: physColor(c.physical_score), fontWeight: 700, fontSize: 15, lineHeight: 1 }}>
                              {c.physical_score}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--d4)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 12, lineHeight: 1.9 }}>
        Mental: 🟢 Dialed In / Clear Headed &nbsp; 😐 Steady &nbsp; 😤🔴 Spinning / Fighting It
        &nbsp;·&nbsp;
        Physical: <span style={{ color: '#43B878' }}>■</span> 7–10 &nbsp;
        <span style={{ color: '#f0b030' }}>■</span> 4–6 &nbsp;
        <span style={{ color: '#e05a4a' }}>■</span> 1–3
        &nbsp;·&nbsp; Click any athlete to view full history
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
