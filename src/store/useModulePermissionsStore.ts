import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type ModuleKey = 'dashboard' | 'administration'

export const ALL_MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Main overview dashboard' },
  { key: 'administration', label: 'Administration', description: 'System settings and user management' },
]

export interface SubModuleDef {
  key: string
  label: string
  moduleKey: ModuleKey
  path: string
  exact?: boolean
}

export const SUB_MODULES: SubModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', moduleKey: 'dashboard', path: '/dashboard' },
  { key: 'admin/accounts', label: 'Accounts', moduleKey: 'administration', path: '/accounts' },
  { key: 'admin/settings', label: 'System Settings', moduleKey: 'administration', path: '/settings', exact: true },
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

export type AppRole = 'admin' | 'user'

export const ALL_ROLES: { key: AppRole; label: string; color: string }[] = [
  { key: 'admin', label: 'Administrator', color: 'purple' },
  { key: 'user', label: 'User', color: 'blue' },
]

const DEFAULT_MODULE_ACCESS: Record<AppRole, ModuleKey[]> = {
  admin: ['dashboard', 'administration'],
  user: ['dashboard'],
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
  fetch: () => Promise<void>
  checkAccess: (role: AppRole | null | undefined, pathname: string) => AccessCheckResult
  hasModuleAccess: (role: AppRole | null | undefined, moduleKey: ModuleKey) => boolean
  setSubPermission: (role: AppRole, subKey: string, allowed: boolean) => void
  setModuleSubPermissions: (role: AppRole, moduleKey: ModuleKey, allowed: boolean) => void
  saveSubPermissions: (matrix: SubPermissionMatrix) => void
  savePermissions: (matrix: SubPermissionMatrix) => void
  resetToDefaults: () => void
  getSubCountForModule: (role: AppRole, moduleKey: ModuleKey) => { enabled: number; total: number }
}

export const useModulePermissionsStore = create<ModulePermissionsState>((set, get) => ({
  subPermissions: loadFromStorage(),
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'module_permissions')
        .maybeSingle()

      if (!error && data?.value) {
        const parsed = JSON.parse(data.value) as SubPermissionMatrix
        
        for (const role of ALL_ROLES) {
          if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/profile')) {
            parsed[role.key].push('settings/profile', 'settings/security', 'settings/preferences', 'settings/currency', 'settings/sessions')
          }
          if (parsed[role.key]?.includes('admin/settings') && !parsed[role.key]?.includes('settings/security_policy')) {
            parsed[role.key].push('settings/security_policy', 'settings/smtp', 'settings/system_prefs', 'settings/audit_log', 'settings/backup')
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

  saveSubPermissions: async (matrix) => {
    const safe = { ...matrix, admin: SUB_MODULES.map(s => s.key) }
    saveToStorage(safe)
    set({ subPermissions: safe })
    try {
      await supabase.from('system_settings').upsert({ key: 'module_permissions', value: JSON.stringify(safe) })
    } catch {}
  },

  savePermissions: (matrix) => {
    get().saveSubPermissions(matrix)
  },

  resetToDefaults: async () => {
    const defaults = buildDefaultSubPermissions()
    saveToStorage(defaults)
    set({ subPermissions: defaults })
    try {
      await supabase.from('system_settings').upsert({ key: 'module_permissions', value: JSON.stringify(defaults) })
    } catch {}
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
