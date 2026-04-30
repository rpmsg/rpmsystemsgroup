import { useHome } from '../../HomeContext'

// ── SVG circular diagram (approved cycles only) ───────────────
const CX = 260, CY = 240, R = 150, NR = 70

function nodePos(angleDeg) {
  const r = angleDeg * Math.PI / 180
  return { x: CX + R * Math.cos(r), y: CY + R * Math.sin(r) }
}

const TRUTH  = nodePos(-90)   // (260, 90)
const RESET  = nodePos(30)    // (390, 315)
const GOMOVE = nodePos(150)   // (130, 315)

function edgePt(from, to, r) {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  return { x: from.x + (dx / len) * r, y: from.y + (dy / len) * r }
}

// Arrow endpoints (start from source edge, end at dest edge)
const ARR1_S = edgePt(TRUTH, RESET, NR)
const ARR1_E = edgePt(RESET, TRUTH, NR)
const ARR2_S = edgePt(RESET, GOMOVE, NR)
const ARR2_E = edgePt(GOMOVE, RESET, NR)
const ARR3_S = edgePt(GOMOVE, TRUTH, NR)
const ARR3_E = edgePt(TRUTH, GOMOVE, NR)

// Arrowhead: tip at (x,y), pointing in direction of angleDeg
function Arrowhead({ x, y, angle, size = 11 }) {
  const r = angle * Math.PI / 180
  const b1x = x - size * Math.cos(r) + (size * 0.45) * Math.sin(r)
  const b1y = y - size * Math.sin(r) - (size * 0.45) * Math.cos(r)
  const b2x = x - size * Math.cos(r) - (size * 0.45) * Math.sin(r)
  const b2y = y - size * Math.sin(r) + (size * 0.45) * Math.cos(r)
  return <polygon points={`${x},${y} ${b1x},${b1y} ${b2x},${b2y}`} fill="#43B878" />
}

// Arrival angle: direction from source center toward dest center
function arrivalAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI
}

function CycleCircle({ cycle }) {
  const nodes = [
    { pos: TRUTH,  label: 'MY TRUTH',   text: cycle.anchor_statement },
    { pos: RESET,  label: 'MY RESET',   text: cycle.physical_reset },
    { pos: GOMOVE, label: 'MY GO MOVE', text: cycle.go_move },
  ]

  return (
    <svg viewBox="0 0 520 460" width="100%" style={{ maxWidth: 520, display: 'block', margin: '0 auto' }}>
      {/* Arrows — quadratic bezier curves tracing clockwise outside the triangle */}
      <path d={`M ${ARR1_S.x} ${ARR1_S.y} Q 433 140 ${ARR1_E.x} ${ARR1_E.y}`}
        fill="none" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" />
      <Arrowhead x={ARR1_E.x} y={ARR1_E.y} angle={arrivalAngle(TRUTH, RESET)} />

      <path d={`M ${ARR2_S.x} ${ARR2_S.y} Q 260 448 ${ARR2_E.x} ${ARR2_E.y}`}
        fill="none" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" />
      <Arrowhead x={ARR2_E.x} y={ARR2_E.y} angle={arrivalAngle(RESET, GOMOVE)} />

      <path d={`M ${ARR3_S.x} ${ARR3_S.y} Q 87 140 ${ARR3_E.x} ${ARR3_E.y}`}
        fill="none" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" />
      <Arrowhead x={ARR3_E.x} y={ARR3_E.y} angle={arrivalAngle(GOMOVE, TRUTH)} />

      {/* Node circles */}
      {nodes.map(({ pos: p, label }) => (
        <g key={label}>
          <circle cx={p.x} cy={p.y} r={NR} fill="#1a1a1a" stroke="#1A7A4A" strokeWidth="2" />
          <text x={p.x} y={p.y - 4} textAnchor="middle"
            fill="#43B878" fontSize="10" fontWeight="700"
            letterSpacing="1.5" fontFamily="system-ui, -apple-system, sans-serif">
            {label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Pill badge ────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'approved')      return <span className="pill pill-green">Approved</span>
  if (status === 'returned')      return <span className="pill pill-red">Returned for Revision</span>
  return <span className="pill pill-amber">Pending Review</span>
}

// ── Main export ───────────────────────────────────────────────
export default function CycleDocumentScreen({ cycle, onBack, logoUrl }) {
  const goHome = useHome()
  const createdDate = new Date(cycle.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const isApproved = cycle.status === 'approved'
  const isReturned = cycle.status === 'returned'

  return (
    <>
      <nav>
        <img src="/logo.svg" alt="RPM Systems Group" style={{ height: 36, cursor: 'pointer' }} onClick={goHome} />
        <div className="ntag">Performance Cycle</div>
        <button className="btn bo bsm" onClick={onBack}>← Back</button>
      </nav>
      <div className="cw" style={{ alignItems: 'flex-start', padding: '40px 24px' }}>
        <div style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            {logoUrl && (
              <img src={logoUrl} alt="" style={{ height: 44, width: 'auto', opacity: 0.85, display: 'block', marginBottom: 20 }} />
            )}
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
                ✏ Practitioner Feedback — Action Required
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                {cycle.practitioner_note}
              </p>
            </div>
          )}

          {/* Approved note */}
          {isApproved && cycle.practitioner_note && (
            <div style={{ background: 'rgba(26,122,74,.1)', border: '1px solid rgba(26,122,74,.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gl)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                ✓ Practitioner Note
              </div>
              <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                {cycle.practitioner_note}
              </p>
            </div>
          )}

          {/* Approved: circular diagram */}
          {isApproved && (
            <div style={{ background: 'var(--d2)', border: '1px solid var(--bdr)', borderRadius: 14, padding: '28px 20px', marginBottom: 20 }}>
              <CycleCircle cycle={cycle} />

              {/* Content cards below diagram */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
                {[
                  { label: 'MY TRUTH',   value: cycle.anchor_statement },
                  { label: 'MY RESET',   value: cycle.physical_reset },
                  { label: 'MY GO MOVE', value: cycle.go_move },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--d3)', borderRadius: 8, padding: '14px 14px', borderTop: '2px solid #1A7A4A' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#43B878', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                      {label}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--w)', lineHeight: 1.6, margin: 0 }}>
                      {value}
                    </p>
                  </div>
                ))}
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
              {[
                { step: 'Step 1', label: 'My Truth', value: cycle.anchor_statement },
                { step: 'Step 2', label: 'My Reset', value: cycle.physical_reset },
                { step: 'Step 3', label: 'My Go Move', value: cycle.go_move },
              ].map(({ step, label, value }) => (
                <div key={step} style={{ padding: '16px 22px', borderBottom: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#43B878', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                    {step} — {label}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--w)', lineHeight: 1.7, margin: 0 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Fear category */}
          <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 24 }}>
            Fear category addressed: <span style={{ color: 'var(--w)' }}>{cycle.fear_category}</span>
          </div>

          <button className="btn bo" onClick={onBack}>← Back to My Cycles</button>

        </div>
      </div>
    </>
  )
}
