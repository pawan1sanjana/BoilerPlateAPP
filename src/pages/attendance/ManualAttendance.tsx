import { useState, useEffect } from 'react';
import { UserCheck, Search, MapPin, AlertCircle, CheckCircle2, User, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ManualAttendance() {
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: '' }
  const [mode, setMode] = useState('check-in'); // 'check-in' or 'check-out'

  useEffect(() => {
    // Acquire GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          setLocationError(true);
        }
      );
    } else {
      setLocationError(true);
    }

    const fetchData = async () => {
      try {
        const { data, error } = await supabase.from('workforce').select('*').neq('status', 'archived');
        if (error) throw error;
        if (data) setWorkers(data);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedWorker || isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      // Check if a record already exists for today
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', selectedWorker.worker_id)
        .eq('date', today)
        .maybeSingle();

      let dbError = null;

      if (mode === 'check-in') {
        if (existingRecord?.check_in_time) {
          throw new Error('Already checked in today');
        }
        const { error } = await supabase.from('attendance').insert({
          worker_id: selectedWorker.worker_id,
          date: today,
          check_in_time: currentTime,
          check_in_latitude: location?.lat || null,
          check_in_longitude: location?.lng || null,
          check_in_method: 'manual',
        });
        dbError = error;
      } else {
        if (!existingRecord || !existingRecord.check_in_time) {
          throw new Error('Must check in before checking out.');
        }
        if (existingRecord.check_out_time) {
          throw new Error('Already checked out today');
        }
        const { error } = await supabase.from('attendance').update({
          check_out_time: currentTime,
          check_out_latitude: location?.lat || null,
          check_out_longitude: location?.lng || null,
          check_out_method: 'manual'
        }).eq('id', existingRecord.id);
        dbError = error;
      }

      if (!dbError) {
        setStatus({ type: 'success', message: `Identity Confirmed: ${selectedWorker.first_name} ${mode === 'check-in' ? 'marked present' : 'checked out'}.` });
        // Reset after bit
        setTimeout(() => {
          setSelectedWorker(null);
          setStatus(null);
          setSearchTerm('');
        }, 2000);
      } else {
        throw dbError;
      }
    } catch (err) {
      const errMsg = err.message || '';
      const displayMsg = (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('duplicate'))
        ? 'Duplicate Activity: Worker is already marked present for today.'
        : errMsg || 'Muster sync failed';
      setStatus({ type: 'error', message: displayMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.worker_id && w.worker_id.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manual Muster</h1>
          <p className="text-sm text-slate-500 mt-1">Direct Field Logistics Entry — {workers.length} active workers</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Toggle Check-In / Check-Out */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { setMode('check-in'); setStatus(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'check-in' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Check In
            </button>
            <button
              onClick={() => { setMode('check-out'); setStatus(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'check-out' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Check Out
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <MapPin size={16} className={location ? "text-emerald-500" : locationError ? "text-rose-500" : "text-slate-400"} />
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GPS Status</p>
              <p className={`text-xs font-semibold ${locationError ? "text-rose-500" : "text-slate-900 dark:text-white"}`}>
                {location ? "Location Locked" : locationError ? "Unavailable" : "Acquiring..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Col: Search */}
        <div className="md:col-span-5 space-y-4">
           <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative mb-4">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search name or ID..." 
                   className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 transition-all text-sm text-slate-900 dark:text-white"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>

              <div className="space-y-1 h-[400px] overflow-y-auto custom-scrollbar pr-2">
                 {searchTerm && filteredWorkers.map(worker => (
                    <button 
                      key={worker.id}
                      onClick={() => setSelectedWorker(worker)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                        selectedWorker?.id === worker.id 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                          : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                       <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex flex-shrink-0 items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                          {worker.photo ? <img src={worker.photo} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{worker.first_name} {worker.last_name}</p>
                          <p className="text-xs text-slate-500 truncate">{worker.worker_id}</p>
                       </div>
                    </button>
                 ))}
                 {!searchTerm && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-60">
                      <Search size={32} />
                      <p className="text-sm">Search to find a worker</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Col: Confirmation */}
        <div className="md:col-span-7">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col items-center justify-center">
              {selectedWorker ? (
                <div className="w-full max-w-sm space-y-6 flex flex-col items-center text-center">
                   <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                      {selectedWorker.photo ? <img src={selectedWorker.photo} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-300" />}
                   </div>
                   
                   <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedWorker.first_name} {selectedWorker.last_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">ID: {selectedWorker.worker_id}</p>
                   </div>

                   <div className="w-full">
                      {status && (
                        <div className={`p-3 rounded-lg flex items-center justify-center gap-2 mb-4 text-sm font-medium ${
                          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                        }`}>
                          {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>{status.message}</span>
                        </div>
                      )}

                      <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`w-full py-3 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          mode === 'check-in' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : mode === 'check-in' ? <UserCheck size={16} /> : <LogOut size={16} />}
                        {isSubmitting ? "Saving..." : mode === 'check-in' ? "Mark as Present" : "Mark as Check-Out"}
                      </button>
                   </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-4 opacity-60">
                   <User size={48} className="mx-auto" />
                   <p className="text-sm">Select a worker from the list</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
