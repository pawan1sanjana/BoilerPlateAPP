import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Users, Search, Map, Activity, CheckCircle, LayoutGrid, List, Lock, Banknote } from 'lucide-react';
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { isAdmin } from '../../lib/roleUtils';
import { usePayrollLock } from '../../lib/payrollLockUtils';
import type { AppRole } from '../../store/useModulePermissionsStore';

interface WorkerCardProps {
  worker: any;
  isLocked: boolean;
  onDragStart: (e: any, workerId: string | number) => void;
  onTouchStart: (e: any) => void;
  onUnlock?: () => void;
  onClick?: (id: string | number) => void;
}

const WorkerCard = memo(({ worker, isLocked, onDragStart, onTouchStart, onUnlock, onClick }: WorkerCardProps) => {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition-all select-none ${isLocked ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 active:scale-95'}`}
      draggable={!isLocked}
      onDragStart={(e) => !isLocked && onDragStart(e, worker.id)}
      onTouchStart={onTouchStart}
      onClick={() => onClick && onClick(worker.id)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {worker.photo ? (
        <img
          src={worker.photo.startsWith('data:') ? worker.photo : `/api/uploads/${worker.photo}`}
          alt={worker.first_name}
          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-500">
          {worker.first_name?.[0] || ''}
        </div>
      )}
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-outfit">
        {worker.first_name}
      </span>
      {isLocked && onUnlock && (
        <button
          onClick={onUnlock}
          className="ml-auto p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-all"
          title="Unlock to remove"
        >
          <Lock size={14} />
        </button>
      )}
    </div>
  );
});


export default function DailyMuster() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { isLocked: isPayrollLocked } = usePayrollLock(todayStr, selectedEstateFilter !== 'all' ? selectedEstateFilter : profile?.estate_id);
  const isLockedForUser = isPayrollLocked && !isUserAdmin;

  // Existing state
  const [workers, setWorkers] = useState([]);
  const [_summary, setSummary] = useState(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [activeAttendance, setActiveAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [estates, setEstates] = useState<any[]>([]);

  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  useEffect(() => {
    const fetchEstates = async () => {
      try {
        const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
        if (!error && data) setEstates(data);
      } catch (err) {
        console.error('Failed to load estates:', err);
      }
    };
    fetchEstates();
  }, []);
  // UI State
  const [viewMode, setViewMode] = useState('board'); // 'list' | 'board'
  const [searchTerm, setSearchTerm] = useState('');
  // Drag and Drop Muster State
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedTask, setSelectedTask] = useState('Plucking');
  const [musterAssignments, setMusterAssignments] = useState({}); // { workerId: { blockId, task, daily_wage } }
  const [batchWage, setBatchWage] = useState(''); // Global/Batch wage for specialized tasks
  const [isSaving, setIsSaving] = useState(false);
  // Touch drag-and-drop state
  const [touchDragWorkerId, setTouchDragWorkerId] = useState(null);
  const [touchDropTarget, setTouchDropTarget] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const [workersResponse, summaryResponse, blocksResponse, attendanceResponse, musterResponse] = await Promise.all([
          (async () => {
            const { data, error } = await supabase.from('workforce').select('*').eq('status', 'active');
            if (error) {
              const { data: fallbackData } = await supabase.from('workforce').select('*');
              return { success: true, data: fallbackData || [] };
            }
            return { success: true, data: data || [] };
          })(),
          apiClient.get('/workforce/summary'),
          (async () => {
            const { data, error } = await supabase.from('field_blocks').select('*').eq('status', 'active');
            if (error) return { success: false, data: [] };
            return { success: true, data };
          })(),
          (async () => {
            const { data, error } = await supabase.from('attendance').select('*').eq('date', today);
            if (error) return { success: false, data: [] };

            // Map to expected format for backward compatibility in DailyMuster
            const workerAttendanceMap: Record<string, any> = {};
            data.forEach((record: any) => {
              workerAttendanceMap[record.worker_id] = {
                worker_id: record.worker_id,
                check_in_time: record.check_in_time,
                check_out_time: record.check_out_time
              };
            });
            return { success: true, data: Object.values(workerAttendanceMap) };
          })(),
          // Fetch today's saved muster assignments from dedicated table
          (async () => {
            const { data, error } = await supabase.from('daily_muster').select('*').eq('muster_date', today);
            if (error) return { success: false, data: [] };
            return { success: true, data: data || [] };
          })()
        ]);

        if (workersResponse.success) {
          setWorkers(workersResponse.data);

          // Rehydrate today's muster assignments from daily_muster table
          const existingAssignments = {};
          if (musterResponse.success && musterResponse.data.length > 0) {
            musterResponse.data.forEach((record: any) => {
              // Match daily_muster.worker_id (text EPF) → workforce.id (uuid) for state key
              const worker = workersResponse.data.find((w: any) => w.worker_id === record.worker_id);
              if (worker) {
                existingAssignments[worker.id] = {
                  blockId: record.block_id,
                  task: record.task,
                  daily_wage: record.daily_wage,
                  isSaved: true
                };
              }
            });
          }
          setMusterAssignments(existingAssignments);
        }
        if (summaryResponse.success) setSummary(summaryResponse.data);
        if (blocksResponse.success) {
          setBlocks(blocksResponse.data);
          // Wait to set selectedBlockId until filteredBlocks updates to avoid race conditions
        }
        if (attendanceResponse.success) {
          setActiveAttendance(attendanceResponse.data);
        }
      } catch (error) {
        console.error('Fetch workforce data failed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Performance: use refs for drag state to avoid extra re-renders
  const dragRef = React.useRef({ workerId: null, dropTarget: null });

  // Drag start – store id in ref (no state update)
  const handleDragStart = useCallback((e, workerId) => {
    e.dataTransfer.setData('workerId', workerId);
    e.dataTransfer.effectAllowed = 'move';
    dragRef.current.workerId = workerId;
  }, []);

  // Touch start – store id in ref
  const handleTouchStart = useCallback((e, workerId) => {
    e.preventDefault();
    dragRef.current.workerId = workerId;
  }, []);

  // Drag over – prevent default
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Reusable assign logic
  const handleAssignWorker = useCallback((workerId) => {
    if (!workerId || !selectedBlockId || isLockedForUser) return;
    setMusterAssignments(prev => ({
      ...prev,
      [workerId]: {
        blockId: selectedBlockId,
        task: selectedTask,
        daily_wage: (['Other Works', 'Cinnamon', 'Coconut'].includes(selectedTask)) ? (batchWage || null) : null,
      },
    }));
  }, [selectedBlockId, selectedTask, batchWage, isLockedForUser]);

  // Reusable unassign logic
  const handleUnassignWorker = useCallback((workerId) => {
    if (!workerId || isLockedForUser) return;
    setMusterAssignments(prev => {
      // Delete from daily_muster in DB (fire-and-forget; harmless if not yet saved)
      const worker = (workers as any[]).find((w: any) => w.id === workerId);
      if (worker?.worker_id) {
        supabase
          .from('daily_muster')
          .delete()
          .eq('worker_id', worker.worker_id)
          .eq('muster_date', new Date().toISOString().split('T')[0])
          .then(({ error }) => { if (error) console.error('Unassign error:', error); });
      }
      const newAssignments = { ...prev };
      delete newAssignments[workerId];
      return newAssignments;
    });
  }, [workers, isLockedForUser]);

  // Drop to assign – read from ref if needed
  const handleDropToAssign = useCallback((e) => {
    e.preventDefault();
    const workerId = e.dataTransfer.getData('workerId') || dragRef.current.workerId;
    handleAssignWorker(workerId);
    dragRef.current.workerId = null;
  }, [handleAssignWorker]);

  // Drop to unassign – read from ref
  const handleDropToUnassign = useCallback((e) => {
    e.preventDefault();
    const workerId = e.dataTransfer.getData('workerId') || dragRef.current.workerId;
    handleUnassignWorker(workerId);
    dragRef.current.workerId = null;
  }, [handleUnassignWorker]);

  const handleUnlockWorker = useCallback((workerId) => {
    setMusterAssignments(prev => {
      if (!prev[workerId]) return prev;
      return {
        ...prev,
        [workerId]: { ...prev[workerId], isSaved: false }
      };
    });
  }, []);

  // Update all affected assignments when pay rate changes
  useEffect(() => {
    setMusterAssignments(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      Object.keys(updated).forEach(workerId => {
        const assignment = updated[workerId];
        // Update wage for affected tasks when batchWage changes
        if (['Other Works', 'Cinnamon', 'Coconut'].includes(assignment.task)) {
          const newWage = batchWage || null;
          if (assignment.daily_wage !== newWage) {
            updated[workerId] = { ...assignment, daily_wage: newWage };
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [batchWage, selectedTask]);

  const handleSaveMuster = async () => {
    if (isLockedForUser) {
      alert(`Payroll for ${todayStr} is Confirmed & Locked. Muster assignments cannot be saved except by Super Admin.`);
      return;
    }
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Map uuid-keyed state → daily_muster rows (worker_id is the text EPF number)
      const assignmentsPayload = Object.keys(musterAssignments)
        .map(workerUuid => {
          const worker = (workers as any[]).find((w: any) => w.id === workerUuid);
          return {
            worker_id:   worker?.worker_id ?? null, // text EPF ref in daily_muster
            block_id:    musterAssignments[workerUuid].blockId,
            task:        musterAssignments[workerUuid].task,
            daily_wage:  musterAssignments[workerUuid].daily_wage ?? null,
            muster_date: today,
          };
        })
        .filter(a => a.worker_id); // skip any unmatched

      const { error } = await supabase
        .from('daily_muster')
        .upsert(assignmentsPayload, { onConflict: 'worker_id,muster_date' });

      if (!error) {
        alert(`Successfully saved ${assignmentsPayload.length} muster assignments!`);

        // Lock them in the UI instantly
        setMusterAssignments(prev => {
          const locked = { ...prev };
          Object.keys(locked).forEach(k => {
            locked[k].isSaved = true;
          });
          return locked;
        });
      } else {
        throw new Error(error.message || 'Failed to save assignments');
      }
    } catch (error) {
      console.error('Save Muster Error:', error);
      alert('Error saving muster assignments. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Derived State ---
  const filteredWorkers = useMemo(() => workers.filter((w: any) => {
    const matchesSearch = `${w.first_name} ${w.last_name} ${w.worker_id}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstate = selectedEstateFilter === 'all' || w.estate_id === selectedEstateFilter;
    return matchesSearch && matchesEstate;
  }), [workers, searchTerm, selectedEstateFilter]);

  const filteredBlocks = useMemo(() => blocks.filter(b =>
    selectedEstateFilter === 'all' || b.estate_id === selectedEstateFilter || !b.estate_id
  ), [blocks, selectedEstateFilter]);

  // Ensure a valid block is selected when filtered blocks change
  useEffect(() => {
    if (filteredBlocks.length > 0) {
      const isSelectedBlockValid = filteredBlocks.some(b => b.id.toString() === selectedBlockId);
      if (!isSelectedBlockValid) {
        setSelectedBlockId(filteredBlocks[0].id.toString());
      }
    } else {
      setSelectedBlockId('');
    }
  }, [filteredBlocks, selectedBlockId]);

  const availableWorkers = useMemo(() => filteredWorkers.filter(w => {
    return !musterAssignments[w.id];
  }), [filteredWorkers, musterAssignments]);

  const assignedToCurrentBlock = useMemo(() => filteredWorkers.filter(w =>
    musterAssignments[w.id] && musterAssignments[w.id].blockId === selectedBlockId
  ), [filteredWorkers, musterAssignments, selectedBlockId]);

  // List view components
  const renderListView = () => (
    <div className="premium-card overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by EPF or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-tea-500 transition-all text-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-[0.2em]">
              <th className="px-6 py-4 text-left font-bold">Worker ID</th>
              <th className="px-6 py-4 text-left font-bold">Worker Name</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-left font-bold">Assignment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredWorkers.map((worker) => (
              <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-mono font-bold text-tea-600 dark:text-tea-400">{worker.worker_id || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {worker.photo ? (
                      <img
                        src={worker.photo.startsWith('data:') ? worker.photo : `/api/uploads/${worker.photo}`}
                        alt={worker.first_name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase shrink-0 text-slate-500">
                        {(worker.first_name?.[0] || '') + (worker.last_name?.[0] || '')}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-outfit">{worker.first_name} {worker.last_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const att = activeAttendance.find(a => String(a.worker_id) === String(worker.worker_id));
                    const isOffDuty = !!att?.check_out_time;
                    const isOnDuty = !!att?.check_in_time && !isOffDuty;

                    return (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isOnDuty ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        isOffDuty ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                        {isOnDuty ? 'On Duty' : isOffDuty ? 'Off Duty' : 'Absent'}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4">
                  {musterAssignments[worker.id] ? (
                    <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-black tracking-widest uppercase">
                      Block {blocks.find(b => b.id.toString() === musterAssignments[worker.id].blockId)?.name} • {musterAssignments[worker.id].task}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">Unassigned</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBoardView = () => (
    <div className="flex flex-col md:grid md:grid-cols-[1.5fr_1fr] lg:grid-cols-[2fr_1fr] gap-4 h-auto md:h-[750px] animate-fade-in">

      {/* Target Mustering Block (Right Side conceptually, but rendered first in flex flow or left depending on preference) */}
      <div className="premium-card flex flex-col overflow-hidden border-2 border-tea-500 flex-1 min-h-[450px]">
        <div className="p-2 md:p-4 bg-tea-500/10 border-b border-tea-500/20">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-tea-600 dark:text-tea-400 flex items-center gap-1 md:gap-2">
              <Map size={14} className="shrink-0" /> <span className="truncate">Assignments</span>
            </h3>
            <span className="px-1.5 md:px-2.5 py-0.5 md:py-1 bg-tea-600 text-white text-[9px] md:text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shrink-0">
              {assignedToCurrentBlock.length} <span className="hidden md:inline">Assigned</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">Target Block</label>
              <select
                value={selectedBlockId}
                onChange={(e) => setSelectedBlockId(e.target.value)}
                className="p-1.5 md:p-2 border border-tea-500/30 rounded-xl bg-white dark:bg-slate-900 text-[10px] md:text-xs font-bold outline-none text-slate-900 dark:text-white cursor-pointer"
              >
                {filteredBlocks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-500 tracking-widest">Active Task</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="p-1.5 md:p-2 border border-tea-500/30 rounded-xl bg-white dark:bg-slate-900 text-[10px] md:text-xs font-bold outline-none text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="Plucking">Plucking</option>
                <option value="Pruning">Pruning</option>
                <option value="Weeding">Weeding</option>
                <option value="Manure">Manure</option>
                <option value="Foliar Application">Foliar Application</option>
                <option value="Nursery">Nursery</option>
                <option value="Lopping">Lopping</option>
                <option value="Cinnamon">Cinnamon</option>
                <option value="Coconut">Coconut</option>
                <option value="Factory">Factory</option>
                <option value="Other Works">Other Works</option>
              </select>
            </div>
            {['Other Works', 'Cinnamon', 'Coconut'].includes(selectedTask) && (
              <div className="flex flex-col gap-1 sm:col-span-2 mt-2 animate-in slide-in-from-top-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1">
                  <Banknote size={10} /> Manual Daily Wage Override (LKR)
                </label>
                <input
                  type="number"
                  placeholder="Enter daily amount..."
                  value={batchWage}
                  onChange={(e) => setBatchWage(e.target.value)}
                  className="p-1.5 md:p-2 border border-amber-500/30 rounded-xl bg-amber-50/30 dark:bg-amber-900/10 text-[10px] md:text-xs font-bold outline-none text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-1 p-2 md:p-4 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto dashboard-scroll grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 content-start"
          onDragOver={handleDragOver}
          onDrop={handleDropToAssign}
          data-dropzone="assign"
          onTouchMove={() => {
            if (touchDragWorkerId) setTouchDropTarget('assign');
          }}
          onTouchEnd={() => {
            if (touchDragWorkerId && touchDropTarget === 'assign') {
              handleDropToAssign({
                preventDefault: () => { },
                dataTransfer: { getData: () => touchDragWorkerId }
              });
            }
          }}

        >
          {assignedToCurrentBlock.length === 0 ? (
            <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mx-2 md:mx-4 my-4 md:my-8 p-6 md:p-10 min-h-[150px] md:min-h-[200px]">
              <Map className="mb-2 opacity-30" size={32} />
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-50">Drag Labours Here</p>
              <p className="text-[9px] md:text-[10px] font-bold mt-1 max-w-[200px] text-center opacity-40">Assign workers to this block and task.</p>
            </div>
          ) : (
            assignedToCurrentBlock.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                isLocked={musterAssignments[worker.id]?.isSaved}
                onDragStart={handleDragStart}
                onTouchStart={e => { e.preventDefault(); setTouchDragWorkerId(worker.id); }}
                onUnlock={() => handleUnlockWorker(worker.id)}
                onClick={(id) => {
                  if (!musterAssignments[id]?.isSaved) {
                    handleUnassignWorker(id);
                  }
                }}
              />
            ))
          )}
        </div>

        <div className="p-2 md:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-end">
          <button
            onClick={handleSaveMuster}
            disabled={isSaving || isLockedForUser || Object.keys(musterAssignments).length === 0}
            className="btn-primary flex items-center gap-1.5 md:gap-2 group w-full md:w-auto justify-center disabled:opacity-50 text-[10px] md:text-sm py-2 md:py-2.5"
          >
            {isSaving ? <Activity className="animate-spin" size={14} /> : <CheckCircle size={14} className="group-hover:scale-110 transition-transform" />}
            {isSaving ? 'Syncing...' : 'Save Muster'}
          </button>
        </div>
      </div>

      <div className="premium-card flex flex-col overflow-hidden min-h-[400px]">
        <div className="p-2 md:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-1 md:gap-2 mb-2 md:mb-4 truncate">
            <Users size={14} className="text-indigo-500 shrink-0" /> Available
          </h3>
          <div className="relative">
            <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 md:pl-10 pr-2 md:pr-4 py-1.5 md:py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all text-[10px] md:text-xs font-bold"
            />
          </div>
        </div>

        <div
          className="flex-1 p-2 md:p-4 overflow-y-auto dashboard-scroll bg-slate-50/20 dark:bg-transparent grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 content-start"
          onDragOver={handleDragOver}
          onDrop={handleDropToUnassign}
          data-dropzone="unassign"
          onTouchMove={() => {
            if (touchDragWorkerId) setTouchDropTarget('unassign');
          }}
          onTouchEnd={() => {
            if (touchDragWorkerId && touchDropTarget === 'unassign') {
              handleDropToUnassign({
                preventDefault: () => { },
                dataTransfer: { getData: () => touchDragWorkerId }
              });
            }
          }}
        >
          {availableWorkers.length === 0 ? (
            <div className="col-span-full text-center p-4 md:p-8 text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
              No available workers
            </div>
          ) : (
            availableWorkers.map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                isLocked={false}
                onDragStart={handleDragStart}
                onTouchStart={(e) => handleTouchStart(e, worker.id)}
                onClick={(id) => handleAssignWorker(id)}
              />
            ))
          )}
        </div>
      </div>

    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in relative z-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Smart Muster</h1>
        </div>
        <div className="flex gap-2 items-center">
          {isUserAdmin ? (
            <select
              value={selectedEstateFilter}
              onChange={(e) => setSelectedEstateFilter(e.target.value)}
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none"
            >
              <option value="all">All Estates</option>
              {estates.map(estate => (
                <option key={estate.id} value={estate.id}>{estate.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={profile?.estate_id || ''}
              disabled
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none opacity-70 cursor-not-allowed"
            >
              {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                <option key={estate.id} value={estate.id}>{estate.name}</option>
              ))}
              {!estates.find(e => e.id === profile?.estate_id) && (
                <option value={profile?.estate_id || ''}>Assigned Estate</option>
              )}
            </select>
          )}

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-tea-600 dark:text-tea-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Muster Builder"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-tea-600 dark:text-tea-400' : 'text-slate-400 hover:text-slate-600'}`}
              title="Directory List"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>


      {isLockedForUser && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <Lock size={16} className="shrink-0 text-amber-600" />
          <span>Daily Payroll for today ({todayStr}) is Confirmed & Locked. Muster assignments cannot be modified except by Super Admin.</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-tea-600 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 border-dashed">
          <Activity className="animate-pulse mb-3" size={32} />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Loading Rosters...</span>
        </div>
      ) : (
        viewMode === 'board' ? renderBoardView() : renderListView()
      )}

    </div>
  );
}
