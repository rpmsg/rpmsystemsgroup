import { useState, useEffect } from 'react'
import { useHome } from '../../HomeContext'
import { fetchPerformanceCycles, submitPerformanceCycle, resubmitPerformanceCycle } from '../../lib/cycleApi'
import CycleNameScreen from './CycleNameScreen'
import CycleDocumentScreen from './CycleDocumentScreen'

// ── Static data ───────────────────────────────────────────────

const FEAR_CATEGORIES = [
  { id: 'Inadequacy',        desc: '"I\'m not good enough"' },
  { id: 'Unsafety',          desc: '"I\'m losing my spot or control"' },
  { id: 'Failure',           desc: '"If I mess this up, everything falls apart"' },
  { id: 'Judgment',          desc: '"Everyone is watching and evaluating me"' },
  { id: 'Disappointing Others', desc: '"I\'m letting my team, coach, or family down"' },
  { id: 'Impostor',          desc: '"I don\'t actually belong here at this level"' },
  { id: 'Perfectionism',     desc: '"Anything less than perfect means I failed"' },
  { id: 'Loss of Control',   desc: '"When things go off script I fall apart"' },
]

const FEAR_EXAMPLES = {
  Inadequacy:            ['I have trained [X] hours for this. I own my skills.', 'One mistake is data, not a definition. I am a competitor.'],
  Unsafety:              ['I am safe. I control my effort, not the outcome.', 'I trust my instincts. Just play.'],
  Failure:               ['One moment does not define the game. Reset and go.', 'I have failed before and come back stronger. This is no different.'],
  Judgment:              ['Their eyes don\'t change my ability. I know what I can do.', 'I play for the work I\'ve put in, not for the crowd.'],
  'Disappointing Others':['The best thing I can do for my team right now is compete fully.', 'I show up for them by showing up for myself. Play.'],
  Impostor:              ['I earned my spot through work. I belong here.', 'Everyone doubts themselves. The ones who stay are the ones who play anyway.'],
  Perfectionism:         ['My job is to compete, not to be perfect. Compete.', 'Excellence is built from imperfect reps. Keep going.'],
  'Loss of Control':     ['I cannot control the situation. I can control my next action.', 'Chaos is where competitors separate themselves. This is my moment.'],
}

const RESET_OPTIONS = [
  { id: 'breath',  label: 'The Breath',      desc: 'Two box breaths (4 in, 4 hold, 4 out)' },
  { id: 'focal',   label: 'The Focal Point', desc: 'Fix your eyes on one specific object to zoom in and reset' },
  { id: 'touch',   label: 'The Touch',       desc: 'Adjust your gear, tap your helmet, wipe your shoes' },
  { id: 'custom',  label: 'Custom',          desc: 'Write your own physical reset' },
]

const GO_EXAMPLES = [
  { old: 'Hiding in the corner.',              next: 'Sprinting to the open spot and calling for the ball.' },
  { old: 'Forcing a pass into double coverage.',next: 'Going through the read progression and hitting the check-down.' },
  { old: 'Going quiet and withdrawing.',        next: 'Calling for the ball and communicating with teammates.' },
]

// ── Screen keys ───────────────────────────────────────────────
const S = {
  LIST: 'list', NAME: 'name',
  STEP1: 'step1', STEP2: 'step2', STEP3: 'step3',
  REVIEW: 'review', DONE: 'done', VIEW: 'view', DETAIL: 'detail',
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'approved') return <span className="pill pill-green">Approved</span>
  if (status === 'returned') return <span className="pill pill-red">Returned</span>
  return <span className="pill pill-amber">Pending Review</span>
}

// ── Shared nav ────────────────────────────────────────────────
function Nav({ onBack, label = 'Performance Cycle' }) {
  const goHome = useHome()
  return (
    <nav>
      <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
      <div className="ntag">{label}</div>
      {onBack && <button className="btn bo bsm" onClick={onBack}>← Back</button>}
    </nav>
  )
}

