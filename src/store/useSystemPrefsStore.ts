import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export interface SystemPrefs {
  timezone: string
  dateFormat: string // 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
  numberFormat: string // '1,234.56' or '1.234,56'
  language: string
  showScrollToTop: boolean
}

const DEFAULT_PREFS: SystemPrefs = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'DD/MM/YYYY',
  numberFormat: '1,234.56',
  language: 'english',
  showScrollToTop: true
}

interface SystemPrefsState {
  prefs: SystemPrefs
  setPrefs: (prefs: Partial<SystemPrefs>) => void
  fetchUserPrefs: (userId: string) => Promise<void>
  saveUserPrefs: (userId: string, prefs: SystemPrefs) => Promise<boolean>
}

export const useSystemPrefsStore = create<SystemPrefsState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFS,
      setPrefs: (newPrefs) => set((state) => ({ prefs: { ...state.prefs, ...newPrefs } })),
      fetchUserPrefs: async (userId) => {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `user_prefs_${userId}`)
            .maybeSingle()

          if (!error && data?.value) {
            set({ prefs: { ...DEFAULT_PREFS, ...JSON.parse(data.value) } })
          }
        } catch (e) {
          console.error(e)
        }
      },
      saveUserPrefs: async (userId, prefs) => {
        try {
          const { error } = await supabase
            .from('system_settings')
            .upsert({ key: `user_prefs_${userId}`, value: JSON.stringify(prefs) })

          if (error) throw error
          set({ prefs })
          return true
        } catch (e) {
          console.error(e)
          return false
        }
      }
    }),
    {
      name: 'BoilerplateApp-system-prefs'
    }
  )
)
