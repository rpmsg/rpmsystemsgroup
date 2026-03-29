import { useState } from 'react'

export default function ChangePasswordModal({ forced, onClose, onSave }) {
  const [current, setCurrent]   = useState('')
  const [newPass, setNewPass]   = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSave() {
    setError('')
    if (!forced && !current) { setError('Please enter your current password.'); return }
    if (newPass.length < 8)  { setError('New password must be at least 8 characters.'); return }
    if (newPass !== confirm)  { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      await onSave(current, newPass, forced)
      setSuccess('Password updated successfully.')
      setTimeout(() => { if (!forced) onClose() }, 1400)
    } catch (e) {
      setError(e.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay on">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>{forced ? 'Set Your Password' : 'Change Password'}</h3>
            <p>{forced
              ? 'Your administrator has set a temporary password. Please set a new one before continuing.'
              : 'Enter your current password, then choose a new one.'
            }</p>
          </div>
          {!forced && (
            <button className="modal-close" onClick={onClose}>✕</button>
          )}
        </div>
        <div className="modal-body">
          {!forced && (
            <div className="fld">
              <label>Current Password</label>
              <input type="password" placeholder="••••••••" value={current} onChange={e => setCurrent(e.target.value)} />
            </div>
          )}
          <div className="fld">
            <label>New Password</label>
            <input type="password" placeholder="Min. 8 characters" value={newPass} onChange={e => setNewPass(e.target.value)} />
          </div>
          <div className="fld">
            <label>Confirm New Password</label>
            <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          {error   && <div className="err">{error}</div>}
          {success && <div style={{ color: 'var(--gl)', fontSize: 13, marginBottom: 12 }}>{success}</div>}
        </div>
        <div className="modal-foot">
          {!forced && <button className="btn bo" onClick={onClose}>Cancel</button>}
          <button className="btn bp" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
