import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuditLogStore } from './useAuditLogStore'

export interface SecurityPolicy {
  minPasswordLength: number
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  sessionTimeoutMinutes: number
  maxConcurrentSessions: number
}

const DEFAULT_POLICY: SecurityPolicy = {
  minPasswordLength: 8,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 60,
  maxConcurrentSessions: 3,
}

const SETTING_KEY = 'security_policy'

interface SecurityPolicyState {
  policy: SecurityPolicy
  isLoading: boolean
  fetch: () => Promise<void>
  savePolicy: (policy: SecurityPolicy) => Promise<boolean>
}

export const useSecurityPolicyStore = create<SecurityPolicyState>((set, get) => ({
  policy: DEFAULT_POLICY,
  isLoading: true,
  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle()

      if (!error && data?.value) {
        set({ policy: { ...DEFAULT_POLICY, ...JSON.parse(data.value) }, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
  savePolicy: async (policy) => {
    try {
      const oldPolicy = get().policy
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: SETTING_KEY, value: JSON.stringify(policy) })

      if (error) throw error
      
      set({ policy })
      
      // Log the change
      useAuditLogStore.getState().logAction(
        'UPDATE_SECURITY_POLICY', 
        'system_settings', 
        JSON.stringify(oldPolicy), 
        JSON.stringify(policy)
      )
      
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
}))
