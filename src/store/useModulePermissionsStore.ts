import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type ModuleKey = 'dashboard' | 'administration' | 'calculators' | 'estates_management' | 'chatbot' | 'gis' | 'weather' | 'compliances' | 'reports' | 'muster' | 'attendance' | 'smart_muster' | 'inventory' | 'audits' | 'payrall' | 'crop' | 'other_crop' | 'rounds_monitor' | 'finance' | 'weighing'

export const ALL_MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Main overview dashboard' },
  { key: 'chatbot', label: 'AI Assistant', description: 'AI Chatbot and tools' },
  { key: 'administration', label: 'Administration', description: 'System settings and user management' },
  { key: 'calculators', label: 'Calculators', description: 'Interactive tools and calculators' },
  { key: 'estates_management', label: 'Estates & Factories', description: 'Tea Estates and Factories Management' },
  { key: 'gis', label: 'GIS', description: 'Geographic Information System' },
  { key: 'weather', label: 'Weather', description: 'Realtime and historical weather data' },
  { key: 'compliances', label: 'Compliances', description: 'Estate compliances and guidelines' },
  { key: 'reports', label: 'Reports', description: 'System reports and analytics' },
  { key: 'muster', label: 'HR', description: 'Workforce and muster management' },
  { key: 'smart_muster', label: 'Smart Muster', description: 'Daily muster assignments' },
  { key: 'attendance', label: 'Attendance', description: 'Attendance tracking' },
  { key: 'inventory', label: 'Inventory', description: 'Goods, physical and biological asset management' },
  { key: 'audits', label: 'Audits', description: 'Physical and biological asset audits' },
  { key: 'finance', label: 'Finance', description: 'Financial management and Chart of Accounts' },
  { key: 'other_crop', label: 'Other Crops', description: 'Other crops management' },
  { key: 'weighing', label: 'Weighing Scale', description: 'Bluetooth scale management and weighing sessions' },
]

export interface SubModuleDef {
  key: string
  label: string
  moduleKey: ModuleKey
  path: string
  exact?: boolean
}

