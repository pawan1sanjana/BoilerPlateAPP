import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useMaintenanceModeStore } from '@/store/useMaintenanceModeStore'
import { useModulePermissionsStore, type AppRole } from '@/store/useModulePermissionsStore'
import Sidebar from './Sidebar'
import Header from './Header'
import Footer from './Footer'
import MaintenancePage from '@/pages/MaintenancePage'
import UnauthorizedModal from '@/components/ui/UnauthorizedModal'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { Truck } from 'lucide-react'

// ─── Module Guard ─────────────────────────────────────────────────────────────

function ModuleGuard({ userRole, children }: { userRole: AppRole | null; children: React.ReactNode }) {
  const location = useLocation()
  const { checkAccess } = useModulePermissionsStore()

  if (userRole === 'admin') return <>{children}</>

  const { allowed, label } = checkAccess(userRole, location.pathname)
  if (!allowed) return <UnauthorizedModal moduleName={label} />

  return <>{children}</>
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, profile } = useAuthStore()
  const { isMaintenanceMode } = useMaintenanceModeStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { appName, appIcon } = useAppInfoStore()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (profile?.status === 'pending') {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl text-center space-y-4 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-center mb-6">
            {appIcon ? (
              <img src={appIcon} alt={`${appName} Logo`} className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Pending for {appName}</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Your account has been created successfully, but it is currently pending administrator approval. Please check back later.
          </p>
          <button 
            onClick={() => useAuthStore.getState().signOut()}
            className="mt-6 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Non-admin users see the maintenance page when maintenance mode is active
  if (isMaintenanceMode && profile?.role !== 'admin') {
    return <MaintenancePage />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 md:p-6 flex-1">
            <div className="mx-auto max-w-7xl">
              <ModuleGuard userRole={(profile?.role as AppRole) ?? null}>
                <Outlet />
              </ModuleGuard>
            </div>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
