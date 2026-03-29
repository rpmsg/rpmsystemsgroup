import { useState } from 'react'
import AdminLogin from './AdminLogin'
import AdminDashboard from './AdminDashboard'

export default function AdminFlow({ onBack }) {
  const [admin, setAdmin] = useState(null)

  if (!admin) {
    return <AdminLogin onLogin={setAdmin} onBack={onBack} />
  }

  return <AdminDashboard onLogout={() => setAdmin(null)} onBack={onBack} />
}
