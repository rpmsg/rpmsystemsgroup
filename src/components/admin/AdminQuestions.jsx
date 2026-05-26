import { useState, useEffect } from 'react'
import {
  fetchQuestionList, createQuestion, saveQuestion,
  deactivateQuestion, restoreQuestion, fetchTeamsWithCompletions,
} from '../../lib/adminApi'

// ── Constants ──────────────────────────────────────────────────

const SM_POS_DIMS  = ['Trust','Communication','Safety','Positive Influence','Effectiveness','Decision Trust','Understanding','Most Interaction','Positive Environment']
const SM_NEG_DIMS  = ['Least Connected','Least Interaction','Hard to Communicate']
const PC_DIMS      = ['Trigger','First Signal','Emotions','Inner Voice','Identity','Body Response','Reaction','Behavior','Your Pattern','Outcome','Aftermath']

function genKey(surveyType, setNumber) {
  const ts = Date.now().toString(36)
  return surveyType === 'panic_cycle' ? `pc_${ts}` : `sm${setNumber}_${ts}`
}

// ── Methodology impact computation ────────────────────────────

function computeImpact(originalQ, draft, draftOptions, teamsWithData, allSMQuestions) {
  if (!draft) return null
  const isPanic = draft.survey_type === 'panic_cycle'

  if (isPanic) {
    return {
      level: 'green',
      header: 'No impact on scoring',
      sections: [{
        type: 'scoring', title: 'No Scoring Impact',
        body: 'Panic Cycle questions are used for qualitative profiling only. They do not affect social map scores, zone classifications, or the cohesion score. This change has no impact on any calculated metrics.',
      }],
    }
  }

  const isNew        = !originalQ
  const isDeactivating = originalQ && originalQ.is_active && !draft.is_active
  const typeChanged  = originalQ && originalQ.question_type !== draft.question_type
  const textOnly     = !isNew && !isDeactivating && !typeChanged

  const isPos = draft.question_type === 'positive'
  const isNeg = draft.question_type === 'negative'

  let amber = false, red = false
  const sections = []

  // 1. Scoring impact
  let scoringBody = ''
  if (isNew && isPos) {
    scoringBody = 'Adding a positive question increases the maximum possible positive mention count per player. Team averages will rise proportionally. Zone classifications will recalculate automatically for all players when the next administration is processed. No historical data is affected.'
    amber = true
  } else if (isNew && isNeg) {
    scoringBody = 'Adding a negative question increases the maximum possible friction score per player. Team friction averages will rise. This may cause some players currently classified as Core Influencer or Isolation Risk to shift toward Polarizing Figure or Rejection Risk when the next administration is processed.'
    amber = true
  } else if (isDeactivating && isPos) {
    scoringBody = 'Removing this question reduces the positive mention pool. Team averages will decrease. Players near the average boundary may shift zone classifications when scores are next calculated.'
    amber = true
  } else if (isDeactivating && isNeg) {
    scoringBody = 'Removing this question reduces the friction score pool. Players currently in Rejection Risk or Polarizing Figure zones may shift to lower friction zones when scores are next recalculated.'
    amber = true
  } else if (typeChanged) {
    scoringBody = `Changing this question from ${originalQ.question_type} to ${draft.question_type} shifts how nominations are counted. Both positive and negative mention averages will be affected. Zone classifications may change for multiple players.`
    amber = true
  } else {
    scoringBody = 'Editing question text does not change how responses are counted. Zone classifications are not affected by this type of change.'
  }
  sections.push({ type: 'scoring', title: 'Scoring Impact', body: scoringBody })

  // 2. Zone classification
  sections.push({
    type: 'zone', title: 'Zone Classification',
    body: 'Zone classification is dynamic — Core Influencer, Polarizing Figure, Rejection Risk, and Isolation Risk are assigned based on whether each player\'s mention counts are above or below the current team average. There are no fixed thresholds. Adding or removing questions shifts team averages which causes zone classifications to recalculate for all players automatically.',
  })

  // 3. Data comparability — check affected administration
  const relevantAdmin = draft.set_number === 2 ? 2 : 1
  const affectedTeams = teamsWithData.filter(t => t.completedAdministrations.includes(relevantAdmin))
  if (affectedTeams.length > 0 && (isNew || isDeactivating || typeChanged)) {
    red = true
    sections.push({ type: 'comparability', title: '⚠ Data Comparability Alert', teams: affectedTeams, admin: relevantAdmin })
  }

  // 4. Dimension impact
  if (draft.dimension) {
    const others = allSMQuestions.filter(q => q.dimension === draft.dimension && q.is_active && q.id !== originalQ?.id)
    const currentCount = others.length + (originalQ && originalQ.is_active ? 1 : 0)
    const afterCount   = isDeactivating ? currentCount - 1 : isNew ? currentCount + 1 : currentCount

    let dimBody = `The ${draft.dimension} dimension currently has ${currentCount} question${currentCount !== 1 ? 's' : ''} across Set 1 and Set 2.`
    if (afterCount > currentCount) {
      dimBody += ` After this change: ${afterCount} questions will measure ${draft.dimension}. Increased measurement confidence for this dimension.`
    } else if (afterCount < currentCount) {
      dimBody += ` After this change: ${afterCount} question${afterCount !== 1 ? 's' : ''} will measure ${draft.dimension}.`
      dimBody += afterCount === 0
        ? ' This dimension will no longer be measured. Consider whether this affects your methodology.'
        : ' Reduced measurement confidence for this dimension.'
    }
    sections.push({ type: 'dimension', title: 'Dimension Impact', body: dimBody })
  }

  // 5. Friction proximity (negative questions)
  if (isNeg && (isNew || isDeactivating)) {
    sections.push({
      type: 'friction', title: 'Friction Proximity Impact',
      body: 'Friction proximity (High/Moderate/Low) is calculated using negative nominations. ' +
        (isNew
          ? 'Adding a negative question increases the number of ways two players can receive a High proximity rating. This may increase the frequency of Friction Risk relationship classifications in the player comparison tool.'
          : 'Removing this negative question reduces the number of ways two players can receive a High proximity rating.'),
    })
  }

  const level  = red ? 'red' : amber ? 'amber' : 'green'
  const header = red   ? 'High impact — data comparability affected'
               : amber ? 'Moderate impact — scores will shift'
               : 'No impact on scoring'

  return { level, header, sections }
}

