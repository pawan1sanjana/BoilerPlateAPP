import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface AuditLogEntry {
  id: string
  user_id: string
  user_name: string
  action: string
  resource: string
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  created_at: string
}

interface AuditLogState {
  logs: AuditLogEntry[]
  isLoading: boolean
  totalCount: number
  fetchLogs: (page?: number, pageSize?: number) => Promise<void>
  logAction: (action: string, resource: string, oldVal?: string | null, newVal?: string | null) => Promise<void>
  clearOldLogs: (daysToKeep: number) => Promise<boolean>
}

export const useAuditLogStore = create<AuditLogState>((set) => ({
  logs: [],
  isLoading: false,
  totalCount: 0,
  fetchLogs: async (page = 1, pageSize = 50) => {
    set({ isLoading: true })
    try {
      const { data, count, error } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      
      if (!error && data) {
        set({ logs: data as AuditLogEntry[], totalCount: count || 0 })
      } else {
         console.warn('Error fetching audit logs:', error)
      }
    } catch (e) {
      console.warn('Audit log table might not exist yet', e)
    } finally {
      set({ isLoading: false })
    }
  },
  logAction: async (action, resource, oldVal = null, newVal = null) => {
    try {
      const user = useAuthStore.getState().user
      const profile = useAuthStore.getState().profile
      if (!user) return

      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_name: profile?.name || user.email || 'Unknown',
        action,
        resource,
        old_value: oldVal,
        new_value: newVal,
        ip_address: null, // Hard to get client IP reliably from client-side
      })
    } catch (e) {
      console.warn('Failed to log action', e)
    }
  },
  clearOldLogs: async (daysToKeep) => {
    try {
      const date = new Date()
      date.setDate(date.getDate() - daysToKeep)
      
      const { error } = await supabase
        .from('audit_log')
        .delete()
        .lt('created_at', date.toISOString())
        
      if (!error) {
        useAuditLogStore.getState().fetchLogs()
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }
}))
