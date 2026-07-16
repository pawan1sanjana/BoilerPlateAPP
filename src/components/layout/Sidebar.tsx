import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Settings as SettingsIcon, X, UserCog, ChevronDown, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useModulePermissionsStore, type AppRole } from '@/store/useModulePermissionsStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'

import { useModuleOrderStore } from '@/store/useModuleOrderStore'
import { useEffect } from 'react'

const STATIC_MAIN_REGISTRY: Record<string, any> = {
  'dashboard': { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  'administration': { name: 'Administration', icon: SettingsIcon }
}

const STATIC_SUB_REGISTRY: Record<string, any> = {
  'admin/accounts': { name: 'Accounts', path: '/accounts', icon: UserCog },
  'admin/settings': { name: 'System Settings', path: '/settings', icon: SettingsIcon }
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean | undefined>>({})
  const location = useLocation()
  
  const { profile } = useAuthStore()
  const { appName, appIcon, appVersion, companyName } = useAppInfoStore()
  const { checkAccess } = useModulePermissionsStore()
  const { mainOrder, subOrders, fetch: fetchModuleOrder } = useModuleOrderStore()
  const userRole = (profile?.role as AppRole) ?? null

  useEffect(() => {
    fetchModuleOrder()
  }, [fetchModuleOrder])

  const navItems = mainOrder.map(mainKey => {
    const mainDef = STATIC_MAIN_REGISTRY[mainKey]
    if (!mainDef) return null

    const subs = subOrders[mainKey]
    if (subs && subs.length > 0) {
      const subItems = subs.map(subKey => STATIC_SUB_REGISTRY[subKey]).filter(Boolean)
      return { ...mainDef, subItems }
    }

    return mainDef
  }).filter(Boolean)

  const filteredNavItems = navItems.map(item => {
    if (item.subItems) {
      const filteredSubItems = item.subItems.filter(sub => {
        return checkAccess(userRole, sub.path).allowed
      })
      return { ...item, subItems: filteredSubItems }
    }
    return checkAccess(userRole, item.path!).allowed ? item : null
  }).filter(item => {
    if (!item) return false
    if (item.subItems && item.subItems.length === 0) return false
    return true
  }) as typeof navItems

  const isSubRouteActive = (subItems: any[]) => subItems.some(item => {
    if (item.exact) {
      return location.pathname === item.path
    }
    return location.pathname.startsWith(item.path)
  })

  const toggleDropdown = (name: string) => {
    setOpenDropdowns(prev => {
      const isCurrentlyOpen = prev[name] !== undefined
        ? prev[name]
        : filteredNavItems.find(i => i.name === name)?.subItems?.some(sub => {
          if ((sub as any).exact) {
            return location.pathname === sub.path
          }
          return location.pathname.startsWith(sub.path)
        })

      const nextState: Record<string, boolean> = {}

      filteredNavItems.forEach(item => {
        if (item.subItems) {
          nextState[item.name] = false
        }
      })

      nextState[name] = !isCurrentlyOpen
      return nextState
    })
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base styles
          'flex flex-col h-full bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300',
          'transition-all duration-300 border-r border-slate-200 dark:border-slate-800',
          // Desktop: always visible, static
          'md:relative md:translate-x-0 md:w-64 md:flex-shrink-0 md:z-auto',
          // Mobile: fixed drawer that slides in
          'fixed inset-y-0 left-0 z-50 w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        aria-label="Sidebar navigation"
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-16 px-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            {appIcon ? (
              <img src={appIcon} alt="App Logo" className="w-6 h-6 object-contain" />
            ) : (
              <Truck className="w-6 h-6 text-blue-500" />
            )}
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-wide truncate">{appName}</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {filteredNavItems.map((item) => {
              if (item.subItems) {
                const isOpen = openDropdowns[item.name] !== undefined
                  ? openDropdowns[item.name]
                  : isSubRouteActive(item.subItems)
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={cn(
                        'w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                        isSubRouteActive(item.subItems)
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                        {item.name}
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 transition-transform duration-200',
                          isOpen ? 'rotate-180' : ''
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="pl-10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((subItem) => (
                          <NavLink
                             key={subItem.name}
                            to={subItem.path}
                            onClick={onClose}
                            end={(subItem as any).exact}
                            className={({ isActive }) =>
                              cn(
                                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                                isActive
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                              )
                            }
                          >
                            <subItem.icon className="mr-3 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            {subItem.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.path!}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    )
                  }
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center flex flex-col items-center gap-1">
            <span>{appName} &copy; {new Date().getFullYear()} {companyName && `| ${companyName}`}</span>
            {appVersion && <span className="text-[10px] opacity-75">Version {appVersion}</span>}
          </div>
        </div>
      </aside>
    </>
  )
}
