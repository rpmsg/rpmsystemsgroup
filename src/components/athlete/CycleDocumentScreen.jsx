import { useState } from 'react'
import { useHome } from '../../HomeContext'

// ── Ring geometry helpers ─────────────────────────────────────
function toRad(deg) { return deg * Math.PI / 180 }

function onRing(deg, cx, cy, r) {
  const a = toRad(deg)
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function RingArrow({ deg, cx, cy, r, color, size = 9 }) {
  const p = onRing(deg, cx, cy, r)
  const t = toRad(deg + 90)
  const b1x = p.x - size * Math.cos(t) + size * 0.4 * Math.sin(t)
  const b1y = p.y - size * Math.sin(t) - size * 0.4 * Math.cos(t)
  const b2x = p.x - size * Math.cos(t) - size * 0.4 * Math.sin(t)
  const b2y = p.y - size * Math.sin(t) + size * 0.4 * Math.cos(t)
  return <polygon points={`${p.x},${p.y} ${b1x},${b1y} ${b2x},${b2y}`} fill={color} />
}

// ── 3-node performance ring ───────────────────────────────────
const PC_NODES = [
  { lines: ['TRUTH'] },
  { lines: ['RESET'] },
  { lines: ['GO', 'MOVE'] },
]
const PC_MID_ANGLES = [-30, 90, 210]

function PerformanceCycleRing({ selectedIdx, onSelect }) {
  const W = 340, H = 340, CX = 170, CY = 170, R = 110, NR = 46
  const color = '#43B878'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto' }}>
      {/* Ring path */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke={color} strokeWidth="1.5" strokeOpacity="0.22" strokeDasharray="6 5" />

      {/* Directional arrows */}
      {PC_MID_ANGLES.map((a, i) => <RingArrow key={i} deg={a} cx={CX} cy={CY} r={R} color={color} />)}

      {/* Center label */}
      <text x={CX} y={CY - 5} textAnchor="middle" fill={color} fontSize="9" fontWeight="700"
        letterSpacing="2" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.45">
        PERFORMANCE
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fill={color} fontSize="9" fontWeight="700"
        letterSpacing="2" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.45">
        CYCLE
      </text>

      {/* Nodes */}
      {PC_NODES.map(({ lines }, i) => {
        const p = onRing(-90 + i * 120, CX, CY, R)
        const sel = i === selectedIdx
        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r={NR}
              fill={sel ? color : '#141414'} stroke={color} strokeWidth={sel ? 0 : 1.5} />
            {lines.length === 2 ? (
              <>
                <text x={p.x} y={p.y - 3} textAnchor="middle"
                  fill={sel ? '#0a2e18' : color} fontSize="11" fontWeight="800"
                  fontFamily="system-ui, -apple-system, sans-serif">{lines[0]}</text>
                <text x={p.x} y={p.y + 12} textAnchor="middle"
                  fill={sel ? '#0a2e18' : color} fontSize="11" fontWeight="800"
                  fontFamily="system-ui, -apple-system, sans-serif">{lines[1]}</text>
              </>
            ) : (
              <text x={p.x} y={p.y + 5} textAnchor="middle"
                fill={sel ? '#0a2e18' : color} fontSize="11" fontWeight="800"
                fontFamily="system-ui, -apple-system, sans-serif">{lines[0]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'approved') return <span className="pill pill-green">Approved</span>
  if (status === 'returned') return <span className="pill pill-red">Returned for Revision</span>
  return <span className="pill pill-amber">Pending Review</span>
}

// ── Main export ───────────────────────────────────────────────
export default function CycleDocumentScreen({ cycle, onBack, logoUrl }) {
  const goHome = useHome()
  const [selectedIdx, setSelectedIdx] = useState(0)

  const isApproved = cycle.status === 'approved'
  const isReturned = cycle.status === 'returned'

  const createdDate = new Date(cycle.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const steps = [
    { label: 'My Truth',   value: cycle.anchor_statement },
    { label: 'My Reset',   value: cycle.physical_reset },
    { label: 'My Go Move', value: cycle.go_move },
  ]

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Performance Cycle</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw" style={{ alignItems: 'flex-start', padding: '40px 24px' }}>
        <div style={{ maxWidth: 560, width: '100%', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 20 }} />}
            <div style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
              Performance Cycle · {createdDate}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{cycle.cycle_name}</h2>
              <StatusBadge status={cycle.status} />
            </div>
          </div>

          {/* Returned feedback */}
          {isReturned && cycle.practitioner_note && (
            <div style={{ background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.35)', borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e05a4a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Practitioner Feedback — Action Required
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>{cycle.practitioner_note}</p>
            </div>
          )}

          {/* Approved note */}
          {isApproved && cycle.practitioner_note && (
            <div style={{ background: 'rgba(26,122,74,.1)', border: '1px solid rgba(26,122,74,.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gl)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Practitioner Note
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>{cycle.practitioner_note}</p>
            </div>
          )}

          {/* Approved: interactive ring */}
          {isApproved && (
            <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '28px 20px 20px', marginBottom: 20 }}>
              <PerformanceCycleRing selectedIdx={selectedIdx} onSelect={setSelectedIdx} />
              <div style={{ marginTop: 18, background: 'rgba(26,122,74,.08)', border: '1px solid rgba(26,122,74,.2)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#43B878', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
                  {steps[selectedIdx].label}
                </div>
                <p style={{ fontSize: 14, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                  {steps[selectedIdx].value}
                </p>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--mid)', textAlign: 'center' }}>
                Tap a node to view each step
              </div>
            </div>
          )}

          {/* Pending / Returned: text summary */}
          {!isApproved && (
            <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--bdr)', background: 'var(--d3)' }}>
                <div style={{ fontSize: 11, color: 'var(--mid)' }}>
                  {isReturned
                    ? 'Review the feedback above, then use the Revise button to update your cycle.'
                    : 'Your RPM practitioner will review and sign off on this cycle shortly.'}
                </div>
              </div>
              {steps.map(({ label, value }, i) => (
                <div key={i} style={{ padding: '16px 22px', borderBottom: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#43B878', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                    Step {i + 1} — {label}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 24 }}>
            Fear addressed: <span style={{ color: 'var(--w)' }}>{cycle.fear_category}</span>
          </div>

          <button className="btn bo" onClick={onBack}>← Back to My Cycles</button>
        </div>
      </div>
    </>
  )
}
