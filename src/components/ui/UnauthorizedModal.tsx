import { useNavigate } from 'react-router-dom'
import { Lock, ShieldX, ArrowLeft, Home } from 'lucide-react'

interface UnauthorizedModalProps {
  moduleName: string
}

export default function UnauthorizedModal({ moduleName }: UnauthorizedModalProps) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 animate-in zoom-in-90 fade-in duration-300">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-br from-red-600/30 via-rose-600/20 to-red-900/30 rounded-[2rem] blur-xl" />

        <div className="relative bg-white dark:bg-slate-900 rounded-[1.75rem] border border-red-200/50 dark:border-red-800/40 shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

          <div className="p-8 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/60 dark:to-rose-950/60 border-2 border-red-200/70 dark:border-red-800/50 flex items-center justify-center shadow-lg shadow-red-500/20">
                <ShieldX size={40} className="text-red-500" />
              </div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping" />
              {/* Lock badge */}
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-red-600 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                <Lock size={16} className="text-white" />
              </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Access Restricted
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              You don&apos;t have permission to access the{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {moduleName}
              </span>{' '}
              module. Please contact your administrator to request access.
            </p>

            {/* Role badge */}
            <div className="mt-5 flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 rounded-xl">
              <Lock size={13} className="text-red-500 shrink-0" />
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Unauthorized — Insufficient Permissions
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 w-full">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft size={15} />
                Go Back
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/30"
              >
                <Home size={15} />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
