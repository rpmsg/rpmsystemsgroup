import { useState } from 'react'
import Landing from './components/Landing'
import AthleteFlow from './components/athlete/AthleteFlow'
import CycleFlow from './components/athlete/CycleFlow'
import CoachFlow from './components/coach/CoachFlow'
import AdminFlow from './components/admin/AdminFlow'

export default function App() {
  const [flow, setFlow] = useState(null) // null | 'athlete' | 'cycle' | 'coach' | 'admin'

  if (flow === 'athlete') return <AthleteFlow onBack={() => setFlow(null)} />
  if (flow === 'cycle')   return <CycleFlow   onBack={() => setFlow(null)} />
  if (flow === 'coach')   return <CoachFlow   onBack={() => setFlow(null)} />
  if (flow === 'admin')   return <AdminFlow   onBack={() => setFlow(null)} />

  return <Landing onSelect={setFlow} />
}
