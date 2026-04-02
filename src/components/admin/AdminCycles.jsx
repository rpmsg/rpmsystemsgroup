import { useState, useEffect } from 'react'
import { fetchAllTeams, fetchCycleStatus, upsertCycleDocument, releaseCycleDocument, unreleaseCycleDocument } from '../../lib/adminApi'

const RAW_LABELS = [
  ['q1_trigger',          'Trigger Situation'],
  ['q2_first_signal',     'First Signal'],
  ['q3_emotions',         'Emotions'],
  ['q4_inner_voice',      'Inner Voice'],
  ['q5_identity_phrase',  'Identity Phrase'],
  ['q6_body_response',    'Body Response'],
  ['q7_reaction',         'Reaction'],
  ['q8_behavior',         'Behavior'],
  ['q9_pattern_sentence', 'Pattern Sentence'],
  ['q10_outcome',         'Outcome'],
  ['q11_aftermath',       'Aftermath'],
]

const EMPTY_DOC = { trigger: '', emotions: '', body_response: '', behavior: '', aftermath: '', coaching_note: '' }

function docStatus(athlete) {
  if (!athlete.responses) return 'no-responses'
  if (!athlete.doc) return 'no-doc'
  if (athlete.doc.released) return 'released'
  if (!athlete.doc.coaching_note?.trim()) return 'needs-note'
  return 'ready'
}

function DocStatusPill({ status }) {
  if (status === 'no-responses') return <span className="pill pill-gray">No data</span>
  if (status === 'no-doc')       return <span className="pill pill-amber">Needs doc</span>
  if (status === 'needs-note')   return <span className="pill pill-amber">Needs coaching note</span>
  if (status === 'ready')        return <span className="pill pill-green">Ready to release</span>
  return <span className="pill pill-green">Released</span>
}

