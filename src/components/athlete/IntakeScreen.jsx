import { useState, useEffect } from 'react'
import { PC_QUESTIONS, SM_QUESTIONS } from './questions'
import { fetchRosterNames, fetchCustomQuestions, submitAssessment } from '../../lib/athleteApi'

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

// Replace 'Other' in a list with the typed other-text (if provided)
function resolveOther(values, otherText) {
  return values.map(v => (v === 'Other' && otherText?.trim()) ? otherText.trim() : v)
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const TOTAL = 23

// ── Sub-components defined at module scope to prevent remount on parent re-render ──

function SidebarItem({ label, state }) {
  return (
    <div className={`sbi${state === 'active' ? ' active' : ''}${state === 'done' ? ' done' : ''}`}>
      <span className="sbd" />
      {label}
    </div>
  )
}

function ProgressBar({ n }) {
  const pct = Math.round((n / TOTAL) * 100)
  return (
    <div className="pm">
      <div className="pml">Question {n} of {TOTAL}</div>
      <div className="pt"><div className="pf" style={{ width: pct + '%' }} /></div>
    </div>
  )
}

function PCQuestion({ q, sel, otherVal, error, setText, toggleSingle, toggleMulti, setOtherText, navPC, donePC }) {
  const otherSelected = sel.includes('Other')

  return (
    <div>
      <ProgressBar n={q.n} />
      <div className="qmeta">{q.meta}</div>
      <div className="qt">{q.q}</div>
      <div className="qs">{q.sub}</div>

      {q.type === 'text' ? (
        <textarea
          placeholder={q.placeholder}
          value={sel}
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

function SMQuestion({ q, smIndex, smTotal, sel, roster, athleteName, error, toggleRoster, navSM, handleSubmit, submitting }) {
  const others = roster.filter(nm => nm.toLowerCase() !== athleteName.toLowerCase())
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
        {smIndex === smTotal - 1 ? (
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

// ── Main component ─────────────────────────────────────────────

export default function IntakeScreen({ team, athlete, onSubmitted }) {
  const [step, setStep]             = useState('brk-start')
  const [answers, setAnswers]       = useState({})
  const [otherTexts, setOtherTexts] = useState({})
  const [roster, setRoster]         = useState([])
  const [pcQuestions, setPcQ]       = useState(PC_QUESTIONS)
  const [smQuestions, setSmQ]       = useState(SM_QUESTIONS)
  const [loadingQ, setLoadingQ]     = useState(true)
  const [error, setError]           = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchRosterNames(team.id),
      fetchCustomQuestions(),
    ]).then(([names, customs]) => {
      setRoster(names)
      setPcQ(mergeQuestions(PC_QUESTIONS, customs))
      setSmQ(mergeQuestions(SM_QUESTIONS, customs))
    }).catch(() => {
      setRoster([])
    }).finally(() => setLoadingQ(false))
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [team.id])

  // ── Validation ──────────────────────────────────────────────

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

  // ── Answer helpers ───────────────────────────────────────────

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

  // ── Navigation ───────────────────────────────────────────────

  function startPC() { setStep(1); setError('') }
  function startSM() { setStep(12); setError('') }

  function navPC(n) {
    if (n > step && typeof step === 'number' && step <= 11) {
      if (!validatePC(step)) return
    }
    setError('')
    if (n < 1) { setStep('brk-start'); return }
    setStep(n)
  }

  function donePC() {
    if (!validatePC(11)) return
    setError('')
    setStep('brk-social')
  }

  function navSM(n) {
    setError('')
    if (n < 12) { setStep('brk-social'); return }
    setStep(n)
  }

  // ── Submit ───────────────────────────────────────────────────

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

      const pc = {
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

      const sm = smQuestions.map((q, i) => ({
        athlete_id:      athlete.id,
        team_id:         team.id,
        question_number: i + 1,
        question_type:   q.positive ? 'positive' : 'negative',
        nominee_1:       (answers[q.id] || [])[0] || null,
        nominee_2:       (answers[q.id] || [])[1] || null,
      }))

      await submitAssessment({ athleteId: athlete.id, teamId: team.id, pc, sm })
      onSubmitted(pc)
    } catch {
      setError('Submission error. Please try again or notify your coach.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Sidebar ──────────────────────────────────────────────────

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

  function stepState(stepN, current) {
    if (stepN < current) return 'done'
    if (stepN === current) return 'active'
    return 'pending'
  }

  // ── Render ───────────────────────────────────────────────────

  const activePC = typeof step === 'number' && step >= 1  && step <= 11
  const activeSM = typeof step === 'number' && step >= 12 && step <= 23

  return (
    <>
      <nav>
        <div className="logo">RPM<span>.</span>SG</div>
        <div className="ntag">
          {activePC ? 'Panic Cycle Assessment' : 'Social Map Assessment'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mid)' }}>
          {typeof step === 'number' ? `${step} / ${TOTAL}` : ''}
        </div>
      </nav>

      <div className="il">
        <div className="sb">
          <div className="sbsec">Part 1 — Panic Cycle</div>
          {pcSidebar.map(s => <SidebarItem key={s.n} label={s.label} state={stepState(s.n, currentN)} />)}
          <div className="sbsec">Part 2 — Social Map</div>
          {smSidebar.map(s => <SidebarItem key={s.n} label={s.label} state={stepState(s.n, currentN)} />)}
        </div>

        <div className="im">
          {step === 'brk-start' && !loadingQ && (
            <div className="brk on">
              <div className="bico">🧠</div>
              <h2>Part 1: Your Panic Cycle</h2>
              <p>These questions map how pressure shows up for you — your triggers, body response, and automatic reactions. No wrong answers.</p>
              <button className="btn bp" onClick={startPC}>Let's Begin →</button>
            </div>
          )}
          {step === 'brk-start' && loadingQ && <div className="spinner" />}
          {step === 'brk-social' && (
            <div className="brk on">
              <div className="bico">🔗</div>
              <h2>Part 2: Team Social Map</h2>
              <p>Now we map your team's relational dynamics. Select up to 2 teammates per question. Responses are fully confidential.</p>
              <button className="btn bp" onClick={startSM}>Continue →</button>
            </div>
          )}
          {activePC && (
            <PCQuestion
              q={pcQuestions[step - 1]}
              sel={pcQuestions[step - 1]?.type === 'text' ? (answers[pcQuestions[step - 1].id] || '') : (answers[pcQuestions[step - 1].id] || [])}
              otherVal={otherTexts[pcQuestions[step - 1]?.id] || ''}
              error={error}
              setText={setText}
              toggleSingle={toggleSingle}
              toggleMulti={toggleMulti}
              setOtherText={setOtherText}
              navPC={navPC}
              donePC={donePC}
            />
          )}
          {activeSM && (
            <SMQuestion
              q={smQuestions[step - 12]}
              smIndex={step - 12}
              smTotal={smQuestions.length}
              sel={answers[smQuestions[step - 12]?.id] || []}
              roster={roster}
              athleteName={athlete.full_name}
              error={error}
              toggleRoster={toggleRoster}
              navSM={navSM}
              handleSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </>
  )
}
