import { useState, useEffect } from 'react'
import { fetchAllTeams } from '../../lib/adminApi'
import CoachDashboard from '../coach/CoachDashboard'

export default function CoachViewTab() {
  const [teams, setTeams]                   = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')

  useEffect(() => {
    fetchAllTeams().then(setTeams).catch(() => {})
  }, [])

  return (
    <div>
      <div className="sh"><div className="stit">Coach View</div></div>
      <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20 }}>
        View the coach dashboard for any team.
      </p>

      <div className="fld" style={{ maxWidth: 320, marginBottom: 28 }}>
        <label>Select Team</label>
        <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
          <option value="">— Select a team —</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}{t.season ? ` · ${t.season}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedTeamId ? (
        <CoachDashboard key={selectedTeamId} adminTeamId={selectedTeamId} />
      ) : (
        <div style={{ fontSize: 13, color: 'var(--mid)', padding: '32px 0' }}>
          Select a team above to view their dashboard.
        </div>
      )}
    </div>
  )
}
