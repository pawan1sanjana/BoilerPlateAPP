import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Banknote,
  Users,
  Calendar,
  Search,
  Download,
  Activity,
  Wallet,
  ReceiptText,
  X,
  Plus,
  FileText,
  FileIcon,
  FileSpreadsheet,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Unlock
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

export default function CasualPayroll() {
  const { profile, user } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const profileReady = !!user && profile !== null;

  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [batchStatus, setBatchStatus] = useState<'draft' | 'approved' | 'confirmed'>('draft');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'weekly', 'contract', 'daily'
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Estate Filter state
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  // Add Form state
  const [newEntry, setNewEntry] = useState({
    estate_id: '',
    worker_name: '',
    nic_or_id: '',
    wage_type: 'daily',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    days_worked: 1,
    plucking_pay: 0,
    pruning_pay: 0,
    weeding_pay: 0,
    manure_pay: 0,
    other_pay: 0,
    tea_deduction: 0,
    advance_deduction: 0,
    contract_ref: '',
    notes: ''
  });
  const [savingEntry, setSavingEntry] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: string; text: string } | null>(null);

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
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

  const fetchCasualPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const effectiveEstId = !isUserAdmin ? profile?.estate_id : (estateFilter !== 'all' ? estateFilter : null);

      // Query cash_advances for this date range and estate
      let advancesQuery = supabase
        .from('cash_advances')
        .select('*')
        .gte('advance_date', dateRange.startDate)
        .lte('advance_date', dateRange.endDate);

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

      // Query tea_packet_issues for this date range and estate
      let teaIssuesQuery = supabase
        .from('tea_packet_issues')
        .select('*')
        .gte('issue_date', dateRange.startDate)
        .lte('issue_date', dateRange.endDate);

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

      // Query dedicated casual_payrolls table in Supabase
      let query = supabase
        .from('casual_payrolls')
        .select('*')
        .gte('start_date', dateRange.startDate)
        .lte('end_date', dateRange.endDate);

      if (effectiveEstId) {
        query = query.eq('estate_id', effectiveEstId);
      }

      if (filterType !== 'all') {
        query = query.eq('wage_type', filterType);
      }

      const { data: dbData, error } = await query.order('created_at', { ascending: false });

      if (!error && dbData && dbData.length > 0) {
        const enriched = dbData.map((r: any) => {
          const nameKey = (r.worker_name || '').toLowerCase().trim();
          const epfKey = r.nic_or_id || r.worker_epf;
          const advanceFromDB = (epfKey && advancesMap.has(epfKey))
            ? advancesMap.get(epfKey)
            : (advancesMap.get(nameKey) || parseFloat(r.advance_deduction) || 0);

          const teaFromDB = (epfKey && teaDedMap.has(epfKey))
            ? teaDedMap.get(epfKey)
            : (teaDedMap.get(nameKey) || parseFloat(r.tea_deduction) || 0);

          const gross = parseFloat(r.gross_pay) || 0;
          const net = Math.max(0, gross - (teaFromDB || 0) - (advanceFromDB || 0));

          return {
            ...r,
            tea_deduction: teaFromDB || 0,
            advance_deduction: advanceFromDB || 0,
            net_pay: net
          };
        });

        setPayrollData(enriched);
        const hasConfirmed = dbData.some((r: any) => r.status === 'confirmed');
        const hasApproved = dbData.some((r: any) => r.status === 'approved');
        if (hasConfirmed) setBatchStatus('confirmed');
        else if (hasApproved) setBatchStatus('approved');
        else setBatchStatus('draft');
      } else {
        // Fallback to API mock data if table is empty
        const res = await apiClient.get(`/payrall/casual?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&type=${filterType}`);
        if (res.success && Array.isArray(res.data)) {
          const enriched = res.data.map((r: any) => {
            const nameKey = (r.worker_name || '').toLowerCase().trim();
            const epfKey = r.nic_or_id || r.worker_epf;
            const advanceFromDB = (epfKey && advancesMap.has(epfKey))
              ? advancesMap.get(epfKey)
              : (advancesMap.get(nameKey) || parseFloat(r.advance_deduction) || 0);

            const teaFromDB = (epfKey && teaDedMap.has(epfKey))
              ? teaDedMap.get(epfKey)
              : (teaDedMap.get(nameKey) || parseFloat(r.tea_deduction) || 0);

            const gross = parseFloat(r.gross_pay) || 0;
            const net = Math.max(0, gross - (teaFromDB || 0) - (advanceFromDB || 0));

            return {
              ...r,
              tea_deduction: teaFromDB || 0,
              advance_deduction: advanceFromDB || 0,
              net_pay: net
            };
          });

          setPayrollData(enriched);
          setBatchStatus('draft');
        } else {
          setPayrollData([]);
          setBatchStatus('draft');
        }
      }
    } catch (error) {
      console.error("Failed to fetch casual payroll:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, filterType, isUserAdmin, profile?.estate_id, estateFilter]);

  const handleUpdateStatus = async (newStatus: 'draft' | 'approved' | 'confirmed') => {
    try {
      setLoading(true);
      const effectiveEstId = !isUserAdmin ? profile?.estate_id : (estateFilter !== 'all' ? estateFilter : null);

      let updateQuery = supabase
        .from('casual_payrolls')
        .update({ status: newStatus })
        .gte('start_date', dateRange.startDate)
        .lte('end_date', dateRange.endDate);

      if (effectiveEstId) {
        updateQuery = updateQuery.eq('estate_id', effectiveEstId);
      }

      if (filterType !== 'all') {
        updateQuery = updateQuery.eq('wage_type', filterType);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setBatchStatus(newStatus);
      fetchCasualPayroll();
    } catch (err) {
      console.error('Failed to update casual payroll status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasualPayroll();
  }, [fetchCasualPayroll]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.worker_name.trim()) {
      setFormMsg({ type: 'error', text: 'Worker Name is required.' });
      return;
    }
    setSavingEntry(true);
    setFormMsg(null);

    try {
      const gross = (Number(newEntry.plucking_pay) || 0) +
        (Number(newEntry.pruning_pay) || 0) +
        (Number(newEntry.weeding_pay) || 0) +
        (Number(newEntry.manure_pay) || 0) +
        (Number(newEntry.other_pay) || 0);

      const net = Math.max(0, gross - (Number(newEntry.tea_deduction) || 0) - (Number(newEntry.advance_deduction) || 0));
      const selectedEstId = newEntry.estate_id || (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || null));

      if (!selectedEstId) {
        setFormMsg({ type: 'error', text: 'Please select an estate.' });
        setSavingEntry(false);
        return;
      }

      const payload = {
        estate_id: selectedEstId,
        worker_name: newEntry.worker_name.trim(),
        nic_or_id: newEntry.nic_or_id.trim() || null,
        wage_type: newEntry.wage_type,
        start_date: newEntry.start_date,
        end_date: newEntry.end_date,
        days_worked: Number(newEntry.days_worked) || 1,
        plucking_pay: Number(newEntry.plucking_pay) || 0,
        pruning_pay: Number(newEntry.pruning_pay) || 0,
        weeding_pay: Number(newEntry.weeding_pay) || 0,
        manure_pay: Number(newEntry.manure_pay) || 0,
        other_pay: Number(newEntry.other_pay) || 0,
        gross_pay: gross,
        tea_deduction: Number(newEntry.tea_deduction) || 0,
        advance_deduction: Number(newEntry.advance_deduction) || 0,
        net_pay: net,
        status: 'draft',
        contract_ref: newEntry.contract_ref.trim() || null,
        notes: newEntry.notes.trim() || null,
        created_by: profile?.id || null
      };

      const { error } = await supabase.from('casual_payrolls').insert(payload).select().single();
      if (error) throw error;

      setShowAddModal(false);
      setNewEntry({
        estate_id: '',
        worker_name: '',
        nic_or_id: '',
        wage_type: 'daily',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        days_worked: 1,
        plucking_pay: 0,
        pruning_pay: 0,
        weeding_pay: 0,
        manure_pay: 0,
        other_pay: 0,
        tea_deduction: 0,
        advance_deduction: 0,
        contract_ref: '',
        notes: ''
      });
      fetchCasualPayroll();
    } catch (err: any) {
      console.error('Failed to create casual payroll entry:', err);
      setFormMsg({ type: 'error', text: err.message || 'Failed to save entry' });
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!isUserAdmin) {
      alert('Delete action is restricted to Super Admin users only.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this casual payroll record?')) return;
    try {
      await supabase.from('casual_payrolls').delete().eq('id', id);
      fetchCasualPayroll();
    } catch (err) {
      console.error('Failed to delete casual payroll entry:', err);
    }
  };

  const filteredData = useMemo(() => {
    let list = payrollData;
    if (estateFilter !== 'all') {
      list = list.filter(w => !w.estate_id || String(w.estate_id) === String(estateFilter));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((w: any) =>
        (w.worker_name && w.worker_name.toLowerCase().includes(q)) ||
        (w.worker_epf && String(w.worker_epf).toLowerCase().includes(q)) ||
        (w.nic_or_id && String(w.nic_or_id).toLowerCase().includes(q)) ||
        (w.contract_ref && String(w.contract_ref).toLowerCase().includes(q))
      );
    }
    return list;
  }, [payrollData, searchTerm, estateFilter]);

  const totalGross = useMemo(() => filteredData.reduce((acc, curr: any) => acc + (parseFloat(curr.gross_pay) || 0), 0), [filteredData]);
  const totalNet = useMemo(() => filteredData.reduce((acc, curr: any) => acc + (parseFloat(curr.net_pay) || 0), 0), [filteredData]);

  const handleExport = (type: 'pdf' | 'excel' | 'csv') => {
    if (filteredData.length === 0) return;
    const dateTag = `${dateRange.startDate}_to_${dateRange.endDate}`;

    if (type === 'csv') {
      const headers = ["Worker Name", "ID/NIC", "Wage Type", "Days Worked", "Gross Pay", "Tea Ded.", "Advances", "Net Pay", "Contract Ref"];
      const rows = filteredData.map((w: any) => [
        w.worker_name,
        w.worker_epf || w.nic_or_id || 'N/A',
        w.wage_type,
        w.days_worked,
        w.gross_pay,
        w.tea_deduction,
        w.advance_deduction,
        w.net_pay,
        w.contract_ref || '-'
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Casual_Payroll_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === 'excel') {
      const headers = ["Worker Name", "ID / NIC", "Wage Type", "Days Worked", "Plucking Pay", "Pruning Pay", "Field Work Pay", "Gross Pay (Rs)", "Tea Deduction", "Advance Recovery", "Net Payable (Rs)", "Contract Ref"];
      const rows = filteredData.map((w: any) => [
        w.worker_name,
        w.worker_epf || w.nic_or_id || 'N/A',
        w.wage_type,
        w.days_worked,
        w.plucking_pay || 0,
        w.pruning_pay || 0,
        ((w.weeding_pay || 0) + (w.manure_pay || 0) + (w.lopping_pay || 0) + (w.foliar_pay || 0) + (w.other_pay || 0)),
        w.gross_pay || 0,
        w.tea_deduction || 0,
        w.advance_deduction || 0,
        w.net_pay || 0,
        w.contract_ref || '-'
      ]);
      downloadExcel(headers, rows, { title: `Casual & Contract Payroll — ${dateTag}`, recordCount: filteredData.length }, `Casual_Payroll_${dateTag}.xlsx`);
    } else if (type === 'pdf') {
      const doc = new jsPDF('l', 'pt', 'a4');
      const displayEstate = currentEstateName !== 'All Estates' ? currentEstateName : 'ALL ESTATES';

      // Top Accent Bar (Tea Green Theme)
      doc.setFillColor(13, 148, 136); // tea-600
      doc.rect(0, 0, 841.89, 12, 'F');

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${displayEstate.toUpperCase()} — CASUAL & CONTRACT PAYROLL`, 40, 45);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 148, 136);
      doc.text(`PERIOD: ${dateRange.startDate} TO ${dateRange.endDate} · WORKFORCE: ${filteredData.length} CASUAL WORKERS`, 40, 60);

      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, 70, 761, 35, 6, 6, 'FD');

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(`Gross Total: Rs ${totalGross.toLocaleString()}`, 55, 91);
      doc.setTextColor(13, 148, 136);
      doc.text(`Net Disbursements: Rs ${totalNet.toLocaleString()}`, 580, 91);

      const tableHeaders = [
        ["#", "Worker Name", "ID / NIC", "Category", "Days", "Plucking", "Pruning", "Other Work", "Gross Pay", "Tea Ded.", "Advances", "Net Payable", "Ref"]
      ];

      const tableRows = filteredData.map((w: any, idx: number) => [
        idx + 1,
        w.worker_name,
        w.worker_epf || w.nic_or_id || 'N/A',
        w.wage_type,
        w.days_worked,
        w.plucking_pay > 0 ? `Rs ${w.plucking_pay.toLocaleString()}` : '-',
        w.pruning_pay > 0 ? `Rs ${w.pruning_pay.toLocaleString()}` : '-',
        ((w.weeding_pay || 0) + (w.manure_pay || 0) + (w.lopping_pay || 0) + (w.foliar_pay || 0) + (w.other_pay || 0)) > 0
          ? `Rs ${((w.weeding_pay || 0) + (w.manure_pay || 0) + (w.lopping_pay || 0) + (w.foliar_pay || 0) + (w.other_pay || 0)).toLocaleString()}`
          : '-',
        `Rs ${w.gross_pay.toLocaleString()}`,
        w.tea_deduction > 0 ? `-Rs ${w.tea_deduction.toLocaleString()}` : '-',
        w.advance_deduction > 0 ? `-Rs ${w.advance_deduction.toLocaleString()}` : '-',
        `Rs ${w.net_pay.toLocaleString()}`,
        w.contract_ref || '-'
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
          1: { cellWidth: 120 },
          2: { cellWidth: 65 },
          3: { cellWidth: 50, halign: 'center' },
          4: { cellWidth: 35, halign: 'center' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold' },
          9: { halign: 'right' },
          10: { halign: 'right' },
          11: { halign: 'right', fontStyle: 'bold', textColor: [13, 148, 136] },
          12: { cellWidth: 50 }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 25;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Official Document · ${displayEstate} ERP · Generated on ${new Date().toLocaleDateString('sv-SE')}`, 40, finalY);

      doc.save(`Casual_Payroll_Registry_${dateTag}.pdf`);
    }
  };

  const handleViewPayslip = (worker: any) => {
    setSelectedWorker(worker);
    setShowPayslip(true);
  };

  // Payment Voucher Modal
  const PayslipModal = ({ worker, onClose }: any) => {
    const [isDownloading, setIsDownloading] = useState(false);
    if (!worker) return null;

    const downloadVoucherPDF = () => {
      try {
        setIsDownloading(true);
        const doc = new jsPDF('p', 'pt', 'a4');
        const displayEstate = currentEstateName !== 'All Estates' ? currentEstateName : (worker.estate_name || 'ESTATE');

        // Top Accent Bar
        doc.setFillColor(13, 148, 136);
        doc.rect(0, 0, 595.28, 12, 'F');

        // Header
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(displayEstate.toUpperCase(), 40, 48);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text(`CASUAL & CONTRACT PAYMENT VOUCHER · ${dateRange.startDate} TO ${dateRange.endDate}`, 40, 65);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(40, 75, 555, 75);

        // Summary Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(40, 85, 515, 60, 6, 6, 'FD');

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("WORKER NAME", 55, 105);
        doc.text("ID / NIC", 240, 105);
        doc.text("TYPE", 360, 105);
        doc.text("DAYS LOGGED", 460, 105);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(worker.worker_name.toUpperCase(), 55, 124);
        doc.text(worker.worker_epf || worker.nic_or_id || "N/A", 240, 124);
        doc.text(String(worker.wage_type).toUpperCase(), 360, 124);
        doc.text(`${worker.days_worked} Days`, 460, 124);

        const tableBody: any[] = [];
        if (worker.plucking_pay > 0) tableBody.push(['Plucking Operations', 'Earnings', `Rs ${parseFloat(worker.plucking_pay).toLocaleString()}`]);
        if (worker.pruning_pay > 0) tableBody.push(['Pruning Field Tasks', 'Earnings', `Rs ${parseFloat(worker.pruning_pay).toLocaleString()}`]);

        const otherPay = (worker.weeding_pay || 0) + (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0);
        if (otherPay > 0) tableBody.push(['Other Works & Contract Tasks', 'Earnings', `Rs ${otherPay.toLocaleString()}`]);

        tableBody.push([{ content: 'GROSS DISBURSEMENT', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: 'Total Gross', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: `Rs ${parseFloat(worker.gross_pay).toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);

        if (worker.tea_deduction > 0) tableBody.push(['Tea Packet Deduction', 'Deduction', `- Rs ${parseFloat(worker.tea_deduction).toLocaleString()}`]);
        if (worker.advance_deduction > 0) tableBody.push(['Cash Advance Recovery', 'Deduction', `- Rs ${parseFloat(worker.advance_deduction).toLocaleString()}`]);

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
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(40, netY, 515, 42, 6, 6, 'FD');

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("NET PAYABLE AMOUNT", 55, netY + 26);

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136);
        doc.text(`Rs ${parseFloat(worker.net_pay).toLocaleString()}`, 535, netY + 27, { align: 'right' });

        const footerY = netY + 80;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.line(40, footerY - 10, 200, footerY - 10);
        doc.text("Receiver Signature", 40, footerY);

        doc.line(395, footerY - 10, 555, footerY - 10);
        doc.text("Authorized Estate Sign", 395, footerY);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Voucher Ref: ${worker.contract_ref || worker.id || 'N/A'} · ${displayEstate} ERP`, 40, footerY + 25);

        doc.save(`Voucher_${worker.worker_name.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error('Failed to create PDF:', err);
      } finally {
        setIsDownloading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 relative z-10 animate-in zoom-in-95 duration-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-tea-50 dark:bg-tea-900/30 rounded-lg">
                <ReceiptText size={18} className="text-tea-600 dark:text-tea-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Casual Payment Voucher</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadVoucherPDF}
                disabled={isDownloading}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors disabled:opacity-50"
                title="Download PDF Voucher"
              >
                {isDownloading ? <Activity size={16} className="animate-spin text-tea-500" /> : <Download size={16} />}
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div id="printable-payslip" className="space-y-4 bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">{currentEstateName}</h1>
              </div>
              <div>
                <span className="text-[10px] font-bold text-tea-700 dark:text-tea-400 border border-tea-200 dark:border-tea-800 px-2.5 py-0.5 rounded-full bg-tea-50 dark:bg-tea-950/40">
                  {dateRange.startDate} to {dateRange.endDate}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Casual Worker</p>
                <h3 className="font-bold text-slate-900 dark:text-white truncate">{worker.worker_name}</h3>
                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">ID/NIC: {worker.worker_epf || worker.nic_or_id || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attendance</p>
                <h3 className="font-bold text-slate-900 dark:text-white">{worker.days_worked} Days Logged</h3>
                <p className="text-[10px] font-semibold text-amber-600 uppercase">{worker.wage_type} basis</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                {worker.plucking_pay > 0 && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Plucking Output</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rs {parseFloat(worker.plucking_pay).toLocaleString()}</span>
                  </div>
                )}
                {worker.pruning_pay > 0 && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Pruning Tasks</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rs {parseFloat(worker.pruning_pay).toLocaleString()}</span>
                  </div>
                )}
                {((worker.weeding_pay || 0) + (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)) > 0 && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Field & Contract Work</span>
                    <span className="font-semibold text-slate-900 dark:text-white">Rs {((worker.weeding_pay || 0) + (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                <span>Gross Total</span>
                <span>Rs {parseFloat(worker.gross_pay).toLocaleString()}</span>
              </div>

              {worker.tea_deduction > 0 && (
                <div className="flex justify-between items-center text-rose-500 text-xs">
                  <span>Tea Packet Issue</span>
                  <span>- Rs {parseFloat(worker.tea_deduction).toLocaleString()}</span>
                </div>
              )}
              {worker.advance_deduction > 0 && (
                <div className="flex justify-between items-center text-rose-500 text-xs">
                  <span>Cash Advance Recovery</span>
                  <span>- Rs {parseFloat(worker.advance_deduction).toLocaleString()}</span>
                </div>
              )}

              <div className="pt-3 mt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Net Amount Payable</span>
                <span className="text-xl font-bold text-tea-600 dark:text-tea-400">Rs {parseFloat(worker.net_pay).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <p>Receiver Sign: __________________</p>
              <p className="font-semibold">{currentEstateName} ERP</p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              onClick={downloadVoucherPDF}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-tea-600 hover:bg-tea-700 text-white h-9 px-4 rounded-lg shadow-sm"
            >
              {isDownloading ? <Activity size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Download Voucher PDF</span>
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4 shadow-sm"
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Casual & Contract Payroll</h1>
        </div>

        {/* Header Action Button */}
        {(batchStatus !== 'confirmed' || isUserAdmin) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-tea-600 hover:bg-tea-700 text-white h-9 px-4 rounded-lg shadow-sm"
          >
            <Plus size={14} />
            <span>Add Casual Entry</span>
          </button>
        )}
      </div>

      {/* ANALYTICS SUMMARY CARDS (Daily Operations Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Active Casual Workforce",
            val: filteredData.length,
            unit: "PAX",
            icon: Users,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20"
          },
          {
            label: "Gross Casual Payroll",
            val: `Rs ${totalGross.toLocaleString()}`,
            unit: "",
            icon: Wallet,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
          },
          {
            label: "Net Disbursement Ready",
            val: `Rs ${totalNet.toLocaleString()}`,
            unit: "",
            icon: Banknote,
            color: "text-tea-600 dark:text-tea-400",
            bg: "bg-tea-50 dark:bg-tea-900/20"
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

      {/* Control Bar */}
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

          {/* Wage Type Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {['all', 'daily', 'weekly', 'contract'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-xs font-semibold capitalize rounded-md transition-all ${
                  filterType === t
                    ? 'bg-white dark:bg-slate-800 text-tea-700 dark:text-tea-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, NIC, or contract ref..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 placeholder:text-slate-400"
            />
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
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

      {/* Main Register Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Casual & Contract Payment Register
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredData.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Worker Profile</th>
                <th className="px-5 py-3 text-center font-semibold">Wage Category</th>
                <th className="px-5 py-3 text-center font-semibold">Days Logged</th>
                <th className="px-5 py-3 text-right font-semibold text-tea-600 dark:text-tea-400">Plucking</th>
                <th className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Pruning</th>
                <th className="px-5 py-3 text-right font-semibold text-sky-600 dark:text-sky-400">Field / Other</th>
                <th className="px-5 py-3 text-right font-semibold">Gross Pay</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-500">Tea Ded.</th>
                <th className="px-5 py-3 text-right font-semibold text-rose-500">Advances</th>
                <th className="px-5 py-3 text-right font-semibold text-tea-600 dark:text-tea-400">Net Payable</th>
                <th className="px-5 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Activity size={20} className="animate-spin text-tea-500" />
                      <span>Loading casual payroll records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((worker: any) => (
                  <tr key={worker.id || worker.worker_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Worker Profile */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{worker.worker_name}</p>
                        <p className="text-[10px] text-slate-400">ID/NIC: {worker.worker_epf || worker.nic_or_id || 'N/A'}</p>
                      </div>
                    </td>

                    {/* Wage Category */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        worker.wage_type === 'contract'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : worker.wage_type === 'weekly'
                          ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {worker.wage_type}
                      </span>
                    </td>

                    {/* Days Worked */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {worker.days_worked}
                    </td>

                    {/* Plucking */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {parseFloat(worker.plucking_pay) > 0 ? `Rs ${parseFloat(worker.plucking_pay).toLocaleString()}` : '-'}
                    </td>

                    {/* Pruning */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {parseFloat(worker.pruning_pay) > 0 ? `Rs ${parseFloat(worker.pruning_pay).toLocaleString()}` : '-'}
                    </td>

                    {/* Field / Other */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                      {((worker.weeding_pay || 0) + (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)) > 0
                        ? `Rs ${((worker.weeding_pay || 0) + (worker.manure_pay || 0) + (worker.lopping_pay || 0) + (worker.foliar_pay || 0) + (worker.other_pay || 0)).toLocaleString()}`
                        : '-'}
                    </td>

                    {/* Gross Pay */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      Rs {parseFloat(worker.gross_pay || 0).toLocaleString()}
                    </td>

                    {/* Tea Deduction */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-500">
                      {parseFloat(worker.tea_deduction) > 0 ? `-Rs ${parseFloat(worker.tea_deduction).toLocaleString()}` : '-'}
                    </td>

                    {/* Advances */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-rose-500">
                      {parseFloat(worker.advance_deduction) > 0 ? `-Rs ${parseFloat(worker.advance_deduction).toLocaleString()}` : '-'}
                    </td>

                    {/* Net Payable */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-tea-600 dark:text-tea-400">
                      Rs {parseFloat(worker.net_pay || 0).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewPayslip(worker)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-tea-600 dark:hover:text-tea-400 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors"
                          title="View Payment Voucher"
                        >
                          <ReceiptText size={14} />
                        </button>

                        {worker.id && isUserAdmin && (
                          <button
                            onClick={() => handleDeleteEntry(worker.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors"
                            title="Delete Entry (Super Admin)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">No casual payroll records found for selected criteria.</p>
                      <p className="text-slate-400">Click "Add Casual Entry" to create a new casual or contract payment record.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Approval & Confirmation Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payroll Status:</span>
          {batchStatus === 'approved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 size={13} />
              Approved
            </span>
          )}
          {batchStatus === 'confirmed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={13} />
              {isUserAdmin ? 'Confirmed & Locked (Super Admin Access)' : 'Confirmed & Locked'}
            </span>
          )}
          {batchStatus === 'draft' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Draft
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {(!profileReady || loading) ? (
            <div className="h-10 w-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            <>
              {/* Approve button: only show when draft */}
              {batchStatus === 'draft' && (
                <button
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={filteredData.length === 0}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Payroll</span>
                </button>
              )}

              {/* Confirm & Lock: show when draft or approved */}
              {(batchStatus === 'draft' || batchStatus === 'approved') && (
                <button
                  onClick={() => handleUpdateStatus('confirmed')}
                  disabled={filteredData.length === 0}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <ShieldCheck size={15} />
                  <span>Confirm & Lock Salary</span>
                </button>
              )}

              {/* Unlock: only Super Admin sees this when confirmed */}
              {batchStatus === 'confirmed' && isUserAdmin && (
                <button
                  onClick={() => handleUpdateStatus('draft')}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm w-full sm:w-auto"
                >
                  <Unlock size={15} />
                  <span>Unlock Batch</span>
                </button>
              )}

              {/* For non-admins: read-only lock indicator when confirmed */}
              {batchStatus === 'confirmed' && !isUserAdmin && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck size={14} />
                  Payroll Finalized & Locked
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Casual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddModal(false)} />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 relative z-10 animate-in zoom-in-95 duration-200 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-tea-50 dark:bg-tea-900/30 rounded-lg">
                  <Plus size={18} className="text-tea-600 dark:text-tea-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">New Casual / Contract Entry</h2>
                  <p className="text-[11px] text-slate-400">Saved to dedicated `casual_payrolls` table</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {formMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                formMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                <AlertCircle size={14} />
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Estate *</label>
                <select
                  required
                  value={newEntry.estate_id || (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || ''))}
                  onChange={e => setNewEntry({ ...newEntry, estate_id: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                >
                  <option value="" disabled>Select Estate</option>
                  {estates.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Worker Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Kumar"
                    value={newEntry.worker_name}
                    onChange={e => setNewEntry({ ...newEntry, worker_name: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">ID / NIC / Temp Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 199482710V"
                    value={newEntry.nic_or_id}
                    onChange={e => setNewEntry({ ...newEntry, nic_or_id: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Wage Category</label>
                  <select
                    value={newEntry.wage_type}
                    onChange={e => setNewEntry({ ...newEntry, wage_type: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newEntry.start_date}
                    onChange={e => setNewEntry({ ...newEntry, start_date: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEntry.end_date}
                    onChange={e => setNewEntry({ ...newEntry, end_date: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Days Worked</label>
                  <input
                    type="number"
                    min="1"
                    value={newEntry.days_worked}
                    onChange={e => setNewEntry({ ...newEntry, days_worked: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Plucking Pay (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.plucking_pay}
                    onChange={e => setNewEntry({ ...newEntry, plucking_pay: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Pruning Pay (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.pruning_pay}
                    onChange={e => setNewEntry({ ...newEntry, pruning_pay: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Weeding Pay (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.weeding_pay}
                    onChange={e => setNewEntry({ ...newEntry, weeding_pay: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Manure Pay (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.manure_pay}
                    onChange={e => setNewEntry({ ...newEntry, manure_pay: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Other Pay (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.other_pay}
                    onChange={e => setNewEntry({ ...newEntry, other_pay: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-rose-500 font-semibold mb-1">Tea Deduction (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.tea_deduction}
                    onChange={e => setNewEntry({ ...newEntry, tea_deduction: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-rose-500 font-semibold mb-1">Advance Recovery (Rs)</label>
                  <input
                    type="number"
                    value={newEntry.advance_deduction}
                    onChange={e => setNewEntry({ ...newEntry, advance_deduction: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Contract Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. AGR-2026-088"
                    value={newEntry.contract_ref}
                    onChange={e => setNewEntry({ ...newEntry, contract_ref: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-tea-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-tea-600 hover:bg-tea-700 text-white h-9 px-4 rounded-lg shadow-sm"
                >
                  {savingEntry ? <Activity size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save Casual Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Voucher Modal */}
      {showPayslip && <PayslipModal worker={selectedWorker} onClose={() => setShowPayslip(false)} />}

    </div>
  );
}
