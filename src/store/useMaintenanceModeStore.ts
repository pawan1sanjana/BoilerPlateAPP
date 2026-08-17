import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** localStorage key — marks a deployment as permanently seen */
const LS_SEEN_KEY  = 'boilerplate_seen_deployment_ts'
/** sessionStorage key — set when user clicks "Later" so next refresh forces reload */
const SS_DEFER_KEY = 'boilerplate_update_deferred'

interface MaintenanceModeState {
  isMaintenanceMode: boolean
  isLoading: boolean
  deploymentNote: string | null
  deploymentTs: string | null
  showUpdateBanner: boolean
  /** When true, the "Later" button is hidden — user must reload */
  isForced: boolean
  _channel: RealtimeChannel | null
  _prevMaintenance: boolean
  fetch: () => Promise<void>
  setMaintenanceMode: (value: boolean, note?: string) => Promise<boolean>
  subscribeToChanges: () => void
  unsubscribe: () => void
  /** "Reload Now" — marks deployment as seen in localStorage, hides banner */
  dismissUpdateBanner: () => void
  /** "Later" — hides banner now but shows it again (forced) on next page refresh */
  deferUpdateBanner: () => void
}

function hasSeenDeployment(ts: string | null | undefined): boolean {
  if (!ts) return true
  return localStorage.getItem(LS_SEEN_KEY) === ts
}

export const useMaintenanceModeStore = create<MaintenanceModeState>((set, get) => ({
  isMaintenanceMode: false,
  isLoading: true,
  deploymentNote: null,
  deploymentTs: null,
  showUpdateBanner: false,
  isForced: false,
  _channel: null,
  _prevMaintenance: false,

  fetch: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'deployment_note', 'deployment_note_ts'])

      if (!error && data) {
        const byKey = Object.fromEntries(data.map(r => [r.key, r.value]))
        const isOn  = byKey['maintenance_mode'] === 'true'
        const note  = byKey['deployment_note'] ?? null
        const ts    = byKey['deployment_note_ts'] ?? null

        // Check if user previously clicked "Later" — if so, this refresh forces them to reload
        const wasDeferred = sessionStorage.getItem(SS_DEFER_KEY) === 'true'
        if (wasDeferred) sessionStorage.removeItem(SS_DEFER_KEY)

        const shouldShow = !isOn && !!note && !hasSeenDeployment(ts)

        set({
          isMaintenanceMode: isOn,
          _prevMaintenance: isOn,
          isLoading: false,
          deploymentNote: note,
          deploymentTs: ts,
          showUpdateBanner: shouldShow,
          // Force reload (no Later button) if they deferred on the previous visit
          isForced: shouldShow && wasDeferred,
        })
      } else {
        set({ isMaintenanceMode: false, _prevMaintenance: false, isLoading: false })
      }
    } catch {
      set({ isMaintenanceMode: false, _prevMaintenance: false, isLoading: false })
    }
  },

  setMaintenanceMode: async (value: boolean, note?: string) => {
    try {
      if (!value) {
        const ts = Date.now().toString()
        const upserts: { key: string; value: string }[] = [
          { key: 'deployment_note_ts', value: ts },
        ]
        if (note && note.trim()) {
          upserts.push({ key: 'deployment_note', value: note.trim() })
        }
        await supabase.from('system_settings').upsert(upserts)
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'maintenance_mode', value: value ? 'true' : 'false' })

      if (error) throw error
      set({ isMaintenanceMode: value })
      return true
    } catch {
      return false
    }
  },

  subscribeToChanges: () => {
    if (get()._channel) return

    const channel = supabase
      .channel('maintenance-mode-watch')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.maintenance_mode',
        },
        async (payload) => {
          const newValue = (payload.new as { value?: string })?.value
          if (newValue === undefined) return

          const isNowOn = newValue === 'true'
          const wasOn   = get()._prevMaintenance

          if (wasOn && !isNowOn) {
            const { data } = await supabase
              .from('system_settings')
              .select('key, value')
              .in('key', ['deployment_note', 'deployment_note_ts'])

            const byKey = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
            const note  = byKey['deployment_note'] ?? null
            const ts    = byKey['deployment_note_ts'] ?? null

            set({
              isMaintenanceMode: false,
              _prevMaintenance: false,
              deploymentNote: note,
              deploymentTs: ts,
              showUpdateBanner: true,
              isForced: false, // First time seeing it — Later is allowed
            })
          } else {
            set({ isMaintenanceMode: isNowOn, _prevMaintenance: isNowOn })
          }
        }
      )
      .subscribe()

    set({ _channel: channel })
  },

  unsubscribe: () => {
    const channel = get()._channel
    if (channel) {
      supabase.removeChannel(channel)
      set({ _channel: null })
    }
  },

  /** Called when user clicks "Reload Now" — mark permanently seen, then reload */
  dismissUpdateBanner: () => {
    const ts = get().deploymentTs
    if (ts) localStorage.setItem(LS_SEEN_KEY, ts)
    set({ showUpdateBanner: false })
  },

  /** Called when user clicks "Later" — hides now, forces reload on next page refresh */
  deferUpdateBanner: () => {
    sessionStorage.setItem(SS_DEFER_KEY, 'true')
    set({ showUpdateBanner: false })
  },
}))
