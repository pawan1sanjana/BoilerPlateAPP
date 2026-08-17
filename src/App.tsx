import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore, applyTheme } from '@/store/useThemeStore'
import { useMaintenanceModeStore } from '@/store/useMaintenanceModeStore'
import { useModulePermissionsStore } from '@/store/useModulePermissionsStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { usePWAStore } from '@/store/usePWAStore'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'
import { Truck } from 'lucide-react'
import { registerSession } from '@/lib/sessionManager'
import { Toaster } from 'react-hot-toast'
import ReloadPrompt from './components/layout/ReloadPrompt'
import SystemUpdateBanner from './components/layout/SystemUpdateBanner'

// ── Eagerly load only the shell (Layout + auth pages) ──────────────────────
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AuthCallback from './pages/auth/AuthCallback'

// ── Lazily load all content pages — only downloaded when first visited ──────
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const EstatesList    = lazy(() => import('./pages/estates/EstatesList'))
const EstateForm     = lazy(() => import('./pages/estates/EstateForm'))
const EstateDetail   = lazy(() => import('./pages/estates/EstateDetail'))
const FactoriesList  = lazy(() => import('./pages/factories/FactoriesList'))
const FactoryForm    = lazy(() => import('./pages/factories/FactoryForm'))
const Chatbot        = lazy(() => import('./pages/chatbot/Chatbot'))
const BoundaryTracker = lazy(() => import('./pages/gis/BoundaryTracker'))
const FieldMapPage   = lazy(() => import('./pages/gis/FieldMapPage'))
const FieldDataPage  = lazy(() => import('./pages/gis/FieldDataPage'))
const Settings       = lazy(() => import('./pages/settings/Settings'))
const Calculators    = lazy(() => import('./pages/calculators/PHDolomiteCalculator'))
const FoliarSprayCalculator = lazy(() => import('./pages/calculators/FoliarSprayCalculator'))
const UnitsConverter = lazy(() => import('./pages/calculators/UnitsConverter'))
const AccountCreate  = lazy(() => import('./pages/accounts/AccountCreate'))
const AccountEdit    = lazy(() => import('./pages/accounts/AccountEdit'))
const AccountsList   = lazy(() => import('./pages/accounts/AccountsList'))
const PrivacyPolicy  = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const Support        = lazy(() => import('./pages/Support'))
const WeatherPage    = lazy(() => import('./pages/weather/WeatherPage'))
const HistoricalData = lazy(() => import('./pages/weather/HistoricalData'))
const EPFGuidelines  = lazy(() => import('./pages/compliances/EPFGuidelines'))
const ETFGuidelines  = lazy(() => import('./pages/compliances/ETFGuidelines'))
const Subsidies      = lazy(() => import('./pages/compliances/SubsidyReplantingPage'))
const Cinnamon       = lazy(() => import('./pages/compliances/CinnamonCompliance'))
const RevenueLicenseManagement = lazy(() => import('./pages/compliances/RevenueLicenseManagement'))
const InsuranceManagement = lazy(() => import('./pages/compliances/InsuranceManagement'))
const WorkerRegistration = lazy(() => import('./pages/muster/WorkerRegistration'))
const WorkerView = lazy(() => import('./pages/muster/WorkerView'))
const WorkerArchive = lazy(() => import('./pages/muster/WorkerArchive'))
const WorkerEnrollment = lazy(() => import('./pages/muster/WorkerEnrollment'))
const FaceAttendance  = lazy(() => import('./pages/attendance/FaceAttendance'))
const QRAttendance    = lazy(() => import('./pages/attendance/QRAttendance'))
const ManualAttendance = lazy(() => import('./pages/attendance/ManualAttendance'))
const TodaysAttendance = lazy(() => import('./pages/attendance/TodaysAttendance'))
const DailyMuster = lazy(() => import('./pages/muster/DailyMuster'))
const DutyRelease = lazy(() => import('./pages/muster/DutyRelease'))
const AttendanceReportPage = lazy(() => import('./pages/reports/AttendanceReportPage'))
const EpfEtfReportPage = lazy(() => import('./pages/reports/EpfEtfReportPage'))
const GoodsInventoryTab = lazy(() => import('./pages/inventory/GoodsInventoryTab'))
const AddGoodsItemTab = lazy(() => import('./pages/inventory/AddGoodsItemTab'))
const IssueGoodsItemTab = lazy(() => import('./pages/inventory/IssueGoodsItemTab'))
const IssueHistoryTab = lazy(() => import('./pages/inventory/IssueHistoryTab'))
const SuppliersTab = lazy(() => import('./pages/inventory/SuppliersTab'))
const TeaInventoryTab = lazy(() => import('./pages/inventory/TeaInventoryTab'))
const BiologicalAssetsTab = lazy(() => import('./pages/inventory/BiologicalAssetsTab'))
const PhysicalAssetsTab = lazy(() => import('./pages/inventory/PhysicalAssetsTab'))
const InventoryReportsPage = lazy(() => import('./pages/reports/InventoryReportsPage'))
const AssetAuditTab = lazy(() => import('./pages/audits/AssetAuditTab'))
const BiologicalAssetAuditTab = lazy(() => import('./pages/audits/BiologicalAssetAuditTab'))
const AssetAuditReportsPage = lazy(() => import('./pages/reports/AssetAuditReportsPage'))
const PluckingIntel = lazy(() => import('./pages/crop/PluckingIntel'))
const PruningIntel = lazy(() => import('./pages/crop/PruningIntel'))
const WeedingIntel = lazy(() => import('./pages/crop/WeedingIntel'))
const ManureIntel = lazy(() => import('./pages/crop/ManureIntel'))
const LoppingIntel = lazy(() => import('./pages/crop/LoppingIntel'))
const FoliarRound = lazy(() => import('./pages/rounds/FoliarRound'))
const WeedingRound = lazy(() => import('./pages/rounds/WeedingRound'))
const PluckingRound = lazy(() => import('./pages/rounds/PluckingRound'))
const LoppingRound = lazy(() => import('./pages/rounds/LoppingRound'))
const ManureRound = lazy(() => import('./pages/rounds/ManureRound'))
const PruningRound = lazy(() => import('./pages/rounds/PruningRound'))
const FoliarApplications = lazy(() => import('./pages/crop/FoliarApplications'))
const OtherWorksIntel = lazy(() => import('./pages/crop/OtherWorksIntel'))
const OtherCropIntel = lazy(() => import('./pages/crop/OtherCropIntel'))
const Payrall = lazy(() => import('./pages/payrall/Payrall'))
const MonthlyPayrall = lazy(() => import('./pages/payrall/MonthlyPayrall'))
const CasualPayroll = lazy(() => import('./pages/payrall/CasualPayroll'))
const CashAdvance = lazy(() => import('./pages/payrall/CashAdvance'))
const TeaPacketIssue = lazy(() => import('./pages/payrall/TeaPacketIssue'))
const ChartOfAccounts = lazy(() => import('./pages/finance/ChartOfAccounts'))
const Expenses = lazy(() => import('./pages/finance/Expenses'))
const Income = lazy(() => import('./pages/finance/Income'))
const DailyWeeklyCOP = lazy(() => import('./pages/finance/DailyWeeklyCOP'))
const HelpCenter = lazy(() => import('./pages/help/HelpCenter'))
const WeighingScaleManager = lazy(() => import('./pages/weighing/WeighingScaleManager'))
const WeighingConsole = lazy(() => import('./pages/weighing/WeighingConsole'))
// Minimal inline fallback — avoids layout shift while lazy chunks load
function PageSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center py-24">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>
  )
}

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
    // ── Fire all independent startup fetches in parallel ──────────────────
    // Previously these ran sequentially; now they race concurrently so the
    // slowest one determines total wait time instead of the sum of all.
    Promise.all([
      fetchMaintenanceMode(),
      fetchAppInfo(),
    ])

    // Subscribe to real-time maintenance mode changes so all active sessions
    // immediately see the maintenance page when an admin enables it.
    subscribeToMaintenanceMode()

    const loadPermissions = () => {
      const profile = useAuthStore.getState().profile;
      if (profile) {
        fetchModulePermissions(profile.estate_id || undefined, profile.role || undefined);
      } else {
        fetchModulePermissions(); // clear or default
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && session?.access_token) {
        registerSession(currentUser.id, session.access_token)
        fetchProfile(currentUser.id).then(loadPermissions).finally(() => setIsLoading(false));
      } else {
        useAuthStore.getState().setProfile(null);
        loadPermissions();
        setIsLoading(false);
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && session?.access_token) {
        registerSession(currentUser.id, session.access_token)
        fetchProfile(currentUser.id).then(loadPermissions);
      } else {
        useAuthStore.getState().setProfile(null);
        loadPermissions();
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
          <Route path="/login" element={<Navigate to="/login/estate" replace />} />
          <Route path="/login/estate" element={<Login mode="estate" />} />
          <Route path="/login/estate/:estateCodeParam" element={<Login mode="estate" />} />
          <Route path="/login/admin" element={<Login mode="admin" />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Protected Routes inside Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={
              <Suspense fallback={<PageSpinner />}><Dashboard /></Suspense>
            } />
            <Route path="estates" element={
              <Suspense fallback={<PageSpinner />}><EstatesList /></Suspense>
            } />
            <Route path="estates/new" element={
              <Suspense fallback={<PageSpinner />}><EstateForm /></Suspense>
            } />
            <Route path="estates/edit/:id" element={
              <Suspense fallback={<PageSpinner />}><EstateForm /></Suspense>
            } />
            <Route path="estates/:id" element={
              <Suspense fallback={<PageSpinner />}><EstateDetail /></Suspense>
            } />

            <Route path="factories" element={
              <Suspense fallback={<PageSpinner />}><FactoriesList /></Suspense>
            } />
            <Route path="factories/new" element={
              <Suspense fallback={<PageSpinner />}><FactoryForm /></Suspense>
            } />
            <Route path="factories/edit/:id" element={
              <Suspense fallback={<PageSpinner />}><FactoryForm /></Suspense>
            } />
            <Route path="gis/boundary-tracker" element={
              <Suspense fallback={<PageSpinner />}><BoundaryTracker /></Suspense>
            } />
            <Route path="gis/field-map" element={
              <Suspense fallback={<PageSpinner />}><FieldMapPage /></Suspense>
            } />
            <Route path="gis/field-data" element={
              <Suspense fallback={<PageSpinner />}><FieldDataPage /></Suspense>
            } />
            <Route path="chatbot" element={
              <Suspense fallback={<PageSpinner />}><Chatbot /></Suspense>
            } />
            <Route path="calculators/ph-dolomite" element={
              <Suspense fallback={<PageSpinner />}><Calculators /></Suspense>
            } />
            <Route path="calculators/foliar-spray" element={
              <Suspense fallback={<PageSpinner />}><FoliarSprayCalculator /></Suspense>
            } />
            <Route path="calculators/units-converter" element={
              <Suspense fallback={<PageSpinner />}><UnitsConverter /></Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={<PageSpinner />}><Settings /></Suspense>
            } />
            
            <Route path="accounts" element={
              <Suspense fallback={<PageSpinner />}><AccountsList /></Suspense>
            } />
            <Route path="accounts/new" element={
              <Suspense fallback={<PageSpinner />}><AccountCreate /></Suspense>
            } />
            <Route path="accounts/edit/:id" element={
              <Suspense fallback={<PageSpinner />}><AccountEdit /></Suspense>
            } />
            
            <Route path="weather" element={
              <Suspense fallback={<PageSpinner />}><WeatherPage /></Suspense>
            } />
            <Route path="weather/historical" element={
              <Suspense fallback={<PageSpinner />}><HistoricalData /></Suspense>
            } />
            <Route path="compliances/epf" element={
              <Suspense fallback={<PageSpinner />}><EPFGuidelines /></Suspense>
            } />
            <Route path="compliances/etf" element={
              <Suspense fallback={<PageSpinner />}><ETFGuidelines /></Suspense>
            } />
            <Route path="compliances/subsidies" element={
              <Suspense fallback={<PageSpinner />}><Subsidies /></Suspense>
            } />
            <Route path="compliances/cinnamon" element={
              <Suspense fallback={<PageSpinner />}><Cinnamon /></Suspense>
            } />
            <Route path="compliances/revenue-license" element={
              <Suspense fallback={<PageSpinner />}><RevenueLicenseManagement /></Suspense>
            } />
            <Route path="compliances/insurance" element={
              <Suspense fallback={<PageSpinner />}><InsuranceManagement /></Suspense>
            } />
            <Route path="muster/workers" element={
              <Suspense fallback={<PageSpinner />}><WorkerRegistration /></Suspense>
            } />
            <Route path="muster/directory" element={
              <Suspense fallback={<PageSpinner />}><WorkerView /></Suspense>
            } />
            <Route path="muster/archive" element={
              <Suspense fallback={<PageSpinner />}><WorkerArchive /></Suspense>
            } />
            <Route path="muster/enrollment" element={
              <Suspense fallback={<PageSpinner />}><WorkerEnrollment /></Suspense>
            } />
            <Route path="muster/daily" element={
              <Suspense fallback={<PageSpinner />}><DailyMuster /></Suspense>
            } />
            <Route path="muster/release" element={
              <Suspense fallback={<PageSpinner />}><DutyRelease /></Suspense>
            } />
            <Route path="attendance/face-attendance" element={
              <Suspense fallback={<PageSpinner />}><FaceAttendance /></Suspense>
            } />
            <Route path="attendance/qr-attendance" element={
              <Suspense fallback={<PageSpinner />}><QRAttendance /></Suspense>
            } />
            <Route path="attendance/manual-attendance" element={
              <Suspense fallback={<PageSpinner />}><ManualAttendance /></Suspense>
            } />
            <Route path="attendance/todays-attendance" element={
              <Suspense fallback={<PageSpinner />}><TodaysAttendance /></Suspense>
            } />

            <Route path="reports/attendance" element={
              <Suspense fallback={<PageSpinner />}><AttendanceReportPage /></Suspense>
            } />

            <Route path="reports/epf-etf" element={
              <Suspense fallback={<PageSpinner />}><EpfEtfReportPage /></Suspense>
            } />

            <Route path="inventory/goods" element={
              <Suspense fallback={<PageSpinner />}><GoodsInventoryTab /></Suspense>
            } />
            <Route path="inventory/goods/new" element={
              <Suspense fallback={<PageSpinner />}><AddGoodsItemTab /></Suspense>
            } />
            <Route path="inventory/goods/issue" element={
              <Suspense fallback={<PageSpinner />}><IssueGoodsItemTab /></Suspense>
            } />
            <Route path="inventory/goods/history" element={
              <Suspense fallback={<PageSpinner />}><IssueHistoryTab /></Suspense>
            } />
            <Route path="inventory/tea-packets" element={
              <Suspense fallback={<PageSpinner />}><TeaInventoryTab /></Suspense>
            } />
            <Route path="inventory/suppliers" element={
              <Suspense fallback={<PageSpinner />}><SuppliersTab /></Suspense>
            } />
            <Route path="inventory/biological" element={
              <Suspense fallback={<PageSpinner />}><BiologicalAssetsTab /></Suspense>
            } />
            <Route path="inventory/physical" element={
              <Suspense fallback={<PageSpinner />}><PhysicalAssetsTab /></Suspense>
            } />
            <Route path="/reports/inventory" element={
              <Suspense fallback={<PageSpinner />}><InventoryReportsPage /></Suspense>
            } />
            <Route path="/reports/audits" element={
              <Suspense fallback={<PageSpinner />}><AssetAuditReportsPage /></Suspense>
            } />
            <Route path="inventory" element={<Navigate to="/inventory/goods" replace />} />
            <Route path="audits/physical" element={
              <Suspense fallback={<PageSpinner />}><AssetAuditTab /></Suspense>
            } />
            <Route path="audits/biological" element={
              <Suspense fallback={<PageSpinner />}><BiologicalAssetAuditTab /></Suspense>
            } />
            <Route path="crop/plucking" element={
              <Suspense fallback={<PageSpinner />}><PluckingIntel /></Suspense>
            } />
            <Route path="crop/pruning" element={
              <Suspense fallback={<PageSpinner />}><PruningIntel /></Suspense>
            } />
            <Route path="crop/weeding" element={
              <Suspense fallback={<PageSpinner />}><WeedingIntel /></Suspense>
            } />
            <Route path="crop/manure" element={
              <Suspense fallback={<PageSpinner />}><ManureIntel /></Suspense>
            } />
            <Route path="crop/lopping" element={
              <Suspense fallback={<PageSpinner />}><LoppingIntel /></Suspense>
            } />
            <Route path="crop/foliar-applications" element={
              <Suspense fallback={<PageSpinner />}><FoliarApplications /></Suspense>
            } />
            <Route path="rounds/foliar" element={
              <Suspense fallback={<PageSpinner />}><FoliarRound /></Suspense>
            } />
            <Route path="rounds/weeding" element={
              <Suspense fallback={<PageSpinner />}><WeedingRound /></Suspense>
            } />
            <Route path="rounds/plucking" element={
              <Suspense fallback={<PageSpinner />}><PluckingRound /></Suspense>
            } />
            <Route path="rounds/lopping" element={
              <Suspense fallback={<PageSpinner />}><LoppingRound /></Suspense>
            } />
            <Route path="rounds/manure" element={
              <Suspense fallback={<PageSpinner />}><ManureRound /></Suspense>
            } />
            <Route path="rounds/pruning" element={
              <Suspense fallback={<PageSpinner />}><PruningRound /></Suspense>
            } />
            <Route path="crop/other-works" element={
              <Suspense fallback={<PageSpinner />}><OtherWorksIntel /></Suspense>
            } />
            <Route path="other-crop" element={
              <Suspense fallback={<PageSpinner />}><OtherCropIntel /></Suspense>
            } />
            <Route path="payrall/daily" element={
              <Suspense fallback={<PageSpinner />}><Payrall /></Suspense>
            } />
            <Route path="payrall/monthly" element={
              <Suspense fallback={<PageSpinner />}><MonthlyPayrall /></Suspense>
            } />
            <Route path="payrall/casual" element={
              <Suspense fallback={<PageSpinner />}><CasualPayroll /></Suspense>
            } />
            <Route path="payrall/cash-advance" element={
              <Suspense fallback={<PageSpinner />}><CashAdvance /></Suspense>
            } />
            <Route path="payrall/tea-packet-issue" element={
              <Suspense fallback={<PageSpinner />}><TeaPacketIssue /></Suspense>
            } />
            <Route path="finance/chart-of-accounts" element={
              <Suspense fallback={<PageSpinner />}><ChartOfAccounts /></Suspense>
            } />
            <Route path="finance/expenses" element={
              <Suspense fallback={<PageSpinner />}><Expenses /></Suspense>
            } />
            <Route path="finance/income" element={
              <Suspense fallback={<PageSpinner />}><Income /></Suspense>
            } />
            <Route path="finance/cop" element={
              <Suspense fallback={<PageSpinner />}><DailyWeeklyCOP /></Suspense>
            } />
            <Route path="finance" element={<Navigate to="/finance/chart-of-accounts" replace />} />

            {/* Public/Informational Routes inside Layout */}
            <Route path="privacy" element={
              <Suspense fallback={<PageSpinner />}><PrivacyPolicy /></Suspense>
            } />
            <Route path="terms" element={
              <Suspense fallback={<PageSpinner />}><TermsOfService /></Suspense>
            } />
            <Route path="support" element={
              <Suspense fallback={<PageSpinner />}><Support /></Suspense>
            } />
            <Route path="help" element={
              <Suspense fallback={<PageSpinner />}><HelpCenter /></Suspense>
            } />
            <Route path="weighing/scales" element={
              <Suspense fallback={<PageSpinner />}><WeighingScaleManager /></Suspense>
            } />
            <Route path="weighing/console" element={
              <Suspense fallback={<PageSpinner />}><WeighingConsole /></Suspense>
            } />
            <Route path="weighing" element={<Navigate to="/weighing/scales" replace />} />
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
