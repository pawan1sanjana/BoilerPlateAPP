import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Users,
  Download,
  FileText,
  FileIcon,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Search,
  Banknote,
  Building2,
  AlertCircle,
  Percent,
  BadgeDollarSign,
  Receipt,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { isAdmin } from "@/lib/roleUtils";
import type { AppRole } from "@/store/useModulePermissionsStore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadExcel } from "@/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Sri Lanka statutory rates
const EPF_EMPLOYEE_RATE = 0.08; // 8% — employee contribution
const EPF_EMPLOYER_RATE = 0.03; // 3% — employer contribution
const ETF_RATE          = 0.03; // 3% — employer ETF contribution

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerEpfRecord {
  worker_id: string;
  worker_name: string;
  worker_epf: string;
  photo: string | null;
  estate_id: string | null;
  days_worked: number;
  gross_pay: number;
  epf_employee: number; // 8%
  epf_employer: number; // 3%
  etf_employer: number; // 3%
  total_epf: number;    // 8% + 3%
  total_statutory: number; // 8% + 3% + 3%
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EpfEtfReportPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<WorkerEpfRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Estate filter
  const [estateFilter, setEstateFilter] = useState("all");
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  // Load estates
  useEffect(() => {
    supabase.from("estates").select("id, name").eq("status", "active").then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const currentEstateName = useMemo(() => {
    if (estateFilter !== "all") {
      const found = estates.find((e) => e.id === estateFilter);
      if (found) return found.name;
    }
    if (profile?.estate_id) {
      const found = estates.find((e) => e.id === profile.estate_id);
      if (found) return found.name;
    }
    return "All Estates";
  }, [estateFilter, estates, profile]);

  // ─── Data Fetch ─────────────────────────────────────────────────────────────

  const fetchEpfEtfData = useCallback(async () => {
    setLoading(true);
    try {
      const startOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-01`;
      const lastDayNum = new Date(selectedDate.year, selectedDate.month, 0).getDate();
      const endOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-${pad(lastDayNum)}`;

      const effectiveEstId = !isUserAdmin
        ? profile?.estate_id
        : estateFilter !== "all"
        ? estateFilter
        : null;

      // Query payroll_batches + entries
      let batchQuery = supabase
        .from("payroll_batches")
        .select("id, batch_date, task_type, estate_id, status, payroll_entries(*)")
        .gte("batch_date", startOfMonth)
        .lte("batch_date", endOfMonth);

      if (effectiveEstId) {
        batchQuery = batchQuery.eq("estate_id", effectiveEstId);
      }

      const { data: batches } = await batchQuery;

      // Workforce metadata for photos
      const { data: wfData } = await supabase
        .from("workforce")
        .select("id, worker_id, first_name, last_name, photo, estate_id");

      const wfMap = new Map<string, any>();
      if (wfData) {
        wfData.forEach((w: any) => {
          if (w.id) wfMap.set(w.id, w);
          if (w.worker_id) wfMap.set(w.worker_id, w);
        });
      }

      if (!batches || !batches.some((b: any) => Array.isArray(b.payroll_entries) && b.payroll_entries.length > 0)) {
        setReportData([]);
        return;
      }

      // Aggregate per worker
      const workerAggMap = new Map<string, any>();

      batches.forEach((b: any) => {
        const bDate = b.batch_date;
        (b.payroll_entries || []).forEach((e: any) => {
          const wKey = e.worker_epf || e.worker_id || e.worker_name;
          const wf = wfMap.get(e.worker_id) || wfMap.get(e.worker_epf) || {};

          if (!workerAggMap.has(wKey)) {
            workerAggMap.set(wKey, {
              worker_id: e.worker_id || wKey,
              worker_name:
                e.worker_name ||
                `${wf.first_name || ""} ${wf.last_name || ""}`.trim() ||
                "Worker",
              worker_epf: e.worker_epf || wf.worker_id || "N/A",
              photo: wf.photo
                ? wf.photo.startsWith("data:")
                  ? wf.photo
                  : `/api/uploads/${wf.photo}`
                : null,
              estate_id: b.estate_id || wf.estate_id,
              datesSet: new Set<string>(),
              gross_pay: 0,
            });
          }

          const wRec = workerAggMap.get(wKey);
          if (bDate) wRec.datesSet.add(bDate);
          wRec.gross_pay += parseFloat(e.wage) || 0;
        });
      });

      const result: WorkerEpfRecord[] = Array.from(workerAggMap.values()).map((w: any) => {
        const gross = w.gross_pay;
        const epf_employee = Math.round(gross * EPF_EMPLOYEE_RATE);
        const epf_employer = Math.round(gross * EPF_EMPLOYER_RATE);
        const etf_employer = Math.round(gross * ETF_RATE);
        return {
          worker_id: w.worker_id,
          worker_name: w.worker_name,
          worker_epf: w.worker_epf,
          photo: w.photo,
          estate_id: w.estate_id,
          days_worked: w.datesSet.size,
          gross_pay: gross,
          epf_employee,
          epf_employer,
          etf_employer,
          total_epf: epf_employee + epf_employer,
          total_statutory: epf_employee + epf_employer + etf_employer,
        };
      });

      setReportData(result);
    } catch (error) {
      console.error("Failed to fetch EPF/ETF data:", error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isUserAdmin, profile?.estate_id, estateFilter]);

  useEffect(() => {
    fetchEpfEtfData();
  }, [fetchEpfEtfData]);

  // ─── Month Nav ───────────────────────────────────────────────────────────────

  const changeMonth = (delta: number) => {
    setSelectedDate((prev) => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      else if (newMonth < 1) { newMonth = 12; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  // ─── Filtered Data ───────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    let list = reportData;
    if (estateFilter !== "all") {
      list = list.filter((p) => !p.estate_id || String(p.estate_id) === String(estateFilter));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          (p.worker_name && p.worker_name.toLowerCase().includes(q)) ||
          (p.worker_epf && String(p.worker_epf).toLowerCase().includes(q))
      );
    }
    return list;
  }, [reportData, searchTerm, estateFilter]);

  // ─── Totals ──────────────────────────────────────────────────────────────────

  const totals = useMemo(() => ({
    workers:      filteredData.length,
    gross:        filteredData.reduce((a, p) => a + p.gross_pay, 0),
    epfEmployee:  filteredData.reduce((a, p) => a + p.epf_employee, 0),
    epfEmployer:  filteredData.reduce((a, p) => a + p.epf_employer, 0),
    etf:          filteredData.reduce((a, p) => a + p.etf_employer, 0),
    totalEpf:     filteredData.reduce((a, p) => a + p.total_epf, 0),
    totalStatutory: filteredData.reduce((a, p) => a + p.total_statutory, 0),
  }), [filteredData]);

  // ─── Exports ─────────────────────────────────────────────────────────────────

  const monthLabel = `${MONTH_NAMES[selectedDate.month - 1]} ${selectedDate.year}`;

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "Worker Name", "EPF No.", "Days Worked", "Gross Pay (Rs)",
      "EPF 8% Employee (Rs)", "EPF 3% Employer (Rs)", "Total EPF (Rs)",
      "ETF 3% Employer (Rs)", "Total Statutory (Rs)",
    ];
    const rows = filteredData.map((p) => [
      p.worker_name,
      p.worker_epf || "N/A",
      p.days_worked,
      p.gross_pay,
      p.epf_employee,
      p.epf_employer,
      p.total_epf,
      p.etf_employer,
      p.total_statutory,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `EPF_ETF_Report_${monthLabel.replace(/\s+/g, "_")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "Worker Name", "EPF No.", "Days Worked", "Gross Pay (Rs)",
      "EPF 8% Employee (Rs)", "EPF 3% Employer (Rs)", "Total EPF (Rs)",
      "ETF 3% Employer (Rs)", "Total Statutory (Rs)",
    ];
    const rows = filteredData.map((p) => [
      p.worker_name,
      p.worker_epf || "N/A",
      p.days_worked,
      p.gross_pay,
      p.epf_employee,
      p.epf_employer,
      p.total_epf,
      p.etf_employer,
      p.total_statutory,
    ]);
    downloadExcel(
      headers,
      rows,
      { title: `EPF / ETF Statutory Report — ${monthLabel}`, recordCount: filteredData.length },
      `EPF_ETF_Report_${monthLabel.replace(/\s+/g, "_")}.xlsx`
    );
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) return;

    const doc = new jsPDF("l", "pt", "a4");
    const displayEstate = currentEstateName !== "All Estates" ? currentEstateName : "ALL ESTATES";

    // Top accent bar
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 841.89, 12, "F");

    // Title
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${displayEstate.toUpperCase()} — EPF / ETF STATUTORY REPORT`, 40, 44);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136);
    doc.text(
      `PERIOD: ${monthLabel.toUpperCase()} · TOTAL WORKFORCE: ${filteredData.length} WORKERS`,
      40, 59
    );

    // Summary bar
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, 68, 761, 36, 6, 6, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`Gross Payroll: Rs ${totals.gross.toLocaleString()}`, 55, 88);
    doc.text(`Total EPF (11%): Rs ${totals.totalEpf.toLocaleString()}`, 230, 88);
    doc.text(`Total ETF (3%): Rs ${totals.etf.toLocaleString()}`, 430, 88);
    doc.setTextColor(13, 148, 136);
    doc.text(`Total Statutory Liability: Rs ${totals.totalStatutory.toLocaleString()}`, 580, 88);

    // Table
    const tableHeaders = [[
      "#", "Worker Name", "EPF No.", "Days",
      "Gross Pay", "EPF 8% (Emp)", "EPF 3% (Er)", "Total EPF (11%)",
      "ETF 3% (Er)", "Total Statutory",
    ]];

    const tableRows = filteredData.map((w, idx) => [
      idx + 1,
      w.worker_name,
      w.worker_epf || "N/A",
      w.days_worked,
      `Rs ${w.gross_pay.toLocaleString()}`,
      `Rs ${w.epf_employee.toLocaleString()}`,
      `Rs ${w.epf_employer.toLocaleString()}`,
      `Rs ${w.total_epf.toLocaleString()}`,
      `Rs ${w.etf_employer.toLocaleString()}`,
      `Rs ${w.total_statutory.toLocaleString()}`,
    ]);

    // Totals row
    tableRows.push([
      { content: "TOTALS", styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `${filteredData.length} Workers`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: "", styles: { fillColor: [241, 245, 249] as [number, number, number] } },
      { content: "", styles: { fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.gross.toLocaleString()}`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.epfEmployee.toLocaleString()}`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.epfEmployer.toLocaleString()}`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.totalEpf.toLocaleString()}`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.etf.toLocaleString()}`, styles: { fontStyle: "bold" as const, fillColor: [241, 245, 249] as [number, number, number] } },
      { content: `Rs ${totals.totalStatutory.toLocaleString()}`, styles: { fontStyle: "bold" as const, textColor: [13, 148, 136] as [number, number, number], fillColor: [240, 253, 244] as [number, number, number] } },
    ] as any[]);

    autoTable(doc, {
      startY: 114,
      theme: "grid",
      head: tableHeaders,
      body: tableRows,
      styles: {
        fontSize: 8,
        cellPadding: 5,
        lineColor: [226, 232, 240],
      lineWidth: 0.5,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0:  { cellWidth: 24, halign: "center" },
        1:  { cellWidth: 120 },
        2:  { cellWidth: 65 },
        3:  { cellWidth: 36, halign: "center" },
        4:  { halign: "right", fontStyle: "bold" },
        5:  { halign: "right" },
        6:  { halign: "right" },
        7:  { halign: "right", fontStyle: "bold" },
        8:  { halign: "right" },
        9:  { halign: "right", fontStyle: "bold", textColor: [13, 148, 136] },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Statutory Document · ${displayEstate} ERP · Generated on ${new Date().toLocaleDateString("sv-SE")}`,
      40,
      finalY
    );

    doc.save(`EPF_ETF_Report_${monthLabel.replace(/\s+/g, "_")}.pdf`);
  };

  const handleExport = (type: "pdf" | "excel" | "csv") => {
    if (type === "pdf") exportToPDF();
    else if (type === "csv") exportToCSV();
    else exportToExcel();
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="pb-16 space-y-5">

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-teal-50 dark:bg-teal-900/30 rounded-xl">
          <ShieldCheck size={20} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">EPF / ETF Statutory Report</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monthly breakdown of EPF (8% + 3%) & ETF (3%) contributions per worker
          </p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Col 1: Workers + Gross (stacked) ── */}
        <div className="flex flex-col gap-4">

          {/* Workers Card */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
              <Users size={22} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Workers</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight">
                {loading ? <span className="text-slate-300 dark:text-slate-700 animate-pulse">—</span> : totals.workers}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Employees on record this month</p>
            </div>
          </div>

          {/* Gross Payroll Card */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gross Payroll</p>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Earnings Base
              </span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {loading ? <span className="text-slate-300 dark:text-slate-700 animate-pulse">—</span> : `Rs ${totals.gross.toLocaleString()}`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Banknote size={13} className="text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-400">Total wages before statutory deductions</p>
            </div>
          </div>
        </div>

        {/* ── Col 2: EPF Breakdown ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <Percent size={15} className="text-rose-600 dark:text-rose-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">EPF Contributions</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Employees' Provident Fund
            </span>
          </div>

          {/* EPF Employee 8% */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Employee Contribution</span>
              </div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">8% of Gross</span>
            </div>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums pl-4">
              {loading ? "—" : `Rs ${totals.epfEmployee.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-slate-400 pl-4">Deducted directly from worker wages</p>
          </div>

          <div className="border-t border-dashed border-slate-100 dark:border-slate-800" />

          {/* EPF Employer 3% */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Employer Contribution</span>
              </div>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">3% of Gross</span>
            </div>
            <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums pl-4">
              {loading ? "—" : `Rs ${totals.epfEmployer.toLocaleString()}`}
            </p>
            <p className="text-[10px] text-slate-400 pl-4">Paid by the company on top of wages</p>
          </div>

          <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total EPF (11%)</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
              {loading ? "—" : `Rs ${totals.totalEpf.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* ── Col 3: ETF + Hero Total Statutory ── */}
        <div className="flex flex-col gap-4">

          {/* ETF Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <BadgeDollarSign size={15} className="text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">ETF Contribution</p>
              </div>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                3% Employer
              </span>
            </div>
            <p className="text-2xl font-extrabold text-violet-700 dark:text-violet-400 tabular-nums">
              {loading ? "—" : `Rs ${totals.etf.toLocaleString()}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">Employees' Trust Fund — fully employer-funded</p>
          </div>

          {/* Hero Total Statutory Card */}
          <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-5 shadow-lg text-white">
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Receipt size={15} className="text-white" />
                  </div>
                  <p className="text-xs font-bold text-teal-100 uppercase tracking-wider">Total Statutory</p>
                </div>
                <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-1 rounded-full">
                  14% of Gross
                </span>
              </div>

              <p className="text-3xl font-extrabold tabular-nums leading-tight">
                {loading
                  ? <span className="opacity-40">—</span>
                  : `Rs ${totals.totalStatutory.toLocaleString()}`
                }
              </p>
              <p className="text-teal-100 text-[11px] mt-1">Total company statutory obligation</p>

              {/* Breakdown Pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="bg-white/15 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[9px] text-teal-200 font-semibold uppercase tracking-wider">EPF 8%</p>
                  <p className="text-xs font-bold tabular-nums">{loading ? "—" : `Rs ${totals.epfEmployee.toLocaleString()}`}</p>
                </div>
                <div className="bg-white/15 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[9px] text-teal-200 font-semibold uppercase tracking-wider">EPF 3%</p>
                  <p className="text-xs font-bold tabular-nums">{loading ? "—" : `Rs ${totals.epfEmployer.toLocaleString()}`}</p>
                </div>
                <div className="bg-white/15 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[9px] text-teal-200 font-semibold uppercase tracking-wider">ETF 3%</p>
                  <p className="text-xs font-bold tabular-nums">{loading ? "—" : `Rs ${totals.etf.toLocaleString()}`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* ── End Summary Cards ── */}

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

          {/* Estate Selector — admin only */}
          {isUserAdmin && (
            <select
              value={estateFilter}
              onChange={(e) => setEstateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-teal-500 min-w-[140px]"
            >
              <option value="all">All Estates</option>
              {estates.map((est) => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or EPF no."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-teal-500 placeholder:text-slate-400"
            />
          </div>

          {/* Month Picker */}
          <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <button
              onClick={() => changeMonth(-1)}
              className="text-slate-400 hover:text-teal-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[110px] text-center">
              {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="text-slate-400 hover:text-teal-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={loading || filteredData.length === 0}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4 shadow-sm"
          >
            <Download size={14} />
            Export
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[100]">
            <DropdownMenuItem
              onClick={() => handleExport("csv")}
              className="text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <FileText size={14} /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("pdf")}
              className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
            >
              <FileIcon size={14} /> Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("excel")}
              className="text-xs font-bold flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-700"
            >
              <FileSpreadsheet size={14} /> Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              EPF / ETF Contributions · {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{filteredData.length} Records</span>
        </div>

        {/* Rate Legend badges */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          {[
            { label: "EPF 8% — Employee deduction", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
            { label: "EPF 3% — Employer contribution", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
            { label: "ETF 3% — Employer contribution", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
            { label: "Total Statutory 14% of gross", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
          ].map((b) => (
            <span key={b.label} className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${b.color}`}>
              {b.label}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Worker</th>
                <th className="px-5 py-3 text-left">EPF No.</th>
                <th className="px-5 py-3 text-center">Days</th>
                <th className="px-5 py-3 text-right">Gross Pay</th>
                <th className="px-5 py-3 text-right text-rose-500">EPF 8% (Emp)</th>
                <th className="px-5 py-3 text-right text-orange-500">EPF 3% (Er)</th>
                <th className="px-5 py-3 text-right">Total EPF (11%)</th>
                <th className="px-5 py-3 text-right text-violet-500">ETF 3% (Er)</th>
                <th className="px-5 py-3 text-right text-teal-600 dark:text-teal-400">Total Statutory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Activity size={20} className="animate-spin text-teal-500" />
                      <span>Computing EPF / ETF contributions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                <>
                  {filteredData.map((worker, idx) => (
                    <tr
                      key={worker.worker_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* # */}
                      <td className="px-5 py-3.5 text-slate-400 font-medium w-10">{idx + 1}</td>

                      {/* Worker */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 shrink-0">
                            {worker.photo ? (
                              <img src={worker.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              worker.worker_name
                                ? worker.worker_name.substring(0, 2).toUpperCase()
                                : "W"
                            )}
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{worker.worker_name}</p>
                        </div>
                      </td>

                      {/* EPF No. */}
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {worker.worker_epf || "N/A"}
                      </td>

                      {/* Days */}
                      <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                        {worker.days_worked}
                      </td>

                      {/* Gross Pay */}
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        Rs {worker.gross_pay.toLocaleString()}
                      </td>

                      {/* EPF 8% Employee */}
                      <td className="px-5 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        Rs {worker.epf_employee.toLocaleString()}
                      </td>

                      {/* EPF 3% Employer */}
                      <td className="px-5 py-3.5 text-right font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        Rs {worker.epf_employer.toLocaleString()}
                      </td>

                      {/* Total EPF (11%) */}
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        Rs {worker.total_epf.toLocaleString()}
                      </td>

                      {/* ETF 3% Employer */}
                      <td className="px-5 py-3.5 text-right font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                        Rs {worker.etf_employer.toLocaleString()}
                      </td>

                      {/* Total Statutory */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 rounded-lg">
                          Rs {worker.total_statutory.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-xs">
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                      TOTALS — {filteredData.length} Workers
                    </td>
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4 text-right text-slate-900 dark:text-white">
                      Rs {totals.gross.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-rose-600 dark:text-rose-400">
                      Rs {totals.epfEmployee.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-orange-600 dark:text-orange-400">
                      Rs {totals.epfEmployer.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-800 dark:text-slate-200">
                      Rs {totals.totalEpf.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right text-violet-600 dark:text-violet-400">
                      Rs {totals.etf.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/40 px-3 py-1 rounded-lg text-sm">
                        Rs {totals.totalStatutory.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-14 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={28} className="text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">
                        No payroll records found for {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}.
                      </p>
                      <p className="text-slate-400">
                        Try changing the month or estate filter.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Summary */}
      {!loading && filteredData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* EPF Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                <Percent size={14} className="text-rose-600 dark:text-rose-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">EPF Summary</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee (8%)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">Rs {totals.epfEmployee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employer (3%)</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">Rs {totals.epfEmployer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total EPF (11%)</span>
                <span className="font-bold text-slate-900 dark:text-white">Rs {totals.totalEpf.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ETF Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <BadgeDollarSign size={14} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">ETF Summary</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Employer (3%)</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">Rs {totals.etf.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Base</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Rs {totals.gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total ETF (3%)</span>
                <span className="font-bold text-slate-900 dark:text-white">Rs {totals.etf.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Total Statutory Liability */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/40 rounded-lg">
                <Building2 size={14} className="text-teal-700 dark:text-teal-400" />
              </div>
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Total Statutory Liability</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-teal-700 dark:text-teal-400">Total EPF (11%)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Rs {totals.totalEpf.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-700 dark:text-teal-400">Total ETF (3%)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Rs {totals.etf.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-teal-200 dark:border-teal-800">
                <span className="font-bold text-teal-800 dark:text-teal-300">Grand Total (14%)</span>
                <span className="text-lg font-bold text-teal-700 dark:text-teal-400">Rs {totals.totalStatutory.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
