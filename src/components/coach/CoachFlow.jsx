import { useState } from 'react'
import CoachLogin from './CoachLogin'
import CoachDashboard from './CoachDashboard'

export default function CoachFlow({ onBack }) {
  const [coach, setCoach] = useState(null)

  if (coach) {
    return <CoachDashboard coach={coach} onSignOut={() => setCoach(null)} />
  }

  return <CoachLogin onBack={onBack} onLogin={setCoach} />
}
