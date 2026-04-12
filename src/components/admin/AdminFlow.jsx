import { useState, useEffect } from 'react'
import AdminLogin from './AdminLogin'
import AdminDashboard from './AdminDashboard'
import { getAdminSession, adminLogout } from '../../lib/adminApi'

export default function AdminFlow({ onBack }) {
  const [admin, setAdmin]       = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getAdminSession()
      .then(a => { if (a) setAdmin(a) })
      .finally(() => setChecking(false))
  }, [])

  async function handleLogout() {
    await adminLogout()
    setAdmin(null)
  }

  if (checking) return <div className="cw"><div className="spinner" /></div>

  if (!admin) {
    return <AdminLogin onLogin={setAdmin} onBack={onBack} />
  }

  return <AdminDashboard onLogout={handleLogout} onBack={onBack} />
}
