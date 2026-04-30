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

// ── Performance Cycles ────────────────────────────────────────

export async function fetchPanicIntakeData(athleteId, teamId) {
  const { data, error } = await supabase
    .from('panic_cycle_responses')
    .select('q1_trigger, q8_behavior')
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function fetchPerformanceCycles(athleteId, teamId) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('*')
    .eq('roster_id', athleteId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function submitPerformanceCycle({ athleteId, teamId, cycleName, fearCategory, anchorStatement, physicalReset, physicalResetType, goMove }) {
  const { data, error } = await supabase
    .from('performance_cycles')
    .insert({
      roster_id: athleteId,
      team_id: teamId,
      cycle_name: cycleName,
      fear_category: fearCategory,
      anchor_statement: anchorStatement,
      physical_reset: physicalReset,
      physical_reset_type: physicalResetType,
      go_move: goMove,
      status: 'pending_review',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resubmitPerformanceCycle(id, { cycleName, fearCategory, anchorStatement, physicalReset, physicalResetType, goMove }) {
  const { error } = await supabase
    .from('performance_cycles')
    .update({
      cycle_name: cycleName,
      fear_category: fearCategory,
      anchor_statement: anchorStatement,
      physical_reset: physicalReset,
      physical_reset_type: physicalResetType,
      go_move: goMove,
      status: 'pending_review',
      practitioner_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function fetchAllPerformanceCyclesAdmin() {
  const { data, error } = await supabase
    .from('performance_cycles')
    .select('*, roster:roster_id(full_name), team:team_id(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  // Sort: pending_review first, then returned, then approved
  const order = { pending_review: 0, returned: 1, approved: 2 }
  return (data || []).sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
}

export async function approvePerformanceCycle(id, note) {
  const { error } = await supabase
    .from('performance_cycles')
    .update({ status: 'approved', practitioner_note: note || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function returnPerformanceCycle(id, feedback) {
  const { error } = await supabase
    .from('performance_cycles')
    .update({ status: 'returned', practitioner_note: feedback, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