export const SUB_MODULES: SubModuleDef[] = [
  { key: 'estates_management/estates', label: 'Estates List', moduleKey: 'estates_management', path: '/estates' },
  { key: 'estates_management/factories', label: 'Factories List', moduleKey: 'estates_management', path: '/factories' },
  { key: 'smart_muster/daily', label: 'Daily Muster', moduleKey: 'smart_muster', path: '/muster/daily' },
  { key: 'smart_muster/release', label: 'Duty Release', moduleKey: 'smart_muster', path: '/muster/release' },
  { key: 'dashboard', label: 'Dashboard', moduleKey: 'dashboard', path: '/dashboard' },
  { key: 'chatbot', label: 'AI Assistant', moduleKey: 'chatbot', path: '/chatbot' },
  { key: 'admin/accounts', label: 'Accounts', moduleKey: 'administration', path: '/accounts' },
  { key: 'admin/settings', label: 'System Settings', moduleKey: 'administration', path: '/settings', exact: true },
  { key: 'calculators/ph-dolomite', label: 'PH Dolomite', moduleKey: 'calculators', path: '/calculators/ph-dolomite' },
  { key: 'calculators/foliar-spray', label: 'Foliar Spray', moduleKey: 'calculators', path: '/calculators/foliar-spray' },
  { key: 'calculators/units', label: 'Units Converter', moduleKey: 'calculators', path: '/calculators/units-converter' },
  { key: 'gis/boundary-tracker', label: 'Boundary Tracker', moduleKey: 'gis', path: '/gis/boundary-tracker' },
  { key: 'gis/field-map', label: 'Field Map', moduleKey: 'gis', path: '/gis/field-map' },
  { key: 'gis/field-data', label: 'Field Data', moduleKey: 'gis', path: '/gis/field-data' },
  { key: 'weather/realtime', label: 'Realtime Weather', moduleKey: 'weather', path: '/weather', exact: true },
  { key: 'weather/historical', label: 'Historical Data', moduleKey: 'weather', path: '/weather/historical' },
  { key: 'compliances/epf', label: 'EPF Guidelines', moduleKey: 'compliances', path: '/compliances/epf' },
  { key: 'compliances/etf', label: 'ETF Guidelines', moduleKey: 'compliances', path: '/compliances/etf' },
  { key: 'compliances/subsidies', label: 'Tea Subsidies', moduleKey: 'compliances', path: '/compliances/subsidies' },
  { key: 'compliances/cinnamon', label: 'Other Crops', moduleKey: 'compliances', path: '/compliances/cinnamon' },
  { key: 'compliances/revenue-license', label: 'Revenue License', moduleKey: 'compliances', path: '/compliances/revenue-license' },
  { key: 'compliances/insurance', label: 'Insurance', moduleKey: 'compliances', path: '/compliances/insurance' },
  { key: 'reports/attendance', label: 'Attendance Reports', moduleKey: 'reports', path: '/reports/attendance' },
  { key: 'reports/epf-etf', label: 'EPF / ETF Report', moduleKey: 'reports', path: '/reports/epf-etf' },
  // Inventory sub-modules
  { key: 'inventory/goods', label: 'Goods Inventory', moduleKey: 'inventory', path: '/inventory/goods', exact: true },
  { key: 'inventory/add_goods', label: 'Register Item', moduleKey: 'inventory', path: '/inventory/goods/new' },
  { key: 'inventory/issue_goods', label: 'Issue Items', moduleKey: 'inventory', path: '/inventory/goods/issue' },
  { key: 'inventory/issue_history', label: 'Issue History', moduleKey: 'inventory', path: '/inventory/goods/history' },
  { key: 'inventory/tea_packets', label: 'Tea Packets', moduleKey: 'inventory', path: '/inventory/tea-packets' },
  { key: 'inventory/suppliers', label: 'Supplier Directory', moduleKey: 'inventory', path: '/inventory/suppliers' },
  { key: 'inventory/biological', label: 'Biological Assets', moduleKey: 'inventory', path: '/inventory/biological' },
  { key: 'inventory/physical', label: 'Physical Assets', moduleKey: 'inventory', path: '/inventory/physical' },
  { key: 'reports/inventory', label: 'Inventory Reports', moduleKey: 'reports', path: '/reports/inventory' },
  { key: 'reports/audits', label: 'Assets Audit Reports', moduleKey: 'reports', path: '/reports/audits' },
  { key: 'audits/physical', label: 'Asset Audit Scanner', moduleKey: 'audits', path: '/audits/physical' },
  { key: 'audits/biological', label: 'Bio Asset Audit', moduleKey: 'audits', path: '/audits/biological' },
  { key: 'crop/weeding', label: 'Weeding Registry', moduleKey: 'crop', path: '/crop/weeding' },
  { key: 'crop/manure', label: 'Manure Registry', moduleKey: 'crop', path: '/crop/manure' },
  { key: 'crop/lopping', label: 'Lopping Registry', moduleKey: 'crop', path: '/crop/lopping' },
  { key: 'crop/foliar-applications', label: 'Foliar Applications', moduleKey: 'crop', path: '/crop/foliar-applications' },
  { key: 'crop/other-works', label: 'Other Works', moduleKey: 'crop', path: '/crop/other-works' },
  { key: 'other_crop/intel', label: 'Other Crop Intel', moduleKey: 'other_crop', path: '/other-crop' },
  { key: 'rounds/foliar', label: 'Foliar Monitor', moduleKey: 'rounds_monitor', path: '/rounds/foliar' },
  { key: 'rounds/weeding', label: 'Weeding Monitor', moduleKey: 'rounds_monitor', path: '/rounds/weeding' },
  { key: 'rounds/plucking', label: 'Plucking Monitor', moduleKey: 'rounds_monitor', path: '/rounds/plucking' },
  { key: 'rounds/manure', label: 'Manure Monitor', moduleKey: 'rounds_monitor', path: '/rounds/manure' },
  { key: 'rounds/pruning', label: 'Pruning Monitor', moduleKey: 'rounds_monitor', path: '/rounds/pruning' },
  { key: 'rounds/lopping', label: 'Lopping Monitor', moduleKey: 'rounds_monitor', path: '/rounds/lopping' },
  // Finance sub-modules
  { key: 'finance/chart-of-accounts', label: 'Chart of Accounts', moduleKey: 'finance', path: '/finance/chart-of-accounts' },
  { key: 'finance/expenses', label: 'Expenses Analysis', moduleKey: 'finance', path: '/finance/expenses' },
  { key: 'finance/income', label: 'Income Analysis', moduleKey: 'finance', path: '/finance/income' },
  { key: 'finance/cop', label: 'Daily & Weekly COP', moduleKey: 'finance', path: '/finance/cop' },
  // Weighing Scale sub-modules
  { key: 'weighing/scales', label: 'Scale Management', moduleKey: 'weighing', path: '/weighing/scales' },
  { key: 'weighing/console', label: 'Weighing Console', moduleKey: 'weighing', path: '/weighing/console' },
  // Settings sub-modules
  { key: 'settings/profile', label: 'Settings: Profile', moduleKey: 'administration', path: '/settings/profile' },
  { key: 'settings/security', label: 'Settings: Security', moduleKey: 'administration', path: '/settings/security' },
  { key: 'settings/preferences', label: 'Settings: Preferences', moduleKey: 'administration', path: '/settings/preferences' },
  { key: 'settings/currency', label: 'Settings: Currency', moduleKey: 'administration', path: '/settings/currency' },
  { key: 'settings/sessions', label: 'Settings: Sessions', moduleKey: 'administration', path: '/settings/sessions' },
  { key: 'settings/security_policy', label: 'Settings: Security Policy', moduleKey: 'administration', path: '/settings/security_policy' },
  { key: 'settings/smtp', label: 'Settings: Email / SMTP', moduleKey: 'administration', path: '/settings/smtp' },
  { key: 'settings/system_prefs', label: 'Settings: Regional & Time', moduleKey: 'administration', path: '/settings/system_prefs' },
  { key: 'settings/audit_log', label: 'Settings: Audit Log', moduleKey: 'administration', path: '/settings/audit_log' },
  { key: 'settings/backup', label: 'Settings: Backup & Export', moduleKey: 'administration', path: '/settings/backup' },
]

