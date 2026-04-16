import { useState } from 'react'
import Landing from './components/Landing'
import AthletePortal from './components/athlete/AthletePortal'
import CoachFlow from './components/coach/CoachFlow'
import AdminFlow from './components/admin/AdminFlow'
import { HomeContext } from './HomeContext'

export default function App() {
  const [flow, setFlow] = useState(null)
  const goHome = () => setFlow(null)

  if (flow === 'portal') return <HomeContext.Provider value={goHome}><AthletePortal onBack={goHome} /></HomeContext.Provider>
  if (flow === 'coach')  return <HomeContext.Provider value={goHome}><CoachFlow  onBack={goHome} /></HomeContext.Provider>
  if (flow === 'admin')  return <HomeContext.Provider value={goHome}><AdminFlow  onBack={goHome} /></HomeContext.Provider>

  return <Landing onSelect={setFlow} />
}
