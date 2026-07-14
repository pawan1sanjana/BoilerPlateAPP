import { Wrench, Clock, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function MaintenancePage() {
  const { signOut } = useAuthStore()
  const { appName, appIcon } = useAppInfoStore()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden px-4 py-8">

      {/* ── Animated background layers ── */}

      {/* Slowly drifting gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Animated grid */}
      <div className="absolute inset-0 pointer-events-none grid-bg" />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${5 + (i * 53) % 90}%`,
            top: `${10 + (i * 37) % 80}%`,
            animationDelay: `${(i * 0.4) % 6}s`,
            animationDuration: `${4 + (i * 0.7) % 5}s`,
            width: i % 3 === 0 ? '3px' : '2px',
            height: i % 3 === 0 ? '3px' : '2px',
            opacity: 0.15 + (i % 4) * 0.1,
          }} />
        ))}
      </div>

      {/* Scanning line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="scan-line" />
      </div>

      {/* Card */}
      <div className="relative z-10 max-w-md w-full text-center space-y-5">

        {/* Icon cluster */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl scale-150 animate-pulse" />
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border border-blue-500/20 spin-slow" style={{ margin: '-12px' }} />
            <div className="absolute inset-0 rounded-full border border-dashed border-blue-400/10 spin-slow-rev" style={{ margin: '-24px' }} />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/40 flex items-center justify-center">
                <Wrench
                  size={24}
                  className="text-blue-400 drop-shadow-lg"
                  style={{ animation: 'wrench-wiggle 2.5s ease-in-out infinite' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <AlertTriangle size={11} />
            System Offline
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
            Under
            <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Maintenance
            </span>
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            We're performing scheduled maintenance to improve your experience.
            The system will be back online shortly.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-xs mx-auto">
          <Clock size={14} className="text-blue-400 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
          <p className="text-xs text-slate-400">
            Maintenance in progress&nbsp;
            <span className="text-white font-semibold">— please check back soon</span>
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-500/60"
              style={{
                animation: `bounce 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-700 hover:border-blue-500/50 hover:text-white hover:bg-blue-500/10 transition-all duration-300 backdrop-blur-sm"
        >
          Sign Out
        </button>

        {/* Branding */}
        <div className="flex flex-col items-center justify-center pt-4 opacity-75">
          {appIcon && <img src={appIcon} alt={`${appName} Logo`} className="w-8 h-8 object-contain mb-2 opacity-80" />}
          <p className="text-xs text-slate-600 font-semibold tracking-wider uppercase">
            {appName}
          </p>
        </div>
      </div>

      <style>{`
        /* ── Orbs ── */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform, opacity;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%);
          top: -120px; left: -120px;
          animation: orb-drift-1 12s ease-in-out infinite alternate;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation: orb-drift-2 15s ease-in-out infinite alternate;
        }
        .orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: orb-drift-3 9s ease-in-out infinite alternate;
        }
        @keyframes orb-drift-1 {
          from { transform: translate(0, 0) scale(1); opacity: 0.8; }
          to   { transform: translate(80px, 60px) scale(1.15); opacity: 1; }
        }
        @keyframes orb-drift-2 {
          from { transform: translate(0, 0) scale(1); opacity: 0.7; }
          to   { transform: translate(-60px, -80px) scale(1.2); opacity: 1; }
        }
        @keyframes orb-drift-3 {
          from { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          to   { transform: translate(-50%, -55%) scale(1.3); opacity: 0.8; }
        }

        /* ── Animated grid ── */
        .grid-bg {
          background-image:
            linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px);
          background-size: 52px 52px;
          animation: grid-scroll 20s linear infinite;
        }
        @keyframes grid-scroll {
          0%   { background-position: 0 0; }
          100% { background-position: 52px 52px; }
        }

        /* ── Floating particles ── */
        .particle {
          position: absolute;
          border-radius: 50%;
          background: #60a5fa;
          animation: float-up linear infinite;
        }
        @keyframes float-up {
          0%   { transform: translateY(0px) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-120px) scale(0.4); opacity: 0; }
        }

        /* ── Scan line ── */
        .scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent);
          animation: scan 6s ease-in-out infinite;
          box-shadow: 0 0 12px rgba(59,130,246,0.4);
        }
        @keyframes scan {
          0%   { top: -2px;   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%;   opacity: 0; }
        }

        /* ── Spinning rings around icon ── */
        .spin-slow     { animation: spin 12s linear infinite; }
        .spin-slow-rev { animation: spin 18s linear infinite reverse; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Wrench wiggle ── */
        @keyframes wrench-wiggle {
          0%, 100% { transform: rotate(-15deg); }
          25%      { transform: rotate(15deg); }
          50%      { transform: rotate(-10deg); }
          75%      { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  )
}
