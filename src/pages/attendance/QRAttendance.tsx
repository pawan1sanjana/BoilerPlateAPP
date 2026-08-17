import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { MapPin, AlertTriangle, RefreshCcw, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function QRAttendance() {
  const [lastWorker, setLastWorker] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error
  const [mode, setMode] = useState('check-in'); // 'check-in' | 'check-out'
  const modeRef = useRef('check-in');
  const isProcessingRef = useRef(false);
  
  // Keep ref in sync for scanner closure
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const [facingMode, setFacingMode] = useState('environment');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const isSwitchingRef = useRef(false);
  useEffect(() => { isSwitchingRef.current = isSwitchingCamera; }, [isSwitchingCamera]);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const locationRef = useRef<{lat: number, lng: number} | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playBeep = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  const playSuccessSound = () => playBeep(880, 0.15, 'square'); // High crisp beep
  const playErrorSound = () => playBeep(220, 0.4, 'sawtooth'); // Low buzz

  const toggleCamera = () => {
    if (isSwitchingRef.current) return;
    setIsSwitchingCamera(true);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(() => setIsSwitchingCamera(false), 1500); // 1.5s debounce for scanner reboot
  };

  const getPreciseLocation = (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(locationRef.current);
      
      const timeout = setTimeout(() => resolve(locationRef.current), 3000); // Allow 3s, use last known if too slow

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          locationRef.current = newLoc;
          setLocation(newLoc);
          resolve(newLoc);
        },
        (err) => {
          clearTimeout(timeout);
          console.warn("GPS lock failed", err);
          resolve(locationRef.current); // Use last known on failure
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // Coarse location retrieval once on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
           const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
           locationRef.current = loc;
           setLocation(loc);
        },
        (err) => console.warn("Location access denied", err)
      );
    }
  }, []);

  // Scanner lifecycle managed dynamically by facingMode state
  useEffect(() => {
    let isMounted = true;
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        
        await scanner.start(
          { facingMode: facingMode },
          {
            fps: 20, // Increased for tactical feel
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minSide = Math.min(viewfinderWidth, viewfinderHeight);
                const size = Math.floor(minSide * 0.7);
                return { width: size, height: size };
            },
            aspectRatio: 1.0
          },
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Scanner init failed", err);
        if (isMounted) {
          setErrorMsg("Camera access failed. Check permissions.");
          setStatus('error');
        }
      }
    };

    startScanner();

    const handleVisibilityChange = () => {
      if (!scannerRef.current) return;
      try {
        if (document.hidden) {
          if (scannerRef.current.getState() === 2) { // SCANNING
            scannerRef.current.pause(true); // pause and render blank frame
          }
        } else {
          if (scannerRef.current.getState() === 3) { // PAUSED
            scannerRef.current.resume();
          }
        }
      } catch (e) {
        console.warn("Visibility toggle failed on scanner", e);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (scannerRef.current) {
        // Only stop if the scanner was actually started and is in a state that can be stopped
        const scanner = scannerRef.current;
        if (scanner.getState() !== 1) { // 1 is Html5QrcodeScannerState.NOT_STARTED
          scanner.stop()
            .catch(e => console.warn("Scanner stop suppressed", e))
            .finally(() => {
              scanner.clear();
            });
        }
      }
    };
  }, [facingMode]);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setStatus('verifying');
    
    try {
      // Get fresh GPS lock for every scan
      const freshLoc = await getPreciseLocation();
      
      // Fetch worker details first to verify they exist and get name
      const { data: workerData, error: workerError } = await supabase
        .from('workforce')
        .select('first_name, last_name, worker_id, photo')
        .eq('worker_id', decodedText)
        .maybeSingle();
        
      if (workerError || !workerData) {
        throw new Error("Worker not found or inactive");
      }

      // Check for existing record
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', decodedText)
        .eq('date', today)
        .maybeSingle();

      let dbError = null;

      if (modeRef.current === 'check-in') {
        if (existingRecord?.check_in_time) {
          throw new Error('Duplicate Activity: Already checked in today.');
        }
        const { error } = await supabase.from('attendance').insert({
          worker_id: decodedText,
          date: today,
          check_in_time: currentTime,
          check_in_latitude: freshLoc?.lat || null,
          check_in_longitude: freshLoc?.lng || null,
          check_in_method: 'qr'
        });
        dbError = error;
      } else {
        // check-out
        if (!existingRecord || !existingRecord.check_in_time) {
          throw new Error('Must check in before checking out.');
        }
        if (existingRecord.check_out_time) {
          throw new Error('Duplicate Activity: Already checked out today.');
        }
        const { error } = await supabase.from('attendance').update({
          check_out_time: currentTime,
          check_out_latitude: freshLoc?.lat || null,
          check_out_longitude: freshLoc?.lng || null,
          check_out_method: 'qr'
        }).eq('id', existingRecord.id);
        dbError = error;
      }

      if (!dbError) {
        playSuccessSound();
        const workerInfo = { 
          name: `${workerData.first_name} ${workerData.last_name}`, 
          worker_id: workerData.worker_id,
          photo: workerData.photo
        };
        setLastWorker(workerInfo);
        
        // Add to history
        setRecentScans(prev => [{
          ...workerInfo,
          time: new Date().toLocaleTimeString(),
          id: Date.now(),
          coords: freshLoc
        }, ...prev].slice(0, 5));

        setStatus('success');
        // Auto reset after 2.5 seconds
        setTimeout(() => resetScanner(), 2500);
      } else {
        throw dbError;
      }
    } catch (err: any) {
      playErrorSound();
      setErrorMsg(err.message || 'Unknown error');
      setStatus('error');
      
      // Auto reset on error as well so they can try again
      setTimeout(() => resetScanner(), 3000);
    }
  };

  const onScanFailure = () => {
    // Silence errors to keep console clean
  };

  const resetScanner = () => {
    setErrorMsg('');
    setStatus('scanning');
    
    // Unlock the scanner for the next read
    isProcessingRef.current = false;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">QR Muster</h1>
          <p className="text-sm text-slate-500 mt-1">Scan Worker Badges for Automated Entry</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { setMode('check-in'); setStatus('scanning'); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'check-in' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Check In
            </button>
            <button
              onClick={() => { setMode('check-out'); setStatus('scanning'); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'check-out' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Check Out
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <MapPin size={16} className={location ? "text-emerald-500" : "text-slate-400"} />
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GPS Status</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {location ? "Location Locked" : "Acquiring..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Col: Camera */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative flex items-center justify-center">
              <div id="qr-reader" className="w-full h-full object-cover"></div>
              
              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={toggleCamera}
                disabled={isSwitchingCamera}
                className="absolute top-2 right-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white transition-all hover:scale-105 active:scale-95 z-30 disabled:opacity-50"
                title="Flip Camera"
              >
                <RefreshCcw size={16} className={isSwitchingCamera ? 'animate-spin' : ''} />
              </button>

              {status === 'verifying' && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20 text-white rounded-xl">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-xs font-bold uppercase tracking-wider">Verifying...</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
               <span className="flex items-center gap-1.5"><RefreshCcw size={12}/> Auto-Scanning Active</span>
            </div>
          </div>
        </div>

        {/* Right Col: Confirmation & History */}
        <div className="md:col-span-7 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col items-center justify-center relative">
              {status === 'success' && lastWorker ? (
                <div className="w-full max-w-sm space-y-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                   <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                      {lastWorker.photo ? <img src={lastWorker.photo} className="w-full h-full object-cover" /> : <div className="text-slate-300"><MapPin size={48} /></div>}
                   </div>
                   
                   <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lastWorker.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">ID: {lastWorker.worker_id}</p>
                   </div>

                   <div className="w-full">
                      <div className={`p-3 rounded-lg flex items-center justify-center gap-2 mb-4 text-sm font-medium ${
                          mode === 'check-in' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}>
                        <CheckCircle size={16} />
                        <span>Identity Confirmed: {mode === 'check-in' ? 'Marked Present' : 'Checked Out'}.</span>
                      </div>
                   </div>
                </div>
              ) : status === 'error' ? (
                <div className="w-full max-w-sm space-y-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                   <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900">
                     <AlertTriangle className="text-rose-500" size={40} />
                   </div>
                   
                   <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scan Rejected</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {(errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('duplicate')) ? 'Duplicate Activity Detected' : 'Identity Verification Failed'}
                      </p>
                   </div>

                   <div className="w-full">
                      <div className="p-3 rounded-lg flex items-center justify-center gap-2 mb-4 text-sm font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">
                        <AlertTriangle size={16} />
                        <span>{errorMsg}</span>
                      </div>
                      <button 
                        onClick={resetScanner}
                        className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Try Again
                      </button>
                   </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-4 opacity-60">
                   <div className="w-24 h-24 mx-auto border-4 border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center">
                     <div className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-full animate-[scan_2s_linear_infinite]"></div>
                   </div>
                   <p className="text-sm">Hold QR code up to the camera</p>
                </div>
              )}
           </div>

           {/* Recent Scans */}
           {recentScans.length > 0 && (
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
               <div className="space-y-3">
                 {recentScans.map(scan => (
                   <div key={scan.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-left duration-300">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                         {scan.name?.split(' ').map((n: string) => n[0]).join('')}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">{scan.name}</p>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{scan.worker_id}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-500">{scan.time}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { transform: translateY(-30px); }
          50% { transform: translateY(30px); }
        }
      `}} />
    </div>
  );
}
