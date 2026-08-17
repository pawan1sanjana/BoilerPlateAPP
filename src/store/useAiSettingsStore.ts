import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AiSettings {
  provider: 'groq' | 'gemini' | 'openrouter' | 'huggingface'
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

interface AiSettingsState {
  settings: AiSettings
  isLoading: boolean
  fetch: (userId: string) => Promise<void>
  save: (userId: string, settings: AiSettings) => Promise<boolean>
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'groq',
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 1024,
}

export const PROVIDER_MODELS: Record<string, {
  label: string
  badge: string
  tagline: string
  docsUrl: string
  docsLabel: string
  models: { value: string; label: string }[]
}> = {
  groq: {
    label: 'Groq',
    badge: 'Free',
    tagline: 'Ultra-fast inference — no credit card needed',
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'Get Free Groq Key',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
  gemini: {
    label: 'Google Gemini',
    badge: 'Free',
    tagline: '1,500 free requests/day via AI Studio',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Get Free Gemini Key',
    models: [
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Recommended)' },
      { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    badge: 'Free Models',
    tagline: 'Dozens of free open-source models in one API',
    docsUrl: 'https://openrouter.ai/keys',
    docsLabel: 'Get Free OpenRouter Key',
    models: [
      { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
      { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
      { value: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini (Free)' },
      { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (Free)' },
      { value: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)' },
    ],
  },
  huggingface: {
    label: 'Hugging Face',
    badge: 'Free',
    tagline: 'Free Inference API — huge model catalog',
    docsUrl: 'https://huggingface.co/settings/tokens',
    docsLabel: 'Get Free HF Token',
    models: [
      { value: 'HuggingFaceH4/zephyr-7b-beta', label: 'Zephyr 7B Beta' },
      { value: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct' },
      { value: 'meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B Instruct' },
      { value: 'microsoft/Phi-3.5-mini-instruct', label: 'Phi-3.5 Mini Instruct' },
    ],
  },
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
  settings: DEFAULT_AI_SETTINGS,
  isLoading: false,

  fetch: async (userId: string) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('user_ai_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data?.settings) {
        set({ settings: { ...DEFAULT_AI_SETTINGS, ...data.settings } })
      }
    } catch {
      // silently fail, defaults apply
    } finally {
      set({ isLoading: false })
    }
  },

  save: async (userId: string, settings: AiSettings) => {
    try {
      const { error } = await supabase
        .from('user_ai_settings')
        .upsert({ user_id: userId, settings }, { onConflict: 'user_id' })

      if (!error) {
        set({ settings })
        return true
      }
      return false
    } catch {
      return false
    }
  },
}))
