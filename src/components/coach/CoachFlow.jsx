import { useState, useEffect } from 'react'
import CoachLogin from './CoachLogin'
import CoachDashboard from './CoachDashboard'
import { getCoachSession, coachLogout } from '../../lib/coachApi'

export default function CoachFlow({ onBack }) {
  const [coach, setCoach]       = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getCoachSession()
      .then(c => { if (c) setCoach(c) })
      .finally(() => setChecking(false))
  }, [])

  async function handleSignOut() {
    await coachLogout()
    setCoach(null)
  }

  if (checking) return <div className="cw"><div className="spinner" /></div>

  if (coach) {
    return <CoachDashboard coach={coach} onSignOut={handleSignOut} />
  }

  return <CoachLogin onBack={onBack} onLogin={setCoach} />
}