export type AppRole = 'admin' | 'estate_manager' | 'estate_office' | 'field_officer' | 'user'

export const ALL_ROLES: { key: AppRole; label: string; color: string }[] = [
  { key: 'admin', label: 'System Administrator', color: 'red' },
  { key: 'estate_manager', label: 'Estate Manager', color: 'purple' },
  { key: 'estate_office', label: 'Estate Office', color: 'blue' },
  { key: 'field_officer', label: 'Field Officer', color: 'emerald' },
  { key: 'user', label: 'User', color: 'slate' },
]

const DEFAULT_MODULE_ACCESS: Record<AppRole, ModuleKey[]> = {
  admin: ['dashboard', 'chatbot', 'administration', 'calculators', 'estates_management', 'gis', 'weather', 'compliances', 'reports', 'muster', 'attendance', 'smart_muster', 'inventory', 'audits', 'finance', 'crop', 'rounds_monitor', 'payrall', 'other_crop', 'weighing'],
  estate_manager: ['dashboard', 'chatbot', 'administration', 'calculators', 'estates_management', 'gis', 'weather', 'compliances', 'reports', 'muster', 'attendance', 'smart_muster', 'inventory', 'audits', 'finance', 'crop', 'rounds_monitor', 'payrall', 'other_crop', 'weighing'],
  estate_office: ['dashboard', 'chatbot', 'calculators', 'estates_management', 'gis', 'weather', 'compliances', 'reports', 'muster', 'attendance', 'smart_muster', 'inventory', 'audits', 'finance', 'crop', 'rounds_monitor', 'payrall', 'other_crop', 'weighing'],
  field_officer: ['dashboard', 'chatbot', 'gis', 'weather', 'muster', 'attendance', 'smart_muster', 'inventory', 'audits', 'crop', 'rounds_monitor', 'other_crop', 'weighing'],
  user: ['dashboard', 'chatbot', 'calculators', 'weather'],
}

function buildDefaultSubPermissions(): SubPermissionMatrix {
  const result = {} as SubPermissionMatrix
  for (const role of ALL_ROLES) {
    const allowedMods = new Set<ModuleKey>(DEFAULT_MODULE_ACCESS[role.key] ?? [])
    result[role.key] = SUB_MODULES
      .filter(sub => allowedMods.has(sub.moduleKey))
      .map(sub => sub.key)
  }
  result.admin = SUB_MODULES.map(s => s.key)
  return result
}

export const DEFAULT_SUB_PERMISSIONS = buildDefaultSubPermissions()

export type SubPermissionMatrix = Record<AppRole, string[]>
export type PermissionMatrix = SubPermissionMatrix

const SORTED_SUB_MODULES = [...SUB_MODULES].sort((a, b) => b.path.length - a.path.length)

function findSubModuleForPath(pathname: string): SubModuleDef | null {
  for (const sub of SORTED_SUB_MODULES) {
    const match = sub.exact ? pathname === sub.path : pathname.startsWith(sub.path)
    if (match) return sub
  }
  return null
}

const STORAGE_KEY = 'boilerplate-sub-permissions'

