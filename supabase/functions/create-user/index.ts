// @ts-nocheck - This is a Deno Edge Function. Node.js TypeScript will show false errors here.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are missing.')
    }

    // ── 1. Verify the caller is authenticated ──────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── 2. Parse caller identity directly from JWT ────────────────────
    // (Signature is already verified by Supabase API Gateway)
    const token = authHeader.replace('Bearer ', '').trim()
    let callerUser: any = null
    try {
      const payloadBase64 = token.split('.')[1]
      // Fix base64 padding before decoding
      let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
      const pad = base64.length % 4
      if (pad) {
        base64 += '='.repeat(4 - pad)
      }
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''))
      callerUser = JSON.parse(jsonPayload)
    } catch (err) {
      console.error('Failed to parse JWT payload', err)
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!callerUser || !callerUser.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing user ID in token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── 3. Initialize Admin client (service role) ──────────────────────
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // ── 4. Verify caller is an admin or estate_manager ─────────────────
    // First try public.users table; fall back to JWT metadata if not found
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', callerUser.sub)
      .maybeSingle()  // maybeSingle won't throw if row is missing

    const callerRole =
      callerProfile?.role ||
      callerUser.user_metadata?.role ||
      callerUser.app_metadata?.role ||
      ''

    const allowedRoles = ['admin', 'estate_manager', 'system_admin']
    if (!allowedRoles.includes(callerRole)) {
      return new Response(
        JSON.stringify({
          error: `Forbidden: role '${callerRole}' cannot create users. Required: admin or estate_manager.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── 4. Parse request body ─────────────────────────────────────────
    let body: any
    try {
      body = await req.json()
    } catch {
      throw new Error('Invalid JSON body')
    }

    const { email, password, data: userMeta } = body

    if (!email || !password) {
      throw new Error('email and password are required.')
    }

    // ── 5. Create the auth user — confirmed immediately, no email sent ─
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,    // ← bypass email confirmation
      user_metadata: userMeta ?? {},
    })

    if (createError) {
      throw createError
    }

    return new Response(
      JSON.stringify({ user: newUserData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('[create-user]', error)
    return new Response(
      JSON.stringify({ error: error.message ?? 'Unexpected server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
