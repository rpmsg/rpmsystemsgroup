import { useState } from 'react'
import TeamCodeScreen from './TeamCodeScreen'
import NameSelectScreen from './NameSelectScreen'
import ConsentScreen from './ConsentScreen'
import IntakeScreen from './IntakeScreen'
import AssessmentPinScreen from './AssessmentPinScreen'
import ConfirmScreen from './ConfirmScreen'

// screen ids
const S = { CODE: 'code', NAME: 'name', CONSENT: 'consent', INTAKE: 'intake', PIN: 'pin', CONFIRM: 'confirm' }

export default function AthleteFlow({ onBack, initialTeam = null, initialAthlete = null, skipPin = false, onDone = null }) {
  const exitToParent = onDone || onBack

  const [screen, setScreen] = useState(() => {
    if (initialTeam && initialAthlete) {
      return (initialTeam.current_administration || 1) === 1 ? S.CONSENT : S.INTAKE
    }
    return S.CODE
  })
  const [team, setTeam]       = useState(initialTeam)
  const [athlete, setAthlete] = useState(initialAthlete)
  const [submission, setSubmission] = useState(null)

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
          onSelect={(athleteData) => {
            setAthlete(athleteData)
            setScreen((team.current_administration || 1) === 1 ? S.CONSENT : S.INTAKE)
          }}
        />
      )}
      {screen === S.CONSENT && (
        <ConsentScreen
          team={team}
          athlete={athlete}
          onBack={initialTeam ? exitToParent : () => setScreen(S.CODE)}
          onProceed={() => setScreen(S.INTAKE)}
        />
      )}
      {screen === S.INTAKE && (
        <IntakeScreen
          team={team}
          athlete={athlete}
          onSubmitted={(pc) => {
            setSubmission(pc)
            setScreen((team.current_administration || 1) === 1 && !skipPin ? S.PIN : S.CONFIRM)
          }}
        />
      )}
      {screen === S.PIN && (
        <AssessmentPinScreen
          athlete={athlete}
          team={team}
          onPinSet={() => setScreen(S.CONFIRM)}
        />
      )}
      {screen === S.CONFIRM && (
        <ConfirmScreen
          team={team}
          athlete={athlete}
          pc={submission}
          onHome={exitToParent}
        />
      )}
    </>
  )
}
