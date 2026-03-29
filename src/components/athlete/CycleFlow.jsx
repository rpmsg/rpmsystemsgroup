import { useState } from 'react'
import TeamCodeScreen from './TeamCodeScreen'
import CycleNameScreen from './CycleNameScreen'
import CyclePinScreen from './CyclePinScreen'
import CycleDocumentScreen from './CycleDocumentScreen'

const S = { CODE: 'code', NAME: 'name', PIN: 'pin', DOCUMENT: 'document' }

export default function CycleFlow({ onBack }) {
  const [screen, setScreen]   = useState(S.CODE)
  const [team, setTeam]       = useState(null)
  const [athlete, setAthlete] = useState(null)

  return (
    <>
      {screen === S.CODE && (
        <TeamCodeScreen
          onBack={onBack}
          onSuccess={(teamData) => { setTeam(teamData); setScreen(S.NAME) }}
        />
      )}
      {screen === S.NAME && (
        <CycleNameScreen
          team={team}
          onBack={() => setScreen(S.CODE)}
          onSelect={(athleteData) => { setAthlete(athleteData); setScreen(S.PIN) }}
        />
      )}
      {screen === S.PIN && (
        <CyclePinScreen
          team={team}
          athlete={athlete}
          onBack={() => setScreen(S.NAME)}
          onVerified={() => setScreen(S.DOCUMENT)}
        />
      )}
      {screen === S.DOCUMENT && (
        <CycleDocumentScreen
          team={team}
          athlete={athlete}
          onHome={onBack}
        />
      )}
    </>
  )
}