// ── Impact panel ──────────────────────────────────────────────

const LEVEL_COLOR = { green: '#43B878', amber: '#c78b00', red: '#e05a4a' }
const LEVEL_BG    = { green: 'rgba(26,122,74,.12)', amber: 'rgba(199,139,0,.12)', red: 'rgba(192,57,43,.12)' }
const LEVEL_LABEL = { green: '● No scoring impact', amber: '▲ Moderate impact', red: '⚠ High impact' }

function ImpactPanel({ impact, confirmText, setConfirmText, onConfirmSave, saving, saveMsg }) {
  if (!impact) return null
  const { level, header, sections } = impact
  const col = LEVEL_COLOR[level]

  return (
    <div style={{ marginTop: 24, border: `1px solid ${col}30`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ background: `${col}18`, borderBottom: `1px solid ${col}30`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{LEVEL_LABEL[level]}</span>
        <span style={{ fontSize: 12, color: 'var(--mid)' }}>{header}</span>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: i < sections.length - 1 ? 16 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: s.type === 'comparability' ? '#e05a4a' : 'var(--mid)', textTransform: 'uppercase', marginBottom: 6 }}>
              {s.title}
            </div>
            {s.type === 'comparability' ? (
              <div>
                {s.teams.map(t => (
                  <p key={t.id} style={{ fontSize: 12, color: 'var(--w)', marginBottom: 6 }}>
                    <strong>{t.name}</strong> has completed Administration {s.teams.find(x => x.id === t.id) ? s.admin : ''}
                    {' '}data. Changing questions now means future administrations will measure a different question set.
                    Side-by-side comparison between administrations will be flagged as potentially incompatible.
                  </p>
                ))}
                <p style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4 }}>
                  Recommended: make question changes only between seasons, not after any administration has begun collection.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--w)', lineHeight: 1.6 }}>{s.body}</p>
            )}
          </div>
        ))}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bdr)' }}>
          {level === 'green' && (
            <p style={{ fontSize: 12, color: '#43B878', marginBottom: 10 }}>No scoring impact detected. This change is safe to apply.</p>
          )}
          {level === 'amber' && (
            <p style={{ fontSize: 12, color: '#c78b00', marginBottom: 10 }}>This change will affect scoring averages when the next administration is processed. Historical data is not affected.</p>
          )}
          {level === 'red' && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: '#e05a4a', marginBottom: 8 }}>
                This change affects data comparability for teams that have already begun collection. Type CONFIRM to proceed.
              </p>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type CONFIRM"
                style={{ background: 'var(--d3)', border: '1px solid var(--d4)', borderRadius: 6, padding: '7px 12px', color: 'var(--w)', fontFamily: 'inherit', fontSize: 13, outline: 'none', width: 160 }}
              />
            </div>
          )}

          {saveMsg && (
            <div style={{ fontSize: 12, color: saveMsg.includes('fail') || saveMsg.includes('Error') ? 'var(--rl)' : 'var(--gl)', marginBottom: 8 }}>
              {saveMsg}
            </div>
          )}

          <button
            className="btn bsm"
            onClick={onConfirmSave}
            disabled={saving || (level === 'red' && confirmText !== 'CONFIRM')}
            style={{
              background: level === 'red' ? 'var(--r)' : level === 'amber' ? '#c78b00' : 'var(--g)',
              color: '#fff',
              opacity: (saving || (level === 'red' && confirmText !== 'CONFIRM')) ? 0.5 : 1,
              cursor: (saving || (level === 'red' && confirmText !== 'CONFIRM')) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Question editor ───────────────────────────────────────────

function QuestionEditor({ draft, setDraft, draftOptions, setDraftOptions, isNew, onCancel }) {
  const isPanic = draft.survey_type === 'panic_cycle'
  const showOptions = isPanic && draft.input_type !== 'text'

  const dims = isPanic ? PC_DIMS
    : draft.question_type === 'negative' ? SM_NEG_DIMS
    : SM_POS_DIMS

  function updateDraft(key, val) {
    setDraft(d => ({ ...d, [key]: val }))
  }

  function moveOption(i, dir) {
    setDraftOptions(opts => {
      const next = [...opts]
      const j = i + dir
      if (j < 0 || j >= next.length) return opts
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--gl)', textTransform: 'uppercase', marginBottom: 14 }}>
        {isNew ? 'New Question' : 'Edit Question'}
      </div>

      {/* Question text */}
      <div className="fld">
        <label>Question Text</label>
        <textarea
          value={draft.question_text}
          onChange={e => updateDraft('question_text', e.target.value)}
          style={{ minHeight: 70 }}
        />
      </div>

      {/* Subtitle */}
      <div className="fld">
        <label>Sub-text <span style={{ color: 'var(--mid)', fontWeight: 400 }}>(optional)</span></label>
        <input
          value={draft.subtitle || ''}
          onChange={e => updateDraft('subtitle', e.target.value)}
          placeholder="e.g. Select one. / Choose up to two."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Dimension */}
        <div className="fld" style={{ marginBottom: 0 }}>
          <label>Dimension</label>
          <select value={draft.dimension || ''} onChange={e => updateDraft('dimension', e.target.value)}>
            <option value="">Select…</option>
            {dims.map(d => <option key={d} value={d}>{d}</option>)}
            <option value="__custom__">Add new…</option>
          </select>
        </div>
        {draft.dimension === '__custom__' && (
          <div className="fld" style={{ marginBottom: 0 }}>
            <label>New Dimension Name</label>
            <input
              autoFocus
              placeholder="Dimension name"
              onBlur={e => { if (e.target.value.trim()) updateDraft('dimension', e.target.value.trim()) }}
            />
          </div>
        )}

        {/* Social map specific */}
        {!isPanic && (
          <>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Question Type</label>
              <select value={draft.question_type || 'positive'} onChange={e => updateDraft('question_type', e.target.value)}>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Set</label>
              <select value={draft.set_number || 1} onChange={e => updateDraft('set_number', parseInt(e.target.value))}>
                <option value={1}>Set 1 — Administration 1</option>
                <option value={2}>Set 2 — Administration 2</option>
              </select>
            </div>
          </>
        )}

        {/* Panic cycle — input type */}
        {isPanic && (
          <>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Input Type</label>
              <select value={draft.input_type} onChange={e => updateDraft('input_type', e.target.value)}>
                <option value="single">Single choice</option>
                <option value="multi">Multiple choice</option>
                <option value="text">Free text</option>
              </select>
            </div>
            {draft.input_type === 'multi' && (
              <div className="fld" style={{ marginBottom: 0 }}>
                <label>Max Selections</label>
                <input
                  type="number" min="1" max="6"
                  value={draft.max_selections || 2}
                  onChange={e => updateDraft('max_selections', parseInt(e.target.value))}
                />
              </div>
            )}
          </>
        )}

        {/* Display order */}
        <div className="fld" style={{ marginBottom: 0 }}>
          <label>Display Order</label>
          <input
            type="number" min="1"
            value={draft.question_number || ''}
            onChange={e => updateDraft('question_number', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* Options editor (PC only, not text type) */}
      {showOptions && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 10 }}>
            Answer Options
          </div>
          {draftOptions.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button
                  onClick={() => moveOption(i, -1)} disabled={i === 0}
                  style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '1px 4px' }}>
                  ▲
                </button>
                <button
                  onClick={() => moveOption(i, 1)} disabled={i === draftOptions.length - 1}
                  style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: i === draftOptions.length - 1 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '1px 4px' }}>
                  ▼
                </button>
              </div>
              <input
                value={opt}
                onChange={e => setDraftOptions(o => o.map((x, idx) => idx === i ? e.target.value : x))}
                style={{ flex: 1, background: 'var(--d3)', border: '1px solid var(--d4)', borderRadius: 6, padding: '7px 11px', color: 'var(--w)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
              />
              <button
                onClick={() => setDraftOptions(o => o.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--rl)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                ×
              </button>
            </div>
          ))}
          <button
            className="btn bo bsm"
            onClick={() => setDraftOptions(o => [...o, ''])}
            style={{ marginTop: 4 }}>
            + Add Option
          </button>

          {!isPanic && (
            <p style={{ fontSize: 11, color: 'var(--mid)', marginTop: 8 }}>
              Social Map responses use the team roster — no answer options needed.
            </p>
          )}
        </div>
      )}

      {!isPanic && (
        <p style={{ fontSize: 11, color: 'var(--mid)', marginTop: 16 }}>
          Social Map responses use the team roster — athletes select up to 2 teammates per question.
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn bo bsm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Question list item ────────────────────────────────────────

function QuestionItem({ q, onEdit, onDelete, onRestore }) {
  const isPanic = q.survey_type === 'panic_cycle'
  const badgeColor = q.question_type === 'positive' ? '#43B878'
                   : q.question_type === 'negative' ? '#e05a4a'
                   : 'var(--mid)'
  const badge = q.question_type ? q.question_type.toUpperCase() : q.input_type?.toUpperCase()

  return (
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--bdr)',
      opacity: q.is_active ? 1 : 0.45,
      background: 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--mid)', minWidth: 20 }}>Q{q.question_number}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor }}>
              {badge}
            </span>
            {!q.is_active && (
              <span style={{ fontSize: 9, background: 'rgba(255,255,255,.1)', color: 'var(--mid)', borderRadius: 3, padding: '1px 5px' }}>INACTIVE</span>
            )}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--w)', marginBottom: 2 }}>{q.dimension}</div>
          <div style={{ fontSize: 11, color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {q.question_text.slice(0, 65)}{q.question_text.length > 65 ? '…' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {q.is_active ? (
            <>
              <button className="btn bo bsm" onClick={() => onEdit(q)} style={{ padding: '4px 10px', fontSize: 11 }}>Edit</button>
              <button className="btn bsm" onClick={() => onDelete(q)}
                style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: '1px solid rgba(224,90,74,.4)', color: 'var(--rl)', cursor: 'pointer' }}>
                ✕
              </button>
            </>
          ) : (
            <button className="btn bo bsm" onClick={() => onRestore(q)} style={{ padding: '4px 10px', fontSize: 11 }}>Restore</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function AdminQuestions() {
  const [tab, setTab]           = useState('panic_cycle')
  const [smSet, setSmSet]       = useState(1)
  const [showInactive, setShowInactive] = useState(false)
  const [questions, setQuestions]       = useState([])
  const [allSMQuestions, setAllSMQuestions] = useState([])
  const [teamsWithData, setTeamsWithData]   = useState([])
  const [loading, setLoading]   = useState(true)

  const [editing, setEditing]   = useState(null)
  const [isNew, setIsNew]       = useState(false)
  const [draft, setDraft]       = useState(null)
  const [draftOptions, setDraftOptions] = useState([])

  const [impact, setImpact]     = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Load on mount — teams with completions once, questions on tab/set change
  useEffect(() => {
    fetchTeamsWithCompletions().then(setTeamsWithData).catch(() => {})
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [tab, smSet, showInactive])

  async function loadQuestions() {
    setLoading(true)
    try {
      let qs
      if (tab === 'social_map' && smSet === 'both') {
        const [s1, s2] = await Promise.all([fetchQuestionList('social_map', 1), fetchQuestionList('social_map', 2)])
        qs = [...s1, ...s2]
      } else {
        qs = await fetchQuestionList(tab, tab === 'panic_cycle' ? null : smSet)
      }
      setQuestions(qs)

      // Always keep all SM questions for dimension counting in impact
      const [sm1, sm2] = await Promise.all([fetchQuestionList('social_map', 1), fetchQuestionList('social_map', 2)])
      setAllSMQuestions([...sm1, ...sm2])
    } catch {}
    setLoading(false)
  }

  // Recompute impact whenever draft or options change
  useEffect(() => {
    if (!draft) { setImpact(null); return }
    setImpact(computeImpact(editing, draft, draftOptions, teamsWithData, allSMQuestions))
    setConfirmText('')
    setSaveMsg('')
  }, [draft, draftOptions])

  // ── Edit / add helpers ──────────────────────────────────────

  function openEdit(q) {
    setEditing(q)
    setIsNew(false)
    setDraft({
      survey_type:    q.survey_type,
      set_number:     q.set_number,
      question_number: q.question_number,
      dimension:      q.dimension || '',
      question_type:  q.question_type || '',
      input_type:     q.input_type,
      max_selections: q.max_selections || 2,
      question_text:  q.question_text,
      subtitle:       q.subtitle || '',
      is_active:      q.is_active,
    })
    setDraftOptions(
      (q.question_options || [])
        .filter(o => o.is_active)
        .sort((a, b) => a.display_order - b.display_order)
        .map(o => o.option_text)
    )
    setSaveMsg('')
  }

  function openAdd() {
    const setNum = tab === 'panic_cycle' ? null : (smSet === 'both' ? 1 : smSet)
    setEditing(null)
    setIsNew(true)
    setDraft({
      survey_type:    tab,
      set_number:     setNum,
      question_number: questions.filter(q => q.is_active).length + 1,
      dimension:      '',
      question_type:  tab === 'social_map' ? 'positive' : null,
      input_type:     tab === 'panic_cycle' ? 'single' : 'multi',
      max_selections: 2,
      question_text:  '',
      subtitle:       '',
      is_active:      true,
    })
    setDraftOptions([])
    setSaveMsg('')
  }

  function cancelEdit() {
    setEditing(null)
    setIsNew(false)
    setDraft(null)
    setDraftOptions([])
    setImpact(null)
    setSaveMsg('')
  }

  // ── Save ────────────────────────────────────────────────────

  async function handleConfirmSave() {
    if (!draft) return
    setSaving(true); setSaveMsg('')

    const optionTexts = draft.survey_type === 'panic_cycle' && draft.input_type !== 'text'
      ? draftOptions.filter(o => o.trim())
      : null

    const fields = {
      survey_type:    draft.survey_type,
      set_number:     draft.set_number,
      question_number: draft.question_number,
      dimension:      draft.dimension === '__custom__' ? '' : draft.dimension,
      question_type:  draft.question_type || null,
      input_type:     draft.input_type,
      max_selections: draft.input_type === 'multi' ? draft.max_selections : null,
      question_text:  draft.question_text.trim(),
      subtitle:       draft.subtitle?.trim() || null,
      is_active:      draft.is_active,
    }

    try {
      if (isNew) {
        fields.question_key = genKey(draft.survey_type, draft.set_number)
        await createQuestion(fields, optionTexts)
      } else {
        await saveQuestion(editing.id, fields, optionTexts)
      }
      await loadQuestions()
      cancelEdit()
      setSaveMsg('Saved successfully.')
    } catch (e) {
      setSaveMsg('Save failed: ' + (e.message || 'unknown error'))
    }

    setSaving(false)
  }

  // ── Delete / restore ────────────────────────────────────────

  async function handleDelete(q) {
    if (deleteTarget?.id === q.id) {
      try {
        await deactivateQuestion(q.id)
        setDeleteTarget(null)
        if (editing?.id === q.id) cancelEdit()
        await loadQuestions()
      } catch {}
    } else {
      setDeleteTarget(q)
    }
  }

  async function handleRestore(q) {
    try {
      await restoreQuestion(q.id)
      await loadQuestions()
    } catch {}
  }

  // ── Filtered list ───────────────────────────────────────────

  const visible = questions.filter(q => showInactive || q.is_active)

  // ── Render ──────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', gap: 0, margin: '-28px -32px', flex: 1, height: '100%', overflow: 'hidden' }}>

      {/* ── Left panel — question list ──────────────────────── */}
      <div style={{ width: 320, borderRight: '1px solid var(--bdr)', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Survey tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)' }}>
          {[['panic_cycle','Panic Cycle'],['social_map','Social Map']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setEditing(null); setIsNew(false); setDraft(null) }}
              style={{
                flex: 1, padding: '11px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none', borderBottom: tab === id ? '2px solid var(--gl)' : '2px solid transparent',
                color: tab === id ? 'var(--gl)' : 'var(--mid)', fontFamily: 'inherit',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* SM set filter */}
        {tab === 'social_map' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--bdr)' }}>
            {[[1,'Set 1'],[2,'Set 2'],['both','Both']].map(([val, label]) => (
              <button key={val} onClick={() => setSmSet(val)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 11, cursor: 'pointer',
                  background: smSet === val ? 'rgba(26,122,74,.15)' : 'none',
                  border: 'none', color: smSet === val ? 'var(--gl)' : 'var(--mid)', fontFamily: 'inherit',
                }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Show inactive toggle */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <span style={{ fontSize: 11, color: 'var(--mid)', marginLeft: 'auto' }}>
            {visible.length} question{visible.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Question list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24 }}><div className="spinner" /></div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--mid)', fontSize: 12 }}>No questions found.</div>
          ) : (
            visible.map(q => (
              <div key={q.id}>
                {deleteTarget?.id === q.id && (
                  <div style={{ background: 'rgba(192,57,43,.15)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#e05a4a', flex: 1 }}>Remove this question?</span>
                    <button className="btn bsm"
                      onClick={() => handleDelete(q)}
                      style={{ background: 'var(--r)', color: '#fff', padding: '4px 10px', fontSize: 11 }}>
                      Confirm
                    </button>
                    <button className="btn bo bsm" onClick={() => setDeleteTarget(null)} style={{ padding: '4px 10px', fontSize: 11 }}>Cancel</button>
                  </div>
                )}
                <QuestionItem
                  q={q}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div style={{ padding: 12, borderTop: '1px solid var(--bdr)' }}>
          <button className="btn bp bsm bfw" onClick={openAdd}>
            + Add {tab === 'panic_cycle' ? 'Panic Cycle' : 'Social Map'} Question
          </button>
        </div>
      </div>

      {/* ── Right panel — editor + impact ──────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {!draft ? (
          <div style={{ color: 'var(--mid)', fontSize: 13 }}>
            Select a question to edit, or click Add to create a new one.
          </div>
        ) : (
          <>
            <QuestionEditor
              draft={draft}
              setDraft={setDraft}
              draftOptions={draftOptions}
              setDraftOptions={setDraftOptions}
              isNew={isNew}
              onCancel={cancelEdit}
            />
            <ImpactPanel
              impact={impact}
              confirmText={confirmText}
              setConfirmText={setConfirmText}
              onConfirmSave={handleConfirmSave}
              saving={saving}
              saveMsg={saveMsg}
            />
          </>
        )}
      </div>
    </div>
  )
}
