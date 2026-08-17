import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout, Activity, Users,
  FileSpreadsheet, FileText, AlertCircle, Clock, Search, Loader2,
  X, ArrowRight, Sparkles, CheckCircle2, ArrowUpRight, FlaskConical,
  ShieldCheck, Calendar, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from "../../api/client";
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WEED_TYPES = [
  { id: 'manual', label: 'Manual Weeding', color: 'bg-emerald-500' },
  { id: 'chemical', label: 'Chemical Control', color: 'bg-amber-500' },
  { id: 'mechanical', label: 'Mechanical', color: 'bg-indigo-500' },
];

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const getGisBlockAcres = (block: any): number => {
  if (!block) return 0;
  if (block.polygon_coordinates) {
    let latLngs: [number, number][] = [];
    try {
      let polyData = block.polygon_coordinates;
      if (typeof polyData === 'string') polyData = JSON.parse(polyData);
      let rawCoords = null;
      if (polyData?.type === 'Feature' && polyData.geometry?.type === 'Polygon') {
        rawCoords = polyData.geometry.coordinates[0];
      } else if (polyData?.type === 'Polygon') {
        rawCoords = polyData.coordinates[0];
      } else if (Array.isArray(polyData)) {
        rawCoords = polyData;
      }
      if (rawCoords?.length > 0) {
        latLngs = rawCoords.map((c: any) => {
          if (c?.lat && (c?.lng || c?.lon)) return [c.lat, c.lng || c.lon];
          if (Array.isArray(c) && c.length >= 2) return typeof c[0] === 'number' ? [c[1], c[0]] : null;
          return null;
        }).filter(Boolean);
      }
    } catch { }

    if (latLngs.length >= 3) {
      let area = 0;
      const R = 6378137;
      for (let i = 0; i < latLngs.length; i++) {
        const p1 = latLngs[i];
        const p2 = latLngs[(i + 1) % latLngs.length];
        const lat1 = p1[0] * Math.PI / 180;
        const lng1 = p1[1] * Math.PI / 180;
        const lat2 = p2[0] * Math.PI / 180;
        const lng2 = p2[1] * Math.PI / 180;
        area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
      }
      const areaHectares = Math.abs(area * R * R / 2) / 10000;
      const gisAcres = areaHectares * 2.47105;
      if (gisAcres > 0) return gisAcres;
    }
  }

  const directAcres = Number(block.area_acres || block.acres || 0);
  if (directAcres > 0) return directAcres;

  const directHectares = Number(block.area_hectares || 0);
  if (directHectares > 0) return directHectares * 2.47105;

  const genArea = Number(block.area || 0);
  if (genArea > 0) return genArea;

  return 0;
};

