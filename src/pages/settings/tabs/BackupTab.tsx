import { useState } from 'react'
import { Database, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuditLogStore } from '@/store/useAuditLogStore'
import { toast } from 'react-hot-toast'

export default function BackupTab() {
  const [isExportingSettings, setIsExportingSettings] = useState(false)
  const [isExportingUsers, setIsExportingUsers] = useState(false)

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportSettings = async () => {
    setIsExportingSettings(true)
    try {
      const { data, error } = await supabase.from('system_settings').select('*')
      if (error) throw error
      
      const content = JSON.stringify(data, null, 2)
      downloadFile(content, `system_settings_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json')
      
      useAuditLogStore.getState().logAction('EXPORT_SYSTEM_SETTINGS', 'system_settings')
      toast.success('System settings exported successfully')
    } catch (e) {
      toast.error('Failed to export system settings')
    } finally {
      setIsExportingSettings(false)
    }
  }

  const exportUsers = async () => {
    setIsExportingUsers(true)
    try {
      const { data, error } = await supabase.from('users').select('*')
      if (error) throw error
      
      if (!data || data.length === 0) {
        toast.error('No user data found')
        return
      }

      const keys = Object.keys(data[0])
      const csv = [
        keys.join(','),
        ...data.map(row => keys.map(k => `"${(row[k] || '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      downloadFile(csv, `users_backup_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv')
      
      useAuditLogStore.getState().logAction('EXPORT_USERS', 'users')
      toast.success('Users exported successfully')
    } catch (e) {
      toast.error('Failed to export users')
    } finally {
      setIsExportingUsers(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database size={18} className="text-blue-500" /> Backup & Export
        </h3>
        <p className="text-sm text-slate-500 mt-1">Export system configuration and data for backup or compliance purposes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">System Settings</h4>
              <p className="text-xs text-slate-500 mt-1">Export all configuration from the system_settings table as JSON.</p>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
              <Database size={18} className="text-slate-500" />
            </div>
          </div>
          <button 
            onClick={exportSettings} 
            disabled={isExportingSettings}
            className="mt-6 w-full flex justify-center items-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isExportingSettings ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export JSON
          </button>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">User Directory</h4>
              <p className="text-xs text-slate-500 mt-1">Export the complete list of users and their profiles as CSV.</p>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
              <Database size={18} className="text-slate-500" />
            </div>
          </div>
          <button 
            onClick={exportUsers} 
            disabled={isExportingUsers}
            className="mt-6 w-full flex justify-center items-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isExportingUsers ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Data Retention Notice</h4>
        <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
          Downloaded files contain sensitive system information and personally identifiable information (PII). Ensure you follow your organization's data handling and retention policies when storing these exports locally.
        </p>
      </div>
    </div>
  )
}
