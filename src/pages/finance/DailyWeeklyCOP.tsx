import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  ChevronDown,
  FileIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";
import { supabase } from "../../lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

// ── Formatting helpers ─────────────────────────────────────────────────────────
const f2 = (v: number, d = 2) => {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return v < 0 ? `(${s})` : s;
};
const brk = (v: number) =>
  `(${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
const av = (a: number, c: number) => (c ? a / c : 0);
const pc = (v: number) => (v < 0 ? "text-red-600 dark:text-red-400" : v > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white");

// ── Table cell helpers ─────────────────────────────────────────────────────────
const TL = ({ children, bold, w, className = "", colSpan }: { children: React.ReactNode; bold?: boolean; w?: string | number; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={`text-left px-3.5 py-2 text-xs ${bold ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"} ${className}`} style={{ width: w }}>
    {children}
  </td>
);
const TR = ({ v, bold, color, bracket, className = "" }: { v: number; bold?: boolean; color?: string; bracket?: boolean; className?: string }) => (
  <td className={`text-right px-3.5 py-2 text-xs ${bold ? "font-bold" : "font-medium"} ${color || "text-slate-900 dark:text-white"} ${className}`}>
    {bracket ? brk(v) : f2(v)}
  </td>
);
const AV = ({ a, c, bold, color, className = "" }: { a: number; c: number; bold?: boolean; color?: string; className?: string }) => <TR v={av(a, c)} bold={bold} color={color} className={className} />;

