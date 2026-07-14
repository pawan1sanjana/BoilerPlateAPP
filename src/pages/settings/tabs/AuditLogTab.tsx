import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, Trash2 } from 'lucide-react'
import { useAuditLogStore } from '@/store/useAuditLogStore'
import { toast } from 'react-hot-toast'

export default function AuditLogTab() {
  const { logs, isLoading, totalCount, fetchLogs, clearOldLogs } = useAuditLogStore()
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    fetchLogs(page, pageSize)
  }, [page])

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear logs older than 30 days? This cannot be undone.')) {
      const success = await clearOldLogs(30)
      if (success) toast.success('Old logs cleared successfully')
      else toast.error('Failed to clear logs')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" /> Audit Log
          </h3>
          <p className="text-sm text-slate-500 mt-1">Track system changes and user activity for security compliance.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleClearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 text-xs font-semibold rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Clear &gt; 30d
          </button>
        </div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Timestamp</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">User</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Action</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Resource</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" />
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No audit logs found. Ensure the audit_log table is created in Supabase.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{log.user_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {log.resource}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={page * pageSize >= totalCount}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
