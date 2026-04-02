import { supabase } from './supabase'

export async function coachLogin(email, password) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id, full_name, team_id, password, must_change_password')
    .eq('email', email.trim().toLowerCase())
  if (error) throw error
  const coach = data?.[0]
  if (!coach || coach.password !== password) return null
  return coach
}

export async function changePassword(coachId, newPassword) {
  const { error } = await supabase
    .from('coaches')
    .update({ password: newPassword, must_change_password: false })
    .eq('id', coachId)
  if (error) throw error
}

export async function fetchDashboardData(teamId) {
  const [teamRes, rosterRes, scoresRes, panicRes, nominationsRes] = await Promise.all([
    supabase.from('teams').select('id, name, team_code, season, current_administration').eq('id', teamId).single(),
    supabase.from('roster').select('id, full_name, status').eq('team_id', teamId).order('full_name'),
    supabase.from('pulse_report_scores').select('athlete_name, positive_mentions, negative_mentions, social_role, administration').eq('team_id', teamId).order('positive_mentions', { ascending: false }),
    supabase.from('panic_cycle_responses').select('q1_trigger, q7_reaction, q8_behavior, q11_aftermath').eq('team_id', teamId),
    supabase.from('social_map_responses').select('athlete_id, question_type, nominee_1, nominee_2').eq('team_id', teamId),
  ])
  if (teamRes.error) throw teamRes.error

  // Group scores by administration
  const scoresByAdmin = {}
  ;(scoresRes.data || []).forEach(s => {
    const admin = s.administration || 1
    if (!scoresByAdmin[admin]) scoresByAdmin[admin] = []
    scoresByAdmin[admin].push(s)
  })

  const availableAdmins = Object.keys(scoresByAdmin).map(Number).sort()
  const currentAdmin    = teamRes.data.current_administration || 1
  // Default scores: current administration if it has data, else the latest available
  const defaultAdmin    = scoresByAdmin[currentAdmin]
    ? currentAdmin
    : availableAdmins[availableAdmins.length - 1]

  return {
    team:          teamRes.data,
    roster:        rosterRes.data      || [],
    scores:        scoresByAdmin[defaultAdmin] || [],
    scoresByAdmin,
    availableAdmins,
    panic:         panicRes.data       || [],
    nominations:   nominationsRes.data || [],
  }
}
