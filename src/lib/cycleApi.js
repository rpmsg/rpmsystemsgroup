import { supabase } from './supabase'

export async function fetchAthletePin(athleteId, teamId) {
  const { data } = await supabase
    .from('athlete_pins')
    .select('pin')
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .single()
  return data?.pin || null
}

export async function setAthletePin(athleteId, teamId, pin) {
  const { error } = await supabase
    .from('athlete_pins')
    .upsert({ athlete_id: athleteId, team_id: teamId, pin }, { onConflict: 'team_id,athlete_id' })
  if (error) throw error
}

export async function fetchCycleDocument(athleteId, teamId) {
  const { data, error } = await supabase
    .from('panic_cycle_documents')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

// ── Admin functions ───────────────────────────────────────────

export async function fetchAllCycleDocuments(teamId) {
  const { data, error } = await supabase
    .from('panic_cycle_documents')
    .select('*')
    .eq('team_id', teamId)
  if (error) throw error
  return data || []
}

export async function fetchRawResponses(athleteId, teamId) {
  const { data, error } = await supabase
    .from('panic_cycle_responses')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function upsertCycleDocument(athleteId, teamId, fields) {
  const { error } = await supabase
    .from('panic_cycle_documents')
    .upsert(
      { athlete_id: athleteId, team_id: teamId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'team_id,athlete_id' }
    )
  if (error) throw error
}

export async function releaseCycleDocument(athleteId, teamId) {
  const { error } = await supabase
    .from('panic_cycle_documents')
    .update({ released: true, released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
  if (error) throw error
}

export async function unreleaseCycleDocument(athleteId, teamId) {
  const { error } = await supabase
    .from('panic_cycle_documents')
    .update({ released: false, released_at: null, updated_at: new Date().toISOString() })
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
  if (error) throw error
}

export async function resetAthletePin(athleteId, teamId) {
  const { error } = await supabase
    .from('athlete_pins')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
  if (error) throw error
}
