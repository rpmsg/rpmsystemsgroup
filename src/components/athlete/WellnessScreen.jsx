import { useState, useEffect } from 'react'
import { useHome } from '../../HomeContext'
import {
  isWellnessWindowOpen, getTodayDateString,
  checkAlreadySubmitted, submitWellnessCheckin,
} from '../../lib/wellnessApi'

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const MENTAL_OPTIONS = [
  { value: 1, emoji: '🔴', label: 'Spinning / In My Head' },
  { value: 2, emoji: '😤', label: 'Fighting It' },
  { value: 3, emoji: '😐', label: 'Steady' },
  { value: 4, emoji: '🎯', label: 'Dialed In' },
  { value: 5, emoji: '🟢', label: 'Clear Headed and Flowing' },
]

function physColor(n) {
  return n >= 7 ? '#43B878' : n >= 4 ? '#f0b030' : '#e05a4a'
}

export default function WellnessScreen({ athlete, team, onBack, onSubmitted }) {
  const goHome      = useHome()
  const resetDay    = team.wellness_reset_day ?? 1
  const [checking, setChecking]       = useState(true)
  const [windowClosed, setWindowClosed] = useState(false)
  const [alreadyDone, setAlreadyDone]   = useState(false)
  const [mentalScore, setMentalScore]   = useState(null)
  const [mentalWord, setMentalWord]     = useState('')
  const [physScore, setPhysScore]       = useState(null)
  const [error, setError]               = useState('')
  const [submitting, setSubmitting]     = useState(false)

  useEffect(() => {
    async function check() {
      if (!isWellnessWindowOpen(resetDay)) { setWindowClosed(true); setChecking(false); return }
      const done = await checkAlreadySubmitted(team.id, athlete.id)
      if (done) setAlreadyDone(true)
      setChecking(false)
    }
    check()
  }, [])

  async function handleSubmit() {
    setError('')
    if (!mentalScore) { setError('Please rate your mental wellness.'); return }
    const word = mentalWord.trim()
    if (!word) { setError('Please enter one word for your mental state.'); return }
    if (/\s/.test(word)) { setError('Mental state must be a single word — no spaces.'); return }
    if (!/^[a-zA-Z'-]+$/.test(word)) { setError('Mental state must contain letters only.'); return }
    if (!physScore) { setError('Please rate your physical wellness.'); return }
    setSubmitting(true)
    try {
      await submitWellnessCheckin({
        teamId: team.id,
        athleteId: athlete.id,
        mentalScore,
        mentalWord: word.toLowerCase(),
        physicalScore: physScore,
        weekDate: getTodayDateString(),
      })
      onSubmitted()
    } catch (e) {
      setError(e.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const navBar = (
    <nav>
      <img src="/logo.svg" alt="RPM Systems Group" style={{height:36,cursor:'pointer'}} onClick={goHome} />
      <div className="ntag">Weekly Wellness</div>
      <button className="btn bo bsm" onClick={onBack}>← Back</button>
    </nav>
  )

  if (checking) return <>{navBar}<div className="cw"><div className="spinner" /></div></>

  if (windowClosed) return (
    <>{navBar}
      <div className="cw">
        <div className="box" style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>🗓️</div>
          <h2>Window Closed</h2>
          <p>Wellness check-ins are open on <strong>{DAY_NAMES[resetDay]}s</strong> only. Come back then.</p>
          <button className="btn bo bfw" onClick={onBack} style={{marginTop:8}}>← Go Back</button>
        </div>
      </div>
    </>
  )

  if (alreadyDone) return (
    <>{navBar}
      <div className="cw">
        <div className="box" style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>✅</div>
          <h2>Already Submitted</h2>
          <p>You've completed your check-in for this week. See you next {DAY_NAMES[resetDay]}!</p>
          <button className="btn bo bfw" onClick={onBack} style={{marginTop:8}}>← Go Back</button>
        </div>
      </div>
    </>
  )

  return (
    <>{navBar}
      <div className="cw">
        <div className="box" style={{maxWidth:520}}>
          <div className="tag">Weekly Check-In</div>
          <h2 style={{marginBottom:4}}>How are you doing?</h2>
          <p style={{marginBottom:28, color:'var(--mid)', fontSize:13}}>{athlete.full_name.split(' ')[0]}, take a moment to check in with yourself.</p>

          {/* ── Mental wellness ── */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--w)',marginBottom:4}}>🧠 Mental Wellness</div>
            <div style={{fontSize:12,color:'var(--mid)',marginBottom:12}}>How are you feeling mentally today?</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {MENTAL_OPTIONS.map(opt => {
                const sel = mentalScore === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMentalScore(opt.value)}
                    style={{
                      display:'flex', alignItems:'center', gap:14,
                      padding:'12px 16px', borderRadius:8, cursor:'pointer', textAlign:'left',
                      border: sel ? '2px solid var(--g)' : '1px solid var(--bdr)',
                      background: sel ? 'var(--g)1a' : 'var(--d3)',
                    }}
                  >
                    <span style={{fontSize:24,lineHeight:1}}>{opt.emoji}</span>
                    <span style={{fontSize:13,fontWeight: sel ? 600 : 400, color: sel ? 'var(--w)' : 'var(--mid)'}}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="fld" style={{marginBottom:0}}>
              <label style={{fontSize:12}}>Describe your mental state in one word <span style={{color:'var(--rl)'}}>*</span></label>
              <input
                type="text"
                placeholder="e.g. focused, anxious, tired…"
                value={mentalWord}
                maxLength={30}
                onChange={e => setMentalWord(e.target.value.replace(/\s/g, ''))}
              />
            </div>
          </div>

          {/* ── Physical wellness ── */}
          <div style={{marginBottom:28}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--w)',marginBottom:4}}>💪 Physical Wellness</div>
            <div style={{fontSize:12,color:'var(--mid)',marginBottom:12}}>How does your body feel today?</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[1,2,3,4,5,6,7,8,9,10].map(val => {
                const sel = physScore === val
                const col = physColor(val)
                return (
                  <button
                    key={val}
                    onClick={() => setPhysScore(val)}
                    style={{
                      width:44, height:44, borderRadius:8, cursor:'pointer', fontSize:15, fontWeight:700,
                      border: sel ? `2px solid ${col}` : '1px solid var(--bdr)',
                      background: sel ? col + '22' : 'var(--d3)',
                      color: sel ? col : 'var(--mid)',
                    }}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
            <div style={{display:'flex',gap:16,marginTop:8,fontSize:10,color:'var(--mid)'}}>
              <span style={{color:'#e05a4a'}}>■ 1–3 Poor</span>
              <span style={{color:'#f0b030'}}>■ 4–6 Fair</span>
              <span style={{color:'#43B878'}}>■ 7–10 Good</span>
            </div>
          </div>

          {error && <div className="err">{error}</div>}
          <button className="btn bp bfw" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Check-In →'}
          </button>
        </div>
      </div>
    </>
  )
}