export default function DailyWeeklyCOP() {
  const { profile } = useAuthStore();
  const [estates, setEstates] = useState<any[]>([]);
  const [selectedEstateId, setSelectedEstateId] = useState<string>('');

  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [showExportOptions, setShowExportOptions] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadEstates() {
      try {
        const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
        if (!error && data && data.length > 0) {
          setEstates(data);
          if (profile?.estate_id && data.some(e => e.id === profile.estate_id)) {
            setSelectedEstateId(profile.estate_id);
          } else {
            setSelectedEstateId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load estates:', err);
      }
    }
    loadEstates();
  }, [profile]);

  const currentEstate = useMemo(() => {
    if (selectedEstateId) {
      const match = estates.find(e => e.id === selectedEstateId);
      if (match) return match.name;
    }
    if (profile?.estate_id) {
      const match = estates.find(e => e.id === profile.estate_id);
      if (match) return match.name;
    }
    return estates[0]?.name || "Estate";
  }, [selectedEstateId, estates, profile]);

  // Calculate startDate and endDate based on selectedDate and reportType
  const dateRange = useMemo(() => {
    if (reportType === "daily") {
      return { startDate: selectedDate, endDate: selectedDate };
    } else if (reportType === "weekly") {
      const start = new Date(selectedDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        startDate: selectedDate,
        endDate: end.toISOString().split("T")[0]
      };
    } else {
      const parts = selectedDate.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const end = new Date(year, month, 0);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const startDate = `${year}-${pad(month)}-01`;
      const endDate = `${year}-${pad(month)}-${pad(end.getDate())}`;
      return { startDate, endDate };
    }
  }, [selectedDate, reportType]);

  // ── Fetch report data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (range: { startDate: string; endDate: string }) => {
    if (!range) return;
    setStatus("loading");
    try {
      const res = await apiClient.get(`/estate-cop/daily-weekly-report?startDate=${encodeURIComponent(range.startDate)}&endDate=${encodeURIComponent(range.endDate)}`);
      if (res.success) {
        setData(res.data);
        setStatus("ok");
      } else {
        throw new Error(res.error || "Failed to fetch report");
      }
    } catch (e: any) {
      setErrMsg(e.message || "Failed to fetch report");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  // ── Derived totals ────────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    if (!data) return null;
    const mc = data.crop?.monthly || 0, tc = data.crop?.todate || 0;

    const sundryList: any[] = data.sundryExpensesList || [];
    const opSundryList = sundryList.filter(e => {
      const lbl = (e.label || '').toLowerCase();
      return !lbl.includes('sundry') && !lbl.includes('other expense');
    });
    const remSundryList = sundryList.filter(e => {
      const lbl = (e.label || '').toLowerCase();
      return lbl.includes('sundry') || lbl.includes('other expense');
    });

    const allOpExpenses = [...(data.fieldExpenses || []), ...opSundryList];

    const tfM = allOpExpenses.reduce((s, e) => s + (e.monthly || 0), 0);
    const tfT = allOpExpenses.reduce((s, e) => s + (e.todate || 0), 0);
    const tcpM = (data.capitalExpenses || []).reduce((s: number, e: any) => s + (e.monthly || 0), 0);
    const tcpT = (data.capitalExpenses || []).reduce((s: number, e: any) => s + (e.todate || 0), 0);

    const sundryExpM = remSundryList.reduce((s, e) => s + (e.monthly || 0), 0);
    const sundryExpT = remSundryList.reduce((s, e) => s + (e.todate || 0), 0);

    const tiM = (data.leafIncome?.monthly || 0) + (data.sundryIncome?.monthly || 0);
    const tiT = (data.leafIncome?.todate || 0) + (data.sundryIncome?.todate || 0);

    return {
      mc, tc, tfM, tfT, tcpM, tcpT, tiM, tiT,
      allOpExpenses,
      remSundryList,
      sundryExpM,
      sundryExpT,
      fpM: (data.leafIncome?.monthly || 0) - tfM,
      fpT: (data.leafIncome?.todate || 0) - tfT,
      spM: (data.sundryIncome?.monthly || 0) - sundryExpM,
      spT: (data.sundryIncome?.todate || 0) - sundryExpT,
      teM: tfM + sundryExpM,
      teT: tfT + sundryExpT,
      pwcM: tiM - (tfM + sundryExpM + tcpM),
      pwcT: tiT - (tfT + sundryExpT + tcpT),
      pwoM: tiM - (tfM + sundryExpM),
      pwoT: tiT - (tfT + sundryExpT),
    };
  }, [data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExportOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const periodLabel = useMemo(() => {
    if (reportType === "daily") {
      return selectedDate;
    } else if (reportType === "weekly") {
      return `${dateRange.startDate} to ${dateRange.endDate}`;
    } else {
      const parts = selectedDate.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
      return `${monthName} ${year} (${dateRange.startDate} to ${dateRange.endDate})`;
    }
  }, [reportType, selectedDate, dateRange]);

  const reportTitle = useMemo(() => {
    if (reportType === "daily") return "DAILY COP REPORT";
    if (reportType === "weekly") return "WEEKLY COP REPORT";
    return "MONTHLY COP REPORT";
  }, [reportType]);

  const exportCSV = () => {
    if (!data || !derived) return;
    const headers = ['Description', `${periodLabel} Amount (LKR)`, 'Cost Ave. (LKR/Kg)', 'To Date Amount (LKR)', 'To Date Cost Ave. (LKR/Kg)'];
    const rows: any[] = [];

    // Estate Operation
    rows.push(['ESTATE OPERATION', '', '', '', '']);
    rows.push([`Crop (Kg) – ${currentEstate}`, data.crop.monthly, '', data.crop.todate, '']);
    rows.push([
      `ESTATE LEAF INCOME – ${currentEstate}`,
      data.leafIncome?.monthly || 0,
      av(data.leafIncome?.monthly || 0, derived.mc).toFixed(2),
      data.leafIncome?.todate || 0,
      av(data.leafIncome?.todate || 0, derived.tc).toFixed(2)
    ]);

    derived.allOpExpenses.forEach((exp: any) => {
      rows.push([
        exp.label,
        exp.monthly || 0,
        av(exp.monthly || 0, derived.mc).toFixed(2),
        exp.todate || 0,
        av(exp.todate || 0, derived.tc).toFixed(2)
      ]);
    });

    rows.push([
      'Total Expense',
      derived.tfM,
      av(derived.tfM, derived.mc).toFixed(2),
      derived.tfT,
      av(derived.tfT, derived.tc).toFixed(2)
    ]);

    rows.push([
      'Tea Field Profit / (Loss)',
      derived.fpM,
      av(derived.fpM, derived.mc).toFixed(2),
      derived.fpT,
      av(derived.fpT, derived.tc).toFixed(2)
    ]);

    // Estate Sundry
    rows.push([]);
    rows.push(['ESTATE SUNDRY', '', '', '', '']);
    data.sundryIncomeList?.forEach((inc: any) => {
      rows.push([
        inc.label,
        inc.monthly || 0,
        av(inc.monthly || 0, derived.mc).toFixed(2),
        inc.todate || 0,
        av(inc.todate || 0, derived.tc).toFixed(2)
      ]);
    });
    if (data.sundryIncomeList?.length > 0) {
      rows.push([
        'Total Sundry Income',
        data.sundryIncome?.monthly || 0,
        av(data.sundryIncome?.monthly || 0, derived.mc).toFixed(2),
        data.sundryIncome?.todate || 0,
        av(data.sundryIncome?.todate || 0, derived.tc).toFixed(2)
      ]);
    }

    derived.remSundryList?.forEach((exp: any) => {
      rows.push([
        exp.label,
        exp.monthly || 0,
        av(exp.monthly || 0, derived.mc).toFixed(2),
        exp.todate || 0,
        av(exp.todate || 0, derived.tc).toFixed(2)
      ]);
    });
    if (derived.remSundryList?.length > 0) {
      rows.push([
        'Total Sundry Expenses',
        derived.sundryExpM,
        av(derived.sundryExpM, derived.mc).toFixed(2),
        derived.sundryExpT,
        av(derived.sundryExpT, derived.tc).toFixed(2)
      ]);
    }
    rows.push([
      'Estate Sundry Profit / (Loss)',
      derived.spM,
      av(derived.spM, derived.mc).toFixed(2),
      derived.spT,
      av(derived.spT, derived.tc).toFixed(2)
    ]);

    // Capital Expenses
    rows.push([]);
    rows.push(['CAPITAL EXPENSES', '', '', '', '']);
    (data.capitalExpenses || []).forEach((exp: any) => {
      rows.push([
        exp.label,
        exp.monthly || 0,
        av(exp.monthly || 0, derived.mc).toFixed(2),
        exp.todate || 0,
        av(exp.todate || 0, derived.tc).toFixed(2)
      ]);
    });
    rows.push([
      'Total Capital Expenses',
      derived.tcpM,
      av(derived.tcpM, derived.mc).toFixed(2),
      derived.tcpT,
      av(derived.tcpT, derived.tc).toFixed(2)
    ]);

    // Summary
    rows.push([]);
    rows.push(['SUMMARY', '', '', '', '']);
    rows.push(['TOTAL INCOME', derived.tiM, av(derived.tiM, derived.mc).toFixed(2), derived.tiT, av(derived.tiT, derived.tc).toFixed(2)]);
    rows.push(['TOTAL EXPENSES', derived.teM, av(derived.teM, derived.mc).toFixed(2), derived.teT, av(derived.teT, derived.tc).toFixed(2)]);
    rows.push(['Profit WITH Capital Expenses', derived.pwcM, av(derived.pwcM, derived.mc).toFixed(2), derived.pwcT, av(derived.pwcT, derived.tc).toFixed(2)]);
    rows.push(['Profit WITHOUT Capital Expenses', derived.pwoM, av(derived.pwoM, derived.mc).toFixed(2), derived.pwoT, av(derived.pwoT, derived.tc).toFixed(2)]);

    const csvContent = [
      ['Estate', currentEstate],
      ['Period', periodLabel],
      [],
      headers.join(','),
      ...rows.map(r => r.map((val: any) => typeof val === 'string' && val.includes(',') ? `"${val}"` : val).join(','))
    ].join('\n');

    const fileName = reportType === "daily"
      ? `Daily_COP_Report_${selectedDate.replace(/-/g, '_')}`
      : reportType === "weekly"
      ? `Weekly_COP_Report_${dateRange.startDate.replace(/-/g, '_')}_to_${dateRange.endDate.replace(/-/g, '_')}`
      : `Monthly_COP_Report_${selectedDate.slice(0, 7).replace(/-/g, '_')}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportOptions(false);
  };

  const exportPDF = () => {
    if (!data || !derived) return;
    const doc = new jsPDF('portrait');
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${currentEstate}`, 14, 15);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(reportTitle, 14, 21);
    doc.text(`Period: ${periodLabel}`, 14, 27);
    doc.text(`Created: ${new Date().toLocaleString()}`, 14, 33);

    const tableBody: any[] = [];

    // Helper to format values
    const fmt = (v: number) => f2(v);
    const fmtPct = (a: number, c: number) => f2(av(a, c));

    // Section 1: Estate Operation
    tableBody.push([{ content: 'ESTATE OPERATION', colSpan: 5, styles: { fillColor: [240, 245, 240], fontStyle: 'bold' } }]);
    tableBody.push([`Crop (Kg) – ${currentEstate}`, fmt(data.crop.monthly), '', fmt(data.crop.todate), '']);
    tableBody.push([
      `ESTATE LEAF INCOME – ${currentEstate}`,
      fmt(data.leafIncome?.monthly || 0),
      fmtPct(data.leafIncome?.monthly || 0, derived.mc),
      fmt(data.leafIncome?.todate || 0),
      fmtPct(data.leafIncome?.todate || 0, derived.tc)
    ]);

    derived.allOpExpenses.forEach((exp: any) => {
      tableBody.push([
        exp.label,
        fmt(exp.monthly || 0),
        fmtPct(exp.monthly || 0, derived.mc),
        fmt(exp.todate || 0),
        fmtPct(exp.todate || 0, derived.tc)
      ]);
    });

    tableBody.push([
      { content: 'Total Expense', styles: { fontStyle: 'bold', fillColor: [253, 242, 242] } },
      { content: `(${fmt(derived.tfM)})`, styles: { fontStyle: 'bold', fillColor: [253, 242, 242] } },
      { content: `(${fmtPct(derived.tfM, derived.mc)})`, styles: { fontStyle: 'bold', fillColor: [253, 242, 242] } },
      { content: `(${fmt(derived.tfT)})`, styles: { fontStyle: 'bold', fillColor: [253, 242, 242] } },
      { content: `(${fmtPct(derived.tfT, derived.tc)})`, styles: { fontStyle: 'bold', fillColor: [253, 242, 242] } }
    ]);

    tableBody.push([
      { content: 'Tea Field Profit / (Loss)', styles: { fontStyle: 'bold', fillColor: derived.fpM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.fpM), styles: { fontStyle: 'bold', fillColor: derived.fpM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.fpM, derived.mc), styles: { fontStyle: 'bold', fillColor: derived.fpM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.fpT), styles: { fontStyle: 'bold', fillColor: derived.fpT >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.fpT, derived.tc), styles: { fontStyle: 'bold', fillColor: derived.fpT >= 0 ? [240, 253, 244] : [254, 242, 242] } }
    ]);

    // Section 2: Estate Sundry
    tableBody.push([{ content: 'ESTATE SUNDRY', colSpan: 5, styles: { fillColor: [240, 240, 250], fontStyle: 'bold' } }]);
    data.sundryIncomeList?.forEach((inc: any) => {
      tableBody.push([
        inc.label,
        fmt(inc.monthly || 0),
        fmtPct(inc.monthly || 0, derived.mc),
        fmt(inc.todate || 0),
        fmtPct(inc.todate || 0, derived.tc)
      ]);
    });
    if (data.sundryIncomeList?.length > 0) {
      tableBody.push([
        'Total Sundry Income',
        fmt(data.sundryIncome?.monthly || 0),
        fmtPct(data.sundryIncome?.monthly || 0, derived.mc),
        fmt(data.sundryIncome?.todate || 0),
        fmtPct(data.sundryIncome?.todate || 0, derived.tc)
      ]);
    }

    derived.remSundryList?.forEach((exp: any) => {
      tableBody.push([
        exp.label,
        fmt(exp.monthly || 0),
        fmtPct(exp.monthly || 0, derived.mc),
        fmt(exp.todate || 0),
        fmtPct(exp.todate || 0, derived.tc)
      ]);
    });
    if (derived.remSundryList?.length > 0) {
      tableBody.push([
        'Total Sundry Expenses',
        fmt(derived.sundryExpM),
        fmtPct(derived.sundryExpM, derived.mc),
        fmt(derived.sundryExpT),
        fmtPct(derived.sundryExpT, derived.tc)
      ]);
    }
    tableBody.push([
      { content: 'Estate Sundry Profit / (Loss)', styles: { fontStyle: 'bold', fillColor: derived.spM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.spM), styles: { fontStyle: 'bold', fillColor: derived.spM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.spM, derived.mc), styles: { fontStyle: 'bold', fillColor: derived.spM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.spT), styles: { fontStyle: 'bold', fillColor: derived.spT >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.spT, derived.tc), styles: { fontStyle: 'bold', fillColor: derived.spT >= 0 ? [240, 253, 244] : [254, 242, 242] } }
    ]);

    // Section 3: Capital Expenses
    tableBody.push([{ content: 'CAPITAL EXPENSES', colSpan: 5, styles: { fillColor: [250, 250, 250], fontStyle: 'bold' } }]);
    (data.capitalExpenses || []).forEach((exp: any) => {
      tableBody.push([
        { content: exp.label, styles: { fontStyle: 'italic' } },
        fmt(exp.monthly || 0),
        fmtPct(exp.monthly || 0, derived.mc),
        fmt(exp.todate || 0),
        fmtPct(exp.todate || 0, derived.tc)
      ]);
    });
    tableBody.push([
      { content: 'Total Capital Expenses', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: `(${fmt(derived.tcpM)})`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: `(${fmtPct(derived.tcpM, derived.mc)})`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: `(${fmt(derived.tcpT)})`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      { content: `(${fmtPct(derived.tcpT, derived.tc)})`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
    ]);

    // Section 4: Summary
    tableBody.push([{ content: 'SUMMARY', colSpan: 5, styles: { fillColor: [245, 245, 245], fontStyle: 'bold' } }]);
    tableBody.push([
      { content: 'TOTAL INCOME', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: fmt(derived.tiM), styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: fmtPct(derived.tiM, derived.mc), styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: fmt(derived.tiT), styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
      { content: fmtPct(derived.tiT, derived.tc), styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } }
    ]);
    tableBody.push([
      { content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
      { content: `(${fmt(derived.teM)})`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
      { content: `(${fmtPct(derived.teM, derived.mc)})`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
      { content: `(${fmt(derived.teT)})`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } },
      { content: `(${fmtPct(derived.teT, derived.tc)})`, styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }
    ]);
    tableBody.push([
      { content: 'Profit WITH Capital Expenses', styles: { fontStyle: 'bold', fillColor: derived.pwcM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.pwcM), styles: { fontStyle: 'bold', fillColor: derived.pwcM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.pwcM, derived.mc), styles: { fontStyle: 'bold', fillColor: derived.pwcM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.pwcT), styles: { fontStyle: 'bold', fillColor: derived.pwcT >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.pwcT, derived.tc), styles: { fontStyle: 'bold', fillColor: derived.pwcT >= 0 ? [240, 253, 244] : [254, 242, 242] } }
    ]);
    tableBody.push([
      { content: 'Profit WITHOUT Capital Expenses', styles: { fontStyle: 'bold', fillColor: derived.pwoM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.pwoM), styles: { fontStyle: 'bold', fillColor: derived.pwoM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.pwoM, derived.mc), styles: { fontStyle: 'bold', fillColor: derived.pwoM >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmt(derived.pwoT), styles: { fontStyle: 'bold', fillColor: derived.pwoT >= 0 ? [240, 253, 244] : [254, 242, 242] } },
      { content: fmtPct(derived.pwoT, derived.tc), styles: { fontStyle: 'bold', fillColor: derived.pwoT >= 0 ? [240, 253, 244] : [254, 242, 242] } }
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Description', `Selected Period`, 'Cost Ave.', 'To Date', 'Cost Ave.']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [26, 71, 42], fontSize: 9, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    const pdfName = reportType === "daily"
      ? `Daily_COP_Report_${selectedDate.replace(/-/g, '_')}`
      : reportType === "weekly"
      ? `Weekly_COP_Report_${dateRange.startDate.replace(/-/g, '_')}_to_${dateRange.endDate.replace(/-/g, '_')}`
      : `Monthly_COP_Report_${selectedDate.slice(0, 7).replace(/-/g, '_')}`;

    doc.save(`${pdfName}.pdf`);
    setShowExportOptions(false);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ── Standard System Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Daily, Weekly & Monthly COP Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cost of Production statements, field operations, and estate summary metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Toggle Report Type */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setReportType("daily");
                setData(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${reportType === "daily"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
            >
              Daily
            </button>
            <button
              onClick={() => {
                setReportType("weekly");
                setData(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${reportType === "weekly"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
            >
              Weekly
            </button>
            <button
              onClick={() => {
                setReportType("monthly");
                setData(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs transition-all ${reportType === "monthly"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
            >
              Monthly
            </button>
          </div>

          {/* Estate Selector */}
          {estates.length > 1 && (
            <div className="relative flex items-center">
              <Building2 className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
              <select
                value={selectedEstateId}
                onChange={e => setSelectedEstateId(e.target.value)}
                className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm outline-none cursor-pointer appearance-none"
              >
                {estates.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date / Month Picker */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 text-slate-400 pointer-events-none" size={14} />
            {reportType === "monthly" ? (
              <input
                type="month"
                value={selectedDate.slice(0, 7)}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(`${e.target.value}-01`);
                  }
                }}
                className="pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm outline-none cursor-pointer"
              />
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm outline-none cursor-pointer"
              />
            )}
          </div>

          {/* Export Options */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={!data || !derived || status === "loading"}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4 shadow-sm"
            >
              <Download size={14} />
              Export Options
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[100]">
              <DropdownMenuItem
                onClick={exportCSV}
                className="text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportPDF}
                className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
              >
                <FileIcon size={14} /> Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {status === "error" && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">System Error</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{errMsg}</p>
          </div>
        </div>
      )}

      {/* ── System Dashboard Metric Cards ── */}
      {derived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Income', value: `LKR ${f2(derived.tiM)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            { label: 'Total Expenses', value: `LKR ${f2(derived.teM)}`, icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
            { label: `Net Profit (${reportType})`, value: `LKR ${f2(derived.pwcM)}`, icon: Activity, color: derived.pwcM >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400', bg: derived.pwcM >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className={`inline-flex p-2 rounded-lg mb-3 ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-xl font-bold font-mono tracking-tight mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── REPORT CONTENT ── */}
      {data && derived ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden p-6 md:p-8">
          <div id="report" className="max-w-4xl mx-auto">
            {/* Report Header */}
            <div className="text-center mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">{currentEstate}</h2>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{reportTitle}</h3>
              <div className="flex justify-center items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><Clock size={13} /> Code: {data.code}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Calendar size={13} /> Period: {periodLabel}</span>
              </div>
            </div>

            {/* ── SECTION: ESTATE OPERATION ── */}
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-600" /> ESTATE OPERATION
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[38%]">Description</th>
                      <th className="text-right px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selected Period</th>
                      <th className="text-right px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 italic">Cost Ave.</th>
                      <th className="text-right px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">To Date</th>
                      <th className="text-right px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 italic">Cost Ave.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                      <TL bold>Crop (Kg) – {currentEstate}</TL>
                      <TR v={data.crop.monthly} bold /><td />
                      <TR v={data.crop.todate} bold /><td />
                    </tr>
                    <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <TL bold className="text-emerald-700 dark:text-emerald-400">ESTATE LEAF INCOME – {currentEstate}</TL>
                      <TR v={data.leafIncome?.monthly} bold color="text-emerald-700 dark:text-emerald-400" /><AV a={data.leafIncome?.monthly} c={derived.mc} bold className="text-emerald-600 dark:text-emerald-400" />
                      <TR v={data.leafIncome?.todate} bold color="text-emerald-700 dark:text-emerald-400" /><AV a={data.leafIncome?.todate} c={derived.tc} bold className="text-emerald-600 dark:text-emerald-400" />
                    </tr>

                    {derived.allOpExpenses.map((exp: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <TL>{exp.label}</TL>
                        <TR v={exp.monthly} /><AV a={exp.monthly} c={derived.mc} />
                        <TR v={exp.todate} /><AV a={exp.todate} c={derived.tc} />
                      </tr>
                    ))}

                    <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-semibold border-t border-slate-200 dark:border-slate-700">
                      <TL bold className="text-rose-700 dark:text-rose-400 uppercase">Total Expense</TL>
                      <TR v={derived.tfM} bold bracket color="text-rose-700 dark:text-rose-400" />
                      <td className="text-right px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 italic">({f2(av(derived.tfM, derived.mc))})</td>
                      <TR v={derived.tfT} bold bracket color="text-rose-700 dark:text-rose-400" />
                      <td className="text-right px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 italic">({f2(av(derived.tfT, derived.tc))})</td>
                    </tr>
                    <tr className={`border-t border-slate-200 dark:border-slate-700 ${derived.fpM < 0 ? "bg-rose-50/50 dark:bg-rose-950/30" : "bg-emerald-50/50 dark:bg-emerald-950/30"}`}>
                      <TL bold className="uppercase">Tea Field Profit / (Loss)</TL>
                      <TR v={derived.fpM} bold color={pc(derived.fpM)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.fpM)}`}>{f2(av(derived.fpM, derived.mc))}</td>
                      <TR v={derived.fpT} bold color={pc(derived.fpT)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.fpT)}`}>{f2(av(derived.fpT, derived.tc))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION: ESTATE SUNDRY ── */}
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600" /> ESTATE SUNDRY
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {/* Sundry Income Categories */}
                    {data.sundryIncomeList?.map((inc: any, i: number) => (
                      <tr key={`inc-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <TL w="38%">{inc.label}</TL>
                        <TR v={inc.monthly} /><AV a={inc.monthly} c={derived.mc} />
                        <TR v={inc.todate} /><AV a={inc.todate} c={derived.tc} />
                      </tr>
                    ))}
                    {data.sundryIncomeList?.length > 0 && (
                      <tr className="bg-emerald-50/30 dark:bg-emerald-950/20">
                        <TL bold className="uppercase text-xs">Total Sundry Income</TL>
                        <TR v={data.sundryIncome?.monthly} bold /><td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(data.sundryIncome?.monthly, derived.mc))}</td>
                        <TR v={data.sundryIncome?.todate} bold /><td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(data.sundryIncome?.todate, derived.tc))}</td>
                      </tr>
                    )}

                    {/* Sundry Expense Categories */}
                    {derived.remSundryList?.map((exp: any, i: number) => (
                      <tr key={`exp-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <TL w="38%">{exp.label}</TL>
                        <TR v={exp.monthly} /><AV a={exp.monthly} c={derived.mc} />
                        <TR v={exp.todate} /><AV a={exp.todate} c={derived.tc} />
                      </tr>
                    ))}
                    {derived.remSundryList?.length > 0 && (
                      <tr className="bg-rose-50/30 dark:bg-rose-950/20">
                        <TL bold className="uppercase text-xs">Total Sundry Expenses</TL>
                        <TR v={derived.sundryExpM} bold /><td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(derived.sundryExpM, derived.mc))}</td>
                        <TR v={derived.sundryExpT} bold /><td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(derived.sundryExpT, derived.tc))}</td>
                      </tr>
                    )}

                    {(!data.sundryIncomeList?.length && !derived.remSundryList?.length) && (
                      <tr>
                        <TL className="text-slate-400 italic" colSpan={5}>No sundry transactions recorded for this period</TL>
                      </tr>
                    )}
                    <tr className={`border-t border-slate-200 dark:border-slate-700 ${derived.spM < 0 ? "bg-rose-50/50 dark:bg-rose-950/30" : "bg-emerald-50/50 dark:bg-emerald-950/30"}`}>
                      <TL bold className="uppercase">Estate Sundry Profit / (Loss)</TL>
                      <TR v={derived.spM} bold color={pc(derived.spM)} /><td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.spM)}`}>{f2(av(derived.spM, derived.mc))}</td>
                      <TR v={derived.spT} bold color={pc(derived.spT)} /><td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.spT)}`}>{f2(av(derived.spT, derived.tc))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION: CAPITAL EXPENSES ── */}
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" /> CAPITAL EXPENSES
              </h4>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {data.capitalExpenses?.map((exp: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <TL className="italic">{exp.label}</TL>
                        <TR v={exp.monthly} /><AV a={exp.monthly} c={derived.mc} />
                        <TR v={exp.todate} /><AV a={exp.todate} c={derived.tc} />
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 font-semibold">
                      <TL bold className="uppercase">Total Capital Expenses</TL>
                      <TR v={derived.tcpM} bold bracket color="text-slate-900 dark:text-white" />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">({f2(av(derived.tcpM, derived.mc))})</td>
                      <TR v={derived.tcpT} bold bracket color="text-slate-900 dark:text-white" />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">({f2(av(derived.tcpT, derived.tc))})</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION: SUMMARY ── */}
            <div className="border-t-2 border-slate-900 dark:border-slate-700 pt-6">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 font-semibold">
                      <TL bold w="38%" className="tracking-wider">TOTAL INCOME</TL>
                      <TR v={derived.tiM} bold />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(derived.tiM, derived.mc))}</td>
                      <TR v={derived.tiT} bold />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">{f2(av(derived.tiT, derived.tc))}</td>
                    </tr>
                    <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-semibold">
                      <TL bold className="tracking-wider">TOTAL EXPENSES</TL>
                      <TR v={derived.teM} bold bracket />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">({f2(av(derived.teM, derived.mc))})</td>
                      <TR v={derived.teT} bold bracket />
                      <td className="text-right px-3.5 py-2 text-xs font-bold italic">({f2(av(derived.teT, derived.tc))})</td>
                    </tr>
                    <tr className={`border-t-2 border-slate-900 dark:border-slate-700 ${derived.pwcM < 0 ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}`}>
                      <TL bold className="tracking-wider uppercase">Profit WITH Capital Expenses</TL>
                      <TR v={derived.pwcM} bold color={pc(derived.pwcM)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.pwcM)}`}>{f2(av(derived.pwcM, derived.mc))}</td>
                      <TR v={derived.pwcT} bold color={pc(derived.pwcT)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.pwcT)}`}>{f2(av(derived.pwcT, derived.tc))}</td>
                    </tr>
                    <tr className={derived.pwoM < 0 ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}>
                      <TL bold className="tracking-wider uppercase">Profit WITHOUT Capital Expenses</TL>
                      <TR v={derived.pwoM} bold color={pc(derived.pwoM)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.pwoM)}`}>{f2(av(derived.pwoM, derived.mc))}</td>
                      <TR v={derived.pwoT} bold color={pc(derived.pwoT)} />
                      <td className={`text-right px-3.5 py-2 text-xs font-bold italic ${pc(derived.pwoT)}`}>{f2(av(derived.pwoT, derived.tc))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span>Period: {periodLabel}</span>
                <span>•</span>
                <span>Created: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : status === 'error' ? null : (
        <div className="p-16 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Loading COP Registry...</p>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report, #report * { visibility: visible; }
          #report { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0 !important; 
            border: none !important; 
            background: white !important;
            color: black !important;
          }
          .dark #report { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
