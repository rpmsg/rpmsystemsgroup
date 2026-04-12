import { supabase } from './supabase'

export async function lookupWellnessTeam(code) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, team_code, wellness_reset_day')
    .eq('team_code', code.trim().toUpperCase())
    .eq('status', 'active')
  if (error) throw error
  return data?.[0] || null
}

export async function fetchRosterForWellness(teamId) {
  const { data, error } = await supabase
    .from('roster')
    .select('id, full_name')
    .eq('team_id', teamId)
    .order('full_name')
  if (error) throw error
  return data || []
}

export function isWellnessWindowOpen(resetDay) {
  return new Date().getDay() === (resetDay ?? 1)
}

export function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

export async function checkAlreadySubmitted(teamId, athleteId) {
  const today = getTodayDateString()
  const { data } = await supabase
    .from('wellness_checkins')
    .select('id')
    .eq('team_id', teamId)
    .eq('athlete_id', athleteId)
    .eq('week_date', today)
  return (data?.length || 0) > 0
}

export async function submitWellnessCheckin({ teamId, athleteId, mentalScore, mentalWord, physicalScore, weekDate }) {
  const { error } = await supabase
    .from('wellness_checkins')
    .insert({
      team_id: teamId,
      athlete_id: athleteId,
      mental_score: mentalScore,
      mental_word: mentalWord,
      physical_score: physicalScore,
      week_date: weekDate,
    })
  if (error) throw error
}

export async function fetchTeamWellnessCheckins(teamId) {
  const { data, error } = await supabase
    .from('wellness_checkins')
    .select('athlete_id, mental_score, mental_word, physical_score, week_date')
    .eq('team_id', teamId)
    .order('week_date', { ascending: false })
    .limit(500)
  if (error) throw error
  return data || []
}
