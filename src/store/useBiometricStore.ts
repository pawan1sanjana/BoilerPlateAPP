import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// ─── localStorage keys ─────────────────────────────────────────────────────────
const SETTING_KEY = 'biometric_login_enabled'

// ─── Store interface ───────────────────────────────────────────────────────────
interface BiometricState {
  /** Global admin toggle — is biometric login enabled for this system? */
  biometricEnabled: boolean
  /** Is the current device/browser capable of biometric auth? */
  isSupported: boolean
  /** Does the current user have any passkeys enrolled? */
  hasCredential: boolean
  isLoading: boolean

  /** Detect browser/device WebAuthn support */
  checkSupport: () => Promise<void>
  /** Fetch the global enabled flag from system_settings and check user's passkeys */
  fetch: () => Promise<void>
  /** Admin toggle — enable or disable biometrics system-wide */
  setBiometricEnabled: (value: boolean) => Promise<boolean>

  /**
   * Register a native passkey for the current authenticated user.
   */
  register: () => Promise<boolean>

  /**
   * Authenticate via passkey.
   * Returns true if successful (and Supabase SDK will automatically update the session).
   */
  authenticate: () => Promise<boolean>

  /** Remove all passkeys for the current user */
  removeCredential: () => Promise<boolean>
}

// ─── Store ─────────────────────────────────────────────────────────────────────
export const useBiometricStore = create<BiometricState>((set) => ({
  biometricEnabled: true,
  isSupported: false,
  hasCredential: false,
  isLoading: true,

  checkSupport: async () => {
    // Basic check for WebAuthn support
    let supported = typeof window !== 'undefined' && !!(navigator.credentials && window.PublicKeyCredential)
    
    if (supported && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        supported = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      } catch (e) {
        console.warn('Failed to check platform authenticator availability', e)
      }
    }
    
    set({ isSupported: supported })
  },

  fetch: async () => {
    try {
      // 1. Fetch system setting
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle()

      const enabled = data ? data.value !== 'false' : true
      
      // 2. Fetch if user has passkeys
      let hasPasskey = false
      const { data: sessionData } = await supabase.auth.getSession()
      
      if (sessionData?.session) {
        try {
          const { data: passkeys, error } = await supabase.auth.passkey.list()
          if (!error && passkeys && passkeys.length > 0) {
            hasPasskey = true
          }
        } catch (e) {
          // Ignore 404 errors if passkeys are not enabled on this Supabase project
        }
      }

      set({ biometricEnabled: enabled, hasCredential: hasPasskey, isLoading: false })
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

  register: async () => {
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error

      set({ hasCredential: true })
      return true
    } catch (err: any) {
      console.error('Biometric registration failed:', err)
      return false
    }
  },

  authenticate: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPasskey()
      if (error) throw error
      
      return !!data.session
    } catch (err: any) {
      console.error('Biometric authentication failed:', err)
      return false
    }
  },

  removeCredential: async () => {
    try {
      const { data: passkeys } = await supabase.auth.passkey.list()
      if (passkeys) {
        for (const pk of passkeys) {
          await supabase.auth.passkey.delete({ passkeyId: pk.id })
        }
      }
      set({ hasCredential: false })
      return true
    } catch (e) {
      console.warn('Could not remove passkey:', e)
      return false
    }
  },
}))
