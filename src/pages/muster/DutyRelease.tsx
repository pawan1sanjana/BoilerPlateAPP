import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Search, Activity } from 'lucide-react';
import { apiClient } from '../../api/client';

export default function DutyRelease() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActiveAssignments();
  }, []);

  const fetchActiveAssignments = async () => {
    try {
      const res = await apiClient.get('/workforce/workers');
      if (res.success) {
        // Filter only those who have an active task and are not released
        const active = res.data.filter((w: any) => w.task && w.block_id && !w.is_released);
        setWorkers(active);
      }
    } catch (error) {
      console.error('Fetch assignments failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (workerId: string | number) => {
    setReleasing(prev => ({ ...prev, [workerId]: true }));
    try {
      const res = await apiClient.post('/workforce/muster/release', { worker_id: workerId });
      if (res.success) {
        // Optimistic UI update
        setWorkers(prev => prev.filter((w: any) => w.id !== workerId));
      }
    } catch (error) {
      console.error('Release failed', error);
      alert('Failed to release worker from duty.');
    } finally {
      setReleasing(prev => ({ ...prev, [workerId]: false }));
    }
  };

  const filteredWorkers = workers.filter((w: any) => 
    w.full_name_initials?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.worker_id?.toString().includes(searchTerm) ||
    w.task?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">Duty Release Hub</h1>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search by Name, ID or Task..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-all w-full md:w-64"
                />
            </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-amber-600 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 border-dashed">
          <Activity className="animate-pulse mb-3" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Loading Assignments...</span>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-[0.2em]">
                  <th className="px-6 py-4 text-left font-bold">Worker Profile</th>
                  <th className="px-6 py-4 text-left font-bold">Assigned Block</th>
                  <th className="px-6 py-4 text-left font-bold">Task Profile</th>
                  <th className="px-6 py-4 text-right font-bold w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWorkers.length > 0 ? (
                  filteredWorkers.map((worker: any) => (
                    <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {worker.photo ? (
                              <img src={worker.photo.startsWith('data:') ? worker.photo : `/api/uploads/${worker.photo}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users size={14} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{worker.full_name_initials}</p>
                            <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">#{worker.worker_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                          {worker.block_name || 'Block '+worker.block_id}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                          {worker.task}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRelease(worker.id)}
                          disabled={(releasing as Record<string, boolean>)[worker.id]}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-amber-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 ml-auto"
                        >
                          {(releasing as Record<string, boolean>)[worker.id] ? <Activity className="animate-spin" size={14} /> : 'Release'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                      <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-bold uppercase tracking-widest">No workers currently on duty</p>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">All workers are either off-duty or unassigned</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