// ── Step 1 ────────────────────────────────────────────────────
function Step1({ trigger, fearCategory, setFearCategory, anchorStatement, setAnchorStatement, onBack, onContinue, logoUrl }) {
  return (
    <>
      <Nav onBack={onBack} />
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 24 }} />}

          <div className="pm">
            <div className="pml">Step 1 of 3 — Anchor Statement</div>
            <div className="pt"><div className="pf" style={{ width: '33%' }} /></div>
          </div>

          <div style={{ background: 'var(--d3)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "We aren't going to change the referee calls, the weather, or the scoreboard. We are going to change how you process them so you can stay in the game."
            </p>
          </div>

          {trigger && (
            <div style={{ background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--gl)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                From Your Panic Loop
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', margin: 0 }}>
                Your primary trigger: <strong>{trigger}</strong>
              </p>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>What fear does your trigger activate?</div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 14 }}>Select the one that resonates most.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {FEAR_CATEGORIES.map(fc => (
                <div key={fc.id} className={`choice${fearCategory === fc.id ? ' sel' : ''}`}
                  onClick={() => setFearCategory(fc.id)}>
                  <div className="chk" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{fc.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>{fc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {fearCategory && (
            <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#43B878', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
                Example Truth Statements — {fearCategory}
              </div>
              {FEAR_EXAMPLES[fearCategory]?.map((ex, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i === 0 ? 8 : 0 }}>
                  <span style={{ color: 'var(--gl)', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
                  <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{ex}"</p>
                </div>
              ))}
              <div style={{ marginTop: 10, borderTop: '1px solid var(--bdr)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.6 }}>
                  Rules: <strong style={{ color: 'var(--w)' }}>Objectively true</strong> — based on facts and training, not wishful thinking ·
                  Must <strong style={{ color: 'var(--w)' }}>directly contradict your fear</strong> ·
                  <strong style={{ color: 'var(--w)' }}> Keep it short</strong> — say it in the middle of a game
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {trigger
                ? <>When <strong>"{trigger}"</strong> happens, the truth is:</>
                : <>When my trigger happens, the truth is:</>
              }
            </div>
            <textarea
              value={anchorStatement}
              onChange={e => setAnchorStatement(e.target.value)}
              placeholder="Write your truth statement here…"
              style={{ minHeight: 90 }}
            />
          </div>

          <button className="btn bp bfw" onClick={onContinue}
            disabled={!fearCategory || !anchorStatement.trim()}>
            Continue → Step 2
          </button>
        </div>
      </div>
    </>
  )
}

// ── Step 2 ────────────────────────────────────────────────────
function Step2({ physicalResetType, setPhysicalResetType, physicalReset, setPhysicalReset, onBack, onContinue, logoUrl }) {
  function selectOption(opt) {
    setPhysicalResetType(opt.id)
    if (opt.id !== 'custom') setPhysicalReset(opt.desc)
    else setPhysicalReset('')
  }

  return (
    <>
      <Nav onBack={onBack} />
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 24 }} />}

          <div className="pm">
            <div className="pml">Step 2 of 3 — Physical Reset</div>
            <div className="pt"><div className="pf" style={{ width: '66%' }} /></div>
          </div>

          <div style={{ background: 'var(--d3)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "In your Panic Loop, your body speeds up — tightness, racing heart. In the Performance Loop, we manually override the nervous system to signal safety."
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Choose your physical anchor:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {RESET_OPTIONS.map(opt => (
                <div key={opt.id}
                  onClick={() => selectOption(opt)}
                  style={{
                    padding: '14px 15px', borderRadius: 9, cursor: 'pointer',
                    background: physicalResetType === opt.id ? 'rgba(26,122,74,.12)' : 'var(--d3)',
                    border: `1px solid ${physicalResetType === opt.id ? 'var(--gl)' : 'var(--bdr)'}`,
                    transition: 'all .15s',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4,
                    color: physicalResetType === opt.id ? 'var(--w)' : 'var(--mid)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.5 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              After I say my Truth, I will physically:
            </div>
            <textarea
              value={physicalReset}
              onChange={e => setPhysicalReset(e.target.value)}
              placeholder="Describe your physical reset…"
              style={{ minHeight: 90 }}
            />
          </div>

          <button className="btn bp bfw" onClick={onContinue}
            disabled={!physicalResetType || !physicalReset.trim()}>
            Continue → Step 3
          </button>
        </div>
      </div>
    </>
  )
}

// ── Step 3 ────────────────────────────────────────────────────
function Step3({ behavior, goMove, setGoMove, onBack, onContinue, logoUrl }) {
  return (
    <>
      <Nav onBack={onBack} />
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 24 }} />}

          <div className="pm">
            <div className="pml">Step 3 of 3 — The Go Move</div>
            <div className="pt"><div className="pf" style={{ width: '100%' }} /></div>
          </div>

          <div style={{ background: 'var(--d3)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              "In your Panic Loop, you coped — flight, freeze, or fight. In the Performance Loop, you act with intention. This is about guaranteeing you play the right way, not guaranteeing the outcome."
            </p>
          </div>

          {behavior && (
            <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#e05a4a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                From Your Panic Loop
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', margin: 0 }}>
                Your old behavior: <strong>{behavior}</strong>
              </p>
            </div>
          )}

          <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#43B878', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
              Examples — Old vs. New
            </div>
            {GO_EXAMPLES.map((ex, i) => (
              <div key={i} style={{ marginBottom: i < GO_EXAMPLES.length - 1 ? 10 : 0 }}>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginBottom: 2 }}>
                  <span style={{ color: '#e05a4a' }}>Old:</span> {ex.old}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mid)' }}>
                  <span style={{ color: 'var(--gl)' }}>New:</span> {ex.next}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>My responsible action is:</div>
            <textarea
              value={goMove}
              onChange={e => setGoMove(e.target.value)}
              placeholder="Describe the specific action you commit to…"
              style={{ minHeight: 90 }}
            />
          </div>

          <button className="btn bp bfw" onClick={onContinue} disabled={!goMove.trim()}>
            Review My Cycle →
          </button>
        </div>
      </div>
    </>
  )
}

// ── Review screen ─────────────────────────────────────────────
function ReviewScreen({ trigger, cycleName, fearCategory, anchorStatement, physicalReset, goMove, saving, onEditStep, onSubmit, onBack, logoUrl }) {
  return (
    <>
      <Nav onBack={onBack} />
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 24 }} />}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Review Your Cycle
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{cycleName}</h2>
          </div>

          {[
            {
              step: 'Step 1', label: 'My Truth',
              preview: trigger ? `When "${trigger}" happens, the truth is: ${anchorStatement}` : `The truth is: ${anchorStatement}`,
              editStep: 1,
            },
            {
              step: 'Step 2', label: 'My Reset',
              preview: `After I say my Truth, I will physically: ${physicalReset}`,
              editStep: 2,
            },
            {
              step: 'Step 3', label: 'My Go Move',
              preview: `My responsible action is: ${goMove}`,
              editStep: 3,
            },
          ].map(({ step, label, preview, editStep }) => (
            <div key={step} style={{
              background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 10,
              padding: '16px 18px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#43B878', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {step} — {label}
                  </span>
                </div>
                <button onClick={() => onEditStep(editStep)}
                  style={{ fontSize: 11, color: 'var(--mid)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                  Edit
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                {preview}
              </p>
            </div>
          ))}

          <div style={{ marginTop: 8, padding: '12px 16px', background: 'var(--d3)', borderRadius: 8, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--mid)' }}>
              Fear addressed: <span style={{ color: 'var(--w)' }}>{fearCategory}</span>
            </div>
          </div>

          <button className="btn bp bfw" onClick={onSubmit} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit for Review →'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Done screen ───────────────────────────────────────────────
function DoneScreen({ cycleName, onBackToList, logoUrl }) {
  const goHome = useHome()
  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Performance Cycle</div>
      </nav>
      <div className="cw">
        <div className="box" style={{ textAlign: 'center' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', margin: '0 auto 20px' }} />}
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ marginBottom: 8 }}>{cycleName}</h2>
          <p>Your Performance Cycle has been submitted. Your RPM practitioner will review and sign off shortly.</p>
          <button className="btn bp bfw" onClick={onBackToList} style={{ marginTop: 8 }}>
            ← Back to My Cycles
          </button>
        </div>
      </div>
    </>
  )
}

// ── Cycle list ────────────────────────────────────────────────
function CycleList({ cycles, loading, onNew, onView, onRevise, onBack, logoUrl }) {
  return (
    <>
      <Nav onBack={onBack} />
      <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 24 }} />}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>My Performance Cycles</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--mid)' }}>
                Build your personal performance system.
              </p>
            </div>
            <button className="btn bp bsm" onClick={onNew}>+ New Cycle</button>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : cycles.length === 0 ? (
            <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🔄</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No cycles yet</div>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20, lineHeight: 1.6 }}>
                Build your first Performance Cycle — a personal system for staying in the game when things get hard.
              </p>
              <button className="btn bp" onClick={onNew}>Build My First Cycle →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cycles.map(c => (
                <div key={c.id} style={{
                  background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 10,
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{c.cycle_name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mid)' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {c.fear_category}
                      </div>
                      {c.status === 'returned' && c.practitioner_note && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#e05a4a', lineHeight: 1.5 }}>
                          Feedback: {c.practitioner_note.length > 100 ? c.practitioner_note.slice(0, 100) + '…' : c.practitioner_note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {c.status === 'returned' && (
                        <button className="btn bp bsm" onClick={() => onRevise(c)}>Revise</button>
                      )}
                      <button className="btn bo bsm" onClick={() => onView(c)}>
                        {c.status === 'approved' ? 'View →' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────
export default function CycleFlow({ team, athlete, panicIntake, onBack }) {
  const [screen, setScreen] = useState(S.LIST)
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [viewCycle, setViewCycle] = useState(null)
  const [reviewMode, setReviewMode] = useState(false) // true = editing from review screen
  const [saving, setSaving] = useState(false)

  // Form state
  const [cycleName, setCycleName]               = useState('')
  const [fearCategory, setFearCategory]         = useState(null)
  const [anchorStatement, setAnchorStatement]   = useState('')
  const [physicalResetType, setPhysicalResetType] = useState(null)
  const [physicalReset, setPhysicalReset]       = useState('')
  const [goMove, setGoMove]                     = useState('')

  const trigger  = panicIntake?.q1_trigger  || null
  const behavior = panicIntake?.q8_behavior || null

  useEffect(() => { loadCycles() }, [])

  async function loadCycles() {
    setLoading(true)
    try { setCycles(await fetchPerformanceCycles(athlete.id, team.id)) } catch {}
    setLoading(false)
  }

  function resetForm() {
    setEditingId(null); setCycleName(''); setFearCategory(null)
    setAnchorStatement(''); setPhysicalResetType(null); setPhysicalReset(''); setGoMove('')
    setReviewMode(false)
  }

  function startNew() {
    resetForm()
    setScreen(S.NAME)
  }

  function startRevise(cycle) {
    setEditingId(cycle.id)
    setCycleName(cycle.cycle_name)
    setFearCategory(cycle.fear_category)
    setAnchorStatement(cycle.anchor_statement)
    setPhysicalResetType(cycle.physical_reset_type)
    setPhysicalReset(cycle.physical_reset)
    setGoMove(cycle.go_move)
    setReviewMode(false)
    setScreen(S.NAME)
  }

  function handleEditStep(stepNum) {
    setReviewMode(true)
    if (stepNum === 1) setScreen(S.STEP1)
    else if (stepNum === 2) setScreen(S.STEP2)
    else setScreen(S.STEP3)
  }

  function continueStep1() {
    setScreen(reviewMode ? S.REVIEW : S.STEP2)
    setReviewMode(false)
  }

  function continueStep2() {
    setScreen(reviewMode ? S.REVIEW : S.STEP3)
    setReviewMode(false)
  }

  function continueStep3() {
    setReviewMode(false)
    setScreen(S.REVIEW)
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const payload = { cycleName, fearCategory, anchorStatement, physicalReset, physicalResetType, goMove }
      if (editingId) {
        await resubmitPerformanceCycle(editingId, payload)
      } else {
        await submitPerformanceCycle({ athleteId: athlete.id, teamId: team.id, ...payload })
      }
      await loadCycles()
      setScreen(S.DONE)
    } catch {}
    setSaving(false)
  }

  // ── Screen routing ─────────────────────────────────────────

  if (screen === S.LIST) return (
    <CycleList
      cycles={cycles} loading={loading}
      logoUrl={team?.logo_url}
      onNew={startNew}
      onView={c => { setViewCycle(c); setScreen(S.VIEW) }}
      onRevise={c => startRevise(c)}
      onBack={onBack}
    />
  )

  if (screen === S.VIEW) return (
    <CycleDocumentScreen
      cycle={viewCycle}
      logoUrl={team?.logo_url}
      onBack={() => setScreen(S.LIST)}
    />
  )

  if (screen === S.NAME) return (
    <CycleNameScreen
      initialName={cycleName}
      onBack={() => { resetForm(); setScreen(S.LIST) }}
      onContinue={name => { setCycleName(name); setScreen(S.STEP1) }}
    />
  )

  if (screen === S.STEP1) return (
    <Step1
      trigger={trigger}
      fearCategory={fearCategory} setFearCategory={setFearCategory}
      anchorStatement={anchorStatement} setAnchorStatement={setAnchorStatement}
      onBack={() => setScreen(reviewMode ? S.REVIEW : S.NAME)}
      onContinue={continueStep1}
      logoUrl={team?.logo_url}
    />
  )

  if (screen === S.STEP2) return (
    <Step2
      physicalResetType={physicalResetType} setPhysicalResetType={setPhysicalResetType}
      physicalReset={physicalReset} setPhysicalReset={setPhysicalReset}
      onBack={() => setScreen(reviewMode ? S.REVIEW : S.STEP1)}
      onContinue={continueStep2}
      logoUrl={team?.logo_url}
    />
  )

  if (screen === S.STEP3) return (
    <Step3
      behavior={behavior}
      goMove={goMove} setGoMove={setGoMove}
      onBack={() => setScreen(reviewMode ? S.REVIEW : S.STEP2)}
      onContinue={continueStep3}
      logoUrl={team?.logo_url}
    />
  )

  if (screen === S.REVIEW) return (
    <ReviewScreen
      trigger={trigger}
      cycleName={cycleName} fearCategory={fearCategory}
      anchorStatement={anchorStatement} physicalReset={physicalReset} goMove={goMove}
      saving={saving}
      onEditStep={handleEditStep}
      onSubmit={handleSubmit}
      onBack={() => setScreen(S.STEP3)}
      logoUrl={team?.logo_url}
    />
  )

  if (screen === S.DONE) return (
    <DoneScreen
      cycleName={cycleName}
      onBackToList={() => { resetForm(); setScreen(S.LIST) }}
      logoUrl={team?.logo_url}
    />
  )

  return null
}
