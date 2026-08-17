import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'
import { toast } from 'react-hot-toast'

export default function SecurityPolicyTab() {
  const { policy, isLoading, fetch, savePolicy } = useSecurityPolicyStore()
  const [draft, setDraft] = useState(policy)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch()
  }, [])

  useEffect(() => {
    setDraft(policy)
  }, [policy])

  const handleSave = async () => {
    setIsSaving(true)
    const success = await savePolicy(draft)
    setIsSaving(false)
    if (success) {
      toast.success('Security policy updated successfully')
    } else {
      toast.error('Failed to update security policy')
    }
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(policy)

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-500" /> Security Policy
        </h3>
        <p className="text-sm text-slate-500 mt-1">Configure global security requirements and account lockout rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Minimum Password Length</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min={6} max={32} 
              value={draft.minPasswordLength} 
              onChange={e => setDraft({ ...draft, minPasswordLength: parseInt(e.target.value) })}
              className="flex-1 accent-blue-500"
            />
            <span className="font-mono text-sm w-8 text-center">{draft.minPasswordLength}</span>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Max Login Attempts</label>
          <input 
            type="number" min={3} max={20}
            value={draft.maxLoginAttempts}
            onChange={e => setDraft({ ...draft, maxLoginAttempts: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
          <p className="text-[10px] text-slate-400">Failed attempts before account lockout</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Account Lockout Duration (mins)</label>
          <input 
            type="number" min={5}
            value={draft.lockoutDurationMinutes}
            onChange={e => setDraft({ ...draft, lockoutDurationMinutes: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Session Idle Timeout (mins)</label>
          <input 
            type="number" min={5}
            value={draft.sessionTimeoutMinutes}
            onChange={e => setDraft({ ...draft, sessionTimeoutMinutes: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Max Concurrent Sessions</label>
          <input 
            type="number" min={1} max={20}
            value={draft.maxConcurrentSessions}
            onChange={e => setDraft({ ...draft, maxConcurrentSessions: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges} 
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Policy
        </button>
      </div>
    </div>
  )
}
