import { supabase } from './supabase'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'

/**
 * Parse the user-agent string to extract browser, OS, and device info.
 */
function parseUserAgent(ua: string): { browser: string; os: string; device: string; icon: string } {
  // --- Browser detection ---
  let browser = 'Unknown Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer'
  else if (/Chromium/.test(ua)) browser = 'Chromium'

  // --- OS detection ---
  let os = 'Unknown OS'
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11'
  else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1'
  else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS'
  }
  else if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+\.\d+)/)
    os = match ? `Android ${match[1]}` : 'Android'
  }
  else if (/iPhone OS/.test(ua)) {
    const match = ua.match(/iPhone OS (\d+_\d+)/)
    os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS'
  }
  else if (/iPad/.test(ua)) os = 'iPadOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'

  // --- Device detection ---
  let device = 'Desktop'
  let icon = 'Monitor'
  if (/iPhone/.test(ua)) { device = 'iPhone'; icon = 'Smartphone' }
  else if (/iPad/.test(ua)) { device = 'iPad'; icon = 'Tablet' }
  else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = 'Android Phone'; icon = 'Smartphone' }
  else if (/Android/.test(ua)) { device = 'Android Tablet'; icon = 'Tablet' }
  else if (/Mobile/.test(ua)) { device = 'Mobile Device'; icon = 'Smartphone' }
  else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) device = 'Mac'
  else if (/Windows/.test(ua)) device = 'Windows PC'
  else if (/Linux/.test(ua)) device = 'Linux PC'

  return { browser, os, device, icon }
}

/**
 * Derive a stable session token identifier from the Supabase access token.
 * We use the last 32 chars to avoid storing the full JWT.
 */
function deriveSessionToken(accessToken: string): string {
  return accessToken.slice(-32)
}

/**
 * Register or refresh the current session in the user_sessions table.
 * Call this on login and on app mount (if user is authenticated).
 */
export async function registerSession(userId: string, accessToken: string): Promise<void> {
  try {
    const ua = navigator.userAgent
    const { browser, os, device, icon } = parseUserAgent(ua)
    const sessionToken = deriveSessionToken(accessToken)

    // Try to get the public IP address (best-effort, fallback to null)
    let ipAddress: string | null = null
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      ipAddress = data.ip ?? null
    } catch {
      // IP fetch failed — that's fine
    }

    const payload = {
      user_id: userId,
      session_token: sessionToken,
      device,
      browser,
      os,
      ip_address: ipAddress,
      last_active: new Date().toISOString(),
      icon,
    }

    // Upsert — if this token was seen before, just update last_active
    const { error } = await supabase
      .from('user_sessions')
      .upsert(payload, { onConflict: 'session_token' })

    if (error) {
      console.error('Supabase upsert failed (this is expected if the table is not created yet):', error.message)
      return
    }

    // Enforce maxConcurrentSessions
    const maxSessions = useSecurityPolicyStore.getState().policy.maxConcurrentSessions
    
    const { data: activeSessions } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('last_active', { ascending: false })

    if (activeSessions && activeSessions.length > maxSessions) {
      const sessionsToDelete = activeSessions.slice(maxSessions).map(s => s.id)
      if (sessionsToDelete.length > 0) {
        await supabase
          .from('user_sessions')
          .delete()
          .in('id', sessionsToDelete)
      }
    }
  } catch (err) {
    console.warn('Failed to register session:', err)
  }
}

/**
 * Remove the current session from the user_sessions table (called on sign out).
 */
export async function deregisterSession(accessToken: string): Promise<void> {
  try {
    const sessionToken = deriveSessionToken(accessToken)
    await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken)
  } catch (err) {
    console.warn('Failed to deregister session:', err)
  }
}

export async function fetchUserSessions(userId: string, currentAccessToken: string, isAdmin: boolean = false) {
  const currentToken = deriveSessionToken(currentAccessToken)

  let query = supabase
    .from('user_sessions')
    .select('*')
    .order('last_active', { ascending: false })

  if (!isAdmin) {
    query = query.eq('user_id', userId)
  }

  const { data: sessionData, error: sessionError } = await query
  if (sessionError) throw sessionError

  let usersMap = new Map<string, any>()
  if (sessionData && sessionData.length > 0) {
    const userIds = [...new Set(sessionData.map(s => s.user_id))]
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds)
    
    if (!usersError && usersData) {
      usersData.forEach(u => usersMap.set(u.id, u))
    }
  }

  return (sessionData ?? []).map((s: any) => {
    const user = usersMap.get(s.user_id)
    return {
      ...s,
      current: s.session_token === currentToken,
      user_name: user?.name || user?.email || 'Unknown User'
    }
  })
}

/**
 * Revoke a specific session by its ID (delete from user_sessions).
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}
