import { useState } from 'react'
import { adminLogin } from '../../lib/adminApi'
import { useHome } from '../../HomeContext'

export default function AdminLogin({ onLogin, onBack }) {
  const goHome = useHome()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const admin = await adminLogin(username, password)
      if (!admin) { setError('Invalid credentials.'); return }
      onLogin(admin)
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36,cursor:'pointer'}} onClick={goHome} />
        <button className="back-link" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">STAFF ONLY</div>
          <h2>Admin Access</h2>
          <p>Enter your administrator credentials to continue.</p>
          <form onSubmit={handleSubmit}>
            <div className="fld">
              <label>Email</label>
              <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
            </div>
            <div className="fld">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <div className="err">{error}</div>}
            <button type="submit" className="btn bp bfw" disabled={loading || !username || !password}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
