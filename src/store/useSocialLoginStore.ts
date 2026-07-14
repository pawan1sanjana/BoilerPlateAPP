import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'boilerplate-social-login-enabled'
const SETTING_KEY = 'social_login_enabled'

function loadFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) return raw === 'true'
  } catch {}
  // Default: enabled
  return true
}

function saveToStorage(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  } catch {}
}

interface SocialLoginState {
  socialLoginEnabled: boolean
  isLoading: boolean
  fetch: () => Promise<void>
  setSocialLoginEnabled: (value: boolean) => Promise<boolean>
}

export const useSocialLoginStore = create<SocialLoginState>((set) => ({
  socialLoginEnabled: loadFromStorage(),
  isLoading: true,

  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', SETTING_KEY)
        .maybeSingle()

      if (!error && data) {
        const value = data.value !== 'false' // default true unless explicitly 'false'
        saveToStorage(value)
        set({ socialLoginEnabled: value, isLoading: false })
      } else {
        // Row doesn't exist yet — default to enabled
        set({ socialLoginEnabled: true, isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  setSocialLoginEnabled: async (value: boolean) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: SETTING_KEY, value: value ? 'true' : 'false' }, { onConflict: 'key' })

      if (error) throw error

      saveToStorage(value)
      set({ socialLoginEnabled: value })
      return true
    } catch (e) {
      console.error('Failed to save social login setting', e)
      return false
    }
  },
}))
