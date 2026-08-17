import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { LayoutDashboard, Settings as SettingsIcon, X, UserCog, ChevronDown, Truck, Calculator, Droplets, Ruler, Bot, Building2, MapPin, Cloud, History, ShieldCheck, Users, UserPlus, Sprout, ClipboardList, ClipboardCheck, Archive, ScanFace, Fingerprint, QrCode, FileText, LogOut, Package, RefreshCcw, PlusCircle, TreeDeciduous, Box, Scan, Leaf, Coffee, CalendarClock, Scissors, Shovel, Axe, Briefcase, Activity, Banknote, Landmark, ReceiptText, Scale, Bluetooth } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useModulePermissionsStore, type AppRole } from '@/store/useModulePermissionsStore'
import { useModuleOrderStore } from '@/store/useModuleOrderStore'
import { useEffect } from 'react'
import { useAppInfoStore } from '@/store/useAppInfoStore'

const STATIC_MAIN_REGISTRY: Record<string, any> = {
  'estates_management': { name: 'Estates & Factories', icon: Truck },
  'other_crop': { name: 'Other Crops', icon: Sprout },
  'muster': { name: 'HR', icon: Users },
  'smart_muster': { name: 'Muster', icon: ClipboardCheck },
  'attendance': { name: 'Attendance', icon: Fingerprint },
  'gis': { name: 'GIS', icon: MapPin },
  'dashboard': { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  'inventory': { name: 'Inventory', path: '/inventory', icon: Package },
  'audits': { name: 'Audits', icon: ClipboardCheck },
  'weather': { name: 'Weather', icon: Cloud },
  'chatbot': { name: 'AI Assistant', path: '/chatbot', icon: Bot },
  'calculators': { name: 'Calculators', icon: Calculator },
  'reports': { name: 'Reports', icon: FileText },
  'administration': { name: 'Administration', icon: SettingsIcon },
  'compliances': { name: 'Compliances', icon: ShieldCheck },
  'crop': { name: 'Daily Operations', icon: Leaf },
  'rounds_monitor': { name: 'Rounds Monitor', icon: Activity },
  'payrall': { name: 'Payroll', icon: Banknote },
  'finance': { name: 'Finance', icon: Landmark },
  'weighing': { name: 'Weighing Scale', icon: Scale },
}

const STATIC_SUB_REGISTRY: Record<string, any> = {

  'estates_management/estates': { name: 'Estates', path: '/estates', icon: Truck },
  'muster/workers': { name: 'Worker Registration', path: '/muster/workers', icon: UserPlus },
  'muster/directory': { name: 'Worker Directory', path: '/muster/directory', icon: ClipboardList },
  'smart_muster/daily': { name: 'Daily Muster', path: '/muster/daily', icon: ClipboardCheck },
  'smart_muster/release': { name: 'Duty Release', path: '/muster/release', icon: LogOut },
  'muster/enrollment': { name: 'Face Enrollment', path: '/muster/enrollment', icon: ScanFace },
  'attendance/todays-attendance': { name: 'Todays Attendance', path: '/attendance/todays-attendance', icon: CalendarClock },
  'attendance/face-attendance': { name: 'Face Attendance', path: '/attendance/face-attendance', icon: Fingerprint },
  'attendance/qr-attendance': { name: 'QR Attendance', path: '/attendance/qr-attendance', icon: QrCode },
  'attendance/manual-attendance': { name: 'Manual Attendance', path: '/attendance/manual-attendance', icon: ClipboardList },
  'muster/archive': { name: 'Archived Workers', path: '/muster/archive', icon: Archive },
  'estates_management/factories': { name: 'Factories', path: '/factories', icon: Building2 },
  'gis/boundary-tracker': { name: 'Boundary Tracker', path: '/gis/boundary-tracker', icon: MapPin },
  'gis/field-map': { name: 'Field Map', path: '/gis/field-map', icon: MapPin },
  'gis/field-data': { name: 'Field Data', path: '/gis/field-data', icon: MapPin },
  'calculators/ph': { name: 'PH Dolomite', path: '/calculators/ph-dolomite', icon: Calculator },
  'calculators/foliar': { name: 'Foliar Spray', path: '/calculators/foliar-spray', icon: Droplets },
  'calculators/units': { name: 'Units Converter', path: '/calculators/units-converter', icon: Ruler },
  'weather/realtime': { name: 'Realtime Weather', path: '/weather', icon: Cloud, exact: true },
  'weather/historical': { name: 'Historical Data', path: '/weather/historical', icon: History },
  'admin/accounts': { name: 'Accounts', path: '/accounts', icon: UserCog },
  'admin/settings': { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  'compliances/epf': { name: 'EPF Guidelines', path: '/compliances/epf', icon: Building2 },
  'compliances/etf': { name: 'ETF Guidelines', path: '/compliances/etf', icon: Users },
  'compliances/subsidies': { name: 'Tea Subsidies', path: '/compliances/subsidies', icon: Sprout },
  'compliances/cinnamon': { name: 'Other Crops', path: '/compliances/cinnamon', icon: ClipboardList },
  'compliances/revenue-license': { name: 'Revenue License', path: '/compliances/revenue-license', icon: ClipboardList },
  'compliances/insurance': { name: 'Insurance', path: '/compliances/insurance', icon: ShieldCheck },
  'reports/attendance': { name: 'Attendance Reports', path: '/reports/attendance', icon: FileText },
  'inventory/goods': { name: 'Goods Inventory', path: '/inventory/goods', icon: Package, exact: true },
  'inventory/add_goods': { name: 'Register Item', path: '/inventory/goods/new', icon: PlusCircle },
  'inventory/issue_goods': { name: 'Issue Items', path: '/inventory/goods/issue', icon: RefreshCcw },
  'inventory/issue_history': { name: 'Issue History', path: '/inventory/goods/history', icon: History },
  'inventory/tea_packets': { name: 'Tea Packets', path: '/inventory/tea-packets', icon: Coffee },
  'inventory/suppliers': { name: 'Supplier Directory', path: '/inventory/suppliers', icon: Users },
  'inventory/biological': { name: 'Biological Assets', path: '/inventory/biological', icon: TreeDeciduous },
  'inventory/physical': { name: 'Physical Assets', path: '/inventory/physical', icon: Box },
  'reports/inventory': { name: 'Inventory Reports', path: '/reports/inventory', icon: FileText },
  'reports/audits': { name: 'Assets Audit Reports', path: '/reports/audits', icon: FileText },
  'reports/epf-etf': { name: 'EPF / ETF Report', path: '/reports/epf-etf', icon: ShieldCheck },
  'audits/physical': { name: 'Asset Audit Scanner', path: '/audits/physical', icon: Scan },
  'audits/biological': { name: 'Bio Asset Audit', path: '/audits/biological', icon: Leaf },
  'crop/plucking': { name: 'Plucking Registry', path: '/crop/plucking', icon: Sprout },
  'crop/pruning': { name: 'Pruning Registry', path: '/crop/pruning', icon: Scissors },
  'crop/weeding': { name: 'Weeding Registry', path: '/crop/weeding', icon: Shovel },
  'crop/manure': { name: 'Manure Registry', path: '/crop/manure', icon: Package },
  'crop/lopping': { name: 'Lopping Registry', path: '/crop/lopping', icon: Axe },
  'crop/foliar-applications': { name: 'Foliar Applications', path: '/crop/foliar-applications', icon: Droplets },
  'rounds/foliar': { name: 'Foliar Monitor', path: '/rounds/foliar', icon: Droplets },
  'rounds/weeding': { name: 'Weeding Monitor', path: '/rounds/weeding', icon: Shovel },
  'rounds/plucking': { name: 'Plucking Monitor', path: '/rounds/plucking', icon: Sprout },
  'rounds/manure': { name: 'Manure Monitor', path: '/rounds/manure', icon: Package },
  'rounds/pruning': { name: 'Pruning Monitor', path: '/rounds/pruning', icon: Scissors },
  'rounds/lopping': { name: 'Lopping Monitor', path: '/rounds/lopping', icon: Axe },
  'crop/other-works': { name: 'Other Works', path: '/crop/other-works', icon: Briefcase },
  'other_crop/intel': { name: 'Other Crop Intel', path: '/other-crop', icon: Sprout },
  'payrall/daily': { name: 'Daily Payroll', path: '/payrall/daily', icon: ClipboardCheck },
  'payrall/monthly': { name: 'Monthly Payroll', path: '/payrall/monthly', icon: ClipboardList },
  'payrall/casual': { name: 'Casual Payroll', path: '/payrall/casual', icon: Users },
  'payrall/cash-advance': { name: 'Cash Advance', path: '/payrall/cash-advance', icon: Banknote },
  'payrall/tea-packet-issue': { name: 'Tea Packet Issue', path: '/payrall/tea-packet-issue', icon: Package },
  'finance/chart-of-accounts': { name: 'Chart of Accounts', path: '/finance/chart-of-accounts', icon: Landmark },
  'finance/expenses': { name: 'Expenses', path: '/finance/expenses', icon: ReceiptText },
  'finance/income': { name: 'Income', path: '/finance/income', icon: Banknote },
  'finance/cop': { name: 'Daily & Weekly COP', path: '/finance/cop', icon: Calculator },
  'weighing/scales': { name: 'Scale Management', path: '/weighing/scales', icon: Scale },
  'weighing/console': { name: 'Weighing Console', path: '/weighing/console', icon: Bluetooth },
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
      const filteredSubItems = item.subItems.filter((sub: any) => {
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
        : filteredNavItems.find(i => i.name === name)?.subItems?.some((sub: any) => {
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
                        {item.subItems.map((subItem: any) => (
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
                  end
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
