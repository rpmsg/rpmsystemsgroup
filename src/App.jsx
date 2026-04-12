import { useState } from 'react'
import Landing from './components/Landing'
import AthleteFlow from './components/athlete/AthleteFlow'
import CycleFlow from './components/athlete/CycleFlow'
import WellnessFlow from './components/athlete/WellnessFlow'
import CoachFlow from './components/coach/CoachFlow'
import AdminFlow from './components/admin/AdminFlow'
import { HomeContext } from './HomeContext'

export default function App() {
  const [flow, setFlow] = useState(null)
  const goHome = () => setFlow(null)

  if (flow === 'athlete') return <HomeContext.Provider value={goHome}><AthleteFlow onBack={goHome} /></HomeContext.Provider>
  if (flow === 'cycle')    return <HomeContext.Provider value={goHome}><CycleFlow    onBack={goHome} /></HomeContext.Provider>
  if (flow === 'wellness') return <HomeContext.Provider value={goHome}><WellnessFlow onBack={goHome} /></HomeContext.Provider>
  if (flow === 'coach')   return <HomeContext.Provider value={goHome}><CoachFlow   onBack={goHome} /></HomeContext.Provider>
  if (flow === 'admin')   return <HomeContext.Provider value={goHome}><AdminFlow   onBack={goHome} /></HomeContext.Provider>

  return <Landing onSelect={setFlow} />
}
