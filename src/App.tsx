import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore, applyTheme } from '@/store/useThemeStore'
import { useMaintenanceModeStore } from '@/store/useMaintenanceModeStore'
import { useModulePermissionsStore } from '@/store/useModulePermissionsStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { usePWAStore } from '@/store/usePWAStore'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'
import Dashboard from './pages/Dashboard'
import Settings from './pages/settings/Settings'
import AccountCreate from './pages/accounts/AccountCreate'
import AccountEdit from './pages/accounts/AccountEdit'
import AccountsList from './pages/accounts/AccountsList'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AuthCallback from './pages/auth/AuthCallback'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Support from './pages/Support'
import { Truck } from 'lucide-react'
import { registerSession } from '@/lib/sessionManager'
import { Toaster } from 'react-hot-toast'
import ReloadPrompt from './components/layout/ReloadPrompt'
import SystemUpdateBanner from './components/layout/SystemUpdateBanner'

function App() {
  const { user, setUser, fetchProfile } = useAuthStore()
  const { theme, themeColor } = useThemeStore()
  const fetchMaintenanceMode = useMaintenanceModeStore(s => s.fetch)
  const subscribeToMaintenanceMode = useMaintenanceModeStore(s => s.subscribeToChanges)
  const unsubscribeMaintenanceMode = useMaintenanceModeStore(s => s.unsubscribe)
  const fetchModulePermissions = useModulePermissionsStore(s => s.fetch)
  const fetchAppInfo = useAppInfoStore(s => s.fetch)
  const appName = useAppInfoStore(s => s.appName)
  const appIcon = useAppInfoStore(s => s.appIcon)
  const [isLoading, setIsLoading] = useState(true)

  // Update document title, favicon, and PWA manifest
  useEffect(() => {
    document.title = appName;
    
    // Update Favicon
    if (appIcon) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = appIcon;
    }

    // Update PWA Manifest
    const updateManifest = async () => {
      try {
        let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          document.getElementsByTagName('head')[0].appendChild(manifestLink);
        }

        const baseUrl = window.location.origin;
        const manifest = {
          name: appName,
          short_name: appName,
          description: `${appName} Application`,
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: baseUrl + '/',
          id: baseUrl + '/',
          icons: appIcon ? [
            {
              src: appIcon,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: appIcon,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ] : [
            { src: baseUrl + '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: baseUrl + '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: baseUrl + '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        };

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: 'application/manifest+json' });
        manifestLink.href = URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to update PWA manifest', err);
      }
    };
    
    updateManifest();
  }, [appName, appIcon]);

  // Capture PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      usePWAStore.getState().setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      usePWAStore.getState().setInstalled(true);
      usePWAStore.getState().setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check for display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        usePWAStore.getState().setInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);


  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme, themeColor)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system', themeColor)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, themeColor])

  useEffect(() => {
    // Fetch maintenance mode state early so it's ready before any route renders
    fetchMaintenanceMode()
    // Subscribe to real-time maintenance mode changes so all active sessions
    // immediately see the maintenance page when an admin enables it.
    subscribeToMaintenanceMode()
    fetchModulePermissions()
    fetchAppInfo()

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && session?.access_token) {
        registerSession(currentUser.id, session.access_token)
        fetchProfile(currentUser.id).finally(() => setIsLoading(false));
      } else {
        useAuthStore.getState().setProfile(null);
        setIsLoading(false);
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && session?.access_token) {
        registerSession(currentUser.id, session.access_token)
        fetchProfile(currentUser.id);
      } else {
        useAuthStore.getState().setProfile(null);
      }
    })

    return () => {
      subscription.unsubscribe()
      unsubscribeMaintenanceMode()
    }
  }, [setUser, fetchProfile, fetchMaintenanceMode, subscribeToMaintenanceMode, unsubscribeMaintenanceMode, fetchModulePermissions, fetchAppInfo])

  // Separate effect: sets up a realtime channel to handle instant force-logout.
  // Runs only when the logged-in user's ID changes, ensuring .on() is always
  // called before .subscribe() on a fresh channel.
  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    let currentSessionVersion: number | null = null

    // Seed initial session_version so we can detect increments
    supabase
      .from('users')
      .select('session_version')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) currentSessionVersion = data.session_version ?? 0
      })

    const channel = supabase
      .channel(`user-profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newProfile = payload.new as any

          const isDeactivated = newProfile.status === 'inactive'
          const sessionBumped =
            currentSessionVersion !== null &&
            newProfile.session_version > currentSessionVersion

          if (isDeactivated || sessionBumped) {
            // Store a reason so Login page can show a message to the user
            const reason = isDeactivated
              ? 'Your account has been deactivated. Please contact your administrator.'
              : 'Your session was terminated by an administrator. Please sign in again.'
            sessionStorage.setItem('logout_reason', reason)

            // Session is already dead server-side (force_logout_user deleted it).
            // signOut() may return 403 — that's fine, ignore it and always clear local state.
            supabase.auth.signOut().catch(() => {}).finally(() => {
              useAuthStore.getState().signOut()
            })
          } else {
            currentSessionVersion = newProfile.session_version ?? 0
            useAuthStore.getState().fetchProfile(userId)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Session idle timeout
  useEffect(() => {
    let lastActivity = Date.now()

    const updateActivity = () => {
      lastActivity = Date.now()
    }

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))

    const interval = setInterval(() => {
      const { user } = useAuthStore.getState()
      if (!user) return

      const policy = useSecurityPolicyStore.getState().policy
      const timeoutMs = policy.sessionTimeoutMinutes * 60 * 1000

      if (Date.now() - lastActivity > timeoutMs) {
        sessionStorage.setItem('logout_reason', 'Session expired due to inactivity.')
        supabase.auth.signOut().catch(() => {}).finally(() => {
          useAuthStore.getState().signOut()
        })
      }
    }, 60000)

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity))
      clearInterval(interval)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          {appIcon ? (
            <img src={appIcon} alt={`${appName} Logo`} className="h-12 w-12 object-contain" />
          ) : (
            <Truck className="h-12 w-12 text-blue-600" />
          )}
          <p className="text-lg font-medium text-slate-500">Loading {appName}...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected Routes inside Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            
            <Route path="accounts" element={<AccountsList />} />
            <Route path="accounts/new" element={<AccountCreate />} />
            <Route path="accounts/edit/:id" element={<AccountEdit />} />

            {/* Public/Informational Routes inside Layout */}
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="bottom-right" />
      <ReloadPrompt />
      <SystemUpdateBanner />
    </>
  )
}

export default App
