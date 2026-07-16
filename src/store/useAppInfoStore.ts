import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface AppInfoState {
  appName: string
  appIcon: string
  appVersion: string
  companyName: string
  reportSubtitle: string
  reportFooterText: string
  reportAccentColor: string
  reportFont: string
  reportCompactMode: boolean
  reportLogo: string
  isLoading: boolean
  fetch: () => Promise<void>
  setAppInfo: (name: string, icon: string, version: string, company: string, reportSubtitle?: string, reportFooterText?: string) => Promise<boolean>
  setReportConfig: (accentColor: string, font: string, compactMode: boolean, logo: string, subtitle: string, footerText: string) => Promise<boolean>
}

export const DEFAULT_APP_NAME = 'BoilerplateApp'
export const DEFAULT_APP_ICON = ''
export const DEFAULT_APP_VERSION = '1.0.0'
export const DEFAULT_COMPANY_NAME = 'My Company'
export const DEFAULT_REPORT_SUBTITLE = 'System Report'
export const DEFAULT_REPORT_FOOTER = 'Confidential Report.'
export const DEFAULT_REPORT_ACCENT = '#4f46e5'
export const DEFAULT_REPORT_FONT = 'helvetica'

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
    companyName: DEFAULT_COMPANY_NAME,
    reportSubtitle: DEFAULT_REPORT_SUBTITLE,
    reportFooterText: DEFAULT_REPORT_FOOTER,
    reportAccentColor: DEFAULT_REPORT_ACCENT,
    reportFont: DEFAULT_REPORT_FONT,
    reportCompactMode: false,
    reportLogo: ''
  }
}

function saveToStorage(state: Partial<AppInfoState>) {
  try {
    const existing = loadFromStorage()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...state }))
  } catch {}
}

const initialState = loadFromStorage()

export const useAppInfoStore = create<AppInfoState>((set) => ({
  appName: initialState.appName || DEFAULT_APP_NAME,
  appIcon: initialState.appIcon || DEFAULT_APP_ICON,
  appVersion: initialState.appVersion || DEFAULT_APP_VERSION,
  companyName: initialState.companyName || DEFAULT_COMPANY_NAME,
  reportSubtitle: initialState.reportSubtitle || DEFAULT_REPORT_SUBTITLE,
  reportFooterText: initialState.reportFooterText || DEFAULT_REPORT_FOOTER,
  reportAccentColor: initialState.reportAccentColor || DEFAULT_REPORT_ACCENT,
  reportFont: initialState.reportFont || DEFAULT_REPORT_FONT,
  reportCompactMode: initialState.reportCompactMode || false,
  reportLogo: initialState.reportLogo || '',
  isLoading: true,
  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'app_name', 'app_icon', 'app_version', 'company_name', 
          'report_subtitle', 'report_footer', 'report_accent_color', 
          'report_font', 'report_compact_mode', 'report_logo'
        ])

      if (!error && data) {
        const byKey = Object.fromEntries(data.map(r => [r.key, r.value]))
        const newState = {
          appName: byKey['app_name'] || DEFAULT_APP_NAME,
          appIcon: byKey['app_icon'] || DEFAULT_APP_ICON,
          appVersion: byKey['app_version'] || DEFAULT_APP_VERSION,
          companyName: byKey['company_name'] || DEFAULT_COMPANY_NAME,
          reportSubtitle: byKey['report_subtitle'] || DEFAULT_REPORT_SUBTITLE,
          reportFooterText: byKey['report_footer'] || DEFAULT_REPORT_FOOTER,
          reportAccentColor: byKey['report_accent_color'] || DEFAULT_REPORT_ACCENT,
          reportFont: byKey['report_font'] || DEFAULT_REPORT_FONT,
          reportCompactMode: byKey['report_compact_mode'] === 'true',
          reportLogo: byKey['report_logo'] || ''
        }
        
        saveToStorage(newState)
        set({ ...newState, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
  setAppInfo: async (name: string, icon: string, version: string, company: string, reportSubtitle?: string, reportFooterText?: string) => {
    try {
      const finalSubtitle = reportSubtitle || DEFAULT_REPORT_SUBTITLE
      const finalFooter = reportFooterText || DEFAULT_REPORT_FOOTER
      
      const upserts = [
        { key: 'app_name', value: name },
        { key: 'app_icon', value: icon },
        { key: 'app_version', value: version },
        { key: 'company_name', value: company },
        { key: 'report_subtitle', value: finalSubtitle },
        { key: 'report_footer', value: finalFooter }
      ]
      const { error } = await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      
      const finalName = name || DEFAULT_APP_NAME
      const finalVersion = version || DEFAULT_APP_VERSION
      const finalCompany = company || DEFAULT_COMPANY_NAME
      
      const updates = {
        appName: finalName, 
        appIcon: icon, 
        appVersion: finalVersion, 
        companyName: finalCompany,
        reportSubtitle: finalSubtitle,
        reportFooterText: finalFooter
      }
      saveToStorage(updates)
      set(updates)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  },
  setReportConfig: async (accentColor: string, font: string, compactMode: boolean, logo: string, subtitle: string, footerText: string) => {
    try {
      const upserts = [
        { key: 'report_accent_color', value: accentColor },
        { key: 'report_font', value: font },
        { key: 'report_compact_mode', value: String(compactMode) },
        { key: 'report_logo', value: logo },
        { key: 'report_subtitle', value: subtitle },
        { key: 'report_footer', value: footerText }
      ]
      const { error } = await supabase.from('system_settings').upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      
      const updates = {
        reportAccentColor: accentColor,
        reportFont: font,
        reportCompactMode: compactMode,
        reportLogo: logo,
        reportSubtitle: subtitle,
        reportFooterText: footerText
      }
      saveToStorage(updates)
      set(updates)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
}))
