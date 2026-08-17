import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Bot, Eye, EyeOff, Key, Loader2, ExternalLink, AlertCircle, CheckCircle2, Zap, Cpu } from 'lucide-react'
import { useAiSettingsStore, PROVIDER_MODELS, type AiSettings } from '@/store/useAiSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'

const BADGE_COLORS: Record<string, string> = {
  'Free': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  'Free Models': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

export default function AiSettingsTab() {
  const { user } = useAuthStore()
  const { settings, isLoading, fetch: fetchSettings, save } = useAiSettingsStore()
  const [draft, setDraft] = useState<AiSettings>(settings)
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (user?.id) fetchSettings(user.id)
  }, [user?.id, fetchSettings])

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const handleChange = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'provider') {
        const providerModels = PROVIDER_MODELS[value as string]?.models
        if (providerModels?.length) next.model = providerModels[0].value
      }
      return next
    })
    setTestResult(null)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    const ok = await save(user.id, draft)
    setIsSaving(false)
    if (ok) toast.success('AI settings saved successfully')
    else toast.error('Failed to save AI settings')
  }

  const handleTest = async () => {
    if (!draft.apiKey.trim()) {
      setTestResult({ ok: false, message: 'Please enter an API key before testing.' })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      let success = false

      if (draft.provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${draft.apiKey}` }
        })
        success = res.ok
      } else if (draft.provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${draft.apiKey}`
        )
        success = res.ok
      } else if (draft.provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${draft.apiKey}` }
        })
        success = res.ok
      } else if (draft.provider === 'huggingface') {
        const res = await fetch('https://huggingface.co/api/whoami', {
          headers: { Authorization: `Bearer ${draft.apiKey}` }
        })
        success = res.ok
      }

      setTestResult(success
        ? { ok: true, message: 'Connection successful! API key is valid and ready to use.' }
        : { ok: false, message: 'API key validation failed. Please check the key and try again.' }
      )
    } catch {
      setTestResult({ ok: false, message: 'Could not reach the API endpoint. Check your network connection.' })
    } finally {
      setIsTesting(false)
    }
  }

  const currentProvider = PROVIDER_MODELS[draft.provider]
  const currentModels = currentProvider?.models ?? []

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Bot size={22} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Assistant Configuration</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              All providers listed here are <span className="font-semibold text-green-600 dark:text-green-400">100% free</span> — no credit card required. Each user configures their own key.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-7">

            {/* Provider Cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Choose Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChange('provider', key as AiSettings['provider'])}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      draft.provider === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-bold text-sm ${draft.provider === key ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {val.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_COLORS[val.badge] ?? BADGE_COLORS['Free']}`}>
                        {val.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{val.tagline}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* How to get key */}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl">
              <Zap size={16} className="text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium flex-1">
                Get a free API key for <strong>{currentProvider?.label}</strong> in seconds — no credit card needed.
              </p>
              <a
                href={currentProvider?.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                <ExternalLink size={11} />
                {currentProvider?.docsLabel}
              </a>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">API Key</label>
              <div className="relative">
                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={draft.apiKey}
                  onChange={e => handleChange('apiKey', e.target.value)}
                  placeholder={`Paste your ${currentProvider?.label} key here...`}
                  className="w-full pl-11 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 ml-1">Stored securely per your account — never shared.</p>
            </div>

            {/* Model + Advanced */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">
                  <Cpu size={11} className="inline mr-1 opacity-70" />
                  Model
                </label>
                <select
                  value={draft.model}
                  onChange={e => handleChange('model', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
                >
                  {currentModels.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Max Tokens</label>
                <input
                  type="number"
                  min="128"
                  max="8192"
                  step="128"
                  value={draft.maxTokens}
                  onChange={e => handleChange('maxTokens', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">
                Temperature <span className="text-slate-400 font-normal normal-case">— {draft.temperature} ({draft.temperature < 0.5 ? 'Precise' : draft.temperature < 1.2 ? 'Balanced' : 'Creative'})</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={draft.temperature}
                onChange={e => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 px-0.5">
                <span>0 — Precise</span>
                <span>1 — Balanced</span>
                <span>2 — Creative</span>
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-semibold animate-in fade-in ${
                testResult.ok
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
              }`}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {testResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !draft.apiKey.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {isTesting ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
                Save AI Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
          <a
            key={key}
            href={val.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{val.label}</span>
              <ExternalLink size={11} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">{val.tagline}</p>
            <span className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full border ${BADGE_COLORS[val.badge] ?? BADGE_COLORS['Free']}`}>
              {val.badge}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
