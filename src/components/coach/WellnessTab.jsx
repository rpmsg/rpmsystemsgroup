import { useState, useEffect } from 'react'
import { fetchTeamWellnessCheckins } from '../../lib/wellnessApi'

function scoreColor(n) {
  return n >= 7 ? '#43B878' : n >= 4 ? '#f0b030' : '#e05a4a'
}

export default function WellnessTab({ teamId, roster }) {
  const [checkins, setCheckins] = useState(null)

  useEffect(() => {
    fetchTeamWellnessCheckins(teamId).then(setCheckins)
  }, [teamId])

  if (checkins === null) return <div className="spinner" style={{margin:'40px auto'}} />

  if (checkins.length === 0) return (
    <div style={{padding:'48px 0',textAlign:'center',color:'var(--mid)',fontSize:13}}>
      No wellness check-ins submitted yet.
    </div>
  )

  // 8 most recent distinct week_dates
  const allWeeks = [...new Set(checkins.map(c => c.week_date))].sort().reverse().slice(0, 8)

  // Fast lookup by athlete_id:week_date
  const byKey = {}
  checkins.forEach(c => { byKey[`${c.athlete_id}:${c.week_date}`] = c })

  // Flags: scores ≤ 3 from the most recent week only
  const latestWeek = allWeeks[0]
  const flags = []
  roster.forEach(a => {
    const c = byKey[`${a.id}:${latestWeek}`]
    if (!c) return
    const first = a.full_name.split(' ')[0]
    const dateStr = new Date(latestWeek + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (c.mental_score <= 3) {
      flags.push({
        icon: '🧠',
        label: `Mental — ${a.full_name} · ${dateStr}`,
        text: `${first} rated mental wellness ${c.mental_score}/10. Recommended: Schedule a private 1:1 before next session. Use open-ended questions. Do not address in a group setting.`,
      })
    }
    if (c.physical_score <= 3) {
      flags.push({
        icon: '💪',
        label: `Physical — ${a.full_name} · ${dateStr}`,
        text: `${first} rated physical wellness ${c.physical_score}/10. Recommended: Assess for injury or overtraining. Consider modified participation or a rest day. Refer to athletic trainer if concern persists.`,
      })
    }
  })

  return (
    <div>
      {/* ── Flags ── */}
      {flags.length > 0 && (
        <div style={{marginBottom:28}}>
          <div className="cct" style={{marginBottom:12}}>Attention Required</div>
          {flags.map((f, i) => (
            <div key={i} style={{background:'var(--d3)',border:'1px solid #e05a4a44',borderRadius:8,padding:'12px 16px',marginBottom:8}}>
              <div style={{fontSize:11,color:'#e05a4a',fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:0.8}}>
                {f.icon} {f.label}
              </div>
              <div style={{fontSize:13,color:'var(--w)',lineHeight:1.6}}>{f.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead>
            <tr style={{borderBottom:'1px solid var(--bdr)'}}>
              <th style={{textAlign:'left',padding:'8px 12px',color:'var(--mid)',fontWeight:600,minWidth:130}}>Athlete</th>
              {allWeeks.map(w => (
                <th key={w} style={{textAlign:'center',padding:'8px 6px',color:'var(--mid)',fontWeight:600,minWidth:72}}>
                  {new Date(w + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map(a => (
              <tr key={a.id} style={{borderBottom:'1px solid var(--bdr)'}}>
                <td style={{padding:'8px 12px',fontWeight:500,color:'var(--w)',whiteSpace:'nowrap'}}>
                  {a.full_name}
                </td>
                {allWeeks.map(w => {
                  const c = byKey[`${a.id}:${w}`]
                  return (
                    <td key={w} style={{textAlign:'center',padding:'6px 4px'}}>
                      {c ? (
                        <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:2}}>
                          <div style={{display:'flex',gap:4}}>
                            <span style={{fontWeight:700,color:scoreColor(c.mental_score),fontSize:12}} title="Mental">
                              🧠{c.mental_score}
                            </span>
                            <span style={{fontWeight:700,color:scoreColor(c.physical_score),fontSize:12}} title="Physical">
                              💪{c.physical_score}
                            </span>
                          </div>
                          <span style={{fontSize:9,color:'var(--mid)',fontStyle:'italic'}}>{c.mental_word}</span>
                        </div>
                      ) : (
                        <span style={{color:'var(--d4)',fontSize:11}}>—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{fontSize:10,color:'var(--mid)',marginTop:12,lineHeight:1.8}}>
        🧠 Mental &nbsp;·&nbsp; 💪 Physical &nbsp;·&nbsp;
        <span style={{color:'#43B878'}}>■</span> 7–10 &nbsp;
        <span style={{color:'#f0b030'}}>■</span> 4–6 &nbsp;
        <span style={{color:'#e05a4a'}}>■</span> 1–3
      </div>
    </div>
  )
}
