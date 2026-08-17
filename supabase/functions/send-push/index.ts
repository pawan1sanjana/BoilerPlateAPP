import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    // In production, these should be securely stored in Deno.env (Supabase Vault/Secrets)
    // For this example, we will assume they are set in the edge function environment.
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BFVDUYSeNCXweKz3OcyVXd8WJLirqFmspf6aVqu1ToXi1fDLy3XbEHtFRpJFr8hZ-fmn7fA8zD7H06-fy6CbEcQ'
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'Mdg-92c2DecB0EI9-wlwRFF7MRMXIUo2c5PBmhC6IFo'

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing.')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { user_id, title, body, url, data } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required.')
    }

    // Fetch user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No active push subscriptions for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    webpush.setVapidDetails(
      'mailto:admin@BoilerplateApp.app',
      vapidPublicKey,
      vapidPrivateKey
    )

    const notificationPayload = JSON.stringify({
      title: title || 'New Notification',
      body: body || '',
      data: { url: url || '/', ...data }
    })

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key
          }
        }, notificationPayload)
      )
    )

    // Optional: cleanup invalid subscriptions here by deleting them from DB if result is a 410 Gone

    return new Response(
      JSON.stringify({ message: 'Push notifications sent', results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
