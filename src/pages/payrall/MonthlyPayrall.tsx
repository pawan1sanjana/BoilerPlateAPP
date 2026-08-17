import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Banknote,
  Users,
  Download,
  FileText,
  FileIcon,
  FileSpreadsheet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Printer,
  Search,
  TrendingUp,
  ReceiptText,
  Weight,
  X,
  Building2,
  AlertCircle
} from "lucide-react";
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadExcel } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyPayrall() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [showPayslip, setShowPayslip] = useState(false);

  // Estate Filter state
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  // Load estates & profile defaults
  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const currentEstateName = useMemo(() => {
    if (estateFilter !== 'all') {
      const found = estates.find(e => e.id === estateFilter);
      if (found) return found.name;
    }
    if (profile?.estate_id) {
      const found = estates.find(e => e.id === profile.estate_id);
      if (found) return found.name;
    }
    return "All Estates";
  }, [estateFilter, estates, profile]);

  const fetchMonthlyPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const startOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-01`;
      const lastDayNum = new Date(selectedDate.year, selectedDate.month, 0).getDate();
      const endOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-${pad(lastDayNum)}`;

      // Query Supabase for payroll_batches + payroll_entries in this month
      let batchQuery = supabase
        .from('payroll_batches')
        .select('id, batch_date, task_type, estate_id, status, payroll_entries(*)')
        .gte('batch_date', startOfMonth)
        .lte('batch_date', endOfMonth);

      const effectiveEstId = !isUserAdmin ? profile?.estate_id : (estateFilter !== 'all' ? estateFilter : null);
      if (effectiveEstId) {
        batchQuery = batchQuery.eq('estate_id', effectiveEstId);
      }

      const { data: batches } = await batchQuery;

      // Query workforce table for photos and accurate worker metadata
      const { data: wfData } = await supabase
        .from('workforce')
        .select('id, worker_id, first_name, last_name, photo, estate_id');

      const wfMap = new Map<string, any>();
      if (wfData) {
        wfData.forEach((w: any) => {
          if (w.id) wfMap.set(w.id, w);
          if (w.worker_id) wfMap.set(w.worker_id, w);
        });
      }

      // Query cash_advances for this month and estate
      let advancesQuery = supabase
        .from('cash_advances')
        .select('*')
        .gte('advance_date', startOfMonth)
        .lte('advance_date', endOfMonth);

      if (effectiveEstId) {
        advancesQuery = advancesQuery.eq('estate_id', effectiveEstId);
      }

      const { data: advancesData } = await advancesQuery;
      const advancesMap = new Map<string, number>();
      if (advancesData) {
        advancesData.forEach((adv: any) => {
          const amt = parseFloat(adv.amount) || 0;
          if (adv.worker_id) advancesMap.set(adv.worker_id, (advancesMap.get(adv.worker_id) || 0) + amt);
          if (adv.worker_epf) advancesMap.set(adv.worker_epf, (advancesMap.get(adv.worker_epf) || 0) + amt);
          if (adv.worker_name) advancesMap.set(adv.worker_name.toLowerCase().trim(), (advancesMap.get(adv.worker_name.toLowerCase().trim()) || 0) + amt);
        });
      }

      // Query tea_packet_issues for this month and estate
      let teaIssuesQuery = supabase
        .from('tea_packet_issues')
        .select('*')
        .gte('issue_date', startOfMonth)
        .lte('issue_date', endOfMonth);

      if (effectiveEstId) {
        teaIssuesQuery = teaIssuesQuery.eq('estate_id', effectiveEstId);
      }

      const { data: teaIssuesData } = await teaIssuesQuery;
      const teaDedMap = new Map<string, number>();
      if (teaIssuesData) {
        teaIssuesData.forEach((issue: any) => {
          const amt = parseFloat(issue.total_price) || (parseFloat(issue.unit_price) * issue.quantity) || 0;
          if (issue.worker_id) teaDedMap.set(issue.worker_id, (teaDedMap.get(issue.worker_id) || 0) + amt);
          if (issue.worker_epf) teaDedMap.set(issue.worker_epf, (teaDedMap.get(issue.worker_epf) || 0) + amt);
          if (issue.worker_name) teaDedMap.set(issue.worker_name.toLowerCase().trim(), (teaDedMap.get(issue.worker_name.toLowerCase().trim()) || 0) + amt);
        });
      }

      const hasSupabaseEntries = batches && batches.some((b: any) => Array.isArray(b.payroll_entries) && b.payroll_entries.length > 0);

      if (hasSupabaseEntries) {
        const workerAggMap = new Map<string, any>();

        batches.forEach((b: any) => {
          const bDate = b.batch_date;
          (b.payroll_entries || []).forEach((e: any) => {
            const wKey = e.worker_epf || e.worker_id || e.worker_name;
            const wf = wfMap.get(e.worker_id) || wfMap.get(e.worker_epf) || {};

            if (!workerAggMap.has(wKey)) {
              workerAggMap.set(wKey, {
                worker_id: e.worker_id || wKey,
                worker_name: e.worker_name || `${wf.first_name || ''} ${wf.last_name || ''}`.trim() || 'Worker',
                worker_epf: e.worker_epf || wf.worker_id || 'N/A',
                photo: wf.photo ? (wf.photo.startsWith('data:') ? wf.photo : `/api/uploads/${wf.photo}`) : null,
                estate_id: b.estate_id || wf.estate_id,
                datesSet: new Set<string>(),
                total_kg: 0,
                plucking_pay: 0,
                pruning_pay: 0,
                weeding_pay: 0,
                manure_pay: 0,
                lopping_pay: 0,
                foliar_pay: 0,
                other_pay: 0,
                gross_pay: 0
              });
            }

            const wRec = workerAggMap.get(wKey);
            if (bDate) wRec.datesSet.add(bDate);

            const perfVal = parseFloat(e.performance_value) || 0;
            const wageVal = parseFloat(e.wage) || 0;
            const task = (e.task || b.task_type || '').toLowerCase();

            if (task.includes('pluck')) {
              wRec.total_kg += perfVal;
              wRec.plucking_pay += wageVal;
            } else if (task.includes('prun')) {
              wRec.pruning_pay += wageVal;
            } else if (task.includes('weed')) {
              wRec.weeding_pay += wageVal;
            } else if (task.includes('manure')) {
              wRec.manure_pay += wageVal;
            } else if (task.includes('lop')) {
              wRec.lopping_pay += wageVal;
            } else if (task.includes('foliar')) {
              wRec.foliar_pay += wageVal;
            } else {
              wRec.other_pay += wageVal;
            }

            wRec.gross_pay += wageVal;
          });
        });

        const aggregatedList = Array.from(workerAggMap.values()).map((w: any) => {
          const gross = w.gross_pay;
          const epf8 = Math.round(gross * 0.08);
          const epf3 = Math.round(gross * 0.03);
          const nameKey = (w.worker_name || '').toLowerCase().trim();
          const teaDed = (w.worker_id && teaDedMap.has(w.worker_id))
            ? teaDedMap.get(w.worker_id)
            : ((w.worker_epf && teaDedMap.has(w.worker_epf))
              ? teaDedMap.get(w.worker_epf)
              : (teaDedMap.get(nameKey) || 0));

          const advanceDed = (w.worker_id && advancesMap.has(w.worker_id))
            ? advancesMap.get(w.worker_id)
            : ((w.worker_epf && advancesMap.has(w.worker_epf))
              ? advancesMap.get(w.worker_epf)
              : (advancesMap.get(nameKey) || 0));

          const net = Math.max(0, gross - (teaDed || 0) - (advanceDed || 0) - epf8);

          return {
            worker_id: w.worker_id,
            worker_name: w.worker_name,
            worker_epf: w.worker_epf,
            photo: w.photo,
            estate_id: w.estate_id,
            days_worked: w.datesSet.size,
            total_kg: w.total_kg,
            plucking_pay: w.plucking_pay,
            pruning_pay: w.pruning_pay,
            weeding_pay: w.weeding_pay,
            manure_pay: w.manure_pay,
            lopping_pay: w.lopping_pay,
            foliar_pay: w.foliar_pay,
            other_pay: w.other_pay,
            gross_pay: gross,
            tea_deduction: teaDed || 0,
            advance_deduction: advanceDed || 0,
            epf_8_deduction: epf8,
            epf_3_deduction: epf3,
            epf_deduction: epf8 + epf3,
            net_pay: net
          };
        });

        setPayrollData(aggregatedList);
      } else {
        // Fallback to API mock data
        const res = await apiClient.get(`/payrall/monthly?year=${selectedDate.year}&month=${selectedDate.month}`);
        if (res.success && Array.isArray(res.data)) {
          const apiList = res.data.map((p: any) => {
            const wf = wfMap.get(p.worker_id) || wfMap.get(p.worker_epf) || {};
            const gross = p.gross_pay || 0;
            const epf8 = p.epf_8_deduction || Math.round(gross * 0.08);
            const epf3 = p.epf_3_deduction || Math.round(gross * 0.03);
            const nameKey = (p.worker_name || '').toLowerCase().trim();
            const teaDed = (p.worker_id && teaDedMap.has(p.worker_id))
              ? teaDedMap.get(p.worker_id)
              : ((p.worker_epf && teaDedMap.has(p.worker_epf))
                ? teaDedMap.get(p.worker_epf)
                : (teaDedMap.get(nameKey) || p.tea_deduction || 0));

            const advanceDed = (p.worker_id && advancesMap.has(p.worker_id))
              ? advancesMap.get(p.worker_id)
              : ((p.worker_epf && advancesMap.has(p.worker_epf))
                ? advancesMap.get(p.worker_epf)
                : (advancesMap.get(nameKey) || p.advance_deduction || 0));

            const net = Math.max(0, gross - (teaDed || 0) - (advanceDed || 0) - epf8);

            return {
              ...p,
              photo: wf.photo ? (wf.photo.startsWith('data:') ? wf.photo : `/api/uploads/${wf.photo}`) : null,
              estate_id: p.estate_id || wf.estate_id,
              tea_deduction: teaDed || 0,
              advance_deduction: advanceDed || 0,
              net_pay: net,
              epf_deduction: epf8 + epf3
            };
          });
          setPayrollData(apiList);
        } else {
          setPayrollData([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch monthly payroll:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isUserAdmin, profile?.estate_id, estateFilter]);

  useEffect(() => {
    fetchMonthlyPayroll();
  }, [fetchMonthlyPayroll]);

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
      return { year: newYear, month: newMonth };
    });
  };

  const filteredData = useMemo(() => {
    let list = payrollData;
    if (estateFilter !== 'all') {
      list = list.filter(p => !p.estate_id || String(p.estate_id) === String(estateFilter));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.worker_name && p.worker_name.toLowerCase().includes(q)) ||
        (p.worker_epf && String(p.worker_epf).toLowerCase().includes(q))
      );
    }
    return list;
  }, [payrollData, searchTerm, estateFilter]);

  const totalGross = useMemo(() => filteredData.reduce((acc, p) => acc + (p.gross_pay || 0), 0), [filteredData]);
  const totalEPF = useMemo(() => filteredData.reduce((acc, p) => acc + (p.epf_deduction || 0), 0), [filteredData]);
  const totalNet = useMemo(() => filteredData.reduce((acc, p) => acc + (p.net_pay || 0), 0), [filteredData]);

  const handleViewPayslip = (worker: any) => {
    setSelectedWorker(worker);
    setShowPayslip(true);
  };

  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    const headers = ["Worker Name", "EPF/ID", "Days Worked", "Total Harvest (KG)", "Gross Pay (Rs)", "EPF (8%)", "EPF (3%)", "Net Payable (Rs)"];
    const rows = filteredData.map(p => [
      p.worker_name,
      p.worker_epf || "N/A",
      p.days_worked,
      p.total_kg ? p.total_kg.toFixed(2) : '0.00',
      p.gross_pay,
      p.epf_8_deduction,
      p.epf_3_deduction,
      p.net_pay
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Paysheet_${MONTH_NAMES[selectedDate.month - 1]}_${selectedDate.year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = (type: 'pdf' | 'excel' | 'csv') => {
    if (type === 'pdf') {
      exportToPDF();
    } else if (type === 'csv') {
      exportToCSV();
    } else if (type === 'excel') {
      const headers = ["Worker Name", "EPF/ID", "Days Worked", "Plucking Pay", "Pruning Pay", "Weeding Pay", "Other Pay", "Gross Pay (Rs)", "Tea Deduction", "Advance Deduction", "EPF (8%)", "EPF (3%)", "Net Pay (Rs)"];
      const rows = filteredData.map(p => [
        p.worker_name,
        p.worker_epf || "N/A",
        p.days_worked,
        p.plucking_pay || 0,
        p.pruning_pay || 0,
        p.weeding_pay || 0,
        ((p.manure_pay || 0) + (p.lopping_pay || 0) + (p.foliar_pay || 0) + (p.other_pay || 0)),
        p.gross_pay || 0,
        p.tea_deduction || 0,
        p.advance_deduction || 0,
        p.epf_8_deduction || 0,
        p.epf_3_deduction || 0,
        p.net_pay || 0
      ]);
      const monthLabel = `${MONTH_NAMES[selectedDate.month - 1]} ${selectedDate.year}`;
      downloadExcel(headers, rows, { title: `Monthly Payroll Registry — ${monthLabel}`, recordCount: filteredData.length }, `Monthly_Payroll_Registry_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
    }
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) return;

    const doc = new jsPDF('l', 'pt', 'a4');
    const displayEstate = currentEstateName !== 'All Estates' ? currentEstateName : 'ALL ESTATES';
    const monthLabel = `${MONTH_NAMES[selectedDate.month - 1]} ${selectedDate.year}`;

    // Top Accent Bar (Tea Green Theme)
    doc.setFillColor(13, 148, 136); // tea-600
    doc.rect(0, 0, 841.89, 12, 'F');

    // Title & Subtitle Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${displayEstate.toUpperCase()} — MONTHLY PAYROLL REGISTRY`, 40, 45);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136); // tea-600
    doc.text(`PERIOD: ${monthLabel.toUpperCase()} · TOTAL WORKFORCE: ${filteredData.length} WORKERS`, 40, 60);

    // Summary Statistics Header Bar
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(40, 70, 761, 35, 6, 6, 'FD');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`Gross Payroll: Rs ${totalGross.toLocaleString()}`, 55, 91);
    doc.text(`Statutory EPF (11%): Rs ${totalEPF.toLocaleString()}`, 300, 91);
    doc.setTextColor(13, 148, 136);
    doc.text(`Net Disbursements: Rs ${totalNet.toLocaleString()}`, 580, 91);

    // Table Data
    const tableHeaders = [
      ["#", "Worker Name", "EPF / ID", "Days", "Plucking", "Pruning", "Weeding", "Other", "Gross Pay", "Tea Ded.", "Advances", "EPF 8%", "EPF 3%", "Net Pay"]
    ];

    const tableRows = filteredData.map((w, idx) => [
      idx + 1,
      w.worker_name,
      w.worker_epf || 'N/A',
      w.days_worked,
      w.plucking_pay > 0 ? `Rs ${w.plucking_pay.toLocaleString()}` : '-',
      w.pruning_pay > 0 ? `Rs ${w.pruning_pay.toLocaleString()}` : '-',
      w.weeding_pay > 0 ? `Rs ${w.weeding_pay.toLocaleString()}` : '-',
      ((w.manure_pay || 0) + (w.lopping_pay || 0) + (w.foliar_pay || 0) + (w.other_pay || 0)) > 0
        ? `Rs ${((w.manure_pay || 0) + (w.lopping_pay || 0) + (w.foliar_pay || 0) + (w.other_pay || 0)).toLocaleString()}`
        : '-',
      `Rs ${w.gross_pay.toLocaleString()}`,
      w.tea_deduction > 0 ? `-Rs ${w.tea_deduction.toLocaleString()}` : '-',
      w.advance_deduction > 0 ? `-Rs ${w.advance_deduction.toLocaleString()}` : '-',
      w.epf_8_deduction > 0 ? `-Rs ${w.epf_8_deduction.toLocaleString()}` : '-',
      w.epf_3_deduction > 0 ? `-Rs ${w.epf_3_deduction.toLocaleString()}` : '-',
      `Rs ${w.net_pay.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 115,
      theme: 'grid',
      head: tableHeaders,
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [15, 23, 42] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 110 },
        2: { cellWidth: 55 },
        3: { cellWidth: 32, halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold' },
        9: { halign: 'right' },
        10: { halign: 'right' },
        11: { halign: 'right' },
        12: { halign: 'right' },
        13: { halign: 'right', fontStyle: 'bold', textColor: [13, 148, 136] }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Document · ${displayEstate} ERP · Generated on ${new Date().toLocaleDateString('sv-SE')}`, 40, finalY);

    doc.save(`Monthly_Payroll_Registry_${monthLabel.replace(/\s+/g, '_')}.pdf`);
  };

  // Payslip Modal Component
  const PayslipModal = ({ worker, onClose }: { worker: any; onClose: () => void }) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadPayslip = () => {
      try {
        setIsDownloading(true);
        const doc = new jsPDF('p', 'pt', 'a4');
        const displayEstate = currentEstateName !== 'All Estates' ? currentEstateName : (worker.estate_name || 'ESTATE');
        const monthLabel = `${MONTH_NAMES[selectedDate.month - 1]} ${selectedDate.year}`;

        // Top Accent Bar (Tea Green Theme Color)
        doc.setFillColor(13, 148, 136); // tea-600
        doc.rect(0, 0, 595.28, 12, 'F');

        // Brand Header
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(displayEstate.toUpperCase(), 40, 48);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136); // tea-600
        doc.text(`EMPLOYEE MONTHLY PAYSLIP · ${monthLabel.toUpperCase()}`, 40, 65);

        // Divider Line
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(1);
        doc.line(40, 75, 555, 75);

        // Worker Summary Box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.roundedRect(40, 85, 515, 60, 6, 6, 'FD');

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("EMPLOYEE NAME", 55, 105);
        doc.text("EPF / ID", 240, 105);
        doc.text("DAYS WORKED", 360, 105);
        doc.text("TOTAL HARVEST", 460, 105);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(worker.worker_name.toUpperCase(), 55, 124);
        doc.text(worker.worker_epf || "N/A", 240, 124);
        doc.text(`${worker.days_worked} Days`, 360, 124);
        doc.text(`${(Number(worker.total_kg) || 0).toFixed(1)} kg`, 460, 124);

        // Earnings & Deductions Table
        const tableBody: any[] = [];

        if (worker.plucking_pay > 0) tableBody.push(['Plucking Output Earnings', 'Earnings', `Rs ${worker.plucking_pay.toLocaleString()}`]);
        if (worker.pruning_pay > 0) tableBody.push(['Pruning Task Earnings', 'Earnings', `Rs ${worker.pruning_pay.toLocaleString()}`]);
        if (worker.weeding_pay > 0) tableBody.push(['Weeding Field Work', 'Earnings', `Rs ${worker.weeding_pay.toLocaleString()}`]);

        const otherPay = (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0);
        if (otherPay > 0) tableBody.push(['Other Works & Operations', 'Earnings', `Rs ${otherPay.toLocaleString()}`]);

        tableBody.push([{ content: 'GROSS MONTHLY EARNINGS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: 'Total Gross', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: `Rs ${worker.gross_pay.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);

        if (worker.tea_deduction > 0) tableBody.push(['Tea Packet Supply Deduction', 'Deduction', `- Rs ${worker.tea_deduction.toLocaleString()}`]);
        if (worker.advance_deduction > 0) tableBody.push(['Cash Advance Recovery', 'Deduction', `- Rs ${worker.advance_deduction.toLocaleString()}`]);
        if (worker.epf_8_deduction > 0) tableBody.push(['EPF Statutory Contribution (8%)', 'Statutory', `- Rs ${worker.epf_8_deduction.toLocaleString()}`]);
        if (worker.epf_3_deduction > 0) tableBody.push(['EPF Statutory Contribution (3%)', 'Statutory', `- Rs ${worker.epf_3_deduction.toLocaleString()}`]);

        autoTable(doc, {
          startY: 160,
          theme: 'grid',
          head: [['Item Description', 'Category', 'Amount (LKR)']],
          body: tableBody,
          styles: { fontSize: 10, cellPadding: 7, lineColor: [226, 232, 240], lineWidth: 0.5, textColor: [15, 23, 42] },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          columnStyles: { 0: { cellWidth: 260 }, 1: { cellWidth: 100, halign: 'center' }, 2: { halign: 'right' } }
        });

        let netY = (doc as any).lastAutoTable.finalY + 15;

        // NET PAYABLE Callout Box
        doc.setFillColor(240, 253, 244); // tea-50 / green
        doc.setDrawColor(187, 247, 208); // border tea-200
        doc.roundedRect(40, netY, 515, 42, 6, 6, 'FD');

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("NET PAYABLE AMOUNT", 55, netY + 26);

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136); // tea-600
        doc.text(`Rs ${worker.net_pay.toLocaleString()}`, 535, netY + 27, { align: 'right' });

        // Footer / Signature Section
        const footerY = netY + 80;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.line(40, footerY - 10, 200, footerY - 10);
        doc.text("Authorized Signature", 40, footerY);

        doc.line(395, footerY - 10, 555, footerY - 10);
        doc.text("Employee Signature", 395, footerY);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Official Document · ${displayEstate} ERP · Generated on ${new Date().toLocaleDateString('sv-SE')}`, 40, footerY + 25);

        doc.save(`Payslip_${worker.worker_name.replace(/\s+/g, '_')}_${MONTH_NAMES[selectedDate.month - 1]}_${selectedDate.year}.pdf`);
      } catch (error) {
        console.error("Error creating PDF:", error);
      } finally {
        setIsDownloading(false);
      }
    };

    if (!worker) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 relative z-10 animate-in zoom-in-95 duration-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-tea-50 dark:bg-tea-900/30 rounded-lg">
                <ReceiptText size={18} className="text-tea-600 dark:text-tea-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Employee Payslip</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPayslip}
                disabled={isDownloading}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                {isDownloading ? <Activity size={16} className="animate-spin text-tea-500" /> : <Download size={16} />}
              </button>
              <button
                onClick={() => window.print()}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                title="Print Payslip"
              >
                <Printer size={16} />
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div id="printable-payslip" className="space-y-4 bg-white dark:bg-slate-900" ref={printRef}>
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">{currentEstateName !== 'All Estates' ? currentEstateName : (worker.estate_name || 'Estate Payroll')}</h1>
              </div>
              <div>
                <span className="text-[10px] font-bold text-tea-700 dark:text-tea-400 border border-tea-200 dark:border-tea-800 px-2.5 py-0.5 rounded-full bg-tea-50 dark:bg-tea-950/40">
                  {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}
                </span>
              </div>
            </div>

            {/* Worker Details */}
            <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee</p>
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{worker.worker_name}</h3>
                <p className="text-[10px] font-semibold text-tea-600 dark:text-tea-400">EPF: {worker.worker_epf || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Performance</p>
                <h3 className="font-bold text-slate-900 dark:text-white">{worker.days_worked} Days / {(Number(worker.total_kg) || 0).toFixed(1)} kg</h3>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                {[
                  { label: 'Plucking Earnings', val: worker.plucking_pay },
                  { label: 'Pruning Earnings', val: worker.pruning_pay },
                  { label: 'Weeding Earnings', val: worker.weeding_pay },
                  { label: 'Other Work Earnings', val: ((worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)) }
                ].map((item, i) => item.val > 0 && (
                  <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rs {item.val.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                <span>Gross Total</span>
                <span>Rs {worker.gross_pay.toLocaleString()}</span>
              </div>

              {worker.tea_deduction > 0 && (
                <div className="flex justify-between items-center text-rose-500 text-xs">
                  <span>Tea Packet Deduction</span>
                  <span>- Rs {worker.tea_deduction.toLocaleString()}</span>
                </div>
              )}
              {worker.advance_deduction > 0 && (
                <div className="flex justify-between items-center text-rose-500 text-xs">
                  <span>Cash Advance Deduction</span>
                  <span>- Rs {worker.advance_deduction.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 text-xs">
                <span>EPF (8% Employee)</span>
                <span>- Rs {worker.epf_8_deduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 text-xs">
                <span>EPF (3% Employer)</span>
                <span>- Rs {worker.epf_3_deduction.toLocaleString()}</span>
              </div>

              <div className="pt-3 mt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Net Payable Amount</span>
                <span className="text-xl font-bold text-tea-600 dark:text-tea-400">Rs {worker.net_pay.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <p>Accountant Signature: __________________</p>
              <p className="font-semibold">{currentEstateName !== 'All Estates' ? currentEstateName : 'Company Payroll'} ERP</p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              onClick={downloadPayslip}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-2 bg-tea-600 hover:bg-tea-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isDownloading ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16 space-y-4">

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly Payroll Detail</h1>
        </div>
      </div>

      {/* ANALYTICS SUMMARY CARDS (Daily Operations Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Workforce",
            val: filteredData.length,
            unit: "PAX",
            icon: Users,
            color: "text-tea-600 dark:text-tea-400",
            bg: "bg-tea-50 dark:bg-tea-900/20"
          },
          {
            label: "Gross Monthly",
            val: `Rs ${totalGross.toLocaleString()}`,
            unit: "",
            icon: Weight,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
          },
          {
            label: "Statutory EPF (11%)",
            val: `Rs ${totalEPF.toLocaleString()}`,
            unit: "",
            icon: TrendingUp,
            color: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-900/20"
          },
          {
            label: "Net Disbursements",
            val: `Rs ${totalNet.toLocaleString()}`,
            unit: "",
            icon: Banknote,
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-900/20"
          },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={s.color} size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {s.val}{s.unit && <span className="text-xs font-normal text-slate-500 ml-1">{s.unit}</span>}
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* Top Bar (Daily Operations Control Bar Style) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Estate Filter Selector */}
          {isUserAdmin && (
            <select
              value={estateFilter}
              onChange={e => setEstateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 min-w-[140px]"
            >
              <option value="all">All Estates</option>
              {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
            </select>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker name or EPF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 placeholder:text-slate-400"
            />
          </div>

          {/* Month Picker */}
          <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <button
              onClick={() => changeMonth(-1)}
              className="text-slate-400 hover:text-tea-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[110px] text-center">
              {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="text-slate-400 hover:text-tea-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              <DropdownMenuItem onClick={() => handleExport('csv')} className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <FileText size={14} /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700">
                <FileIcon size={14} /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-700">
                <FileSpreadsheet size={14} /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Data Section / Register Card */}
      <div id="paysheet-table" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Monthly Payroll Registry · {MONTH_NAMES[selectedDate.month - 1]} {selectedDate.year}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredData.length} Records
          </span>
        </div>

        {/* Worker Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Worker Profile</th>
                <th className="px-5 py-3 text-left font-semibold">EPF / ID</th>
                <th className="px-5 py-3 text-center font-semibold">Days</th>
                <th className="px-5 py-3 text-right font-semibold text-tea-600 dark:text-tea-400">Plucking</th>
                <th className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Pruning</th>
                <th className="px-5 py-3 text-right font-semibold text-sky-600 dark:text-sky-400">Weeding</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Other</th>
                <th className="px-5 py-3 text-right font-semibold">Gross Pay</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-500">Tea Ded.</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-500">Advances</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">EPF (8%)</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">EPF (3%)</th>
                <th className="px-5 py-3 text-right font-semibold text-tea-600 dark:text-tea-400">Net Pay</th>
                <th className="px-5 py-3 text-center font-semibold print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-5 py-10 text-center text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Activity size={20} className="animate-spin text-tea-500" />
                      <span>Computing monthly payroll records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((worker: any) => (
                  <tr key={worker.worker_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Worker Profile */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 shrink-0">
                          {worker.photo ? (
                            <img src={worker.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            worker.worker_name ? worker.worker_name.substring(0, 2).toUpperCase() : 'W'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{worker.worker_name}</p>
                          <p className="text-[10px] text-slate-400">{worker.worker_epf || 'N/A'}</p>
                        </div>
                      </div>
                    </td>

                    {/* EPF / ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {worker.worker_epf || 'N/A'}
                    </td>

                    {/* Days Worked */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {worker.days_worked}
                    </td>

                    {/* Plucking Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {worker.plucking_pay > 0 ? `Rs ${worker.plucking_pay.toLocaleString()}` : '-'}
                    </td>

                    {/* Pruning Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {worker.pruning_pay > 0 ? `Rs ${worker.pruning_pay.toLocaleString()}` : '-'}
                    </td>

                    {/* Weeding Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {worker.weeding_pay > 0 ? `Rs ${worker.weeding_pay.toLocaleString()}` : '-'}
                    </td>

                    {/* Other Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {((worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)) > 0
                        ? `Rs ${((worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)).toLocaleString()}`
                        : '-'}
                    </td>

                    {/* Gross Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      Rs {(worker.gross_pay || 0).toLocaleString()}
                    </td>

                    {/* Tea Deduction */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-500">
                      {worker.tea_deduction > 0 ? `-Rs ${worker.tea_deduction.toLocaleString()}` : '-'}
                    </td>

                    {/* Advances */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-500">
                      {worker.advance_deduction > 0 ? `-Rs ${worker.advance_deduction.toLocaleString()}` : '-'}
                    </td>

                    {/* EPF 8% */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-600 dark:text-rose-400">
                      {worker.epf_8_deduction > 0 ? `-Rs ${worker.epf_8_deduction.toLocaleString()}` : '-'}
                    </td>

                    {/* EPF 3% */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-600 dark:text-rose-400">
                      {worker.epf_3_deduction > 0 ? `-Rs ${worker.epf_3_deduction.toLocaleString()}` : '-'}
                    </td>

                    {/* Net Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-tea-600 dark:text-tea-400">
                      Rs {(worker.net_pay || 0).toLocaleString()}
                    </td>

                    {/* Payslip Action Button */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap print:hidden">
                      <button
                        onClick={() => handleViewPayslip(worker)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-tea-50 dark:hover:bg-tea-950/40 text-slate-500 hover:text-tea-600 dark:hover:text-tea-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        title="View Employee Payslip"
                      >
                        <FileText size={14} />
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={14} className="px-5 py-10 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">No monthly payroll records found for this period.</p>
                      <p className="text-slate-400">Try changing the month or selecting a different estate filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {!loading && filteredData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {currentEstateName === 'All Estates' ? 'Company Payroll Summary' : `${currentEstateName} Payroll Summary`}
            </span>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-medium text-slate-400">Total Statutory EPF</p>
              <p className="text-base font-bold text-rose-500">Rs {totalEPF.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400">Net Disbursement Volume</p>
              <p className="text-xl font-bold text-tea-600 dark:text-tea-400">Rs {totalNet.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      {showPayslip && <PayslipModal worker={selectedWorker} onClose={() => setShowPayslip(false)} />}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip *,
          #paysheet-table, #paysheet-table * {
            visibility: visible;
          }
          
          ${showPayslip ? `
            #paysheet-table { display: none !important; }
            .overflow-hidden { overflow: visible !important; }
            .max-w-md { max-width: none !important; width: 100% !important; transform: none !important; }
            
            #printable-payslip {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0.5cm;
              font-size: 10pt;
              margin: 0;
            }
            #printable-payslip h1 { font-size: 16pt; }
            #printable-payslip h2 { font-size: 14pt; }
            #printable-payslip h3 { font-size: 12pt; }
          ` : `
            #paysheet-table {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              font-size: 7pt;
            }
            #paysheet-table table {
              width: 100%;
              border-collapse: collapse;
            }
            #paysheet-table th, #paysheet-table td {
              padding: 2pt 4pt !important;
              border-bottom: 0.1pt solid #eee;
            }
            .print\\:hidden { display: none !important; }
            th:last-child, td:last-child { display: none !important; }
            
            #paysheet-table h3 { font-size: 12pt; margin-bottom: 10pt; }
          `}
          
          @page {
            size: ${showPayslip ? 'A4 portrait' : 'A4 landscape'};
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
