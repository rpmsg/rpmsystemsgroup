import { useState, useEffect } from 'react'
import { fetchDashboardData, changePassword } from '../../lib/coachApi'
import { supabase } from '../../lib/supabase'
import ChangePasswordModal from './ChangePasswordModal'
import AthleteModal from './AthleteModal'
import { useHome } from '../../HomeContext'
import PulseReportModal from './PulseReportModal'

// Strip leading initials from old portal bug e.g. "CCCarmen Cline" → "Carmen Cline"
function normalizeName(name) {
  return name.replace(/^[A-Z]{2,4}(?=[A-Z][a-z])/, '')
}

const ROLE_MAP = {
  'Core Influencer':   { key: 'inf', label: 'Core Influencer' },
  'Rejection Risk':    { key: 'rej', label: 'Rejection Risk' },
  'Isolation Risk':    { key: 'iso', label: 'Isolation Risk' },
  'Polarizing Figure': { key: 'pol', label: 'Polarizing Figure' },
}

function tally(rows, field, total) {
  const counts = {}
  rows.forEach(r => {
    const val = r[field]
    if (val) counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => {
      const pct = Math.round((count / total) * 100)
      return { label, pct, color: pct >= 50 ? 'r' : pct >= 30 ? 'y' : 'b' }
    })
}

export default function CoachDashboard({ coach, onSignOut }) {
  const goHome = useHome()
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [showPassModal, setShowPassModal]     = useState(coach.must_change_password)
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [showPulseReport, setShowPulseReport] = useState(false)

  useEffect(() => {
    fetchDashboardData(coach.team_id)
      .then(setData)
      .catch(() => setError('Connection error. Check your internet and refresh.'))
      .finally(() => setLoading(false))
  }, [coach.team_id])

  async function handleChangePassword(currentPass, newPass, forced) {
    if (!forced) {
      const { data: rows } = await supabase.from('coaches').select('password').eq('id', coach.id)
      if (!rows?.[0] || rows[0].password !== currentPass) throw new Error('Current password is incorrect.')
    }
    await changePassword(coach.id, newPass)
  }

  if (loading) return (
    <>
      <nav><div className="logo">RPM<span>.</span>SG</div><div className="ntag">Coach Dashboard</div><span /></nav>
      <div className="cw"><div className="spinner" /></div>
    </>
  )

  if (error) return (
    <>
      <nav><div className="logo">RPM<span>.</span>SG</div><div className="ntag">Coach Dashboard</div>
        <button className="btn bo bsm" onClick={onSignOut}>← Sign Out</button>
      </nav>
      <div className="cw"><div className="box"><p style={{ color: 'var(--rl)' }}>{error}</p></div></div>
    </>
  )

  const { team, roster, panic } = data

  // Normalize a raw scores array: dedupe by name, keep highest positive_mentions
  function normalizeScores(raw) {
    const map = {}
    ;(raw || []).forEach(s => {
      const name = normalizeName(s.athlete_name)
      if (!map[name] || s.positive_mentions > map[name].positive_mentions) {
        map[name] = { ...s, athlete_name: name }
      }
    })
    return Object.values(map).sort((a, b) => b.positive_mentions - a.positive_mentions)
  }

  // Normalize scores for default (dashboard) view
  const scores = normalizeScores(data.scores)

  // Normalize all administrations for PulseReportModal comparison view
  const normalizedScoresByAdmin = {}
  Object.entries(data.scoresByAdmin || {}).forEach(([admin, raw]) => {
    normalizedScoresByAdmin[Number(admin)] = normalizeScores(raw)
  })

  const complete = roster.filter(r => r.status === 'complete').length
  const pending  = roster.length - complete
  const pct      = roster.length > 0 ? Math.round(complete / roster.length * 100) : 0
  const coreInf  = scores.filter(s => s.social_role === 'Core Influencer').length
  const friction = scores.filter(s => s.negative_mentions >= 8).length

  const topPos = scores.slice(0, 8)
  const maxPos = topPos[0]?.positive_mentions || 1
  const topNeg = [...scores].sort((a, b) => b.negative_mentions - a.negative_mentions).filter(s => s.negative_mentions > 0).slice(0, 6)
  const maxNeg = topNeg[0]?.negative_mentions || 1

  const panicTotal = panic.length
  const triggers   = tally(panic, 'q1_trigger', panicTotal)
  const behaviors  = tally(panic, 'q8_behavior', panicTotal)
  const aftermaths = tally(panic, 'q11_aftermath', panicTotal)
  const panicBars  = [...behaviors, ...aftermaths].slice(0, 6)
  const insights   = [
    triggers[0]   && { color: 'r', text: `<strong>${triggers[0].pct}%</strong> of athletes trigger on: ${triggers[0].label}` },
    behaviors[0]  && { color: 'r', text: `<strong>${behaviors[0].pct}%</strong> primary behavioral response: ${behaviors[0].label.toLowerCase()}` },
    aftermaths[0] && { color: 'b', text: `<strong>${aftermaths[0].pct}%</strong> aftermath pattern: ${aftermaths[0].label.toLowerCase()}` },
    triggers[1]   && { color: 'y', text: `<strong>${triggers[1].pct}%</strong> secondary trigger: ${triggers[1].label.toLowerCase()}` },
  ].filter(Boolean)

  const sortedNeg = [...scores].sort((a, b) => b.negative_mentions - a.negative_mentions)
  const suggestions = []
  if (sortedNeg[0]?.negative_mentions > 0)
    suggestions.push({ i: '⚠️', t: `<strong>${sortedNeg[0].athlete_name}</strong> — Friction score is a significant outlier (−${sortedNeg[0].negative_mentions}). Consider a private 1:1 conversation before drawing conclusions.` })
  if (sortedNeg[1]?.negative_mentions > 0)
    suggestions.push({ i: '🔍', t: `<strong>${sortedNeg[1].athlete_name}${sortedNeg[2]?.negative_mentions > 0 ? ' &amp; ' + sortedNeg[2].athlete_name : ''}</strong> — Elevated friction with limited peer support. Understanding the source may reveal fixable dynamics.` })
  const isoCount = scores.filter(s => s.social_role === 'Isolation Risk').length
  if (isoCount > 0)
    suggestions.push({ i: '🔗', t: `<strong>${isoCount} Isolation Risk player${isoCount > 1 ? 's' : ''}</strong> — Intentional grouping with Core Influencers in training and travel may help build connection naturally.` })
  if (!suggestions.length)
    suggestions.push({ i: '✅', t: '<strong>No significant friction patterns detected.</strong> Team dynamics look healthy based on current data.' })

  const RISK_ZONES = [
    { t: '🟢 CORE INFLUENCERS',   c: 'g', d: 'High support, low friction',  role: 'Core Influencer'   },
    { t: '🔴 REJECTION RISK',     c: 'r', d: 'Low support, high friction',   role: 'Rejection Risk'    },
    { t: '🔵 ISOLATION RISK',     c: 'b', d: 'Low support, low friction',    role: 'Isolation Risk'    },
    { t: '🟡 POLARIZING FIGURES', c: 'y', d: 'High support, high friction',  role: 'Polarizing Figure' },
  ]

  return (
    <>
      <nav>
        <div className="logo" onClick={goHome} style={{cursor:'pointer'}}>RPM<span>.</span>SG</div>
        <div className="ntag">Coach Dashboard</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {scores.length > 0 && (
            <button className="btn bp bsm" onClick={() => setShowPulseReport(true)}>📊 Pulse Report</button>
          )}
          <button className="btn bo bsm" onClick={() => setShowPassModal(true)}>🔑 Change Password</button>
          <button className="btn bo bsm" onClick={onSignOut}>← Sign Out</button>
        </div>
      </nav>

      <div className="dl">
        <div className="dsb">
          <h3>My Teams</h3>
          <div className="tc active">
            <div className="tcn">{team.name}</div>
            <div className="tcm">{team.season || ''}</div>
            <div className="tcbar"><div className="tcfill" style={{ width: pct + '%' }} /></div>
            <div className="tcm" style={{ marginTop: 4 }}>{complete}/{roster.length} complete</div>
          </div>
        </div>

        <div className="dm">
          <div className="dhd">
            <h2>{team.name}</h2>
            <p>Pulse Report · Code: {team.team_code}</p>
          </div>

          <div className="stats">
            <div className="stat"><div className="sv g">{complete}</div><div className="sl">Complete</div></div>
            <div className="stat"><div className="sv">{pending}</div><div className="sl">Pending</div></div>
            <div className="stat"><div className="sv g">{coreInf}</div><div className="sl">Core Influencers</div></div>
            <div className="stat"><div className="sv r">{friction}</div><div className="sl">Friction Flags</div></div>
          </div>

          {/* Roster */}
          <div className="sh"><div className="stit">Roster</div></div>
          <div className="rt">
            <div className="rth">
              <div>Athlete</div><div>Status</div><div>Social Role</div><div>Friction</div>
            </div>
            <div>
              {roster.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--mid)', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>👥</div>
                  <strong style={{ color: 'var(--w)', display: 'block', marginBottom: 6 }}>No athletes on the roster yet</strong>
                  Share your team code with athletes and data will appear once they complete the assessment.
                </div>
              ) : roster.map(a => {
                const score = scores.find(s => s.athlete_name === a.full_name)
                const neg   = score?.negative_mentions || 0
                const role  = ROLE_MAP[score?.social_role]
                const nc    = neg >= 10 ? 'var(--rl)' : neg >= 5 ? '#f0b030' : 'var(--mid)'
                const done  = a.status === 'complete'
                return (
                  <div
                    className="rtr"
                    key={a.full_name}
                    style={{ cursor: score ? 'pointer' : 'default' }}
                    onClick={() => score && setSelectedAthlete({ athlete: a, score })}
                  >
                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.full_name}
                    </div>
                    <div>
                      <span className={`pill ${done ? 'done' : 'pend'}`}>
                        {done ? '✓ Complete' : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className={`rtag ${role?.key || 'non'}`}>
                        {role?.label || '—'}
                      </span>
                    </div>
                    <div style={{ color: nc, fontSize: 11, fontWeight: 600 }}>
                      {neg > 0 ? `−${neg}` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {scores.length > 0 && (
            <>
              <div className="sh"><div className="stit">Influence &amp; Friction</div></div>
              <div className="charts">
                <div className="cc">
                  <div className="cct">Positive Influence — Top Players</div>
                  <div className="bl">
                    {topPos.map(s => (
                      <div className="br" key={s.athlete_name}>
                        <div className="bn">{s.athlete_name.split(' ')[0]}</div>
                        <div className="bt"><div className="bf" style={{ width: Math.round(s.positive_mentions / maxPos * 100) + '%', background: 'linear-gradient(90deg,#1d8f5a,#52d98a)' }} /></div>
                        <div className="bv">{s.positive_mentions}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="cc">
                  <div className="cct">Friction Load — Flagged Players</div>
                  <div className="bl">
                    {topNeg.length === 0
                      ? <div style={{ fontSize: 13, color: 'var(--mid)' }}>No friction detected.</div>
                      : topNeg.map(s => (
                        <div className="br" key={s.athlete_name}>
                          <div className="bn">{s.athlete_name.split(' ')[0]}</div>
                          <div className="bt"><div className="bf" style={{ width: Math.round(s.negative_mentions / maxNeg * 100) + '%', background: 'linear-gradient(90deg,#b05e00,#f08c00)' }} /></div>
                          <div className="bv" style={{ color: '#e8e8e8' }}>−{s.negative_mentions}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
                <div className="cc full">
                  <div className="cct">Team Risk Zone Analysis</div>
                  <div className="rqg">
                    {RISK_ZONES.map(z => (
                      <div className="rq" key={z.role}>
                        <div className={`rqt ${z.c}`}>{z.t}</div>
                        <div className="rqd">{z.d}</div>
                        <div className="rqp">
                          {scores.filter(s => s.social_role === z.role).length === 0
                            ? <span style={{ fontSize: 10, color: 'var(--mid)' }}>None identified</span>
                            : scores.filter(s => s.social_role === z.role).map(p => (
                              <div className="rqpi" key={p.athlete_name}>{p.athlete_name.split(' ')[0]}</div>
                            ))
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {panic.length > 0 && (
                <>
                  <div className="sh"><div className="stit">Team Panic Profile</div></div>
                  <div className="pp">
                    <div className="pp-banner">
                      <div className="pp-banner-ico">🧠</div>
                      <div className="pp-banner-text">
                        <h3>Team Panic Cycle Data</h3>
                        <p>Aggregated from all submitted assessments. No individual responses are shown here.</p>
                        <div className="pp-badge">🔒 Confidential — Coach View Only</div>
                      </div>
                    </div>
                    <div className="pp-grid">
                      <div className="pp-col">
                        <div className="pp-col-title">Triggers &amp; Emotions</div>
                        {triggers.map(item => (
                          <div className="pp-row" key={item.label}>
                            <div className="pp-label"><span className="pp-name">{item.label}</span><span className="pp-pct">{item.pct}%</span></div>
                            <div className="pp-track"><div className={`pp-fill-${item.color}`} style={{ width: item.pct + '%' }} /></div>
                          </div>
                        ))}
                      </div>
                      <div className="pp-col">
                        <div className="pp-col-title">Behaviors &amp; Aftermath</div>
                        {panicBars.map(item => (
                          <div className="pp-row" key={item.label}>
                            <div className="pp-label"><span className="pp-name">{item.label}</span><span className="pp-pct">{item.pct}%</span></div>
                            <div className="pp-track"><div className={`pp-fill-${item.color}`} style={{ width: item.pct + '%' }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {insights.length > 0 && (
                      <div className="pp-insight">
                        {insights.map((ins, i) => (
                          <div className="pp-ins-item" key={i}>
                            <div className={`pp-ins-dot ${ins.color}`} />
                            <span className="pp-ins-txt" dangerouslySetInnerHTML={{ __html: ins.text }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="sh"><div className="stit">Coaching Actions</div></div>
              <div className="suggs">
                {suggestions.map((s, i) => (
                  <div className="si" key={i}>
                    <span className="sico">{s.i}</span>
                    <p className="stxt" dangerouslySetInnerHTML={{ __html: s.t }} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showPassModal && (
        <ChangePasswordModal
          forced={coach.must_change_password}
          onClose={() => setShowPassModal(false)}
          onSave={handleChangePassword}
        />
      )}

      {selectedAthlete && (
        <AthleteModal
          athlete={selectedAthlete.athlete}
          score={selectedAthlete.score}
          totalAthletes={scores.length}
          onClose={() => setSelectedAthlete(null)}
        />
      )}

      {showPulseReport && (
        <PulseReportModal
          team={team}
          scores={scores}
          scoresByAdmin={normalizedScoresByAdmin}
          availableAdmins={data.availableAdmins || []}
          roster={roster}
          nominations={data.nominations}
          triggers={triggers}
          behaviors={behaviors}
          aftermaths={aftermaths}
          onClose={() => setShowPulseReport(false)}
        />
      )}
    </>
  )
}