export default function AdminCycles() {
  const [teams, setTeams]     = useState([])
  const [teamId, setTeamId]   = useState('')
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)  // athlete object with responses + doc
  const [draft, setDraft]     = useState(EMPTY_DOC)
  const [saving, setSaving]   = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    fetchAllTeams().then(t => {
      setTeams(t)
      if (t.length) setTeamId(t[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => { if (teamId) loadAthletes() }, [teamId])

  async function loadAthletes() {
    setLoading(true)
    try { setAthletes(await fetchCycleStatus(teamId)) } catch { /* ignore */ }
    setLoading(false)
  }

  function openEditor(athlete) {
    const doc = athlete.doc || {}
    const r   = athlete.responses || {}
    setDraft({
      trigger:       doc.trigger       || r.q1_trigger       || '',
      emotions:      doc.emotions      || r.q3_emotions      || '',
      body_response: doc.body_response || r.q6_body_response || '',
      behavior:      doc.behavior      || r.q8_behavior      || '',
      aftermath:     doc.aftermath     || r.q11_aftermath     || '',
      coaching_note: doc.coaching_note || '',
    })
    setSaveMsg('')
    setSelected(athlete)
  }

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      await upsertCycleDocument(selected.id, teamId, draft)
      setSaveMsg('Saved.')
      await loadAthletes()
      // refresh selected with updated data
      const updated = await fetchCycleStatus(teamId)
      setAthletes(updated)
      const refreshed = updated.find(a => a.id === selected.id)
      if (refreshed) setSelected(refreshed)
    } catch (e) {
      setSaveMsg('Save failed: ' + (e.message || 'Unknown error'))
    }
    setSaving(false)
  }

  async function handleRelease() {
    setReleasing(true); setSaveMsg('')
    try {
      await upsertCycleDocument(selected.id, teamId, draft)
      await releaseCycleDocument(selected.id, teamId)
      setSaveMsg('Saved and released.')
      const updated = await fetchCycleStatus(teamId)
      setAthletes(updated)
      const refreshed = updated.find(a => a.id === selected.id)
      if (refreshed) setSelected(refreshed)
    } catch (e) {
      setSaveMsg('Failed: ' + (e.message || 'Unknown error'))
    }
    setReleasing(false)
  }

  async function handleUnrelease() {
    setReleasing(true); setSaveMsg('')
    try {
      await unreleaseCycleDocument(selected.id, teamId)
      setSaveMsg('Unreleased.')
      const updated = await fetchCycleStatus(teamId)
      setAthletes(updated)
      const refreshed = updated.find(a => a.id === selected.id)
      if (refreshed) setSelected(refreshed)
    } catch (e) {
      setSaveMsg('Failed: ' + (e.message || 'Unknown error'))
    }
    setReleasing(false)
  }

  const withResponses = athletes.filter(a => a.responses)
  const withoutResponses = athletes.filter(a => !a.responses)

  return (
    <div style={{ display: selected ? 'grid' : 'block', gridTemplateColumns: '340px 1fr', gap: 20, minHeight: 0 }}>

      {/* Left panel — athlete list */}
      <div>
        <div className="sh" style={{ marginBottom: 12 }}>
          <div className="stit">Panic Cycles</div>
        </div>

        <div className="fld" style={{ maxWidth: 300, marginBottom: 16 }}>
          <label>Team</label>
          <select value={teamId} onChange={e => { setTeamId(e.target.value); setSelected(null) }}>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : athletes.length === 0 ? (
          <div className="alert alert-info">No athletes on this team.</div>
        ) : (
          <>
            {withResponses.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Has responses ({withResponses.length})
                </div>
                {withResponses.map(a => {
                  const st = docStatus(a)
                  const isActive = selected?.id === a.id
                  return (
                    <div key={a.id}
                      onClick={() => openEditor(a)}
                      style={{
                        padding: '10px 14px', borderRadius: 8, marginBottom: 5, cursor: 'pointer',
                        background: isActive ? 'rgba(26,122,74,.12)' : 'var(--d2)',
                        border: `1px solid ${isActive ? 'var(--gl)' : 'var(--bdr)'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{a.full_name}</span>
                      <DocStatusPill status={st} />
                    </div>
                  )
                })}
              </div>
            )}
            {withoutResponses.length > 0 && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 8 }}>
                  No responses yet ({withoutResponses.length})
                </div>
                {withoutResponses.map(a => (
                  <div key={a.id} style={{ padding: '9px 14px', borderRadius: 8, marginBottom: 4, background: 'var(--d2)', border: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 }}>
                    <span style={{ fontSize: 13 }}>{a.full_name}</span>
                    <DocStatusPill status="no-responses" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right panel — editor */}
      {selected && (
        <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 12, overflow: 'hidden' }}>

          {/* Editor header */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                {selected.doc?.released
                  ? `Released ${new Date(selected.doc.released_at).toLocaleDateString()}`
                  : selected.doc ? 'Draft — not yet released' : 'No document yet'}
              </div>
            </div>
            <button className="btn bo bsm" onClick={() => setSelected(null)}>✕ Close</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

            {/* Raw responses */}
            <div style={{ padding: '20px 22px', borderRight: '1px solid var(--bdr)', overflowY: 'auto', maxHeight: 600 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--gl)', textTransform: 'uppercase', marginBottom: 14 }}>
                Raw Responses
              </div>
              {RAW_LABELS.map(([key, label]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.5 }}>
                    {selected.responses?.[key] || <span style={{ color: 'var(--d4)' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Editable document */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', maxHeight: 600 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--gl)', textTransform: 'uppercase', marginBottom: 8 }}>
                Cycle Document
              </div>
              <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 14, lineHeight: 1.5 }}>
                Auto-generated from athlete responses. Review each section, edit if needed, then add your coaching note and release.
              </div>

              {[
                ['trigger',       'Trigger'],
                ['emotions',      'Emotional Response'],
                ['body_response', 'Physical Response'],
                ['behavior',      'Behavioral Response'],
                ['aftermath',     'Aftermath'],
                ['coaching_note', 'Coaching Note'],
              ].map(([key, label]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
                  <textarea
                    value={draft[key]}
                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                    style={{ minHeight: 70, marginBottom: 0 }}
                    placeholder={`Write ${label.toLowerCase()}…`}
                  />
                </div>
              ))}

              {saveMsg && (
                <div className={`alert ${saveMsg.startsWith('Save') || saveMsg.startsWith('Failed') ? 'alert-error' : 'alert-success'}`} style={{ fontSize: 12, marginBottom: 12 }}>
                  {saveMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn bp" onClick={handleSave} disabled={saving || releasing}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                {selected.doc?.released ? (
                  <button className="btn bo" onClick={handleUnrelease} disabled={saving || releasing}>
                    {releasing ? '…' : 'Unrelease'}
                  </button>
                ) : (
                  <button className="btn bp" style={{ background: 'var(--gl)' }} onClick={handleRelease} disabled={saving || releasing}>
                    {releasing ? 'Releasing…' : 'Save & Release →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
