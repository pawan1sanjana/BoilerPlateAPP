import { useEffect, useState } from 'react'
import { Globe2, Loader2, Check } from 'lucide-react'
import { useSystemPrefsStore } from '@/store/useSystemPrefsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'react-hot-toast'

const TIMEZONES = Intl.supportedValuesOf('timeZone')

export default function SystemPrefsTab() {
  const { user } = useAuthStore()
  const { prefs, fetchUserPrefs, saveUserPrefs } = useSystemPrefsStore()
  const [draft, setDraft] = useState(prefs)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserPrefs(user.id).finally(() => setIsLoading(false))
    }
  }, [user])

  useEffect(() => {
    setDraft(prefs)
  }, [prefs])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    const success = await saveUserPrefs(user.id, draft)
    setIsSaving(false)
    if (success) {
      toast.success('Preferences saved successfully')
    } else {
      toast.error('Failed to save preferences')
    }
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(prefs)

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe2 size={18} className="text-blue-500" /> Regional & Time Settings
        </h3>
        <p className="text-sm text-slate-500 mt-1">Configure your personal language, timezone, and formatting preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 ml-1">Language</label>
          <div className="flex gap-4 flex-wrap">
            {['English', 'Sinhala', 'Tamil'].map(lang => (
              <button 
                key={lang}
                onClick={() => setDraft({ ...draft, language: lang.toLowerCase() })}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 transition-all font-semibold text-sm flex-1 min-w-[120px] ${
                  draft.language === lang.toLowerCase() 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                {lang}
                {draft.language === lang.toLowerCase() && <Check size={16} className="text-blue-500" />}
              </button>
            ))}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Timezone</label>
          <select
            value={draft.timezone}
            onChange={e => setDraft({ ...draft, timezone: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Date Format</label>
          <select
            value={draft.dateFormat}
            onChange={e => setDraft({ ...draft, dateFormat: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 31/12/2026)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 12/31/2026)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2026-12-31)</option>
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 ml-1">Number Format</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setDraft({ ...draft, numberFormat: '1,234.56' })}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                draft.numberFormat === '1,234.56' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-semibold text-slate-900 dark:text-white">1,234.56</div>
              <div className="text-xs text-slate-500 mt-1">Comma separator, period decimal</div>
            </button>

            <button 
              onClick={() => setDraft({ ...draft, numberFormat: '1.234,56' })}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                draft.numberFormat === '1.234,56' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-semibold text-slate-900 dark:text-white">1.234,56</div>
              <div className="text-xs text-slate-500 mt-1">Period separator, comma decimal</div>
            </button>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges} 
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Preferences
        </button>
      </div>
    </div>
  )
}
