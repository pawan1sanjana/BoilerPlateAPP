import React from 'react'
import { Info, Database, Server, Activity, Monitor } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { supabase } from '@/lib/supabase'

export default function SystemInfoTab() {
  const { appName, appVersion, companyName } = useAppInfoStore()
  const [dbStatus, setDbStatus] = React.useState<'checking' | 'healthy' | 'error'>('checking')
  const [dbLatency, setDbLatency] = React.useState<number>(0)
  const [deviceInfo, setDeviceInfo] = React.useState({ os: '', browser: '', screen: '' })

  React.useEffect(() => {
    const checkDb = async () => {
      const start = performance.now()
      try {
        const { error } = await supabase.from('system_settings').select('key').limit(1)
        if (error) throw error
        setDbLatency(Math.round(performance.now() - start))
        setDbStatus('healthy')
      } catch (e) {
        setDbStatus('error')
      }
    }
    checkDb()

    // Parse device info
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

    let os = navigator.platform || 'Unknown OS';
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("like Mac")) os = "iOS";

    setDeviceInfo({
      os,
      browser,
      screen: `${window.innerWidth}x${window.innerHeight}`
    });

    const handleResize = () => {
      setDeviceInfo(prev => ({ ...prev, screen: `${window.innerWidth}x${window.innerHeight}` }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Info size={18} className="text-blue-500" /> System Information
          </h3>
          <p className="text-sm text-slate-500 mt-1">Overview of your application environment and infrastructure.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
              <Server size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Application</p>
              <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">{appName}</h4>
              <p className="text-xs text-slate-400 mt-1">Version {appVersion || '1.0.0'}</p>
              {companyName && <p className="text-xs text-slate-400 mt-0.5">By {companyName}</p>}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
              <Database size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                <h4 className="font-bold text-slate-900 dark:text-white capitalize">{dbStatus}</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">{dbStatus === 'healthy' ? `${dbLatency}ms latency` : 'Checking...'}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
              <Activity size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Environment</p>
              <h4 className="font-bold text-slate-900 dark:text-white mt-0.5 capitalize">{import.meta.env.MODE || 'production'}</h4>
              <p className="text-xs text-slate-400 mt-1">{import.meta.env.PROD ? 'Production build' : 'Development server'}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
              <Monitor size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Device</p>
              <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">{deviceInfo.os || 'Loading...'}</h4>
              <p className="text-xs text-slate-400 mt-1" title={navigator.userAgent}>{deviceInfo.browser} ({deviceInfo.screen})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
