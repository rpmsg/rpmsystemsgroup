import { useState } from 'react'
import { coachLogin } from '../../lib/coachApi'

export default function CoachLogin({ onBack, onLogin }) {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const coach = await coachLogin(email, password)
      if (!coach) { setError('Invalid credentials.'); return }
      onLogin(coach)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav>
        <div className="logo">RPM<span>.</span>SG</div>
        <div className="ntag">Coach Access</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw">
        <div className="box">
          <div className="tag">Coach Portal</div>
          <h2>Dashboard Login</h2>
          <p>Enter your credentials to access the team Pulse Report and Root Pattern Maps.</p>
          <form onSubmit={handleSubmit}>
            <div className="fld">
              <label>Email</label>
              <input type="email" placeholder="coach@university.edu" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="fld">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <div className="err">{error}</div>}
            <button className="btn bp bfw" type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Access Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
