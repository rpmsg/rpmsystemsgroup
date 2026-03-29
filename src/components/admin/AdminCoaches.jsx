import { useState, useEffect } from 'react'
import { fetchAllCoaches, fetchAllTeams, createCoach, updateCoach, deleteCoach } from '../../lib/adminApi'

const EMPTY = { full_name: '', email: '', password: '', team_id: '' }

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState([])
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [c, t] = await Promise.all([fetchAllCoaches(), fetchAllTeams()])
      setCoaches(c)
      setTeams(t)
    } catch { /* ignore */ }
    setLoading(false)
  }

  function teamName(id) {
    return teams.find(t => t.id === id)?.name || '—'
  }

  function openAdd() {
    setForm(EMPTY)
    setEditId(null)
    setError('')
    setModal('add')
  }

  function openEdit(coach) {
    setForm({ full_name: coach.full_name, email: coach.email, password: coach.password, team_id: coach.team_id || '' })
    setEditId(coach.id)
    setError('')
    setModal('edit')
  }

  function closeModal() { setModal(null); setError('') }

  async function handleSave() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (modal === 'add') {
        await createCoach({ ...form, team_id: form.team_id || null })
      } else {
        await updateCoach(editId, { full_name: form.full_name.trim(), email: form.email.trim(), password: form.password, team_id: form.team_id || null })
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
      await deleteCoach(confirm)
      setConfirm(null)
      await load()
    } catch (e) {
      alert(e.message || 'Delete failed.')
    }
  }

  async function handleResetPassword(coach) {
    openEdit(coach)
  }

  const delCoach = coaches.find(c => c.id === confirm)

  return (
    <div>
      <div className="sh">
        <div className="stit">Coaches</div>
        <button className="btn bp bsm" onClick={openAdd}>+ Add Coach</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : coaches.length === 0 ? (
        <div className="alert alert-info">No coaches yet. Add your first coach above.</div>
      ) : (
        <div className="rt">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 130px', padding: '10px 16px', background: 'var(--d3)', fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', borderBottom: '1px solid var(--bdr)' }}>
            <span>Name</span><span>Email</span><span>Team</span><span>Pwd Status</span><span></span>
          </div>
          {coaches.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 130px', padding: '12px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13, alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{c.full_name}</span>
              <span style={{ color: 'var(--mid)', fontSize: 12 }}>{c.email}</span>
              <span style={{ color: 'var(--mid)' }}>{teamName(c.team_id)}</span>
              <span>
                {c.must_change_password
                  ? <span className="pill pill-amber">Must change</span>
                  : <span className="pill pill-green">Set</span>}
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn bo bsm" onClick={() => openEdit(c)}>Edit</button>
                <button className="btn bdanger bsm" onClick={() => setConfirm(c.id)}>Del</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <div className={`modal-overlay${modal ? ' on' : ''}`} onClick={closeModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div><h3>{modal === 'add' ? 'Add Coach' : 'Edit Coach'}</h3></div>
            <button className="modal-close" onClick={closeModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="fld">
              <label>Full Name</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Jane Smith" />
            </div>
            <div className="fld">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="coach@example.com" />
            </div>
            <div className="fld">
              <label>Password</label>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" />
            </div>
            <div className="fld">
              <label>Assign to Team</label>
              <select value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                <option value="">— No team —</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {modal === 'add' && (
              <div className="alert alert-info" style={{ fontSize: 12 }}>
                Coach will be prompted to change their password on first login.
              </div>
            )}
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
            <div><h3>Remove Coach</h3></div>
            <button className="modal-close" onClick={() => setConfirm(null)}>✕</button>
          </div>
          <div className="modal-body">
            <p style={{ color: 'var(--mid)', fontSize: 13, lineHeight: 1.6 }}>
              Remove <strong style={{ color: 'var(--w)' }}>{delCoach?.full_name}</strong> from the platform? Their login access will be revoked immediately.
            </p>
          </div>
          <div className="modal-foot">
            <button className="btn bo" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn bdanger" onClick={handleDelete}>Remove</button>
          </div>
        </div>
      </div>
    </div>
  )
}
