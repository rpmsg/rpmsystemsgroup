import { useState } from 'react'
import AdminTeams from './AdminTeams'
import AdminCoaches from './AdminCoaches'
import AdminRoster from './AdminRoster'
import AdminCycles from './AdminCycles'
import AdminQuestions from './AdminQuestions'

const TABS = [
  { id: 'teams',     label: 'Teams' },
  { id: 'coaches',   label: 'Coaches' },
  { id: 'roster',    label: 'Roster' },
  { id: 'cycles',    label: 'Panic Cycles' },
  { id: 'questions', label: 'Questions' },
]

export default function AdminDashboard({ onLogout, onBack }) {
  const [tab, setTab] = useState('teams')

  return (
    <>
      <nav>
        <div className="logo">RPM<span>SG</span></div>
        <div className="ntag">Admin Panel</div>
        <button className="btn bo bsm" onClick={onLogout}>Sign Out</button>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="tabs" style={{ padding: '0 28px', background: 'var(--d2)', borderBottom: '1px solid var(--bdr)' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {tab === 'teams'     && <AdminTeams />}
          {tab === 'coaches'   && <AdminCoaches />}
          {tab === 'roster'    && <AdminRoster />}
          {tab === 'cycles'    && <AdminCycles />}
          {tab === 'questions' && <AdminQuestions />}
        </div>
      </div>
    </>
  )
}
