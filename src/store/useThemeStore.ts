import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'
export type ThemeColor = 'blue' | 'green' | 'purple' | 'rose' | 'orange'

interface ThemeState {
  theme: Theme
  themeColor: ThemeColor
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  setThemeColor: (color: ThemeColor) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      themeColor: 'blue',
      toggleTheme: () => {
        const current = get().theme
        let next: Theme = 'light'
        
        if (current === 'system') {
          const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          next = isSystemDark ? 'light' : 'dark'
        } else if (current === 'light') {
          next = 'dark'
        }
        
        set({ theme: next })
        applyTheme(next)
      },
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme, get().themeColor)
      },
      setThemeColor: (color) => {
        set({ themeColor: color })
        applyTheme(get().theme, color)
      },
    }),
    {
      name: 'BoilerplateApp-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.themeColor || 'blue')
      },
    }
  )
)

export function applyTheme(theme: Theme, color: ThemeColor = 'blue') {
  const root = document.documentElement
  let isDark = theme === 'dark'

  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Remove existing theme colors
  const themeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'))
  themeClasses.forEach(c => root.classList.remove(c))

  // Add new theme color if not default blue
  if (color !== 'blue') {
    root.classList.add(`theme-${color}`)
  }
}

