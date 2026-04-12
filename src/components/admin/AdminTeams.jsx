import { useState, useEffect } from 'react'
import { fetchAllTeams, createTeam, updateTeam, deleteTeam } from '../../lib/adminApi'

const EMPTY = { name: '', team_code: '', season: '', wellness_reset_day: 1 }

export default function AdminTeams() {
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'add' | 'edit'
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [confirm, setConfirm] = useState(null)  // team id to delete

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setTeams(await fetchAllTeams()) } catch { /* ignore */ }
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY)
    setEditId(null)
    setError('')
    setModal('add')
  }

  function openEdit(team) {
    setForm({ name: team.name, team_code: team.team_code, season: team.season || '', wellness_reset_day: team.wellness_reset_day ?? 1 })
    setEditId(team.id)
    setError('')
    setModal('edit')
  }

  function closeModal() { setModal(null); setError('') }

  async function handleSave() {
    if (!form.name.trim() || !form.team_code.trim()) { setError('Name and team code are required.'); return }
    setSaving(true)
    setError('')
    try {
      if (modal === 'add') {
        await createTeam(form)
      } else {
        await updateTeam(editId, { name: form.name.trim(), team_code: form.team_code.trim(), season: form.season.trim(), wellness_reset_day: Number(form.wellness_reset_day) })
      }
      await load()
      closeModal()
    } catch (e) {
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteTeam(confirm)
      setConfirm(null)
      await load()
    } catch (e) {
      alert(e.message || 'Delete failed.')
    }
  }

  const delTeam = teams.find(t => t.id === confirm)

  return (
    <div>
      <div className="sh">
        <div className="stit">Teams</div>
        <button className="btn bp bsm" onClick={openAdd}>+ Add Team</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : teams.length === 0 ? (
        <div className="alert alert-info">No teams yet. Add your first team above.</div>
      ) : (
        <div className="rt">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 100px', padding: '10px 16px', background: 'var(--d3)', fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', borderBottom: '1px solid var(--bdr)' }}>
            <span>Name</span><span>Code</span><span>Season</span><span>Status</span><span></span>
          </div>
          {teams.map(t => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px 100px', padding: '12px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13, alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--gl)' }}>{t.team_code}</span>
              <span style={{ color: 'var(--mid)' }}>{t.season || '—'}</span>
              <span><span className={`pill pill-${t.status === 'active' ? 'green' : 'gray'}`}>{t.status}</span></span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn bo bsm" onClick={() => openEdit(t)}>Edit</button>
                <button className="btn bdanger bsm" onClick={() => setConfirm(t.id)}>Del</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <div className={`modal-overlay${modal ? ' on' : ''}`} onClick={closeModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div>
              <h3>{modal === 'add' ? 'Add Team' : 'Edit Team'}</h3>
            </div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="fld">
              <label>Team Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Varsity Hockey" />
            </div>
            <div className="fld">
              <label>Team Code</label>
              <input value={form.team_code} onChange={e => setForm(f => ({ ...f, team_code: e.target.value.toUpperCase() }))} placeholder="e.g. VH2025" maxLength={10} />
            </div>
            <div className="fld">
              <label>Season</label>
              <input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="e.g. 2025–26" />
            </div>
            <div className="fld">
              <label>Wellness Check-In Day</label>
              <select value={form.wellness_reset_day} onChange={e => setForm(f => ({ ...f, wellness_reset_day: Number(e.target.value) }))}>
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d,i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            {error && <div className="err">{error}</div>}
          </div>
          <div className="modal-foot">
            <button className="btn bo" onClick={closeModal}>Cancel</button>
            <button className="btn bp" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <div className={`modal-overlay${confirm ? ' on' : ''}`} onClick={() => setConfirm(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div><h3>Delete Team</h3></div>
            <button className="modal-close" onClick={() => setConfirm(null)}>✕</button>
          </div>
          <div className="modal-body">
            <p style={{ color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--w)' }}>{delTeam?.name}</strong>?
              This will remove the team and all associated data permanently.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn bo" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn bdanger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}
