import { supabase } from './supabase'

// ── Auth ──────────────────────────────────────────────────────
export async function adminLogin(username, password) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .eq('password', password)
  if (error) throw error
  return data?.[0] || null
}

// ── Teams ─────────────────────────────────────────────────────
export async function fetchAllTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function createTeam({ name, team_code, season }) {
  const { error } = await supabase
    .from('teams')
    .insert({ name: name.trim(), team_code: team_code.trim().toUpperCase(), season: season.trim(), status: 'active' })
  if (error) throw error
}

export async function updateTeam(id, fields) {
  if (fields.team_code) fields.team_code = fields.team_code.toUpperCase()
  const { error } = await supabase.from('teams').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteTeam(id) {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// ── Coaches ───────────────────────────────────────────────────
export async function fetchAllCoaches() {
  const { data, error } = await supabase
    .from('coaches')
    .select('id, full_name, email, password, team_id, must_change_password')
    .order('full_name')
  if (error) throw error
  return data || []
}

export async function createCoach({ full_name, email, password, team_id }) {
  const { error } = await supabase
    .from('coaches')
    .insert({ full_name: full_name.trim(), email: email.trim().toLowerCase(), password, team_id: team_id || null, must_change_password: true })
  if (error) throw error
}

export async function updateCoach(id, fields) {
  if (fields.email) fields.email = fields.email.trim().toLowerCase()
  const { error } = await supabase.from('coaches').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteCoach(id) {
  const { error } = await supabase.from('coaches').delete().eq('id', id)
  if (error) throw error
}

// ── Roster ────────────────────────────────────────────────────
export async function fetchRosterAdmin(teamId) {
  const { data, error } = await supabase
    .from('roster')
    .select('id, full_name, status, completed_at')
    .eq('team_id', teamId)
    .order('full_name')
  if (error) throw error
  return data || []
}

export async function addAthlete(teamId, full_name) {
  const { error } = await supabase
    .from('roster')
    .insert({ team_id: teamId, full_name: full_name.trim(), status: 'pending' })
  if (error) throw error
}

export async function updateAthlete(id, fields) {
  const { error } = await supabase.from('roster').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteAthlete(id) {
  const { error } = await supabase.from('roster').delete().eq('id', id)
  if (error) throw error
}

export async function resetAthleteSubmission(athleteId, teamId) {
  await Promise.all([
    supabase.from('panic_cycle_responses').delete().eq('athlete_id', athleteId).eq('team_id', teamId),
    supabase.from('social_map_responses').delete().eq('athlete_id', athleteId).eq('team_id', teamId),
    supabase.from('panic_cycle_documents').delete().eq('athlete_id', athleteId).eq('team_id', teamId),
  ])
  const { error } = await supabase
    .from('roster')
    .update({ status: 'pending', completed_at: null })
    .eq('id', athleteId)
  if (error) throw error
}

export async function resetAthletePinAdmin(athleteId, teamId) {
  const { error } = await supabase
    .from('athlete_pins')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
  if (error) throw error
}

// ── Panic Cycles ──────────────────────────────────────────────
export async function fetchCycleStatus(teamId) {
  const [rosterRes, docsRes, responsesRes] = await Promise.all([
    supabase.from('roster').select('id, full_name, status').eq('team_id', teamId).order('full_name'),
    supabase.from('panic_cycle_documents').select('athlete_id, released, updated_at, trigger, emotions, body_response, behavior, aftermath, coaching_note').eq('team_id', teamId),
    supabase.from('panic_cycle_responses').select('athlete_id, q1_trigger, q2_first_signal, q3_emotions, q4_inner_voice, q5_identity_phrase, q6_body_response, q7_reaction, q8_behavior, q9_pattern_sentence, q10_outcome, q11_aftermath').eq('team_id', teamId),
  ])
  const docMap = {}
  ;(docsRes.data || []).forEach(d => { docMap[d.athlete_id] = d })
  const respMap = {}
  ;(responsesRes.data || []).forEach(r => { respMap[r.athlete_id] = r })
  return (rosterRes.data || []).map(a => ({
    ...a,
    responses: respMap[a.id] || null,
    doc: docMap[a.id] || null,
  }))
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
    .eq('athlete_id', athleteId).eq('team_id', teamId)
  if (error) throw error
}

export async function unreleaseCycleDocument(athleteId, teamId) {
  const { error } = await supabase
    .from('panic_cycle_documents')
    .update({ released: false, released_at: null, updated_at: new Date().toISOString() })
    .eq('athlete_id', athleteId).eq('team_id', teamId)
  if (error) throw error
}

// ── Social Map Administration ─────────────────────────────────
export async function fetchSocialMapAdminStatus() {
  const [teamsRes, responsesRes] = await Promise.all([
    supabase.from('teams').select('id, name, current_administration').order('name'),
    supabase.from('social_map_responses').select('team_id, administration, athlete_id'),
  ])
  if (teamsRes.error) throw teamsRes.error

  // Count distinct athletes per (team_id, administration)
  const completionMap = {}
  ;(responsesRes.data || []).forEach(r => {
    const key = `${r.team_id}:${r.administration}`
    if (!completionMap[key]) completionMap[key] = new Set()
    completionMap[key].add(r.athlete_id)
  })

  return (teamsRes.data || []).map(t => ({
    ...t,
    completions: {
      1: completionMap[`${t.id}:1`]?.size || 0,
      2: completionMap[`${t.id}:2`]?.size || 0,
      3: completionMap[`${t.id}:3`]?.size || 0,
    },
  }))
}

export async function advanceAdministration(teamId, newAdmin) {
  const { error } = await supabase
    .from('teams')
    .update({ current_administration: newAdmin })
    .eq('id', teamId)
  if (error) throw error
}

// ── Questions ─────────────────────────────────────────────────
export async function fetchCustomQuestions() {
  const { data, error } = await supabase.from('custom_questions').select('*')
  if (error) throw error
  return data || []
}

export async function saveCustomQuestion(questionId, fields) {
  const { error } = await supabase
    .from('custom_questions')
    .upsert(
      { question_id: questionId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'question_id' }
    )
  if (error) throw error
}

export async function resetCustomQuestion(questionId) {
  const { error } = await supabase.from('custom_questions').delete().eq('question_id', questionId)
  if (error) throw error
}
