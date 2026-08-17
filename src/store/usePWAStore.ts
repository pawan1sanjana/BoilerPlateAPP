import { create } from 'zustand'

interface PWAState {
  deferredPrompt: any | null
  isInstallable: boolean
  isInstalled: boolean
  setDeferredPrompt: (prompt: any) => void
  setInstalled: (status: boolean) => void
  promptInstall: () => Promise<void>
}

export const usePWAStore = create<PWAState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  // Check if we are running in standalone mode (installed)
  isInstalled: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt, isInstallable: !!prompt }),
  setInstalled: (status) => set({ isInstalled: status }),
  promptInstall: async () => {
    const { deferredPrompt } = get()
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        set({ deferredPrompt: null, isInstallable: false, isInstalled: true })
      }
    } catch (error) {
      console.error('Error prompting PWA install:', error)
    }
  }
}))
