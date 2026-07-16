import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface ModuleOrderState {
  mainOrder: string[]
  subOrders: Record<string, string[]>
  settingsOrder: string[]
  isLoading: boolean
  fetch: () => Promise<void>
  saveOrder: (mainOrder: string[], subOrders: Record<string, string[]>, settingsOrder: string[]) => Promise<boolean>
  resetToDefault: () => Promise<boolean>
}

export const DEFAULT_MAIN_ORDER = ['dashboard', 'administration']
export const DEFAULT_SUB_ORDERS: Record<string, string[]> = {
  administration: ['admin/accounts', 'admin/settings']
}
export const DEFAULT_SETTINGS_ORDER = [
  'profile', 'security', 'preferences', 'currency', 'sessions',
  'branding', 'report_export', 'maintenance_mode', 'module_access',
  'security_policy', 'smtp', 'system_prefs', 'audit_log', 'backup',
  'system_info', 'module_order'
]

export const useModuleOrderStore = create<ModuleOrderState>((set) => ({
  mainOrder: DEFAULT_MAIN_ORDER,
  subOrders: DEFAULT_SUB_ORDERS,
  settingsOrder: DEFAULT_SETTINGS_ORDER,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'module_order')
        .maybeSingle()

      if (!error && data?.value) {
        const parsed = JSON.parse(data.value)
        
        // Basic validation/fallback
        const mainOrder = Array.isArray(parsed.mainOrder) && parsed.mainOrder.length > 0 ? parsed.mainOrder : DEFAULT_MAIN_ORDER
        const subOrders = parsed.subOrders || DEFAULT_SUB_ORDERS
        const settingsOrder = Array.isArray(parsed.settingsOrder) && parsed.settingsOrder.length > 0 ? parsed.settingsOrder : DEFAULT_SETTINGS_ORDER

        set({ mainOrder, subOrders, settingsOrder, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  saveOrder: async (mainOrder, subOrders, settingsOrder) => {
    set({ mainOrder, subOrders, settingsOrder })
    try {
      const payload = { mainOrder, subOrders, settingsOrder }
      const { error } = await supabase.from('system_settings').upsert({
        key: 'module_order',
        value: JSON.stringify(payload)
      })
      return !error
    } catch {
      return false
    }
  },

  resetToDefault: async () => {
    set({ mainOrder: DEFAULT_MAIN_ORDER, subOrders: DEFAULT_SUB_ORDERS, settingsOrder: DEFAULT_SETTINGS_ORDER })
    try {
      const payload = { mainOrder: DEFAULT_MAIN_ORDER, subOrders: DEFAULT_SUB_ORDERS, settingsOrder: DEFAULT_SETTINGS_ORDER }
      const { error } = await supabase.from('system_settings').upsert({
        key: 'module_order',
        value: JSON.stringify(payload)
      })
      return !error
    } catch {
      return false
    }
  }
}))