export default function WeedingRound() {
  const navigate = useNavigate();
  const now = new Date();
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (val === 'this_month') {
      const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDayNum = new Date(y, m + 1, 0).getDate();
      const lastDay = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (val === 'last_month') {
      const prevDate = new Date(y, m - 1, 1);
      const prevY = prevDate.getFullYear();
      const prevM = prevDate.getMonth();
      const firstDay = `${prevY}-${String(prevM + 1).padStart(2, '0')}-01`;
      const lastDayNum = new Date(prevY, prevM + 1, 0).getDate();
      const lastDay = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (val === 'last_30') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (val === 'last_90') {
      const d = new Date(today);
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (val === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  const [fields, setFields] = useState<any[]>([]);
  const [fieldData, setFieldData] = useState<Record<string, any>>({});
  const [totals, setTotals] = useState<Record<string, any>>({});
  const [activeField, setActiveField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [intervalDays, setIntervalDays] = useState(90);
  const [statusTab, setStatusTab] = useState<'all' | 'overdue' | 'warn' | 'ok'>('all');

  const [selectedBlockForDetail, setSelectedBlockForDetail] = useState<any | null>(null);
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateKey: string;
    dateObj: Date;
    row: any;
    block: any;
  } | null>(null);

  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      let blocksData: any[] = [];
      let logsData: any[] = [];

      let blocksQuery = supabase.from('field_blocks').select('*');
      if (!isUserAdmin && profile?.estate_id) {
        blocksQuery = blocksQuery.eq('estate_id', profile.estate_id);
      } else if (isUserAdmin && estateFilter !== 'all') {
        blocksQuery = blocksQuery.eq('estate_id', estateFilter);
      }

      const { data: dbBlocks } = await blocksQuery;

      if (dbBlocks && dbBlocks.length > 0) {
        blocksData = dbBlocks;
      } else {
        const resBlocks = await apiClient.get('/crop/blocks');
        if (resBlocks.success && resBlocks.data) {
          blocksData = resBlocks.data;
        }
      }

      const [logsRes, musterRes, manureRes] = await Promise.all([
        supabase.from('weeding_logs').select('*'),
        supabase.from('daily_muster').select('*'),
        supabase.from('manure_logs').select('*')
      ]);

      if (logsRes.data && logsRes.data.length > 0) {
        logsData = logsRes.data;
      } else {
        const reqYear = startDate ? startDate.split('-')[0] : now.getFullYear();
        const resYearLogs = await apiClient.get(`/crop/weeding-logs/year?year=${reqYear}`);
        if (resYearLogs.success && resYearLogs.data) {
          logsData = resYearLogs.data;
        }
      }

      const manureLogsByBlock: Record<string, any[]> = {};
      (manureRes.data || []).forEach((m: any) => {
        const bId = String(m.block_id);
        if (!manureLogsByBlock[bId]) manureLogsByBlock[bId] = [];
        manureLogsByBlock[bId].push(m);
      });

      (musterRes.data || []).forEach((m: any) => {
        if (m.task && (String(m.task).toLowerCase().includes('manure') || String(m.task).toLowerCase().includes('fertilizer'))) {
          const bId = String(m.block_id);
          if (!manureLogsByBlock[bId]) manureLogsByBlock[bId] = [];
          manureLogsByBlock[bId].push({
            date: m.muster_date || m.date,
            type: m.task,
            qty: m.units || m.total_kg || 0
          });
        }
      });

      const dbMusterWeeding = (musterRes.data || []).filter((m: any) =>
        m.task && String(m.task).toLowerCase().includes('weed')
      );

      const mappedFields = blocksData.map((b: any) => ({
        id: String(b.id),
        label: b.name || b.label || `Block ${b.id}`,
        acres: getGisBlockAcres(b).toFixed(2),
        estate_id: b.estate_id
      }));

      setFields(mappedFields);
      if (mappedFields.length > 0 && (!activeField || !mappedFields.find(f => f.id === activeField))) {
        setActiveField(mappedFields[0].id);
      }

      const logsByBlock: Record<string, any[]> = {};
      const weedingLogDatesByBlock = new Set<string>();

      (logsData || []).forEach((log: any) => {
        const bId = String(log.block_id);
        if (!logsByBlock[bId]) logsByBlock[bId] = [];

        let dateStr = log.date;
        if (!dateStr && log.day) {
          const logYear = startDate ? startDate.split('-')[0] : now.getFullYear();
          const logMonth = startDate ? startDate.split('-')[1] : (now.getMonth() + 1);
          dateStr = `${logYear}-${String(logMonth).padStart(2, '0')}-${String(log.day).padStart(2, '0')}`;
        }
        if (!dateStr) return;
        const dateKey = dateStr.split('T')[0];

        if (startDate && dateKey < startDate) return;
        if (endDate && dateKey > endDate) return;

        weedingLogDatesByBlock.add(`${bId}_${dateKey}`);

        logsByBlock[bId].push({
          ...log,
          date: dateKey,
          area: Number(log.acres_covered || log.area || 0),
          labours: Number(log.workers || log.labours || (log.worker_id ? 1 : 0)) || 1,
          type: WEED_TYPES.find(t => t.id === log.type)?.label || log.type || 'Manual Weeding'
        });
      });

      (dbMusterWeeding || []).forEach((m: any) => {
        const bId = String(m.block_id);
        const dateStr = m.muster_date || m.date;
        if (!dateStr) return;
        const dateKey = dateStr.split('T')[0];

        if (startDate && dateKey < startDate) return;
        if (endDate && dateKey > endDate) return;

        if (weedingLogDatesByBlock.has(`${bId}_${dateKey}`)) return;

        if (!logsByBlock[bId]) logsByBlock[bId] = [];

        logsByBlock[bId].push({
          ...m,
          date: dateKey,
          area: Number(m.acres_covered || m.units || 0),
          labours: Number(m.workers || m.labours || (m.worker_id ? 1 : 0)) || 1,
          type: 'Manual Weeding'
        });
      });

      // No dummy data fallback - only real database logs are used

      const dataMap: Record<string, any> = {};
      const totalsMap: Record<string, any> = {};
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - intervalDays);

      mappedFields.forEach((f: any) => {
        dataMap[f.id] = {};
        let logs = logsByBlock[f.id] || [];

        logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentRound = 1;
        let roundStartDate: string | null = null;
        let currentYearKey: string | null = null;

        logs = logs.map((log: any) => {
          const dateKey = log.date.split('T')[0];
          const yearKey = dateKey.substring(0, 4); // "YYYY"

          if (yearKey !== currentYearKey) {
            currentYearKey = yearKey;
            currentRound = 1;
            roundStartDate = dateKey;
          } else if (roundStartDate) {
            const daysSinceStart = Math.round((new Date(dateKey).getTime() - new Date(roundStartDate).getTime()) / 86400000);
            if (daysSinceStart >= intervalDays) {
              currentRound++;
              roundStartDate = dateKey;
            }
          }

          const roundStr = String(currentRound).padStart(2, '0');
          return { ...log, dateKey, round_label: `Round ${roundStr}`, roundStartDate };
        });

        logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const blockAcres = parseFloat(f.acres) || 0;
        const tot: any = {
          id: f.id, area: 0, labours: 0,
          latestRoundArea: 0, readinessArea: 0,
          logCount: logs.length
        };

        if (logs.length > 0) {
          const latestRoundLabel = logs[0].round_label || "Round 01";
          const latestRoundLogs = logs.filter((l: any) => (l.round_label || "Round 01") === latestRoundLabel);

          const earliestDateOfLatestRound = [...latestRoundLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date;
          const absoluteEarliest = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date;

          tot.earliestAppDate = absoluteEarliest.split('T')[0];
          tot.lastAppDate = logs[0].date;
          tot.latestRoundStartDate = earliestDateOfLatestRound;

          const d1 = new Date(earliestDateOfLatestRound);
          d1.setDate(d1.getDate() + intervalDays);
          tot.nextDue = d1.toISOString().split('T')[0];

          const latestLogDate = logs[0].date;
          const latestLogYear = latestLogDate.substring(0, 4);
          const nextDueYear = tot.nextDue.substring(0, 4);

          if (nextDueYear !== latestLogYear) {
            tot.nextRoundLabel = "Round 01";
          } else {
            const roundNum = parseInt(latestRoundLabel.replace('Round ', '')) || 1;
            tot.nextRoundLabel = `Round ${String(roundNum + 1).padStart(2, '0')}`;
          }
          const bManureLogs = manureLogsByBlock[f.id] || [];
          bManureLogs.sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
          const latestManure = bManureLogs[0];

          if (latestManure && new Date(latestManure.date).getTime() >= new Date(earliestDateOfLatestRound).getTime()) {
            tot.fertilizerStatus = 'applied';
            tot.fertilizerDate = latestManure.date;
            tot.fertilizerType = latestManure.type || latestManure.manure_type || 'Fertilizer Application';
          } else {
            tot.fertilizerStatus = 'pending';
          }

          logs.forEach((log: any) => {
            const dateKey = log.date.split('T')[0];
            const logDate = new Date(log.date);

            const existingDay = dataMap[f.id][dateKey];
            const addLabours = Number(log.labours) || 0;
            const addArea = Number(log.area) || 0;

            dataMap[f.id][dateKey] = {
              type: log.type,
              typeColor: 'bg-emerald-500',
              round: log.round_label,
              area: (existingDay?.area || 0) + addArea,
              labours: (existingDay?.labours || 0) + addLabours,
              chem_type: log.chemical_type,
              chem_qty: log.chemical_qty
            };

            tot.area += addArea;
            tot.labours += addLabours;

            if (logDate >= cutoffDate) {
              tot.readinessArea += addArea;
            }

            if (log.round_label === latestRoundLabel) {
              tot.latestRoundArea += addArea;
            }
          });

          tot.readinessArea = Math.min(tot.readinessArea, blockAcres);
        }
        totalsMap[f.id] = tot;
      });

      setFieldData(dataMap);
      setTotals(totalsMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [startDate, endDate, estateFilter, intervalDays]);

  const getDueStatus = (fieldId: string) => {
    const tot = totals[fieldId];
    if (!tot || !tot.nextDue) return "none";
    const diff = Math.round((new Date(tot.nextDue).getTime() - now.getTime()) / 86400000);
    if (diff < 0) return "overdue";
    if (diff <= 10) return "warn";
    return "ok";
  };

  const statusCounts = useMemo(() => {
    const counts = { all: fields.length, overdue: 0, warn: 0, ok: 0 };
    fields.forEach(f => {
      const st = getDueStatus(f.id);
      if (st === 'overdue') counts.overdue++;
      else if (st === 'warn') counts.warn++;
      else if (st === 'ok') counts.ok++;
    });
    return counts;
  }, [fields, totals]);

  const filteredFields = useMemo(() => {
    return fields.filter(f => {
      const matchesSearch = f.label.toLowerCase().includes(searchQuery.toLowerCase());
      const st = getDueStatus(f.id);
      const matchesTab = statusTab === 'all' || st === statusTab;
      return matchesSearch && matchesTab;
    });
  }, [fields, searchQuery, statusTab, totals]);

  const filteredTotals = useMemo(() => {
    return filteredFields.reduce(
      (acc, f) => {
        const tot = totals[f.id] || {};
        acc.area += tot.area || 0;
        acc.labours += tot.labours || 0;
        return acc;
      },
      { area: 0, labours: 0 }
    );
  }, [filteredFields, totals]);

  const exportToExcel = () => {
    const data = filteredFields.map(f => {
      const tot = totals[f.id] || {};
      return {
        'Block': f.label,
        'Total Area (Ac)': f.acres,
        'Total Weeded Area (Ac)': (tot.area || 0).toFixed(2),
        'Total Labour Deployment': tot.labours || 0,
        'Next Due Date': tot.nextDue || 'Ready',
        'Status': getDueStatus(f.id).toUpperCase()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weeding Status");
    XLSX.writeFile(wb, `weeding_round_report_${startDate}_to_${endDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const estateName = estates.find(e => e.id === estateFilter)?.name || 'All Estates';

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Weeding Round Operational Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Estate: ${estateName} | Time Range: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 28);
    doc.text(`Cycle Standard: ${intervalDays} Days Interval`, 14, 34);

    const tableData = filteredFields.map(f => {
      const tot = totals[f.id] || {};
      return [
        f.label,
        `${f.acres} Ac`,
        `${(tot.area || 0).toFixed(2)} Ac`,
        tot.nextDue ? formatDate(tot.nextDue) : 'Ready',
        getDueStatus(f.id).toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Block', 'Total Area', 'Weeded Area', 'Next Due', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 247] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`weeding_round_report_${startDate}_to_${endDate}.pdf`);
  };

  const activeFieldData = activeField && fieldData[activeField] ? fieldData[activeField] : {};

  const matrixDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const dates: string[] = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const chunkSize = Math.max(1, Math.ceil(matrixDates.length / 4));

  return (
    <div className="pb-16 space-y-4">

      {/* Daily Operations Style Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Weeding Round Monitor</h1>
      </div>

      {/* ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Weeded Area",
            val: filteredTotals.area.toFixed(1),
            unit: "Ac",
            icon: Sprout,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
          },
          {
            label: "Deployment Force",
            val: filteredTotals.labours,
            unit: "PAX (Weeding)",
            icon: Users,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-900/20"
          },
          {
            label: "Efficiency Rating",
            val: (filteredTotals.area / Math.max(1, filteredTotals.labours)).toFixed(2),
            unit: "Ac/pax",
            icon: Activity,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20"
          },
          {
            label: "Cycle Overdue",
            val: statusCounts.overdue,
            unit: "blocks",
            icon: AlertCircle,
            color: statusCounts.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
            bg: statusCounts.overdue > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
          },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={s.color} size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {s.val}<span className="text-xs font-normal text-slate-500 ml-1">{s.unit}</span>
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Estate Filter Selector */}
          {isUserAdmin && (
            <select
              value={estateFilter}
              onChange={e => setEstateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 min-w-[140px]"
            >
              <option value="all">All Estates</option>
              {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
            </select>
          )}

          {/* Relevant Block Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">Block:</span>
            <select
              value={activeField || ''}
              onChange={e => setActiveField(e.target.value)}
              className="bg-transparent font-bold text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer"
            >
              {filteredFields.length === 0 && <option value="">No blocks found</option>}
              {filteredFields.map(f => (
                <option key={f.id} value={f.id}>{f.label} ({f.acres} Ac)</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search block name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 placeholder:text-slate-400"
            />
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={timeRange}
                onChange={e => handleTimeRangeChange(e.target.value)}
                className="h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_30">Last 30 Days</option>
                <option value="last_90">Last 90 Days</option>
                <option value="this_year">This Year ({now.getFullYear()})</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {timeRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Settings Button */}
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-lg border-slate-200 dark:border-slate-800"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
        {[
          { key: 'all', label: 'All Blocks', count: statusCounts.all },
          { key: 'overdue', label: 'Overdue Cycles', count: statusCounts.overdue, badgeBg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' },
          { key: 'warn', label: 'Due Soon (≤ 10 Days)', count: statusCounts.warn, badgeBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
          { key: 'ok', label: 'In-Cycle / Optimal', count: statusCounts.ok, badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              statusTab === tab.key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tab.badgeBg || 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading Weeding Intelligence...</span>
        </div>
      ) : (
        <>
          {/* Main Operational Log Matrix Table */}
          {activeField ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {fields.find(f => f.id === activeField)?.label} ({fields.find(f => f.id === activeField)?.acres} Ac)
                    </h2>
                    <button
                      onClick={() => setSelectedBlockForDetail(fields.find(f => f.id === activeField))}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800"
                    >
                      Block Details <ArrowRight size={11} />
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Weeding Log Matrix ({formatDate(startDate)} – {formatDate(endDate)})</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Next Due</p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 leading-tight">
                    {totals[activeField!]?.nextDue ? formatDate(totals[activeField!].nextDue) : "Ready"} • {totals[activeField!]?.nextRoundLabel || "Next Round"}
                  </p>
                </div>
              </div>

              {/* Post-Weeding Fertilizer Application Indicator Banner */}
              {totals[activeField!]?.fertilizerStatus === 'pending' && (
                <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 flex justify-between items-center flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                    <Sparkles size={15} className="text-amber-500 shrink-0" />
                    <span>Post-Weeding Requirement: <strong>Fertilizer application is required once</strong> after completing this weeding round.</span>
                  </div>
                  <button
                    onClick={() => navigate('/crop/manure')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    Log Fertilizer Application <ArrowUpRight size={12} />
                  </button>
                </div>
              )}

              {totals[activeField!]?.fertilizerStatus === 'applied' && (
                <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 flex justify-between items-center flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Post-Weeding Fertilizer: <strong>Applied on {formatDate(totals[activeField!].fertilizerDate)}</strong> ({totals[activeField!].fertilizerType})</span>
                  </div>
                  <button
                    onClick={() => navigate('/rounds/manure')}
                    className="px-2 py-0.5 text-emerald-700 dark:text-emerald-300 hover:underline font-semibold text-[11px] shrink-0 flex items-center gap-1"
                  >
                    View Fertilizer Monitor <ArrowUpRight size={11} />
                  </button>
                </div>
              )}

              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                {[0, 1, 2, 3].map(colIdx => (
                  <div key={colIdx} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                          <th className="px-3 py-2 w-16">Date</th>
                          <th className="px-3 py-2">Operation</th>
                          <th className="px-3 py-2 text-right w-16">Area (Ac)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {matrixDates.slice(colIdx * chunkSize, (colIdx + 1) * chunkSize).map(dateKey => {
                          const d = new Date(dateKey);
                          const row = activeFieldData[dateKey];
                          const todayStr = new Date().toISOString().split('T')[0];
                          const isToday = dateKey === todayStr;
                          const isNextDue = totals[activeField!]?.nextDue === dateKey;

                          return (
                            <tr
                              key={dateKey}
                              onClick={() => {
                                if (row) {
                                  setSelectedDayDetail({
                                    dateKey,
                                    dateObj: d,
                                    row,
                                    block: fields.find(f => f.id === activeField)
                                  });
                                }
                              }}
                              className={`transition-colors ${
                                row ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              } ${isNextDue ? 'ring-2 ring-inset ring-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}
                            >
                              <td className="px-3 py-2">
                                <div className="flex flex-col">
                                  <span className={`font-semibold ${isNextDue ? 'text-amber-600 dark:text-amber-400' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {formatDate(dateKey)}
                                  </span>
                                  {isToday && <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Today</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {row ? (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {row.round || "Round 01"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[90px]">{row.type}</span>
                                  </div>
                                ) : isNextDue ? (
                                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                    <Clock size={11} className="animate-pulse" />
                                    <span>Due {totals[activeField!]?.nextRoundLabel || "Next"}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {row ? (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {row.area.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-medium">
              Please select a block to view weeding log matrix.
            </div>
          )}
        </>
      )}

      {/* SLIDE-OVER BLOCK DETAIL DRAWER */}
      {selectedBlockForDetail && (
        <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl p-6 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div>
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedBlockForDetail.label}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Area: {selectedBlockForDetail.acres} Acres
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedBlockForDetail(null)}
                  className="rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Operational Stats Grid */}
              <div className="py-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total Weeded</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {(totals[selectedBlockForDetail.id]?.area || 0).toFixed(1)} <span className="text-xs font-normal text-slate-400">Ac</span>
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Labour Deployment</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {totals[selectedBlockForDetail.id]?.labours || 0} <span className="text-xs font-normal text-slate-400">PAX</span>
                    </p>
                  </div>
                </div>

                {/* Timeline info */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" /> Block Operational Readiness
                  </h4>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Target Interval</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{intervalDays} Days Cycle</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Post-Weeding Fertilizer</span>
                      <span className={`font-bold flex items-center gap-1 ${
                        totals[selectedBlockForDetail.id]?.fertilizerStatus === 'applied'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        <FlaskConical size={13} />
                        {totals[selectedBlockForDetail.id]?.fertilizerStatus === 'applied' ? 'Applied Post-Weeding' : 'Pending Application'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Cycle Status</span>
                      <span className={`uppercase text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        getDueStatus(selectedBlockForDetail.id) === 'overdue'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : getDueStatus(selectedBlockForDetail.id) === 'warn'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {getDueStatus(selectedBlockForDetail.id)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button
                onClick={() => setSelectedBlockForDetail(null)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DAY DETAIL DRAWER */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl p-6 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {selectedDayDetail.row.round || 'Weeding Log'}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                    {selectedDayDetail.block?.label || 'Field Block'}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} className="text-emerald-600 dark:text-emerald-400" />
                    {selectedDayDetail.dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedDayDetail(null)}
                  className="rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Primary Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-0.5">
                    <Sprout size={14} />
                    <span className="text-xs font-medium">Weeded Area</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedDayDetail.row.area} <span className="text-xs font-normal text-slate-400">Ac</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 mb-0.5">
                    <Users size={14} />
                    <span className="text-xs font-medium">Labour Force</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedDayDetail.row.labours} <span className="text-xs font-normal text-slate-400">PAX</span>
                  </p>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs font-semibold mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-normal">Weeding Method</span>
                  <span className="text-slate-900 dark:text-white font-bold">{selectedDayDetail.row.type}</span>
                </div>

                {selectedDayDetail.row.chem_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-normal">Chemical Agent</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedDayDetail.row.chem_type} ({selectedDayDetail.row.chem_qty || 0} L)</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-normal">Worker Efficiency</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {selectedDayDetail.row.labours > 0 ? (selectedDayDetail.row.area / selectedDayDetail.row.labours).toFixed(2) : '0'} Ac / PAX
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => setSelectedDayDetail(null)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg"
              >
                Close Weeding Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Weeding Round Settings
                  </h3>
                  <p className="text-xs text-slate-400">Configure weeding cycle & display options</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowSettings(false)}
                className="rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Cycle Interval Settings */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Target Weeding Interval
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: 30, label: '30 Days' },
                  { val: 45, label: '45 Days' },
                  { val: 60, label: '60 Days' },
                  { val: 90, label: '90 Days' },
                ].map(item => (
                  <button
                    key={item.val}
                    onClick={() => setIntervalDays(item.val)}
                    className={`h-9 rounded-xl text-xs font-semibold border transition-all ${
                      intervalDays === item.val
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-500 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Reports */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Export Data Reports
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportToExcel}
                  className="h-9 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Excel Sheet</span>
                </button>
                <button
                  onClick={exportToPDF}
                  className="h-9 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText size={15} className="text-red-500" />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {/* Annual Round Calculation Guidelines */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                Annual Weeding Round Guidelines
              </label>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-slate-900 dark:text-white">Annual Reset:</strong> The first weeding date in any given calendar year resets to <span className="font-semibold text-emerald-600 dark:text-emerald-400">Round 01</span>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-slate-900 dark:text-white">Round Progress:</strong> Subsequent weeding dates in that year increment (<span className="font-semibold text-slate-700 dark:text-slate-200">Round 02, Round 03</span>, etc.) after every 90 days.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-slate-900 dark:text-white">Year-End Round:</strong> The final weeding date of the year represents the relevant last round of that year.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-slate-900 dark:text-white">Next Due Prediction:</strong> If the next projected date (after 90 days) falls in the same calendar year, Next Round shows <span className="font-semibold text-amber-600 dark:text-amber-400">Round N+1</span>. If it falls into the next calendar year, Next Round automatically predicts <span className="font-semibold text-emerald-600 dark:text-emerald-400">Round 01</span>.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-slate-900 dark:text-white">Post-Weeding Fertilizer Rule:</strong> Fertilizer / Manure must be applied <span className="font-semibold text-emerald-600 dark:text-emerald-400">once after completing each weeding round</span> for optimal soil nutrient absorption.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setShowSettings(false)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
