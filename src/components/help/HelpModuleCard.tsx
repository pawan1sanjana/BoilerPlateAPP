import { useState, useMemo } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HelpStep {
  title: string
  description: string
}

export interface HelpTip {
  text: string
}

export interface HelpModuleCardData {
  id: string
  icon: LucideIcon
  iconColor: string
  title: string
  badge?: string
  description: string
  steps: HelpStep[]
  tips?: HelpTip[]
  adminOnly?: boolean
}

interface HelpModuleCardProps {
  data: HelpModuleCardData
  searchQuery: string
  forceOpen?: boolean
}

export default function HelpModuleCard({ data, searchQuery, forceOpen }: HelpModuleCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const open = forceOpen || isOpen

  const highlight = (text: string, query: string) => {
    if (!query.trim()) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100 rounded px-0.5">{part}</mark>
        : part
    )
  }

  return (
    <div className={cn(
      'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200',
      open && 'ring-1 ring-blue-500/20'
    )}>
      {/* Header */}
      <button
        id={`help-card-${data.id}`}
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center gap-4 p-4 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        aria-expanded={open}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <data.icon className={cn('w-4 h-4', data.iconColor)} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {highlight(data.title, searchQuery)}
            </span>
            {data.badge && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                {data.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-1">
            {highlight(data.description, searchQuery)}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown className={cn(
          'flex-shrink-0 w-4 h-4 text-slate-400 transition-transform duration-200',
          open && 'rotate-180 text-blue-500'
        )} />
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Description */}
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {highlight(data.description, searchQuery)}
          </p>

          {/* Steps */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              How to Use
            </p>
            <ol className="space-y-3">
              {data.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center mt-0.5 shadow-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">
                      {highlight(step.title, searchQuery)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {highlight(step.description, searchQuery)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {data.tips && data.tips.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">
                💡 Pro Tips
              </p>
              <ul className="space-y-1.5">
                {data.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                    <span>{highlight(tip.text, searchQuery)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
