import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export type SocialProvider = 'google' | 'facebook' | 'github'

const MASTER_KEY = 'social_login_enabled'
const PROVIDER_KEYS: Record<SocialProvider, string> = {
  google: 'social_login_google',
  facebook: 'social_login_facebook',
  github: 'social_login_github',
}

interface SocialLoginState {
  socialLoginEnabled: boolean
  providers: Record<SocialProvider, boolean>
  isLoading: boolean

  fetch: () => Promise<void>
  setSocialLoginEnabled: (value: boolean) => Promise<boolean>
  setProviderEnabled: (provider: SocialProvider, value: boolean) => Promise<boolean>
  isProviderActive: (provider: SocialProvider) => boolean
}

export const useSocialLoginStore = create<SocialLoginState>()(
  persist(
    (set, get) => ({
      socialLoginEnabled: true,
      providers: {
        google: true,
        facebook: true,
        github: false,
      },
      isLoading: true,

      fetch: async () => {
        try {
          const allKeys = [MASTER_KEY, ...Object.values(PROVIDER_KEYS)]
          const { data, error } = await supabase
            .from('system_settings')
            .select('key, value')
            .in('key', allKeys)

          if (error) throw error

          // Create a quick lookup map from the DB results
          const dbValues = data.reduce((acc, row) => {
            acc[row.key] = row.value !== 'false'
            return acc
          }, {} as Record<string, boolean>)

          set((state) => ({
            socialLoginEnabled: dbValues[MASTER_KEY] ?? state.socialLoginEnabled,
            providers: {
              google: dbValues[PROVIDER_KEYS.google] ?? state.providers.google,
              facebook: dbValues[PROVIDER_KEYS.facebook] ?? state.providers.facebook,
              github: dbValues[PROVIDER_KEYS.github] ?? state.providers.github,
            },
            isLoading: false,
          }))
        } catch {
          set({ isLoading: false })
        }
      },

      setSocialLoginEnabled: async (value: boolean) => {
        const previousState = get().socialLoginEnabled
        // Optimistic UI update
        set({ socialLoginEnabled: value })

        const { error } = await supabase
          .from('system_settings')
          .upsert({ key: MASTER_KEY, value: value ? 'true' : 'false' }, { onConflict: 'key' })

        if (error) {
          // Revert on failure
          set({ socialLoginEnabled: previousState })
          return false
        }
        return true
      },

      setProviderEnabled: async (provider: SocialProvider, value: boolean) => {
        const previousState = get().providers[provider]
        const key = PROVIDER_KEYS[provider]

        // Optimistic UI update
        set((state) => ({
          providers: { ...state.providers, [provider]: value }
        }))

        const { error } = await supabase
          .from('system_settings')
          .upsert({ key, value: value ? 'true' : 'false' }, { onConflict: 'key' })

        if (error) {
          // Revert on failure
          set((state) => ({
            providers: { ...state.providers, [provider]: previousState }
          }))
          return false
        }
        return true
      },

      isProviderActive: (provider: SocialProvider) => {
        const { socialLoginEnabled, providers } = get()
        return socialLoginEnabled && providers[provider]
      },
    }),
    {
      name: 'boilerplate-social-login-storage',
      // Only persist the non-loading values we care about across reloads
      partialize: (state) => ({ 
        socialLoginEnabled: state.socialLoginEnabled, 
        providers: state.providers 
      }),
    }
  )
)
