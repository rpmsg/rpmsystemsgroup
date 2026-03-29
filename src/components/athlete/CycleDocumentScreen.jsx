import { useState, useEffect } from 'react'
import { fetchCycleDocument } from '../../lib/cycleApi'

const SECTIONS = [
  { key: 'trigger',       icon: '⚡', label: 'Trigger',             sub: 'What sets me off'              },
  { key: 'emotions',      icon: '🧠', label: 'Emotional Response',   sub: 'How I feel in the moment'      },
  { key: 'body_response', icon: '💢', label: 'Physical Response',    sub: 'What happens in my body'       },
  { key: 'behavior',      icon: '🔄', label: 'Behavioral Response',  sub: 'What I do when it hits'        },
  { key: 'aftermath',     icon: '🌊', label: 'Aftermath',            sub: 'How it typically resolves'     },
]

export default function CycleDocumentScreen({ athlete, team, onHome }) {
  const [doc, setDoc]       = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCycleDocument(athlete.id, team.id)
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false))
  }, [athlete.id, team.id])

  const releasedDate = doc?.released_at
    ? new Date(doc.released_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  if (loading) return (
    <>
      <nav><img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} /><div className="ntag">My Cycle</div></nav>
      <div className="cw"><div className="spinner" /></div>
    </>
  )

  // No document or not released yet
  if (!doc || !doc.released) return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">My Cycle</div>
        <button className="btn bo bsm" onClick={onHome}>← Home</button>
      </nav>
      <div className="cw">
        <div className="box" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🔄</div>
          <h2 style={{ marginBottom: 12 }}>Cycle in Review</h2>
          <p style={{ color: 'var(--mid)', fontSize: 14, lineHeight: 1.7, maxWidth: 380, margin: '0 auto 24px' }}>
            Your panic cycle document is currently in review. You'll be able to access it here once it has been released to you.
          </p>
          <button className="btn bo" onClick={onHome}>← Back to Home</button>
        </div>
      </div>
    </>
  )

  // Released — show full document
  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{height:36}} />
        <div className="ntag">My Cycle</div>
        <button className="btn bo bsm" onClick={onHome}>← Home</button>
      </nav>
      <div className="cw">
        <div className="box" style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* Document header */}
          <div style={{ borderBottom: '1px solid var(--bdr)', paddingBottom: 20, marginBottom: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'var(--mid)', textTransform: 'uppercase', marginBottom: 10 }}>
              RPM Systems Group · Panic Cycle Profile
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{athlete.full_name}</h2>
            <p style={{ color: 'var(--mid)', fontSize: 13 }}>
              {team.name}
              {releasedDate && <span> · Released {releasedDate}</span>}
            </p>
          </div>

          {/* Intro */}
          <div style={{ background: 'var(--d3)', borderRadius: 10, padding: '16px 18px', marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.7, margin: 0 }}>
              Your panic cycle is the pattern your mind and body follow when you face pressure or adversity. Understanding it is the first step to breaking it. This document reflects your responses and your coach's review — use it as a reference before and after high-pressure moments.
            </p>
          </div>

          {/* Cycle sections */}
          {SECTIONS.map((s, i) => (
            <div key={s.key} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--d3)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16, flexShrink: 0
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gl)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Step {i + 1} — {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid)' }}>{s.sub}</div>
                </div>
              </div>
              <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '14px 16px', marginLeft: 42 }}>
                <p style={{ fontSize: 14, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                  {doc[s.key] || <span style={{ color: 'var(--mid)', fontStyle: 'italic' }}>Not yet completed</span>}
                </p>
              </div>
            </div>
          ))}

          {/* Coaching note */}
          {doc.coaching_note && (
            <div style={{ marginTop: 28, borderTop: '1px solid var(--bdr)', paddingTop: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f0b030', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                ✏ Coaching Note
              </div>
              <div style={{ background: 'var(--d3)', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #f0b030' }}>
                <p style={{ fontSize: 14, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                  {doc.coaching_note}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 32, borderTop: '1px solid var(--bdr)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--mid)', margin: 0 }}>
              🔒 Personal and confidential — for your use only
            </p>
            <button className="btn bo bsm" onClick={onHome}>← Home</button>
          </div>

        </div>
      </div>
    </>
  )
}
