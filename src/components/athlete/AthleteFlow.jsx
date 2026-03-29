import { useState } from 'react'
import TeamCodeScreen from './TeamCodeScreen'
import NameSelectScreen from './NameSelectScreen'
import ConsentScreen from './ConsentScreen'
import IntakeScreen from './IntakeScreen'
import AssessmentPinScreen from './AssessmentPinScreen'
import ConfirmScreen from './ConfirmScreen'

const S = { CODE: 'code', NAME: 'name', CONSENT: 'consent', INTAKE: 'intake', PIN: 'pin', CONFIRM: 'confirm' }

export default function AthleteFlow({ onBack }) {
  const [screen, setScreen]     = useState(S.CODE)
  const [team, setTeam]         = useState(null)
  const [athlete, setAthlete]   = useState(null)
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
          onSubmitted={(pc) => { setSubmission(pc); setScreen(S.PIN) }}
        />
      )}
      {screen === S.PIN && (
        <AssessmentPinScreen
          team={team}
          athlete={athlete}
          onPinSet={() => setScreen(S.CONFIRM)}
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