function loadFromStorage(): SubPermissionMatrix {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SubPermissionMatrix
      
      for (const role of ALL_ROLES) {
        if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/profile')) {
          parsed[role.key].push('settings/profile', 'settings/security', 'settings/preferences', 'settings/currency', 'settings/sessions')
        }
        if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/security_policy')) {
          parsed[role.key].push('settings/security_policy', 'settings/smtp', 'settings/system_prefs', 'settings/audit_log', 'settings/backup')
        }
        if (parsed[role.key] && !parsed[role.key].includes('chatbot')) {
          parsed[role.key].push('chatbot')
        }
        
        // Migrate old 'estates' & 'factories' permissions to the new combined module keys
        if (parsed[role.key]) {
          if (parsed[role.key].includes('estates')) {
            parsed[role.key] = parsed[role.key].filter((k: string) => k !== 'estates')
            if (!parsed[role.key].includes('estates_management/estates')) parsed[role.key].push('estates_management/estates')
          }
          if (parsed[role.key].includes('factories')) {
            parsed[role.key] = parsed[role.key].filter((k: string) => k !== 'factories')
            if (!parsed[role.key].includes('estates_management/factories')) parsed[role.key].push('estates_management/factories')
          }
          
          // Migrate missing sub-modules for new features (GIS, Weather, Compliances, Reports)
          const defaultAllowedMods = new Set<ModuleKey>(DEFAULT_MODULE_ACCESS[role.key] ?? [])
          const defaultSubs = SUB_MODULES.filter(s => defaultAllowedMods.has(s.moduleKey)).map(s => s.key)
          const missingNewMods = defaultSubs.filter(k => 
            (k.startsWith('gis/') || k.startsWith('weather/') || k.startsWith('compliances/') || k.startsWith('reports/') || k.startsWith('muster/') || k.startsWith('smart_muster/') || k.startsWith('inventory/') || k.startsWith('audits/') || k.startsWith('finance/') || k.startsWith('crop/') || k.startsWith('other_crop/') || k.startsWith('weighing/')) &&
            !parsed[role.key].includes(k)
          )
          if (missingNewMods.length > 0) {
            parsed[role.key].push(...missingNewMods)
          }
        }
      }

      parsed.admin = SUB_MODULES.map(s => s.key)
      return parsed
    }
  } catch {}
  return buildDefaultSubPermissions()
}

function saveToStorage(matrix: SubPermissionMatrix) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix))
  } catch {}
}

interface AccessCheckResult {
  allowed: boolean
  label: string
}

interface ModulePermissionsState {
  subPermissions: SubPermissionMatrix
  isLoading: boolean
  fetch: (estateId?: string, role?: string) => Promise<void>
  checkAccess: (role: AppRole | null | undefined, pathname: string) => AccessCheckResult
  hasModuleAccess: (role: AppRole | null | undefined, moduleKey: ModuleKey) => boolean
  setSubPermission: (role: AppRole, subKey: string, allowed: boolean) => void
  setModuleSubPermissions: (role: AppRole, moduleKey: ModuleKey, allowed: boolean) => void
  saveSubPermissions: (matrix: SubPermissionMatrix, estateId?: string) => void
  savePermissions: (matrix: SubPermissionMatrix, estateId?: string) => void
  resetToDefaults: (estateId?: string) => void
  getSubCountForModule: (role: AppRole, moduleKey: ModuleKey) => { enabled: number; total: number }
}

