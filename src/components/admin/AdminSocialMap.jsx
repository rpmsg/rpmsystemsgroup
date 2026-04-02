import { useState, useEffect } from 'react'
import { fetchSocialMapAdminStatus, advanceAdministration } from '../../lib/adminApi'

const ADMIN_INFO = {
  1: { label: 'Administration 1', sub: 'Start of Season', set: 'Question Set 1' },
  2: { label: 'Administration 2', sub: 'Mid Season',      set: 'Question Set 2' },
  3: { label: 'Administration 3', sub: 'End of Season',   set: 'Question Set 1' },
}

export default function AdminSocialMap() {
  const [teams, setTeams]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [confirm, setConfirm]   = useState(null)   // { teamId, teamName, newAdmin }
  const [advancing, setAdvancing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setTeams(await fetchSocialMapAdminStatus())
    } catch {
      setError('Failed to load administration data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdvance() {
    if (!confirm) return
    setAdvancing(true)
    try {
      await advanceAdministration(confirm.teamId, confirm.newAdmin)
      setConfirm(null)
      await load()
    } catch {
      setError('Failed to advance administration.')
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) return <div className="spinner" style={{ marginTop: 40 }} />
  if (error)   return <div className="err" style={{ marginTop: 24 }}>{error}</div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 4 }}>Social Map Administration</h3>
        <p style={{ fontSize: 12, color: 'var(--mid)' }}>
          The social map is administered 3 times per season. Advance teams here when ready. Athletes who have not yet completed the current administration will be locked out once you advance.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map(t => {
          const current  = t.current_administration || 1
          const info     = ADMIN_INFO[current]
          const nextAdmin = current < 3 ? current + 1 : null
          const nextInfo  = nextAdmin ? ADMIN_INFO[nextAdmin] : null

          return (
            <div key={t.id} style={{ background: 'var(--d3)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>

                {/* Team name + current administration */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{t.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'var(--g)', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 4, textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      Active: {info.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>{info.sub} · {info.set}</span>
                  </div>
                </div>

                {/* Completion counts per administration */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {[1, 2, 3].map(n => {
                    const count   = t.completions[n] || 0
                    const isActive = n === current
                    const isFuture = n > current
                    return (
                      <div key={n} style={{
                        background: isActive ? 'rgba(67,184,120,0.12)' : 'var(--d4)',
                        border: `1px solid ${isActive ? 'var(--g)' : 'var(--bdr)'}`,
                        borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 72,
                        opacity: isFuture ? 0.4 : 1,
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: isActive ? 'var(--g)' : count > 0 ? 'var(--w)' : 'var(--mid)' }}>
                          {count}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>
                          Admin {n}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Advance button */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {nextAdmin ? (
                    <button
                      className="btn bp bsm"
                      onClick={() => setConfirm({ teamId: t.id, teamName: t.name, newAdmin: nextAdmin })}
                    >
                      Advance to Admin {nextAdmin} →
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--mid)', fontStyle: 'italic' }}>Season complete</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {teams.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--mid)', fontSize: 13, marginTop: 40 }}>
          No teams found. Create a team in the Teams tab first.
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div className="modal-overlay on" onClick={() => !advancing && setConfirm(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Advance to {ADMIN_INFO[confirm.newAdmin].label}?</h3>
              <button className="modal-close" onClick={() => !advancing && setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                You are advancing <strong>{confirm.teamName}</strong> to{' '}
                <strong>{ADMIN_INFO[confirm.newAdmin].label} — {ADMIN_INFO[confirm.newAdmin].sub}</strong>{' '}
                ({ADMIN_INFO[confirm.newAdmin].set}).
              </p>
              <div style={{
                background: 'rgba(224, 90, 74, 0.1)',
                border: '1px solid rgba(224, 90, 74, 0.3)',
                borderRadius: 8, padding: '12px 14px', marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, color: '#e05a4a', fontWeight: 600, marginBottom: 4 }}>Warning</div>
                <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, margin: 0 }}>
                  Athletes who have not yet completed Administration {confirm.newAdmin - 1} will not be able to go back and complete it. Confirm that all athletes have submitted before proceeding.
                </p>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn bo" onClick={() => setConfirm(null)} disabled={advancing}>Cancel</button>
              <button className="btn bp" onClick={handleAdvance} disabled={advancing}>
                {advancing ? 'Advancing…' : `Confirm — Advance to Admin ${confirm.newAdmin}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
