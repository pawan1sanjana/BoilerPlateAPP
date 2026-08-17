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

export const DEFAULT_MAIN_ORDER = ['dashboard', 'crop', 'other_crop', 'rounds_monitor', 'smart_muster', 'attendance', 'muster', 'inventory', 'audits', 'compliances', 'payrall', 'finance', 'weighing', 'estates_management', 'reports', 'gis', 'weather', 'chatbot', 'calculators', 'administration']
export const DEFAULT_SUB_ORDERS: Record<string, string[]> = {

  estates_management: ['estates_management/estates', 'estates_management/factories'],
  muster: ['muster/workers', 'muster/directory', 'muster/enrollment', 'muster/archive'],
  smart_muster: ['smart_muster/daily', 'smart_muster/release'],
  attendance: ['attendance/todays-attendance', 'attendance/face-attendance', 'attendance/qr-attendance', 'attendance/manual-attendance'],
  gis: ['gis/boundary-tracker', 'gis/field-map', 'gis/field-data'],
  weather: ['weather/realtime', 'weather/historical'],
  calculators: ['calculators/ph', 'calculators/foliar', 'calculators/units'],
  administration: ['admin/accounts', 'admin/settings'],
  compliances: ['compliances/epf', 'compliances/etf', 'compliances/subsidies', 'compliances/cinnamon', 'compliances/revenue-license', 'compliances/insurance'],
  reports: ['reports/attendance', 'reports/inventory', 'reports/audits', 'reports/epf-etf'],
  inventory: ['inventory/goods', 'inventory/add_goods', 'inventory/issue_goods', 'inventory/issue_history', 'inventory/tea_packets', 'inventory/suppliers', 'inventory/biological', 'inventory/physical'],
  audits: ['audits/physical', 'audits/biological'],
  crop: ['crop/plucking', 'crop/pruning', 'crop/weeding', 'crop/manure', 'crop/lopping', 'crop/foliar-applications', 'crop/other-works'],
  other_crop: ['other_crop/intel'],
  rounds_monitor: ['rounds/foliar', 'rounds/weeding', 'rounds/plucking', 'rounds/pruning', 'rounds/lopping', 'rounds/manure'],
  payrall: ['payrall/daily', 'payrall/monthly', 'payrall/casual', 'payrall/cash-advance', 'payrall/tea-packet-issue'],
  finance: ['finance/chart-of-accounts', 'finance/expenses', 'finance/income', 'finance/cop'],
  weighing: ['weighing/scales', 'weighing/console'],
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
        let mainOrder = Array.isArray(parsed.mainOrder) && parsed.mainOrder.length > 0 ? parsed.mainOrder : [...DEFAULT_MAIN_ORDER]
        
        // Migrate old 'estates' key to 'estates_management'
        if (mainOrder.includes('estates')) {
          const idx = mainOrder.indexOf('estates')
          mainOrder[idx] = 'estates_management'
        }
        // Remove standalone 'factories' if present
        mainOrder = mainOrder.filter((k: string) => k !== 'factories')
        
        // Ensure new defaults are appended for existing users
        DEFAULT_MAIN_ORDER.forEach(item => {
          if (!mainOrder.includes(item)) {
            mainOrder.push(item)
          }
        })

        // Always bring dashboard to top
        if (mainOrder.includes('dashboard')) {
          mainOrder = ['dashboard', ...mainOrder.filter((k: string) => k !== 'dashboard')]
        }

        // Place smart_muster, attendance, muster, inventory, audits, compliances after rounds_monitor
        if (mainOrder.includes('rounds_monitor')) {
          const rest = mainOrder.filter((k: string) => !['smart_muster', 'attendance', 'muster', 'inventory', 'audits', 'compliances'].includes(k))
          const roundsIdx = rest.indexOf('rounds_monitor')
          if (roundsIdx !== -1) {
            rest.splice(roundsIdx + 1, 0, 'smart_muster', 'attendance', 'muster', 'inventory', 'audits', 'compliances')
            mainOrder = rest
          }
        }

        // Place estates_management at position 17 (right before administration) and administration at bottom
        const rest = mainOrder.filter((k: string) => k !== 'estates_management' && k !== 'administration')
        mainOrder = [...rest, 'estates_management', 'administration']
        const savedSubOrders = parsed.subOrders || {}
        const subOrders = { ...DEFAULT_SUB_ORDERS, ...savedSubOrders }
        
        // Ensure default items exist within each subOrder if it's missing
        Object.keys(DEFAULT_SUB_ORDERS).forEach(mainKey => {
          if (!subOrders[mainKey] || !Array.isArray(subOrders[mainKey]) || subOrders[mainKey].length === 0) {
            subOrders[mainKey] = [...DEFAULT_SUB_ORDERS[mainKey]]
          } else {
            // Merge individual missing sub-items
            DEFAULT_SUB_ORDERS[mainKey].forEach(subItem => {
              if (!subOrders[mainKey].includes(subItem)) {
                subOrders[mainKey].push(subItem)
              }
            })
          }
        })
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
