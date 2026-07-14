import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuditLogStore } from './useAuditLogStore'

export interface SmtpConfig {
  host: string
  port: number
  encryption: 'none' | 'starttls' | 'ssl/tls'
  username: string
  password?: string
  fromName: string
  fromEmail: string
}

const DEFAULT_SMTP: SmtpConfig = {
  host: '',
  port: 587,
  encryption: 'starttls',
  username: '',
  fromName: 'My Application',
  fromEmail: 'noreply@example.com'
}

const SETTING_KEY = 'smtp_config'

interface SmtpState {
  config: SmtpConfig
  isLoading: boolean
  fetch: () => Promise<void>
  saveConfig: (config: SmtpConfig) => Promise<boolean>
}

export const useSmtpStore = create<SmtpState>((set) => ({
  config: DEFAULT_SMTP,
  isLoading: true,
  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle()

      if (!error && data?.value) {
        const parsed = JSON.parse(data.value)
        set({ config: { ...DEFAULT_SMTP, ...parsed }, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
  saveConfig: async (config) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: SETTING_KEY, value: JSON.stringify(config) })

      if (error) throw error
      
      set({ config })
      
      // Log the change (masking password)
      const sanitized = { ...config, password: config.password ? '********' : '' }
      useAuditLogStore.getState().logAction('UPDATE_SMTP_CONFIG', 'system_settings', null, JSON.stringify(sanitized))
      
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
}))
