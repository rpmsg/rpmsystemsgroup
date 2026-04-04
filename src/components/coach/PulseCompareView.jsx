import { useState } from 'react'
import { ROLE_COLORS, ADMIN_LABELS_SHORT } from '../../constants'
import { cohesionScore, trendArrow, buildComparisonRows } from '../../lib/pulseAlgorithms'

export default function PulseCompareView({ scoresByAdmin, availableAdmins }) {
  const [compareA, setCompareA] = useState(availableAdmins?.[0] ?? 1)
  const [compareB, setCompareB] = useState(availableAdmins?.[availableAdmins.length - 1] ?? 1)

  const scoresA       = scoresByAdmin?.[compareA] || []
  const scoresB       = scoresByAdmin?.[compareB] || []
  const compRows      = buildComparisonRows(scoresA, scoresB)
  const cohesionA     = cohesionScore(scoresA)
  const cohesionB     = cohesionScore(scoresB)
  const cohesionArrow = trendArrow(cohesionA, cohesionB)

  function roleCounts(s) {
    return {
      ci:   s.filter(x => x.social_role === 'Core Influencer').length,
      pol:  s.filter(x => x.social_role === 'Polarizing Figure').length,
      iso:  s.filter(x => x.social_role === 'Isolation Risk').length,
      rr:   s.filter(x => x.social_role === 'Rejection Risk').length,
      fric: s.filter(x => x.negative_mentions >= 8).length,
    }
  }
  const rcA = roleCounts(scoresA)
  const rcB = roleCounts(scoresB)

  return (
    <>
      {/* ── A / B selectors ── */}
      <div className="no-print" style={{ padding: '10px 24px', borderBottom: '1px solid var(--bdr)', background: 'var(--d2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={compareA}
          onChange={e => setCompareA(Number(e.target.value))}
          style={{ background: 'var(--d4)', color: 'var(--w)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}
        >
          {availableAdmins.map(n => <option key={n} value={n}>{ADMIN_LABELS_SHORT[n]}</option>)}
        </select>
        <span style={{ fontSize: 11, color: 'var(--mid)' }}>vs</span>
        <select
          value={compareB}
          onChange={e => setCompareB(Number(e.target.value))}
          style={{ background: 'var(--d4)', color: 'var(--w)', border: '1px solid var(--bdr)', borderRadius: 4, padding: '3px 8px', fontSize: 11 }}
        >
          {availableAdmins.map(n => <option key={n} value={n}>{ADMIN_LABELS_SHORT[n]}</option>)}
        </select>
      </div>

      <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
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
                  : `${ADMIN_LABELS_SHORT[compareA]} vs ${ADMIN_LABELS_SHORT[compareB]}`}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Avg Cohesion',    a: cohesionA,  b: cohesionB,  higherBetter: true,  format: v => v.toFixed(1) },
                  { label: 'Core Influencers', a: rcA.ci,    b: rcB.ci,    higherBetter: true,  format: v => v },
                  { label: 'Friction Flags',   a: rcA.fric,  b: rcB.fric,  higherBetter: false, format: v => v },
                  { label: 'Rejection Risk',   a: rcA.rr,    b: rcB.rr,    higherBetter: false, format: v => v },
                  { label: 'Isolation Risk',   a: rcA.iso,   b: rcB.iso,   higherBetter: false, format: v => v },
                  { label: 'Polarizing',       a: rcA.pol,   b: rcB.pol,   higherBetter: null,  format: v => v },
                ].map(m => {
                  const arrow    = trendArrow(m.a, m.b)
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
                        {ADMIN_LABELS_SHORT[compareA]} → {ADMIN_LABELS_SHORT[compareB]}
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
                      <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--mid)', fontWeight: 600 }} colSpan={3}>{ADMIN_LABELS_SHORT[compareA]}</th>
                      <th style={{ padding: '6px 4px' }} />
                      <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--mid)', fontWeight: 600 }} colSpan={3}>{ADMIN_LABELS_SHORT[compareB]}</th>
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
                          <td style={{ textAlign: 'center', padding: '6px 6px' }}>
                            {pa && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: pa.color }} title="Positive nominations">{pa.symbol}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: na.color }} title="Friction">{na.symbol}</span>
                              </div>
                            )}
                          </td>
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
      </div>
    </>
  )
}
