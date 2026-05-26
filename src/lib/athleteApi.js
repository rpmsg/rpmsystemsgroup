import { supabase } from './supabase'

export async function fetchCustomQuestions(teamId) {
  const { data } = await supabase
    .from('custom_questions')
    .select('*')
    .eq('team_id', teamId)
  return data || []
}

export async function fetchQuestionsFromSupabase(surveyType, setNumber) {
  let q = supabase
    .from('questions')
    .select('question_key, question_number, dimension, question_type, input_type, max_selections, question_text, subtitle, question_options(option_text, display_order, is_active)')
    .eq('survey_type', surveyType)
    .eq('is_active', true)
    .order('question_number')

  if (surveyType === 'panic_cycle') {
    q = q.is('set_number', null)
  } else {
    q = q.eq('set_number', setNumber)
  }

  const { data, error } = await q
  if (error) throw error

  const isSM = surveyType === 'social_map'
  const prefix = isSM ? 'Social Map' : 'Panic Cycle'

  return (data || []).map(row => {
    const opts = (row.question_options || [])
      .filter(o => o.is_active)
      .sort((a, b) => a.display_order - b.display_order)
      .map(o => o.option_text)

    const mapped = {
      id:   row.question_key,
      n:    isSM ? row.question_number + 11 : row.question_number,
      meta: `${prefix} — ${row.dimension}`,
      q:    row.question_text,
    }

    if (row.subtitle) mapped.sub = row.subtitle

    if (isSM) {
      mapped.positive = row.question_type === 'positive'
      if (!row.subtitle) mapped.sub = 'Select up to 2 teammates.'
    } else {
      mapped.type = row.input_type
      if (row.input_type === 'multi') mapped.max = row.max_selections
      if (row.input_type === 'text') {
        mapped.placeholder = row.subtitle || 'Write your response here...'
      } else {
        mapped.choices = opts
      }
    }

    return mapped
  })
}

export async function lookupTeamCode(code) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, team_code, current_administration, wellness_reset_day, logo_url')
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

// Returns a Set of athlete_ids who have already submitted the given administration
export async function fetchCompletedAthleteIds(teamId, administration) {
  const { data } = await supabase
    .from('social_map_responses')
    .select('athlete_id')
    .eq('team_id', teamId)
    .eq('administration', administration)
  return new Set((data || []).map(r => r.athlete_id))
}

export async function submitAssessment({ athleteId, teamId, administration, questionSet, pc, sm }) {
  // Admin 1 only: save panic cycle responses and mark roster complete
  if (administration === 1) {
    const { error: pcErr } = await supabase
      .from('panic_cycle_responses')
      .insert(pc)
    if (pcErr) throw pcErr
  }

  // Save social map rows (all administrations)
  const { error: smErr } = await supabase
    .from('social_map_responses')
    .insert(sm)
  if (smErr) throw smErr

  // Admin 1 only: mark athlete complete on roster (drives panic cycle document flow)
  if (administration === 1) {
    const { error: rErr } = await supabase
      .from('roster')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', athleteId)
    if (rErr) throw rErr
  }

  // Recalculate pulse scores for this administration
  await recalculatePulseScores(teamId, administration)
}

async function recalculatePulseScores(teamId, administration) {
  const { data: rows } = await supabase
    .from('social_map_responses')
    .select('question_type, nominee_1, nominee_2')
    .eq('team_id', teamId)
    .eq('administration', administration)

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
      administration,
      positive_mentions: p,
      negative_mentions: n,
      social_role: role,
      avg_positive: avgPos,
      avg_negative: avgNeg,
      last_calculated: new Date().toISOString()
    }
  })

  await supabase.from('pulse_report_scores').delete().eq('team_id', teamId).eq('administration', administration)
  await supabase.from('pulse_report_scores').insert(upserts)
}
