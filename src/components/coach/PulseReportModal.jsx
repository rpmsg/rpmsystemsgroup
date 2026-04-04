import { useState } from 'react'
import PulseSingleView from './PulseSingleView'
import PulseCompareView from './PulseCompareView'

export default function PulseReportModal({ team, scores, scoresByAdmin, availableAdmins, roster, onClose }) {
  const [viewMode, setViewMode] = useState('single')
  const hasMultipleAdmins = (availableAdmins?.length || 0) > 1
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const complete = roster.filter(r => r.status === 'complete').length

  return (
    <>
      <style>{`
        @media print {
          body > *:not(.print-report) { display: none !important; }
          .print-report { display: block !important; position: static !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .modal-overlay { position: static !important; background: white !important; }
          .modal { max-width: 100% !important; max-height: none !important; box-shadow: none !important; border: none !important; background: white !important; color: black !important; }
          .cct { color: #555 !important; }
          svg text { fill: #333 !important; }
        }
      `}</style>

      <div className="modal-overlay on print-report" onClick={onClose}>
        <div
          className="modal"
          style={{ maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-head">
            <div>
              <h3>📊 Pulse Report — {team.name}</h3>
              <p>{team.season || 'Current Season'} · {complete}/{roster.length} athletes complete · {today}</p>
            </div>
            <button className="modal-close no-print" onClick={onClose}>✕</button>
          </div>

          {/* ── Single / Compare toggle ── */}
          {hasMultipleAdmins && (
            <div className="no-print" style={{ padding: '10px 24px', borderBottom: '1px solid var(--bdr)', background: 'var(--d2)', display: 'flex', gap: 6 }}>
              {['single', 'compare'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '4px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                    border: '1px solid var(--bdr)',
                    background: viewMode === mode ? 'var(--g)' : 'var(--d4)',
                    color: viewMode === mode ? '#fff' : 'var(--mid)',
                  }}
                >
                  {mode === 'single' ? 'Single View' : 'Compare Administrations'}
                </button>
              ))}
            </div>
          )}

          {viewMode === 'single' && (
            <PulseSingleView
              team={team}
              defaultScores={scores}
              scoresByAdmin={scoresByAdmin}
              availableAdmins={availableAdmins}
              roster={roster}
            />
          )}
          {viewMode === 'compare' && (
            <PulseCompareView
              scoresByAdmin={scoresByAdmin}
              availableAdmins={availableAdmins}
            />
          )}

          <div className="modal-foot no-print">
            <p style={{ fontSize: 11, color: 'var(--mid)' }}>Charts generated live from team data</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn bo" onClick={onClose}>Close</button>
              <button className="btn bp" onClick={() => window.print()}>🖨 Print / Save PDF</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
