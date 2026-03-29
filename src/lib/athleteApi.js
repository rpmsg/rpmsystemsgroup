import { supabase } from './supabase'

export async function fetchCustomQuestions() {
  const { data } = await supabase.from('custom_questions').select('*')
  return data || []
}

export async function lookupTeamCode(code) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, team_code')
    .eq('team_code', code.toUpperCase())
    .eq('status', 'active')
  if (error) throw error
  return data?.[0] || null
}

export async function fetchRoster(teamId) {
  const { data, error } = await supabase
    .from('roster')
    .select('id, full_name, status')
    .eq('team_id', teamId)
    .order('full_name')
  if (error) throw error
  return data || []
}

export async function fetchRosterNames(teamId) {
  const { data, error } = await supabase
    .from('roster')
    .select('full_name')
    .eq('team_id', teamId)
    .order('full_name')
  if (error) throw error
  return (data || []).map(r => r.full_name)
}

export async function submitAssessment({ athleteId, teamId, pc, sm }) {
  // Save panic cycle
  const { error: pcErr } = await supabase
    .from('panic_cycle_responses')
    .insert(pc)
  if (pcErr) throw pcErr

  // Save all social map rows
  const { error: smErr } = await supabase
    .from('social_map_responses')
    .insert(sm)
  if (smErr) throw smErr

  // Mark athlete complete
  const { error: rErr } = await supabase
    .from('roster')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', athleteId)
  if (rErr) throw rErr

  // Recalculate pulse scores
  await recalculatePulseScores(teamId)
}

async function recalculatePulseScores(teamId) {
  const { data: rows } = await supabase
    .from('social_map_responses')
    .select('question_type, nominee_1, nominee_2')
    .eq('team_id', teamId)

  if (!rows?.length) return

  const pos = {}, neg = {}
  rows.forEach(r => {
    [r.nominee_1, r.nominee_2].forEach(nm => {
      if (!nm) return
      if (r.question_type === 'positive') pos[nm] = (pos[nm] || 0) + 1
      else neg[nm] = (neg[nm] || 0) + 1
    })
  })

  const allNames = [...new Set([...Object.keys(pos), ...Object.keys(neg)])]
  const avgPos = allNames.reduce((s, n) => s + (pos[n] || 0), 0) / (allNames.length || 1)
  const avgNeg = allNames.reduce((s, n) => s + (neg[n] || 0), 0) / (allNames.length || 1)

  const upserts = allNames.map(nm => {
    const p = pos[nm] || 0, n = neg[nm] || 0
    const role = p >= avgPos && n <= avgNeg ? 'Core Influencer'
               : p >= avgPos && n >  avgNeg ? 'Polarizing Figure'
               : p <  avgPos && n >  avgNeg ? 'Rejection Risk'
               : 'Isolation Risk'
    return {
      team_id: teamId,
      athlete_name: nm,
      positive_mentions: p,
      negative_mentions: n,
      social_role: role,
      avg_positive: avgPos,
      avg_negative: avgNeg,
      last_calculated: new Date().toISOString()
    }
  })

  await supabase.from('pulse_report_scores').delete().eq('team_id', teamId)
  await supabase.from('pulse_report_scores').insert(upserts)
}
