import { useEffect } from 'react'
import toast from 'react-hot-toast'

export function PWAInstallPrompt() {
  useEffect(() => {
    // Check if already installed
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;

    if (!isPWA) {
       // Show a toast advising them to install
       const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen')
       if (!hasSeenPrompt) {
         // Add a small delay so it doesn't pop up instantly on initial load
         setTimeout(() => {
           toast("Install our App for the best native experience! You can install it from your browser menu.", {
             icon: '📱',
             duration: 6000,
           })
           localStorage.setItem('pwa-prompt-seen', 'true')
         }, 2000)
       }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Since we removed the install button from the header, this component just silently handles the prompt logic and toast
  return null
}
