import { Link, useLocation } from 'react-router-dom'
import { LogOut, User, Sun, Moon, Menu, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { appName } = useAppInfoStore()
  const location = useLocation()

  const getPageName = () => {
    const path = location.pathname.split('/')[1] || 'dashboard'
    // Capitalize first letter and replace hyphens with spaces
    // e.g., "privacy-policy" -> "Privacy policy" (simple approach), 
    // or we can map common ones
    if (path === 'terms') return 'Terms of Service'
    if (path === 'privacy') return 'Privacy Policy'
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 flex-shrink-0">

      {/* Left: Hamburger (mobile) + Search (desktop) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden flex-shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand name — mobile only (center feel) */}
        <span className="md:hidden font-bold text-slate-900 dark:text-white tracking-wide text-lg">
          {appName}
        </span>

        {/* Current Page Name — desktop only */}
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {getPageName()}
          </h1>
        </div>
      </div>

      {/* Right: Theme Toggle + Notifications + Avatar */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        
        <PWAInstallPrompt />

        {/* ── Animated Theme Toggle ── */}
        {profile?.role === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="relative w-9 h-9 rounded-full overflow-hidden text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors duration-200"
          >
            {/* Sun icon */}
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring
                ${theme === 'dark'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 rotate-90 scale-50'
                }`}
            >
              <Sun className="h-5 w-5" />
            </span>
            {/* Moon icon */}
            <span
              className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring
                ${theme === 'light'
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-50'
                }`}
            >
              <Moon className="h-5 w-5" />
            </span>
          </Button>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none ring-2 ring-transparent hover:ring-blue-400 dark:hover:ring-blue-500 transition-all duration-200">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'admin'}`}
                alt={user?.email || ''}
              />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.name || 'Administrator'}
                  </p>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <Link to="/settings" className="w-full">
              <DropdownMenuItem className="cursor-pointer">Profile settings</DropdownMenuItem>
            </Link>
            <Link to="/help" className="w-full">
              <DropdownMenuItem className="cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help Center</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
