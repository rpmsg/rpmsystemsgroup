import { supabase } from './supabase'

// ── Practitioner (admin) ──────────────────────────────────────

export async function fetchRosterWithMessages(teamId) {
  const [rosterRes, wellnessRes, messagesRes] = await Promise.all([
    supabase.from('roster').select('id, full_name').eq('team_id', teamId).order('full_name'),
    supabase.from('wellness_checkins')
      .select('athlete_id, mental_score, mental_word, week_date')
      .eq('team_id', teamId)
      .order('week_date', { ascending: false })
      .limit(400),
    supabase.from('messages')
      .select('athlete_id, is_read, sent_at')
      .eq('team_id', teamId)
      .order('sent_at', { ascending: false }),
  ])

  const roster   = rosterRes.data   || []
  const checkins = wellnessRes.data  || []
  const msgs     = messagesRes.data  || []

  const allWeeks = [...new Set(checkins.map(c => c.week_date))].sort().reverse().slice(0, 4)
  const checkinByKey = {}
  checkins.forEach(c => { checkinByKey[`${c.athlete_id}:${c.week_date}`] = c })

  const latestMsgByAthlete = {}
  msgs.forEach(m => { if (!latestMsgByAthlete[m.athlete_id]) latestMsgByAthlete[m.athlete_id] = m })

  return roster.map(a => ({
    ...a,
    recentCheckins: allWeeks.map(w => checkinByKey[`${a.id}:${w}`] || null),
    latestMessage:  latestMsgByAthlete[a.id] || null,
    hasUnread:      msgs.some(m => m.athlete_id === a.id && !m.is_read),
  }))
}

export async function sendMessage({ practitionerId, athleteId, teamId, file, durationSeconds, note }) {
  const getExt = (f) => {
    if (f.name) { const p = f.name.split('.'); if (p.length > 1) return p.pop() }
    if (f.type.includes('mp4')) return 'mp4'
    if (f.type.includes('ogg')) return 'ogg'
    if (f.type.includes('mpeg') || f.type.includes('mp3')) return 'mp3'
    return 'webm'
  }
  const mediaType = file.type.startsWith('video/') ? 'video' : 'audio'
  const path      = `${teamId}/${athleteId}/${Date.now()}.${getExt(file)}`

  const { error: uploadErr } = await supabase.storage
    .from('practitioner-messages')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadErr) throw uploadErr

  const { data, error: insertErr } = await supabase
    .from('messages')
    .insert({
      practitioner_id:  practitionerId,
      athlete_id:       athleteId,
      team_id:          teamId,
      storage_path:     path,
      media_type:       mediaType,
      duration_seconds: durationSeconds || null,
      practitioner_note: note?.trim() || null,
      sent_at:          new Date().toISOString(),
    })
    .select('id')
    .single()
  if (insertErr) throw insertErr

  await supabase.from('message_notifications').insert({
    athlete_id: athleteId,
    team_id:    teamId,
    message_id: data.id,
  })
}

export async function fetchSentMessages(teamId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, athlete_id, sent_at, is_read, read_at, duration_seconds, media_type')
    .eq('team_id', teamId)
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Athlete (no auth session) ────────────────────────────────

export async function fetchAthleteMessages(athleteId, teamId) {
  const { data, error } = await supabase
    .from('messages_athlete_view')
    .select('id, athlete_id, team_id, sent_at, is_read, read_at, duration_seconds, media_type')
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getSignedMessageUrl(athleteId, teamId, messageId, pin) {
  const { data, error } = await supabase.functions.invoke('get-message-url', {
    body: { athleteId, teamId, messageId, pin },
  })
  if (error) throw new Error(error.message || 'Failed to get message URL')
  if (data?.error) throw new Error(data.error)
  return data.signedUrl
}

export async function fetchAthleteUnreadCount(athleteId, teamId) {
  const { count } = await supabase
    .from('messages_athlete_view')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)
    .eq('team_id', teamId)
    .eq('is_read', false)
  return count || 0
}
