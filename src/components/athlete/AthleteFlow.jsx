import { useState } from 'react'
import TeamCodeScreen from './TeamCodeScreen'
import NameSelectScreen from './NameSelectScreen'
import ConsentScreen from './ConsentScreen'
import IntakeScreen from './IntakeScreen'
import ConfirmScreen from './ConfirmScreen'

// screen ids
const S = { CODE: 'code', NAME: 'name', CONSENT: 'consent', INTAKE: 'intake', CONFIRM: 'confirm' }

export default function AthleteFlow({ onBack }) {
  const [screen, setScreen] = useState(S.CODE)
  const [team, setTeam]     = useState(null)   // { id, name }
  const [athlete, setAthlete] = useState(null) // { id, full_name }
  const [submission, setSubmission] = useState(null) // final pc payload for confirm screen

  function goBack() {
    if (screen === S.CODE)    return onBack()
    if (screen === S.NAME)    return setScreen(S.CODE)
    if (screen === S.CONSENT) return setScreen(S.CODE)
    if (screen === S.INTAKE)  return setScreen(S.CONSENT)
  }

  return (
    <>
      {screen === S.CODE && (
        <TeamCodeScreen
          onBack={onBack}
          onSuccess={(teamData) => { setTeam(teamData); setScreen(S.NAME) }}
        />
      )}
      {screen === S.NAME && (
        <NameSelectScreen
          team={team}
          onBack={() => setScreen(S.CODE)}
          onSelect={(athleteData) => { setAthlete(athleteData); setScreen(S.CONSENT) }}
        />
      )}
      {screen === S.CONSENT && (
        <ConsentScreen
          team={team}
          athlete={athlete}
          onBack={() => setScreen(S.CODE)}
          onProceed={() => setScreen(S.INTAKE)}
        />
      )}
      {screen === S.INTAKE && (
        <IntakeScreen
          team={team}
          athlete={athlete}
          onSubmitted={(pc) => { setSubmission(pc); setScreen(S.CONFIRM) }}
        />
      )}
      {screen === S.CONFIRM && (
        <ConfirmScreen
          team={team}
          athlete={athlete}
          pc={submission}
          onHome={onBack}
        />
      )}
    </>
  )
}
