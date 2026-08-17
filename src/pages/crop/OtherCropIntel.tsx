import React, { useState, useEffect, useMemo } from 'react';
import {
  Leaf,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Users,
  Target,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  BadgePercent,
  History,
  TrendingUp,
  FileSpreadsheet,
  Download,
  PlusCircle,
  Scissors,
  Sprout,
  Package,
  Settings,
  CircleDot,
  Activity,
  RefreshCcw,
  User,
  Layers,
  Brain
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { Card } from '@/components/ui/card';

const PayMultiplierModal = ({ isOpen, onClose, onSave, currentMultiplier, workerName }: any) => {
  const [multiplier, setMultiplier] = useState(currentMultiplier || 1.0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BadgePercent size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">Pay Rate Override</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Multiplier Value</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              {[1.0, 1.25, 1.5, 2.0].map(val => (
                <button
                  key={val}
                  onClick={() => setMultiplier(val)}
                  className={`py-2 rounded-xl text-sm font-bold border transition-all ${multiplier === val ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                >
                  {val.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.25"
            value={multiplier}
            onChange={(e) => setMultiplier(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-500">Custom Value</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">{multiplier.toFixed(2)}x</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSave(multiplier); onClose(); }}
              className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default function OtherCropIntel() {
  const [activeCrop, setActiveCrop] = useState('Cinnamon');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [workerData, setWorkerData] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [showPerformance, setShowPerformance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [multiplierModal, setMultiplierModal] = useState({ open: false, workerIndex: -1, workerName: '', currentVal: 1.0 });

  const cropConfig: Record<string, any> = {
    Cinnamon: {
      icon: <CircleDot size={14} />,
      color: "amber",
      unit: "kg",
      tasks: ["Harvesting", "Maintenance"],
      accent: "from-amber-500 to-orange-600"
    },
    Coconut: {
      icon: <CircleDot size={14} />,
      color: "emerald",
      unit: "nuts",
      tasks: ["Harvesting", "Cleaning", "Fertilizing"],
      accent: "from-emerald-500 to-teal-600"
    },
    Pepper: {
      icon: <CircleDot size={14} />,
      color: "rose",
      unit: "kg",
      tasks: ["Plucking", "Drying", "Sorting", "Maintenance"],
      accent: "from-rose-500 to-red-600"
    }
  };

  const tabs = [
    { id: 'Cinnamon', label: 'Cinnamon', icon: Scissors, activeClass: 'bg-amber-600 text-white shadow-md shadow-amber-600/20' },
    { id: 'Coconut', label: 'Coconut', icon: Sprout, activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' },
    { id: 'Pepper', label: 'Pepper', icon: Package, activeClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/20' }
  ];

  useEffect(() => {
    fetchBlocks();
  }, [selectedDate, activeCrop]);

  useEffect(() => {
    if (showPerformance) fetchPerformance();
  }, [showPerformance, activeCrop, selectedDate]);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/crop/other-crop-logs?date=${selectedDate}&crop_type=${activeCrop}`);
      if (response.success) setBlocks(response.data);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await apiClient.get(`/crop/other-crop-performance?date=${selectedDate}&crop_type=${activeCrop}`);
      if (response.success) setPerformanceData(response.data);
    } catch (error) {
      console.error('Performance fetch failed:', error);
    }
  };

  const handleExpandBlock = async (blockId: any) => {
    if (expandedBlock === blockId) {
      setExpandedBlock(null);
      return;
    }

    setExpandedBlock(blockId);
    setLoadingWorkers(true);
    try {
      const response = await apiClient.get(`/crop/other-crop-logs/assigned-workers?date=${selectedDate}&block_id=${blockId}&crop_type=${activeCrop}`);
      if (response.success) {
        const normalized = response.data.map((w: any) => ({
          ...w,
          work_type: w.work_type === 'Peeling' ? 'Harvesting' : w.work_type
        }));
        setWorkerData(normalized);
      }
    } catch (error) {
      console.error('Worker fetch failed:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleWorkerChange = (index: number, field: string, value: any) => {
    const newData = [...workerData];
    newData[index][field] = value;
    setWorkerData(newData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.post('/crop/other-crop-logs/individual', {
        date: selectedDate,
        block_id: expandedBlock,
        crop_type: activeCrop,
        entries: workerData
      });
      if (response.success) {
        fetchBlocks();
        setExpandedBlock(null);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBlocks = useMemo(() => {
    return blocks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [blocks, searchQuery]);

  const changeDate = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const totalQtyToday = useMemo(() => {
    return blocks.reduce((sum, b) => sum + (parseFloat(b.logs?.total_qty) || 0), 0);
  }, [blocks]);

  const totalWorkersToday = useMemo(() => {
    return blocks.reduce((sum, b) => sum + (parseInt(b.logs?.worker_count) || 0), 0);
  }, [blocks]);

  const dayLabel = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Mobile Page Selection */}
      <div className="md:hidden relative mb-4 shadow-sm rounded-xl">
        <select
          value={activeCrop}
          onChange={(e) => setActiveCrop(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-10 py-3.5 text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
        >
          {['Cinnamon', 'Coconut', 'Pepper'].map((crop) => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-400 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">
          {cropConfig[activeCrop].icon}
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {['Cinnamon', 'Coconut', 'Pepper'].map((crop) => (
          <button
            key={crop}
            onClick={() => setActiveCrop(crop)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${activeCrop === crop
              ? `bg-${cropConfig[crop].color}-600 text-white shadow-md shadow-${cropConfig[crop].color}-600/20`
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
          >
            <div className="shrink-0 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">{cropConfig[crop].icon}</div>
            {crop}
          </button>
        ))}
      </div>

      {/* Top Header Metrics & Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
            <TrendingUp size={14} className="opacity-80" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Output</span>
              <span className="text-sm font-black font-outfit leading-none">
                {totalQtyToday.toLocaleString()} <span className="text-[8px] uppercase">{cropConfig[activeCrop].unit}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
            <Users size={14} className="text-slate-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workforce</span>
              <span className="text-sm font-black font-outfit text-slate-900 dark:text-white leading-none">
                {totalWorkersToday} <span className="text-[8px] uppercase text-slate-400">pax</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative">
          <button
            onClick={fetchBlocks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <RefreshCcw size={12} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── DAY ENTRY ── */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-200 dark:hover:border-blue-900/50 transition-all w-full sm:w-auto">
                <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                  <ChevronLeft size={22} />
                </button>
                <div className="flex flex-col items-center min-w-[140px] sm:min-w-[180px]">
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white outline-none cursor-pointer text-center font-outfit"
                    />
                  </div>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mt-0.5 opacity-80">{dayLabel.split(',')[0]}</p>
                </div>
                <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-blue-600">
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            <div className="flex gap-8 items-center">
              <div className="flex flex-col items-end">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Yield</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-black font-outfit text-${cropConfig[activeCrop].color}-600`}>{totalQtyToday.toLocaleString()}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{cropConfig[activeCrop].unit}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Registry Section */}
        <div className={`space-y-4 ${showPerformance ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search field blocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full transition-all"
                />
              </div>
              <button
                onClick={() => setShowPerformance(!showPerformance)}
                className={`p-2.5 rounded-xl border transition-all ${showPerformance ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
              >
                <TrendingUp size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium">Syncing agricultural records...</p>
              </div>
            ) : filteredBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <Sprout size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium text-center px-6">No blocks assigned for {activeCrop} on this date. <br /><span className="text-xs">Check attendance muster for assignments.</span></p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBlocks.map(block => (
                  <Card key={block.id} className="p-0 overflow-hidden group transition-all duration-300 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 bg-${cropConfig[activeCrop].color}-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                          <Sprout size={20} className={`text-${cropConfig[activeCrop].color}-600 dark:text-${cropConfig[activeCrop].color}-400`} />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 dark:text-white text-lg font-outfit tracking-tight leading-none mb-1.5">{block.name}</h5>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{block.area_acres || '—'} Acres</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{block.logs?.worker_count || 0} / {block.assigned_pax || 0} Assigned</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Harvested</p>
                          <p className={`text-2xl font-black text-${cropConfig[activeCrop].color}-600 dark:text-${cropConfig[activeCrop].color}-400 font-outfit tracking-tighter italic leading-none`}>
                            {block.logs?.total_qty || 0} <span className="text-[10px] not-italic text-slate-400 uppercase">{cropConfig[activeCrop].unit}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleExpandBlock(block.id)}
                          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${expandedBlock === block.id
                            ? `bg-${cropConfig[activeCrop].color}-600 text-white shadow-lg shadow-${cropConfig[activeCrop].color}-600/20`
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                            }`}>
                          {expandedBlock === block.id ? <User size={14} className="hidden sm:block" /> : <Users size={14} className="hidden sm:block" />}
                          {expandedBlock === block.id ? 'Hide' : 'Workers'}
                          <ChevronLeft size={14} className={`transition-transform duration-300 ${expandedBlock === block.id ? '-rotate-90' : '-rotate-90'}`} />
                        </button>
                      </div>
                    </div>

                    {expandedBlock === block.id && (
                      <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h6 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Individual Worker Performance</h6>
                        </div>
                        <div className="space-y-3">
                          {loadingWorkers ? (
                            <div className="py-10 text-center text-slate-400 text-sm">Fetching assigned workers...</div>
                          ) : workerData.length === 0 ? (
                            <div className="py-6 text-center text-slate-500 text-sm italic">No workers assigned to this block in muster.</div>
                          ) : (
                            <>
                              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                {/* Desktop Header */}
                                <div className="hidden md:grid grid-cols-[1fr_120px_140px_60px] gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                  <div>Worker Profile</div>
                                  <div className="text-center">Output ({cropConfig[activeCrop].unit})</div>
                                  <div className="text-center">Task Type</div>
                                  <div className="text-center">Rate</div>
                                </div>
                                <div className="flex flex-col divide-y divide-slate-50 dark:divide-slate-800">
                                  {workerData.map((worker, idx) => (
                                    <div key={worker.id} className="relative flex flex-col md:grid md:grid-cols-[1fr_120px_140px_60px] gap-4 md:items-center px-4 py-4 md:px-6 hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors group">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200/50 dark:border-slate-600/50 group-hover:scale-110 transition-transform shrink-0">
                                          {worker.photo ? (
                                            <img src={worker.photo} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="text-[10px] font-black text-slate-500 uppercase">
                                              {worker.first_name[0]}{worker.last_name[0]}
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1 pr-10 md:pr-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                              {worker.first_name} {worker.last_name}
                                            </p>
                                            {worker.pay_multiplier > 1 && (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border rounded-lg text-[8px] font-black uppercase tracking-widest bg-amber-500/15 border-amber-400/30 text-amber-600 font-outfit whitespace-nowrap">
                                                <BadgePercent size={9} /> {worker.pay_multiplier}x
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">
                                            ID: {worker.worker_id} • {worker.worker_type}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 md:contents gap-3 items-end md:items-center">
                                        <div className="flex flex-col gap-1 md:block">
                                          <label className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Output ({cropConfig[activeCrop].unit})</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={worker.quantity || ''}
                                            onChange={(e) => handleWorkerChange(idx, 'quantity', parseFloat(e.target.value))}
                                            className="w-full text-center py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 outline-none transition-all shadow-inner"
                                            placeholder="0.00"
                                          />
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 md:block">
                                          <label className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Task</label>
                                          <select
                                            value={worker.work_type}
                                            onChange={(e) => handleWorkerChange(idx, 'work_type', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-lg text-[10px] font-black uppercase tracking-widest px-3 py-2.5 md:py-1.5 outline-none focus:ring-1 focus:ring-blue-500 appearance-none text-center"
                                          >
                                            {cropConfig[activeCrop].tasks.map((t: any) => (
                                              <option key={t} value={t}>{t}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      
                                      <div className="absolute top-4 right-4 md:static">
                                        <button
                                          type="button"
                                          onClick={() => setMultiplierModal({ open: true, workerIndex: idx, workerName: `${worker.first_name} ${worker.last_name}`, currentVal: worker.pay_multiplier })}
                                          className={`p-2 rounded-xl transition-all ${worker.pay_multiplier > 1 ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                        >
                                          <BadgePercent size={18} />
                                        </button>
                                      </div>

                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-end gap-3 pt-6">
                                <button
                                  type="button"
                                  onClick={() => setExpandedBlock(null)}
                                  className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs uppercase tracking-widest"
                                >
                                  Dismiss
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSave}
                                  disabled={isSaving}
                                  className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 text-xs uppercase tracking-widest font-outfit"
                                >
                                  {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                  ) : (
                                    <CheckCircle2 size={18} />
                                  )}
                                  Submit
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence Side Panel */}
        {showPerformance && (
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Brain size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Krushi Intel</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mt-0.5">Performance Engine</p>
                  </div>
                </div>
                <button onClick={() => setShowPerformance(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><PlusCircle className="rotate-45" size={20} /></button>
              </div>
              <div className="space-y-4">
                {performanceData.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Activity size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3 animate-pulse" />
                    <p className="text-xs font-bold text-slate-500">Awaiting Performance Data</p>
                    <p className="text-[10px] text-slate-400 mt-1 px-4">Worker outputs are being analyzed. Select a block to begin.</p>
                  </div>
                ) : (
                  performanceData.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-4 group">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 group-hover:shadow-md transition-all">
                          {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{p.first_name[0]}</div>}
                        </div>
                        <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg ${idx === 0 ? 'bg-amber-400 text-amber-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'}`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.first_name} {p.last_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${cropConfig[activeCrop].accent} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(100, (p.total_qty / 50) * 100)}%` }}></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">{p.total_qty}{p.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full mt-6 py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                <FileSpreadsheet size={16} /> Download Performance Report
              </button>
            </Card>
          </div>
        )}
      </div>

      <PayMultiplierModal
        isOpen={multiplierModal.open}
        onClose={() => setMultiplierModal({ ...multiplierModal, open: false })}
        workerName={multiplierModal.workerName}
        currentMultiplier={multiplierModal.currentVal}
        onSave={(val: any) => handleWorkerChange(multiplierModal.workerIndex, 'pay_multiplier', val)}
      />
    </div>
  );
}
