import { useState, useEffect } from 'react'
import { PC_QUESTIONS, SM_QUESTIONS, SM_QUESTIONS_SET2 } from './questions'
import { fetchRosterNames, fetchCustomQuestions, submitAssessment } from '../../lib/athleteApi'
import { useHome } from '../../HomeContext'

function mergeQuestions(defaults, overrides) {
  const map = {}
  overrides.forEach(o => { map[o.question_id] = o })
  return defaults.map(q => {
    const o = map[q.id]
    if (!o) return q
    return {
      ...q,
      ...(o.meta          && { meta: o.meta }),
      ...(o.question_text && { q:    o.question_text }),
      ...(o.sub_text      && { sub:  o.sub_text }),
      ...(o.choices && Array.isArray(o.choices) && o.choices.length && { choices: o.choices }),
    }
  })
}

function SidebarItem({ label, state }) {
  return (
    <div className={`sbi${state === 'active' ? ' active' : ''}${state === 'done' ? ' done' : ''}`}>
      <span className="sbd" />
      {label}
    </div>
  )
}

function stepState(stepN, current) {
  if (stepN < current) return 'done'
  if (stepN === current) return 'active'
  return 'pending'
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function resolveOther(values, otherText) {
  return values.map(v => (v === 'Other' && otherText?.trim()) ? otherText.trim() : v)
}

export default function IntakeScreen({ team, athlete, onSubmitted }) {
  const goHome = useHome()
  const administration = team.current_administration || 1
  const questionSet    = administration === 2 ? 2 : 1
  const smOnly         = administration > 1

  const PC_TOTAL = smOnly ? 0 : 11
  const SM_TOTAL = 12
  const TOTAL    = smOnly ? 12 : 23

  const smDefaultQuestions = questionSet === 2 ? SM_QUESTIONS_SET2 : SM_QUESTIONS

  const [step, setStep]             = useState(smOnly ? 'brk-social' : 'brk-start')
  const [answers, setAnswers]       = useState({})
  const [otherTexts, setOtherTexts] = useState({})
  const [roster, setRoster]         = useState([])
  const [pcQuestions, setPcQ]       = useState(PC_QUESTIONS)
  const [smQuestions, setSmQ]       = useState(smDefaultQuestions)
  const [loadingQ, setLoadingQ]     = useState(true)
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchRosterNames(team.id),
      fetchCustomQuestions(),
    ]).then(([names, customs]) => {
      setRoster(names)
      if (!smOnly) setPcQ(mergeQuestions(PC_QUESTIONS, customs))
      setSmQ(mergeQuestions(smDefaultQuestions, customs))
    }).catch(() => {
      setRoster([])
    }).finally(() => setLoadingQ(false))
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [team.id])

  // ── Validation ────────────────────────────────────────────

  function isAnswered(q) {
    if (q.type === 'text') return (answers[q.id] || '').trim().length > 0
    const sel = answers[q.id] || []
    if (sel.length === 0) return false
    if (sel.includes('Other') && !(otherTexts[q.id] || '').trim()) return false
    return true
  }

  function validatePC(n) {
    const q = pcQuestions[n - 1]
    if (!isAnswered(q)) {
      if (q.type === 'text') {
        setError('Please write your response before continuing.')
      } else if ((answers[q.id] || []).includes('Other') && !(otherTexts[q.id] || '').trim()) {
        setError('Please describe your "Other" response before continuing.')
      } else {
        setError('Please make a selection before continuing.')
      }
      return false
    }
    setError('')
    return true
  }

  // ── Answer helpers ────────────────────────────────────────

  function toggleSingle(key, value) {
    setAnswers(a => ({ ...a, [key]: [value] }))
    setError('')
  }

  function toggleMulti(key, value, max) {
    setAnswers(a => {
      const cur = a[key] || []
      if (cur.includes(value)) return { ...a, [key]: cur.filter(v => v !== value) }
      if (cur.length >= max) return a
      return { ...a, [key]: [...cur, value] }
    })
    setError('')
  }

  function toggleRoster(key, name) {
    setAnswers(a => {
      const cur = a[key] || []
      if (cur.includes(name)) return { ...a, [key]: cur.filter(v => v !== name) }
      if (cur.length >= 2) return a
      return { ...a, [key]: [...cur, name] }
    })
  }

  function setText(key, value) {
    setAnswers(a => ({ ...a, [key]: value }))
    setError('')
  }

  function setOtherText(key, value) {
    setOtherTexts(o => ({ ...o, [key]: value }))
    setError('')
  }

  // ── Navigation ────────────────────────────────────────────

  function startPC() { setStep(1); setError('') }
  function startSM() { setStep(12); setError('') }

  function navPC(n) {
    if (n > step && typeof step === 'number' && step <= 11) {
      if (!validatePC(step)) return
    }
    setError('')
    if (n < 1)  { setStep('brk-start'); return }
    setStep(n)
  }

  function donePC() {
    if (!validatePC(11)) return
    setError('')
    setStep('brk-social')
  }

  function navSM(n) {
    setError('')
    if (n < 12) {
      setStep(smOnly ? 'brk-social' : 'brk-social')
      return
    }
    setStep(n)
  }

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      function single(key) {
        return resolveOther(answers[key] || [], otherTexts[key])[0] || ''
      }
      function multi(key) {
        return resolveOther(answers[key] || [], otherTexts[key]).join(', ')
      }

      let pc = null
      if (!smOnly) {
        pc = {
          athlete_id:          athlete.id,
          team_id:             team.id,
          q1_trigger:          single('pc1'),
          q2_first_signal:     multi('pc2'),
          q3_emotions:         multi('pc3'),
          q4_inner_voice:      single('pc4'),
          q5_identity_phrase:  single('pc5'),
          q6_body_response:    multi('pc6'),
          q7_reaction:         single('pc7'),
          q8_behavior:         single('pc8'),
          q9_pattern_sentence: answers.pc9 || '',
          q10_outcome:         single('pc10'),
          q11_aftermath:       single('pc11'),
        }
      }

      const sm = smQuestions.map((q, i) => {
        const sel = answers[q.id] || []
        return {
          athlete_id:      athlete.id,
          team_id:         team.id,
          question_number: i + 1,
          question_type:   q.positive ? 'positive' : 'negative',
          nominee_1:       sel[0] || null,
          nominee_2:       sel[1] || null,
          administration,
          question_set:    questionSet,
        }
      })

      await submitAssessment({ athleteId: athlete.id, teamId: team.id, administration, questionSet, pc, sm })
      onSubmitted(pc)
    } catch {
      setError('Submission error. Please try again or notify your coach.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Sidebar ───────────────────────────────────────────────

  const currentN = typeof step === 'number' ? step : step === 'brk-social' ? 12 : 0

  const pcSidebar = [
    { n: 1,  label: 'Trigger Situation' }, { n: 2,  label: 'First Signal' },
    { n: 3,  label: 'Emotions' },          { n: 4,  label: 'Inner Voice' },
    { n: 5,  label: 'Identity Phrase' },   { n: 6,  label: 'Body Response' },
    { n: 7,  label: 'Reaction' },          { n: 8,  label: 'Behavior' },
    { n: 9,  label: 'Your Pattern' },      { n: 10, label: 'Outcome' },
    { n: 11, label: 'Aftermath' },
  ]
  const smSidebar = [
    { n: 12, label: 'Trust' },             { n: 13, label: 'Communication' },
    { n: 14, label: 'Safety' },            { n: 15, label: 'Positive Influence' },
    { n: 16, label: 'Effectiveness' },     { n: 17, label: 'Decision Trust' },
    { n: 18, label: 'Understanding' },     { n: 19, label: 'Most Interaction' },
    { n: 20, label: 'Positive Environment' }, { n: 21, label: 'Least Connected' },
    { n: 22, label: 'Least Interaction' }, { n: 23, label: 'Hard to Communicate' },
  ]

  // ── Sub-components ────────────────────────────────────────

  function ProgressBar({ n }) {
    const displayN = smOnly ? n - 11 : n
    const pct = Math.round((displayN / TOTAL) * 100)
    return (
      <div className="pm">
        <div className="pml">Question {displayN} of {TOTAL}</div>
        <div className="pt"><div className="pf" style={{ width: pct + '%' }} /></div>
      </div>
    )
  }

  function PCQuestion({ q }) {
    const sel = answers[q.id] || []
    const otherSelected = sel.includes('Other')
    const otherVal = otherTexts[q.id] || ''

    return (
      <div>
        <ProgressBar n={q.n} />
        <div className="qmeta">{q.meta}</div>
        <div className="qt">{q.q}</div>
        <div className="qs">{q.sub}</div>

        {q.type === 'text' ? (
          <textarea
            placeholder={q.placeholder}
            value={answers[q.id] || ''}
            onChange={e => setText(q.id, e.target.value)}
          />
        ) : (
          <>
            <div className="choices">
              {q.choices.map(c => {
                const isSel = sel.includes(c)
                return (
                  <div
                    key={c}
                    className={`choice${isSel ? ' sel' : ''}`}
                    onClick={() => q.type === 'single' ? toggleSingle(q.id, c) : toggleMulti(q.id, c, q.max)}
                  >
                    <span className="chk" />{c}
                  </div>
                )
              })}
              <div
                className={`choice${otherSelected ? ' sel' : ''}`}
                onClick={() => q.type === 'single' ? toggleSingle(q.id, 'Other') : toggleMulti(q.id, 'Other', q.max)}
              >
                <span className="chk" />Other
              </div>
            </div>
            {otherSelected && (
              <textarea
                placeholder="Please describe..."
                value={otherVal}
                onChange={e => setOtherText(q.id, e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
          </>
        )}

        {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}

        <div className="qnav">
          {q.n === 11 ? (
            <button className="btn bp" onClick={donePC}>Continue to Social Map →</button>
          ) : (
            <button className="btn bp" onClick={() => navPC(q.n + 1)}>Next →</button>
          )}
          {q.n > 1 && (
            <button className="btn bo" onClick={() => navPC(q.n - 1)}>← Back</button>
          )}
        </div>
      </div>
    )
  }

  function SMQuestion({ q, smIndex }) {
    const sel = answers[q.id] || []
    const others = roster.filter(nm => nm.toLowerCase() !== athlete.full_name.toLowerCase())
    return (
      <div>
        <ProgressBar n={q.n} />
        <div className="qmeta">{q.meta}</div>
        <div className="qt">{q.q}</div>
        <div className="qs">{q.sub || 'Select up to 2 teammates.'}</div>
        <div className="rg">
          {others.map(nm => (
            <div
              key={nm}
              className={`ri${sel.includes(nm) ? ' sel' : ''}`}
              onClick={() => toggleRoster(q.id, nm)}
            >
              <div className="av">{initials(nm)}</div>
              {nm}
            </div>
          ))}
        </div>
        {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}
        <div className="qnav">
          {smIndex === smQuestions.length - 1 ? (
            <>
              <button className="btn bp" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Assessment ✓'}
              </button>
              <button className="btn bo" onClick={() => navSM(q.n - 1)}>← Back</button>
            </>
          ) : (
            <>
              <button className="btn bp" onClick={() => navSM(q.n + 1)}>Next →</button>
              {smIndex > 0 && <button className="btn bo" onClick={() => navSM(q.n - 1)}>← Back</button>}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────

  const adminLabel = administration === 1 ? 'Administration 1 — Start of Season'
                   : administration === 2 ? 'Administration 2 — Mid Season'
                   : 'Administration 3 — End of Season'

  return (
    <>
      <nav>
        <div className="logo" onClick={goHome} style={{cursor:'pointer'}}>RPM<span>.</span>SG</div>
        <div className="ntag">
          {!smOnly && typeof step === 'number' && step <= 11 ? 'Panic Cycle Assessment' : 'Social Map Assessment'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mid)' }}>
          {typeof step === 'number' ? `${smOnly ? step - 11 : step} / ${TOTAL}` : ''}
        </div>
      </nav>

      <div className="il">
        <div className="sb">
          {!smOnly && (
            <>
              <div className="sbsec">Part 1 — Panic Cycle</div>
              {pcSidebar.map(s => <SidebarItem key={s.n} label={s.label} state={stepState(s.n, currentN)} />)}
            </>
          )}
          <div className="sbsec">{smOnly ? 'Social Map' : 'Part 2 — Social Map'}</div>
          {smSidebar.map(s => <SidebarItem key={s.n} label={s.label} state={stepState(s.n, currentN)} />)}
        </div>

        <div className="im">
          {!smOnly && step === 'brk-start' && (
            <div className="brk on">
              <div className="bico">🧠</div>
              <h2>Part 1: Your Panic Cycle</h2>
              <p>These questions map how pressure shows up for you — your triggers, body response, and automatic reactions. No wrong answers.</p>
              <button className="btn bp" onClick={startPC}>Let's Begin →</button>
            </div>
          )}
          {step === 'brk-social' && (
            <div className="brk on">
              <div className="bico">🔗</div>
              <h2>{smOnly ? 'Team Social Map' : 'Part 2: Team Social Map'}</h2>
              <p style={{ marginBottom: 8 }}>
                {smOnly
                  ? 'Select up to 2 teammates per question. Responses are fully confidential.'
                  : 'Now we map your team\'s relational dynamics. Select up to 2 teammates per question. Responses are fully confidential.'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 16 }}>{adminLabel}</p>
              <button className="btn bp" onClick={startSM}>Continue →</button>
            </div>
          )}
          {!smOnly && loadingQ && step === 'brk-start' && <div className="spinner" />}
          {!smOnly && typeof step === 'number' && step >= 1  && step <= 11 && <PCQuestion q={pcQuestions[step - 1]} />}
          {typeof step === 'number' && step >= 12 && step <= 23 && <SMQuestion q={smQuestions[step - 12]} smIndex={step - 12} />}
        </div>
      </div>
    </>
  )
}
