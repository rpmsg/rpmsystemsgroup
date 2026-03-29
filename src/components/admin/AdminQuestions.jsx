import { useState, useEffect } from 'react'
import { PC_QUESTIONS, SM_QUESTIONS } from '../athlete/questions'
import { fetchCustomQuestions, saveCustomQuestion, resetCustomQuestion } from '../../lib/adminApi'

function buildOverrideMap(customs) {
  const map = {}
  customs.forEach(c => { map[c.question_id] = c })
  return map
}

function effectiveQuestion(q, overrides) {
  const o = overrides[q.id]
  if (!o) return q
  return {
    ...q,
    ...(o.meta          && { meta: o.meta }),
    ...(o.question_text && { q:    o.question_text }),
    ...(o.sub_text      && { sub:  o.sub_text }),
    ...(o.choices       && Array.isArray(o.choices) && o.choices.length && { choices: o.choices }),
  }
}

function QuestionCard({ q, overrides, onSave, onReset }) {
  const isOverridden = !!overrides[q.id]
  const effective = effectiveQuestion(q, overrides)

  const [open, setOpen]         = useState(false)
  const [meta, setMeta]         = useState(effective.meta || '')
  const [text, setText]         = useState(effective.q)
  const [sub, setSub]           = useState(effective.sub || '')
  const [choices, setChoices]   = useState(effective.choices ? [...effective.choices] : null)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  function resetDraft() {
    const e = effectiveQuestion(q, overrides)
    setMeta(e.meta || '')
    setText(e.q)
    setSub(e.sub || '')
    setChoices(e.choices ? [...e.choices] : null)
    setMsg('')
  }

  // Re-sync when overrides change externally
  useEffect(() => {
    if (!open) resetDraft()
  }, [overrides, open])

  async function handleSave() {
    setSaving(true); setMsg('')
    const fields = {
      meta:          meta.trim(),
      question_text: text.trim(),
      sub_text:      sub.trim(),
      choices:       choices ? choices.filter(c => c.trim()) : null,
    }
    try {
      await onSave(q.id, fields)
      setMsg('Saved.')
    } catch (e) {
      setMsg('Save failed.')
    }
    setSaving(false)
  }

  async function handleReset() {
    setSaving(true); setMsg('')
    try {
      await onReset(q.id)
      setMsg('Reset to default.')
    } catch {
      setMsg('Reset failed.')
    }
    setSaving(false)
  }

  function updateChoice(i, val) {
    setChoices(cs => cs.map((c, idx) => idx === i ? val : c))
  }
  function addChoice() { setChoices(cs => [...cs, '']) }
  function removeChoice(i) { setChoices(cs => cs.filter((_, idx) => idx !== i)) }

  return (
    <div style={{ background: 'var(--d2)', border: `1px solid ${isOverridden ? 'rgba(26,122,74,.4)' : 'var(--bdr)'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>

      {/* Header row */}
      <div
        onClick={() => { setOpen(o => !o); if (!open) resetDraft() }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--mid)', minWidth: 28 }}>Q{q.n}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isOverridden ? 'var(--gl)' : 'var(--w)' }}>
              {effective.meta}
              {isOverridden && <span style={{ fontSize: 10, background: 'rgba(26,122,74,.2)', color: 'var(--gl)', borderRadius: 4, padding: '1px 6px', marginLeft: 8 }}>EDITED</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2, maxWidth: 480 }}>{effective.q}</div>
          </div>
        </div>
        <span style={{ color: 'var(--mid)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Editor */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--bdr)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Section Label (meta)</label>
              <input value={meta} onChange={e => setMeta(e.target.value)} />
            </div>
            <div className="fld" style={{ marginBottom: 0 }}>
              <label>Sub-text</label>
              <input value={sub} onChange={e => setSub(e.target.value)} placeholder="e.g. Select one." />
            </div>
          </div>

          <div className="fld" style={{ marginTop: 12 }}>
            <label>Question Text</label>
            <textarea value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 60, marginBottom: 0 }} />
          </div>

          {choices !== null && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 8 }}>Choices</div>
              {choices.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input
                    value={c}
                    onChange={e => updateChoice(i, e.target.value)}
                    style={{ flex: 1, background: 'var(--d3)', border: '1px solid var(--d4)', borderRadius: 6, padding: '8px 12px', color: 'var(--w)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                  />
                  <button
                    onClick={() => removeChoice(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--rl)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                    ×
                  </button>
                </div>
              ))}
              <button className="btn bo bsm" onClick={addChoice} style={{ marginTop: 4 }}>+ Add Choice</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button className="btn bp bsm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            {isOverridden && (
              <button className="btn bo bsm" onClick={handleReset} disabled={saving}>Reset to Default</button>
            )}
            {msg && <span style={{ fontSize: 12, color: msg.includes('fail') ? 'var(--rl)' : 'var(--gl)' }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminQuestions() {
  const [overrides, setOverrides] = useState({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const customs = await fetchCustomQuestions()
      setOverrides(buildOverrideMap(customs))
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleSave(questionId, fields) {
    await saveCustomQuestion(questionId, fields)
    const customs = await fetchCustomQuestions()
    setOverrides(buildOverrideMap(customs))
  }

  async function handleReset(questionId) {
    await resetCustomQuestion(questionId)
    const customs = await fetchCustomQuestions()
    setOverrides(buildOverrideMap(customs))
  }

  if (loading) return <div className="spinner" />

  const editedCount = Object.keys(overrides).length

  return (
    <div>
      <div className="sh" style={{ marginBottom: 16 }}>
        <div className="stit">Assessment Questions</div>
      </div>

      {editedCount > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          {editedCount} question{editedCount !== 1 ? 's' : ''} have been customised. Athletes will see your edited versions.
        </div>
      )}

      <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--gl)', textTransform: 'uppercase', marginBottom: 10 }}>
        Part 1 — Panic Cycle ({PC_QUESTIONS.length} questions)
      </div>

      {PC_QUESTIONS.map(q => (
        <QuestionCard key={q.id} q={q} overrides={overrides} onSave={handleSave} onReset={handleReset} />
      ))}

      <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--gl)', textTransform: 'uppercase', marginBottom: 10, marginTop: 24 }}>
        Part 2 — Social Map ({SM_QUESTIONS.length} questions)
      </div>

      {SM_QUESTIONS.map(q => (
        <QuestionCard key={q.id} q={q} overrides={overrides} onSave={handleSave} onReset={handleReset} />
      ))}
    </div>
  )
}
