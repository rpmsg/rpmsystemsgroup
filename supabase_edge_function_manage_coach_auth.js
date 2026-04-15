// Supabase Edge Function — manage-coach-auth
// ─────────────────────────────────────────────────────────────
// Deploy steps:
//   1. Supabase Dashboard → Edge Functions → New Function
//   2. Name it exactly: manage-coach-auth
//   3. Paste this entire file → Deploy
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Admin client — uses service role key injected automatically by Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is a logged-in admin
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!jwt) throw new Error('Unauthorized')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt)
    if (userError || !user) throw new Error('Unauthorized')

    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', user.email)
      .single()
    if (!admin) throw new Error('Forbidden — caller is not an admin')

    const { action, email, password, newEmail, newPassword } = await req.json()

    // ── CREATE ──────────────────────────────────────────────
    if (action === 'create') {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error) throw error
    }

    // ── DELETE ──────────────────────────────────────────────
    else if (action === 'delete') {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const target = data?.users?.find(u => u.email === email)
      if (target) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(target.id)
        if (error) throw error
      }
    }

    // ── UPDATE (email / password change) ────────────────────
    else if (action === 'update') {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const target = data?.users?.find(u => u.email === email)
      if (target) {
        const updates = {}
        if (newEmail)    updates.email    = newEmail
        if (newPassword) updates.password = newPassword
        if (Object.keys(updates).length > 0) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, updates)
          if (error) throw error
        }
      }
    }

    else {
      throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
