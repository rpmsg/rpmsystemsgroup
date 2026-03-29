import { useState, useEffect, useRef } from 'react'
import {
  fetchAllTeams, fetchRosterAdmin,
  addAthlete, updateAthlete, deleteAthlete,
  resetAthleteSubmission, resetAthletePinAdmin,
} from '../../lib/adminApi'

export default function AdminRoster() {
  const [teams, setTeams]         = useState([])
  const [teamId, setTeamId]       = useState('')
  const [roster, setRoster]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [modal, setModal]         = useState(null)  // null | 'add' | 'edit' | 'csv'
  const [addName, setAddName]     = useState('')
  const [editAthlete, setEdit]    = useState(null)
  const [editName, setEditName]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [confirm, setConfirm]     = useState(null)  // { type, athlete }
  const [csvText, setCsvText]     = useState('')
  const [csvResult, setCsvResult] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    fetchAllTeams().then(t => {
      setTeams(t)
      if (t.length) setTeamId(t[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (teamId) loadRoster()
  }, [teamId])

  async function loadRoster() {
    setLoading(true)
    try { setRoster(await fetchRosterAdmin(teamId)) } catch { /* ignore */ }
    setLoading(false)
  }

  function closeModal() { setModal(null); setError(''); setAddName(''); setCsvText(''); setCsvResult(null) }

  // ── Add athlete ──
  async function handleAdd() {
    if (!addName.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      await addAthlete(teamId, addName)
      await loadRoster()
      setAddName('')
      closeModal()
    } catch (e) { setError(e.message || 'Failed.') }
    setSaving(false)
  }

  // ── Edit athlete ──
  function openEdit(a) {
    setEdit(a); setEditName(a.full_name); setError(''); setModal('edit')
  }

  async function handleEdit() {
    if (!editName.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      await updateAthlete(editAthlete.id, { full_name: editName.trim() })
      await loadRoster()
      closeModal()
    } catch (e) { setError(e.message || 'Failed.') }
    setSaving(false)
  }

  // ── CSV import ──
  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setCsvText(ev.target.result)
    reader.readAsText(f)
    e.target.value = ''
  }

  async function handleCsvImport() {
    const names = csvText.split('\n')
      .map(line => line.split(',')[0].trim())
      .filter(n => n && n.toLowerCase() !== 'name' && n.toLowerCase() !== 'full_name')

    if (!names.length) { setError('No valid names found.'); return }
    setSaving(true); setError('')
    let added = 0, skipped = 0
    for (const name of names) {
      try { await addAthlete(teamId, name); added++ }
      catch { skipped++ }
    }
    await loadRoster()
    setCsvResult({ added, skipped })
    setSaving(false)
  }

  // ── Reset submission ──
  async function handleResetSubmission() {
    try {
      await resetAthleteSubmission(confirm.athlete.id, teamId)
      setConfirm(null)
      await loadRoster()
    } catch (e) { alert(e.message || 'Failed.') }
  }

  // ── Reset PIN ──
  async function handleResetPin() {
    try {
      await resetAthletePinAdmin(confirm.athlete.id, teamId)
      setConfirm(null)
    } catch (e) { alert(e.message || 'Failed.') }
  }

  // ── Delete ──
  async function handleDelete() {
    try {
      await deleteAthlete(confirm.athlete.id)
      setConfirm(null)
      await loadRoster()
    } catch (e) { alert(e.message || 'Failed.') }
  }

  const complete = roster.filter(a => a.status === 'complete').length

  return (
    <div>
      <div className="sh">
        <div className="stit">Roster</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn bo bsm" onClick={() => { setCsvText(''); setCsvResult(null); setModal('csv') }}>CSV Import</button>
          <button className="btn bp bsm" onClick={() => { setAddName(''); setError(''); setModal('add') }} disabled={!teamId}>+ Add Athlete</button>
        </div>
      </div>

      {/* Team selector */}
      <div className="fld" style={{ maxWidth: 300, marginBottom: 20 }}>
        <label>Team</label>
        <select value={teamId} onChange={e => setTeamId(e.target.value)}>
          {teams.length === 0 && <option value="">No teams found</option>}
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {teamId && (
        <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 16 }}>
          {roster.length} athletes · {complete} completed ({roster.length ? Math.round(complete / roster.length * 100) : 0}%)
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : !teamId ? (
        <div className="alert alert-info">Select a team to view its roster.</div>
      ) : roster.length === 0 ? (
        <div className="alert alert-info">No athletes on this team yet. Add athletes or use CSV import.</div>
      ) : (
        <div className="rt">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 140px 180px', padding: '10px 16px', background: 'var(--d3)', fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', borderBottom: '1px solid var(--bdr)' }}>
            <span>Name</span><span>Status</span><span>Completed</span><span>Actions</span>
          </div>
          {roster.map(a => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 140px 180px', padding: '11px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13, alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{a.full_name}</span>
              <span><span className={`pill ${a.status === 'complete' ? 'pill-green' : 'pill-gray'}`}>{a.status}</span></span>
              <span style={{ color: 'var(--mid)', fontSize: 12 }}>
                {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}
              </span>
              <span style={{ display: 'flex', gap: 5 }}>
                <button className="btn bo bsm" onClick={() => openEdit(a)}>Edit</button>
                {a.status === 'complete' && (
                  <button className="btn bo bsm" style={{ color: '#f5a623', borderColor: 'rgba(245,166,35,.3)' }}
                    onClick={() => setConfirm({ type: 'reset', athlete: a })}>Reset</button>
                )}
                <button className="btn bo bsm" style={{ color: 'var(--mid)' }}
                  onClick={() => setConfirm({ type: 'pin', athlete: a })}>PIN</button>
                <button className="btn bdanger bsm" onClick={() => setConfirm({ type: 'delete', athlete: a })}>Del</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <div className={`modal-overlay${modal === 'add' ? ' on' : ''}`} onClick={closeModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div><h3>Add Athlete</h3></div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="fld">
              <label>Full Name</label>
              <input value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="e.g. Jordan Smith"
                onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
            </div>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="modal-foot">
            <button className="btn bo" onClick={closeModal}>Cancel</button>
            <button className="btn bp" onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Athlete'}</button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <div className={`modal-overlay${modal === 'edit' ? ' on' : ''}`} onClick={closeModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div><h3>Edit Athlete</h3></div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="fld">
              <label>Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEdit()} />
            </div>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="modal-foot">
            <button className="btn bo" onClick={closeModal}>Cancel</button>
            <button className="btn bp" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      <div className={`modal-overlay${modal === 'csv' ? ' on' : ''}`} onClick={closeModal}>
        <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div><h3>CSV Import</h3><p>Upload a CSV or paste names — one per line</p></div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>
          <div className="modal-body">
            {csvResult ? (
              <div>
                <div className="alert alert-success">{csvResult.added} athlete{csvResult.added !== 1 ? 's' : ''} added successfully.</div>
                {csvResult.skipped > 0 && <div className="alert alert-warning">{csvResult.skipped} skipped (duplicates or errors).</div>}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
                  <button className="btn bo bsm" onClick={() => fileRef.current.click()}>Upload file</button>
                  <span style={{ fontSize: 12, color: 'var(--mid)', marginLeft: 10 }}>or paste below</span>
                </div>
                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder={'Jordan Smith\nAlex Johnson\nTaylor Brown'}
                  style={{ minHeight: 140, marginBottom: 4 }}
                />
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 8 }}>
                  First column used if CSV. Header row skipped automatically.
                </div>
                {error && <div className="err">{error}</div>}
              </>
            )}
          </div>
          <div className="modal-foot">
            {csvResult ? (
              <button className="btn bp" onClick={closeModal}>Done</button>
            ) : (
              <>
                <button className="btn bo" onClick={closeModal}>Cancel</button>
                <button className="btn bp" onClick={handleCsvImport} disabled={saving || !csvText.trim()}>
                  {saving ? 'Importing…' : 'Import'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modals */}
      {confirm?.type === 'reset' && (
        <div className="modal-overlay on" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div><h3>Reset Submission</h3></div>
              <button className="modal-close" onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
                Reset all assessment data for <strong style={{ color: 'var(--w)' }}>{confirm.athlete.full_name}</strong>?
                Their responses and cycle document will be permanently deleted and their status reset to pending.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn bo" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn bdanger" onClick={handleResetSubmission}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {confirm?.type === 'pin' && (
        <div className="modal-overlay on" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div><h3>Reset PIN</h3></div>
              <button className="modal-close" onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
                Clear the cycle PIN for <strong style={{ color: 'var(--w)' }}>{confirm.athlete.full_name}</strong>?
                They will be prompted to create a new one on their next visit.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn bo" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn bdanger" onClick={handleResetPin}>Reset PIN</button>
            </div>
          </div>
        </div>
      )}

      {confirm?.type === 'delete' && (
        <div className="modal-overlay on" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div><h3>Remove Athlete</h3></div>
              <button className="modal-close" onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
                Permanently remove <strong style={{ color: 'var(--w)' }}>{confirm.athlete.full_name}</strong> from this team?
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn bo" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn bdanger" onClick={handleDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
