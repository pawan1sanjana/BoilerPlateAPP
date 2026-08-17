import { useEffect, useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { useSmtpStore } from '@/store/useSmtpStore'
import { toast } from 'react-hot-toast'

export default function SmtpTab() {
  const { config, isLoading, fetch, saveConfig } = useSmtpStore()
  const [draft, setDraft] = useState(config)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    fetch()
  }, [])

  useEffect(() => {
    setDraft(config)
  }, [config])

  const handleSave = async () => {
    setIsSaving(true)
    const success = await saveConfig(draft)
    setIsSaving(false)
    if (success) {
      toast.success('SMTP configuration saved')
    } else {
      toast.error('Failed to save SMTP configuration')
    }
  }

  const handleTestEmail = async () => {
    setIsTesting(true)
    const result = await useSmtpStore.getState().testConfig(draft)
    setIsTesting(false)
    
    if (result.success) {
      toast.success('Test email sent successfully! Please check your inbox.')
    } else {
      toast.error(result.error || 'Email sending failed. Please check your SMTP settings.')
    }
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config)

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-300">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Mail size={18} className="text-blue-500" /> Email / SMTP Configuration
        </h3>
        <p className="text-sm text-slate-500 mt-1">Configure outbound email server settings for system alerts and notifications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 ml-1">SMTP Host</label>
          <input 
            type="text" 
            placeholder="smtp.example.com"
            value={draft.host}
            onChange={e => setDraft({ ...draft, host: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">SMTP Port</label>
          <input 
            type="number" 
            value={draft.port}
            onChange={e => setDraft({ ...draft, port: parseInt(e.target.value) || 587 })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Encryption</label>
          <select
            value={draft.encryption}
            onChange={e => setDraft({ ...draft, encryption: e.target.value as any })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all appearance-none"
          >
            <option value="none">None</option>
            <option value="starttls">STARTTLS</option>
            <option value="ssl/tls">SSL / TLS</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Username</label>
          <input 
            type="text" 
            value={draft.username}
            onChange={e => setDraft({ ...draft, username: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">Password</label>
          <input 
            type="password" 
            placeholder={config.password ? "••••••••" : ""}
            value={draft.password}
            onChange={e => setDraft({ ...draft, password: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">From Name</label>
          <input 
            type="text" 
            value={draft.fromName}
            onChange={e => setDraft({ ...draft, fromName: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 ml-1">From Email</label>
          <input 
            type="email" 
            value={draft.fromEmail}
            onChange={e => setDraft({ ...draft, fromEmail: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleTestEmail} 
          disabled={isTesting}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          {isTesting ? <Loader2 size={16} className="animate-spin" /> : null} Send Test Email
        </button>

        <button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges} 
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Config
        </button>
      </div>
    </div>
  )
}
