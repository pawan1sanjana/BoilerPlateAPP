import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import {
  isBiometricAvailable,
  registerBiometric,
  authenticateWithBiometric,
} from '@/lib/webauthn'

// ─── localStorage keys ─────────────────────────────────────────────────────────
const CREDENTIAL_KEY = 'app-biometric-credential'
const SESSION_CACHE_KEY = 'app-biometric-session'
const SETTING_KEY = 'biometric_login_enabled'

// ─── Stored credential shape ───────────────────────────────────────────────────
interface StoredCredential {
  credentialId: string
  userId: string
  email: string
}

function getStoredCredential(): StoredCredential | null {
  try {
    const raw = localStorage.getItem(CREDENTIAL_KEY)
    return raw ? (JSON.parse(raw) as StoredCredential) : null
  } catch {
    return null
  }
}

function saveStoredCredential(cred: StoredCredential) {
  try {
    localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(cred))
  } catch {}
}

function clearStoredCredential() {
  try {
    localStorage.removeItem(CREDENTIAL_KEY)
    localStorage.removeItem(SESSION_CACHE_KEY)
  } catch {}
}

// ─── Store interface ───────────────────────────────────────────────────────────
interface BiometricState {
  /** Global admin toggle — is biometric login enabled for this system? */
  biometricEnabled: boolean
  /** Is the current device/browser capable of biometric auth? */
  isSupported: boolean
  /** Does this device already have a registered passkey? */
  hasCredential: boolean
  isLoading: boolean

  /** Detect browser/device WebAuthn support */
  checkSupport: () => Promise<void>
  /** Fetch the global enabled flag from system_settings */
  fetch: () => Promise<void>
  /** Admin toggle — enable or disable biometrics system-wide */
  setBiometricEnabled: (value: boolean) => Promise<boolean>

  /**
   * Register a passkey for the current device.
   * Must be called while the user is already authenticated (after email+password login).
   * @param refreshToken The current Supabase refresh_token to cache for future biometric logins
   */
  register: (
    userId: string,
    userName: string,
    userEmail: string,
    refreshToken: string,
  ) => Promise<boolean>

  /**
   * Authenticate via biometric on this device.
   * Returns the stored user info and cached refresh token on success, null if cancelled.
   */
  authenticate: () => Promise<{
    userId: string
    email: string
    refreshToken: string | null
  } | null>

  /** Remove the passkey from this device and from Supabase */
  removeCredential: () => Promise<boolean>

  /** Cache the current session refresh token for biometric logins */
  cacheSession: (refreshToken: string) => void

  /** Get the cached refresh token (used during biometric login) */
  getCachedRefreshToken: () => string | null
}

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useBiometricStore = create<BiometricState>((set, get) => ({
  biometricEnabled: true,
  isSupported: false,
  hasCredential: !!getStoredCredential(),
  isLoading: true,

  checkSupport: async () => {
    const supported = await isBiometricAvailable()
    set({ isSupported: supported })
  },

  fetch: async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle()

      // Default to enabled if the row doesn't exist yet
      const enabled = data ? data.value !== 'false' : true
      set({ biometricEnabled: enabled, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  setBiometricEnabled: async (value: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: SETTING_KEY, value: value ? 'true' : 'false' }, { onConflict: 'key' })

      if (error) throw error
      set({ biometricEnabled: value })
      return true
    } catch (e) {
      console.error('Failed to save biometric setting:', e)
      return false
    }
  },

  register: async (userId, userName, userEmail, refreshToken) => {
    try {
      const { credentialId, publicKey } = await registerBiometric(userId, userName, userEmail)

      // Detect device type for the admin's display in passkey_credentials
      const deviceName = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? 'Mobile Device'
        : /Mac/i.test(navigator.userAgent)
        ? 'Mac (Touch ID)'
        : /Win/i.test(navigator.userAgent)
        ? 'Windows (Hello)'
        : 'Desktop'

      // Persist to Supabase (for admin management, visibility, and last-used tracking)
      const { error: dbError } = await supabase
        .from('passkey_credentials')
        .upsert(
          {
            user_id: userId,
            credential_id: credentialId,
            public_key: publicKey,
            device_name: deviceName,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: 'credential_id' },
        )

      if (dbError) {
        console.warn('Could not save passkey to Supabase (may not exist yet):', dbError.message)
        // Continue anyway — local-only registration still works
      }

      // Persist credential identifier locally
      saveStoredCredential({ credentialId, userId, email: userEmail })

      // Cache the refresh token behind the biometric gate
      try {
        localStorage.setItem(SESSION_CACHE_KEY, refreshToken)
      } catch {}

      set({ hasCredential: true })
      return true
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the biometric prompt — not an error
        return false
      }
      console.error('Biometric registration failed:', err)
      throw err
    }
  },

  authenticate: async () => {
    const stored = getStoredCredential()
    if (!stored) return null

    const success = await authenticateWithBiometric(stored.credentialId)
    if (!success) return null

    // Update last_used_at (non-critical, fire-and-forget)
    supabase
      .from('passkey_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('credential_id', stored.credentialId)
      .then()

    const refreshToken = get().getCachedRefreshToken()
    return { userId: stored.userId, email: stored.email, refreshToken }
  },

  removeCredential: async () => {
    const stored = getStoredCredential()
    try {
      if (stored) {
        await supabase
          .from('passkey_credentials')
          .delete()
          .eq('credential_id', stored.credentialId)
      }
    } catch (e) {
      console.warn('Could not remove passkey from Supabase:', e)
    } finally {
      clearStoredCredential()
      set({ hasCredential: false })
    }
    return true
  },

  cacheSession: (refreshToken: string) => {
    try {
      localStorage.setItem(SESSION_CACHE_KEY, refreshToken)
    } catch {}
  },

  getCachedRefreshToken: () => {
    try {
      return localStorage.getItem(SESSION_CACHE_KEY)
    } catch {
      return null
    }
  },
}))