export const useModulePermissionsStore = create<ModulePermissionsState>((set, get) => ({
  subPermissions: loadFromStorage(),
  isLoading: false,

  fetch: async (estateId?: string, role?: string) => {
    set({ isLoading: true })
    try {
      if (role === 'admin') {
         const defaults = buildDefaultSubPermissions()
         saveToStorage(defaults)
         set({ subPermissions: defaults, isLoading: false })
         return
      }

      if (!estateId) {
        set({ isLoading: false })
        return
      }

      const { data, error } = await supabase
        .from('estates')
        .select('provisioned_modules')
        .eq('id', estateId)
        .maybeSingle()

      if (!error && data?.provisioned_modules) {
        const parsed = data.provisioned_modules as SubPermissionMatrix
        
        for (const role of ALL_ROLES) {
          if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/profile')) {
            parsed[role.key].push('settings/profile', 'settings/security', 'settings/preferences', 'settings/currency', 'settings/sessions')
          }
          if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/security_policy')) {
            parsed[role.key].push('settings/security_policy', 'settings/smtp', 'settings/system_prefs', 'settings/audit_log', 'settings/backup')
          }
          if (parsed[role.key] && !parsed[role.key].includes('chatbot')) {
            parsed[role.key].push('chatbot')
          }
          
          // Migrate old 'estates' & 'factories' permissions to the new combined module keys
          if (parsed[role.key]) {
            if (parsed[role.key].includes('estates')) {
              parsed[role.key] = parsed[role.key].filter((k: string) => k !== 'estates')
              if (!parsed[role.key].includes('estates_management/estates')) parsed[role.key].push('estates_management/estates')
            }
            if (parsed[role.key].includes('factories')) {
              parsed[role.key] = parsed[role.key].filter((k: string) => k !== 'factories')
              if (!parsed[role.key].includes('estates_management/factories')) parsed[role.key].push('estates_management/factories')
            }
          }
          
          // Migrate missing sub-modules for new features (GIS, Weather, Compliances, Reports)
          if (parsed[role.key]) {
            const defaultAllowedMods = new Set<ModuleKey>(DEFAULT_MODULE_ACCESS[role.key] ?? [])
            const defaultSubs = SUB_MODULES.filter(s => defaultAllowedMods.has(s.moduleKey)).map(s => s.key)
            const missingNewMods = defaultSubs.filter(k => 
              (k.startsWith('gis/') || k.startsWith('weather/') || k.startsWith('compliances/') || k.startsWith('reports/') || k.startsWith('muster/') || k.startsWith('smart_muster/') || k.startsWith('inventory/') || k.startsWith('audits/') || k.startsWith('finance/') || k.startsWith('crop/') || k.startsWith('other_crop/')) &&
              !parsed[role.key].includes(k)
            )
            if (missingNewMods.length > 0) {
              parsed[role.key].push(...missingNewMods)
            }
          }
        }

        parsed.admin = SUB_MODULES.map(s => s.key)
        saveToStorage(parsed)
        set({ subPermissions: parsed, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  checkAccess: (role, pathname) => {
    if (!role || role === 'admin') return { allowed: true, label: '' }
    const { subPermissions } = get()
    const allowedSubs = new Set(subPermissions[role] ?? [])
    const sub = findSubModuleForPath(pathname)
    if (!sub) return { allowed: true, label: '' }
    const allowed = allowedSubs.has(sub.key)
    if (!allowed) {
      const mod = ALL_MODULES.find(m => m.key === sub.moduleKey)
      return { allowed: false, label: sub.label || mod?.label || 'this page' }
    }
    return { allowed: true, label: '' }
  },

  hasModuleAccess: (role, moduleKey) => {
    if (!role || role === 'admin') return true
    const { subPermissions } = get()
    const allowedSubs = new Set(subPermissions[role] ?? [])
    return SUB_MODULES
      .filter(s => s.moduleKey === moduleKey)
      .some(s => allowedSubs.has(s.key))
  },

  setSubPermission: (role, subKey, allowed) => {
    if (role === 'admin') return
    set(state => {
      const current = new Set(state.subPermissions[role] ?? [])
      if (allowed) current.add(subKey)
      else current.delete(subKey)
      const updated = { ...state.subPermissions, [role]: Array.from(current) }
      saveToStorage(updated)
      return { subPermissions: updated }
    })
  },

  setModuleSubPermissions: (role, moduleKey, allowed) => {
    if (role === 'admin') return
    const modSubs = SUB_MODULES.filter(s => s.moduleKey === moduleKey).map(s => s.key)
    set(state => {
      const current = new Set(state.subPermissions[role] ?? [])
      if (allowed) modSubs.forEach(k => current.add(k))
      else modSubs.forEach(k => current.delete(k))
      const updated = { ...state.subPermissions, [role]: Array.from(current) }
      saveToStorage(updated)
      return { subPermissions: updated }
    })
  },

  saveSubPermissions: async (matrix, estateId?: string) => {
    const safe = { ...matrix, admin: SUB_MODULES.map(s => s.key) }
    saveToStorage(safe)
    set({ subPermissions: safe })
    if (estateId) {
      try {
        await supabase.from('estates').update({ provisioned_modules: safe }).eq('id', estateId)
      } catch {}
    }
  },

  savePermissions: (matrix, estateId?: string) => {
    get().saveSubPermissions(matrix, estateId)
  },

  resetToDefaults: async (estateId?: string) => {
    const defaults = buildDefaultSubPermissions()
    saveToStorage(defaults)
    set({ subPermissions: defaults })
    if (estateId) {
      try {
        await supabase.from('estates').update({ provisioned_modules: defaults }).eq('id', estateId)
      } catch {}
    }
  },

  getSubCountForModule: (role, moduleKey) => {
    const { subPermissions } = get()
    const allowedSubs = new Set(subPermissions[role] ?? [])
    const modSubs = SUB_MODULES.filter(s => s.moduleKey === moduleKey)
    return {
      enabled: modSubs.filter(s => allowedSubs.has(s.key)).length,
      total: modSubs.length,
    }
  },
}))
