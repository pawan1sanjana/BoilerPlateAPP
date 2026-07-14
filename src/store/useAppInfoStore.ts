import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface AppInfoState {
  appName: string
  appIcon: string
  appVersion: string
  companyName: string
  isLoading: boolean
  fetch: () => Promise<void>
  setAppInfo: (name: string, icon: string, version: string, company: string) => Promise<boolean>
}

export const DEFAULT_APP_NAME = 'BoilerplateApp'
export const DEFAULT_APP_ICON = ''
export const DEFAULT_APP_VERSION = '1.0.0'
export const DEFAULT_COMPANY_NAME = 'My Company'

const STORAGE_KEY = 'boilerplate-app-info'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}
  return { 
    appName: DEFAULT_APP_NAME, 
    appIcon: DEFAULT_APP_ICON,
    appVersion: DEFAULT_APP_VERSION,
    companyName: DEFAULT_COMPANY_NAME
  }
}

function saveToStorage(appName: string, appIcon: string, appVersion: string, companyName: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ appName, appIcon, appVersion, companyName }))
  } catch {}
}

const initialState = loadFromStorage()

export const useAppInfoStore = create<AppInfoState>((set) => ({
  appName: initialState.appName || DEFAULT_APP_NAME,
  appIcon: initialState.appIcon || DEFAULT_APP_ICON,
  appVersion: initialState.appVersion || DEFAULT_APP_VERSION,
  companyName: initialState.companyName || DEFAULT_COMPANY_NAME,
  isLoading: true,
  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['app_name', 'app_icon', 'app_version', 'company_name'])

      if (!error && data) {
        const byKey = Object.fromEntries(data.map(r => [r.key, r.value]))
        const fetchedName = byKey['app_name'] || DEFAULT_APP_NAME
        const fetchedIcon = byKey['app_icon'] || DEFAULT_APP_ICON
        const fetchedVersion = byKey['app_version'] || DEFAULT_APP_VERSION
        const fetchedCompany = byKey['company_name'] || DEFAULT_COMPANY_NAME
        saveToStorage(fetchedName, fetchedIcon, fetchedVersion, fetchedCompany)
        set({
          appName: fetchedName,
          appIcon: fetchedIcon,
          appVersion: fetchedVersion,
          companyName: fetchedCompany,
          isLoading: false
        })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
  setAppInfo: async (name: string, icon: string, version: string, company: string) => {
    try {
      const upserts = [
        { key: 'app_name', value: name },
        { key: 'app_icon', value: icon },
        { key: 'app_version', value: version },
        { key: 'company_name', value: company }
      ]
      const { error } = await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      
      const finalName = name || DEFAULT_APP_NAME
      const finalVersion = version || DEFAULT_APP_VERSION
      const finalCompany = company || DEFAULT_COMPANY_NAME
      saveToStorage(finalName, icon, finalVersion, finalCompany)
      set({ appName: finalName, appIcon: icon, appVersion: finalVersion, companyName: finalCompany })
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
}))
