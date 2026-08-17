import { useState, useEffect } from 'react'
import { useMaintenanceModeStore } from '@/store/useMaintenanceModeStore'
import { Rocket, Zap } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function SystemUpdateBanner() {
  const showUpdateBanner = useMaintenanceModeStore(s => s.showUpdateBanner)
  const deploymentNote = useMaintenanceModeStore(s => s.deploymentNote)
  const isForced = useMaintenanceModeStore(s => s.isForced)
  const dismiss = useMaintenanceModeStore(s => s.dismissUpdateBanner)
  const defer = useMaintenanceModeStore(s => s.deferUpdateBanner)
  const { appName } = useAppInfoStore()

  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  // Animate in on mount
  useEffect(() => {
    if (showUpdateBanner) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [showUpdateBanner])

  if (!showUpdateBanner) return null

  const handleReloadNow = () => {
    dismiss()
    setPhase('loading')
    setProgress(0)

    // Smooth progress fill
    const start = performance.now()
    const duration = 2000
    const tick = (now: number) => {
      const pct = Math.min((now - start) / duration, 1)
      // ease-out curve
      setProgress(Math.round(1 - Math.pow(1 - pct, 3)) * 100)
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    setTimeout(() => setPhase('done'), 2100)
    setTimeout(() => window.location.reload(), 2800)
  }

  const handleLater = () => {
    setVisible(false)
    setTimeout(() => defer(), 350)
  }

  return (
    <>
      {/* ── Full-screen overlay ── */}
      <div
        className="fixed inset-0 z-[60]"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(30,27,75,0.72) 0%, rgba(2,6,23,0.85) 100%)',
          backdropFilter: 'blur(6px)',
          transition: 'opacity 0.35s ease',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* ── Modal ── */}
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{
          transition: 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.92)',
        }}
      >
        <div className="relative w-full max-w-sm">

          {/* Rotating gradient border glow */}
          <div
            className="absolute -inset-[1.5px] rounded-[28px] pointer-events-none"
            style={{
              background: 'conic-gradient(from var(--border-angle, 0deg), #3b82f6, #818cf8, #06b6d4, #3b82f6)',
              animation: 'border-spin 4s linear infinite',
              opacity: phase === 'done' ? 0 : 1,
              transition: 'opacity 0.5s',
            }}
          />

          {/* Card body */}
          <div
            className="relative rounded-[26px] overflow-hidden text-white"
            style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #0a0f1f 60%, #0d1333 100%)',
              boxShadow: phase === 'done'
                ? '0 0 0 1.5px rgba(16,185,129,0.6), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(16,185,129,0.15)'
                : '0 0 0 1.5px rgba(59,130,246,0.2), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.1)',
              transition: 'box-shadow 0.6s ease',
            }}
          >
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: i % 3 === 0 ? '3px' : '2px',
                    height: i % 3 === 0 ? '3px' : '2px',
                    background: i % 2 === 0 ? '#60a5fa' : '#818cf8',
                    left: `${8 + (i * 47) % 84}%`,
                    top: `${10 + (i * 31) % 80}%`,
                    opacity: 0.3 + (i % 4) * 0.12,
                    animation: `particle-float ${3 + (i * 0.4) % 3}s ease-in-out ${(i * 0.3) % 2}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            {/* Ambient color glow */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full blur-3xl pointer-events-none"
              style={{
                background: phase === 'done'
                  ? 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
                transition: 'background 0.8s ease',
              }}
            />

            {/* ─── IDLE / LOADING content ─── */}
            {phase !== 'done' && (
              <div className="relative px-7 pt-8 pb-7">



                {/* Icon area */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Outer ring — spins during loading */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: '1.5px solid',
                        borderColor: 'rgba(99,102,241,0.25)',
                        animation: phase === 'loading' ? 'ring-spin 1.2s linear infinite' : 'ring-pulse 3s ease-in-out infinite',
                      }}
                    />
                    {/* Middle dashed ring */}
                    <div
                      className="absolute inset-[10px] rounded-full"
                      style={{
                        border: '1.5px dashed rgba(59,130,246,0.2)',
                        animation: phase === 'loading'
                          ? 'ring-spin 2s linear infinite reverse'
                          : 'ring-pulse 4s ease-in-out 1s infinite',
                      }}
                    />

                    {/* SVG arc — progress ring during loading */}
                    {phase === 'loading' && (
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 96 96"
                        style={{ transform: 'rotate(-90deg)' }}
                      >
                        <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(99,102,241,0.08)" strokeWidth="3" />
                        <circle
                          cx="48" cy="48" r="44" fill="none"
                          stroke="url(#pu-grad)" strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 44}`}
                          strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                        />
                        <defs>
                          <linearGradient id="pu-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                    )}

                    {/* Pulsing halo (idle only) */}
                    {phase === 'idle' && (
                      <div
                        className="absolute inset-3 rounded-full bg-indigo-500/10"
                        style={{ animation: 'halo-pulse 2.5s ease-in-out infinite' }}
                      />
                    )}

                    {/* Center icon button */}
                    <div
                      className="relative w-14 h-14 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #818cf8 100%)',
                        boxShadow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 32px rgba(99,102,241,0.45)',
                        animation: phase === 'loading' ? 'center-pulse 0.9s ease-in-out infinite alternate' : 'none',
                      }}
                    >
                      <Rocket
                        size={22}
                        className="text-white"
                        style={{
                          animation: phase === 'loading'
                            ? 'rocket-launch 0.5s ease-in-out infinite alternate'
                            : 'rocket-idle 3s ease-in-out infinite',
                        }}
                      />
                    </div>
                  </div>

                  {/* Badge */}
                  <div
                    className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(129,140,248,0.15))',
                      border: '1px solid rgba(99,102,241,0.25)',
                    }}
                  >
                    <Zap size={10} className="text-blue-400" style={{ animation: 'zap-flicker 1.8s ease-in-out infinite' }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                      {phase === 'loading' ? 'Applying Update' : 'System Update'}
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <h2 className="text-xl font-black text-white text-center mb-1 tracking-tight">
                  {phase === 'loading'
                    ? 'Installing Update…'
                    : isForced
                      ? 'Update Pending'
                      : 'New Version Available'}
                </h2>
                <p className="text-sm text-slate-400 text-center mb-5 leading-relaxed">
                  {phase === 'loading'
                    ? 'Almost done, please wait…'
                    : isForced
                      ? 'You need to reload to use the latest version.'
                      : `${appName} has been updated with new features and fixes.`}
                </p>

                {/* Progress bar (loading phase) */}
                {phase === 'loading' && (
                  <div className="mb-5 space-y-1.5">
                    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #818cf8, #06b6d4)',
                          boxShadow: '0 0 8px rgba(99,102,241,0.8)',
                          transition: 'width 0.1s linear',
                        }}
                      />
                      {/* Shimmer overlay */}
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer-move 1.2s linear infinite',
                        }}
                      />
                    </div>
                    <p className="text-right text-[10px] font-bold text-slate-500">{progress}%</p>
                  </div>
                )}

                {/* Deployment note */}
                {deploymentNote && phase === 'idle' && (
                  <div
                    className="mb-5 px-4 py-3.5 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.08))',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1 h-1 rounded-full bg-blue-400" style={{ animation: 'dot-blink 1.5s ease-in-out infinite' }} />
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/80">
                        What's new
                      </p>
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed">
                      {deploymentNote}
                    </p>
                  </div>
                )}

                {/* Forced reload notice */}
                {isForced && phase === 'idle' && (
                  <div
                    className="mb-5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                    style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
                  >
                    <span className="text-sm">⚠️</span>
                    <p className="text-[11px] text-amber-300/90 font-medium leading-snug">
                      You dismissed this earlier. A reload is required to continue.
                    </p>
                  </div>
                )}

                {/* CTA buttons */}
                {phase === 'idle' && (
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={handleReloadNow}
                      className="relative w-full py-3 rounded-2xl text-sm font-black tracking-wide overflow-hidden group"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                        boxShadow: '0 4px 24px rgba(79,70,229,0.45), 0 1px 0 rgba(255,255,255,0.1) inset',
                      }}
                    >
                      {/* Button shimmer on hover */}
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)',
                        }}
                      />
                      <span className="relative flex items-center justify-center gap-2">
                        <Rocket size={15} />
                        Reload Now
                      </span>
                    </button>

                    {!isForced && (
                      <button
                        onClick={handleLater}
                        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        Remind me Later
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── DONE state ─── */}
            {phase === 'done' && (
              <div
                className="relative px-7 pt-10 pb-9 flex flex-col items-center text-center"
                style={{ animation: 'fade-up 0.4s ease both' }}
              >
                {/* Success burst rings */}
                <div className="relative w-24 h-24 flex items-center justify-center mb-5">
                  <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', animation: 'burst-ring 0.6s ease-out both' }} />
                  <div className="absolute inset-[-8px] rounded-full" style={{ border: '1.5px solid rgba(16,185,129,0.2)', animation: 'burst-ring 0.6s 0.1s ease-out both' }} />
                  <div className="absolute inset-[-18px] rounded-full" style={{ border: '1px solid rgba(16,185,129,0.1)', animation: 'burst-ring 0.6s 0.2s ease-out both' }} />

                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 0 0 1px rgba(16,185,129,0.5), 0 8px 32px rgba(16,185,129,0.4)',
                      animation: 'pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" style={{ animation: 'check-draw 0.4s 0.3s ease both' }}>
                      <polyline
                        points="6,15 12,21 24,9"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          strokeDasharray: 30,
                          strokeDashoffset: 0,
                          animation: 'check-draw 0.5s 0.35s cubic-bezier(0.65,0,0.35,1) both',
                        }}
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="text-lg font-black text-white mb-1" style={{ animation: 'fade-up 0.4s 0.2s ease both', opacity: 0 }}>
                  Update Applied!
                </h2>
                <p className="text-sm text-slate-400" style={{ animation: 'fade-up 0.4s 0.3s ease both', opacity: 0 }}>
                  Reloading {appName}…
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          to { --border-angle: 360deg; }
        }
        @keyframes ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ring-pulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes halo-pulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes center-pulse {
          from { box-shadow: 0 0 0 1px rgba(99,102,241,0.4), 0 6px 24px rgba(99,102,241,0.35); }
          to   { box-shadow: 0 0 0 1px rgba(99,102,241,0.6), 0 10px 36px rgba(99,102,241,0.55); }
        }
        @keyframes rocket-idle {
          0%,100% { transform: translateY(0px) rotate(-8deg); }
          50%      { transform: translateY(-5px) rotate(8deg); }
        }
        @keyframes rocket-launch {
          from { transform: translateY(2px) rotate(-12deg); }
          to   { transform: translateY(-4px) rotate(12deg); }
        }
        @keyframes zap-flicker {
          0%,100% { opacity: 1; }
          45%     { opacity: 1; }
          50%     { opacity: 0.3; }
          55%     { opacity: 1; }
          80%     { opacity: 1; }
          85%     { opacity: 0.4; }
          90%     { opacity: 1; }
        }
        @keyframes dot-blink {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(0.6); }
        }
        @keyframes particle-float {
          from { transform: translateY(0px) translateX(0px); }
          to   { transform: translateY(-12px) translateX(6px); }
        }
        @keyframes shimmer-move {
          from { background-position: -200% 0; }
          to   { background-position:  200% 0; }
        }
        @keyframes pop-in {
          from { transform: scale(0.3) rotate(-15deg); opacity: 0; }
          to   { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes burst-ring {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-up {
          from { transform: translateY(10px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes check-draw {
          from { stroke-dashoffset: 30; opacity: 0; }
          to   { stroke-dashoffset: 0;  opacity: 1; }
        }
      `}</style>
    </>
  )
}
