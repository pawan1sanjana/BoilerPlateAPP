import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, AlertTriangle, Wallet, Search, Download, FileText, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

export interface ExpenseAccount {
  id: string | number;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface ExpenseItem {
  id: string | number;
  expenseDate: string;
  vendor: string;
  category: string;
  amount: number | string;
  paymentMethod: string;
  reference: string;
  notes?: string;
  expenseAccountId: string | number;
  expenseAccountCode?: string;
  expenseAccountName?: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [accounts, setAccounts] = useState<ExpenseAccount[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(todayISO().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [form, setForm] = useState({
    expenseDate: todayISO(),
    vendor: '',
    category: '',
    amount: '',
    paymentMethod: 'Cash',
    reference: '',
    notes: '',
    expenseAccountId: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, eRes] = await Promise.all([
        apiClient.get('/finance/accounts'),
        apiClient.get('/finance/expenses'),
      ]);
      if (aRes.success && Array.isArray(aRes.data)) {
        setAccounts(aRes.data.filter((a: any) => a.isActive));
        // Preselect General Expenses (5000) or first expense account if available
        const general = aRes.data.find((a: any) => a.code === '5000' || a.type === 'expense');
        if (general && !form.expenseAccountId) {
          setForm(prev => ({ ...prev, expenseAccountId: String(general.id) }));
        }
      }
      if (eRes.success && Array.isArray(eRes.data)) {
        setExpenses(eRes.data);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load expenses');
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = expenses;
    if (monthFilter) {
      result = result.filter(e => e.expenseDate && e.expenseDate.startsWith(monthFilter));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(e =>
        String(e.vendor || '').toLowerCase().includes(q) ||
        String(e.category || '').toLowerCase().includes(q) ||
        String(e.reference || '').toLowerCase().includes(q) ||
        String(e.expenseAccountCode || '').toLowerCase().includes(q) ||
        String(e.expenseAccountName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [expenses, query, monthFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalShown = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        expenseAccountId: form.expenseAccountId,
      };
      const res = await apiClient.post('/finance/expenses', payload);
      if (!res.success) throw new Error(res.error || 'Failed to save expense');
      toast.success('Expense saved successfully');
      setForm(prev => ({
        ...prev,
        expenseDate: todayISO(),
        vendor: '',
        category: '',
        amount: '',
        reference: '',
        notes: '',
      }));
      await load();
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save expense');
      toast.error(e.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Date', 'Vendor', 'Category', 'Code', 'Account Code', 'Account Name', 'Amount'];
    const rows = filtered.map(e => [
      e.expenseDate ? e.expenseDate.slice(0, 10) : '',
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.reference || '').replace(/"/g, '""')}"`,
      `"${(e.expenseAccountCode || '').replace(/"/g, '""')}"`,
      `"${(e.expenseAccountName || '').replace(/"/g, '""')}"`,
      e.amount
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expenses_Export_${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!filtered.length) return;
    const doc = new jsPDF('portrait');
    doc.setFontSize(14);
    doc.text(`Expenses Report (${todayISO()})`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Date', 'Vendor', 'Category', 'Code', 'Account', 'Amount']],
      body: filtered.map(e => [
        e.expenseDate ? e.expenseDate.slice(0, 10) : '—',
        e.vendor || '—',
        e.category || '—',
        e.reference || '—',
        e.expenseAccountCode ? `${e.expenseAccountCode} ${e.expenseAccountName}` : '—',
        Number(e.amount).toFixed(2)
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 71, 42] }
    });
    
    doc.save(`Expenses_Report_${todayISO()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Expenses Analysis</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track operational expenditures, vendor payments, and ledger account postings</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tea-600 hover:bg-tea-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-tea-600/20"
          >
            <Plus size={12} /> Add Expense
          </button>
          
          <div className="relative group">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={12} /> Export
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-2 animate-in slide-in-from-top-2">
                <button
                  onClick={() => { exportCSV(); setShowExportOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
                >
                  <FileSpreadsheet size={16} /> CSV Ledger
                </button>
                <button
                  onClick={() => { exportPDF(); setShowExportOptions(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <FileText size={16} /> PDF Document
                </button>
              </div>
            )}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <RefreshCcw size={12} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="premium-card p-4 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-700 dark:text-rose-400 text-sm">Expense Error</p>
            <p className="text-xs text-rose-500 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="premium-card p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search vendor, category, reference..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tea-500/30"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <p className="text-[9px] font-black uppercase text-slate-400 whitespace-nowrap ml-2">Month View:</p>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tea-500/30"
                />
                {monthFilter && (
                  <button onClick={() => setMonthFilter('')} className="text-[10px] uppercase font-bold text-slate-400 hover:text-rose-500 whitespace-nowrap px-2">
                    All
                  </button>
                )}
              </div>
            </div>
            <div className="text-right w-full md:w-auto">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total (shown)</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{totalShown.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <div className="premium-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Recent Expenses
            </h3>
            <span className="text-[9px] font-black bg-tea-50 dark:bg-tea-900/20 text-tea-600 dark:text-tea-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {filtered.length} items
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 border-4 border-tea-500/20 border-t-tea-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">No expenses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor / Category</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Account</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedData.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {e.expenseDate ? e.expenseDate.slice(0, 10) : '—'}
                      </td>
                      <td className="py-3 px-6">
                        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{e.vendor || '—'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{e.category || 'Expense'}</p>
                      </td>
                      <td className="py-3 px-6 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        {e.reference || '—'}
                      </td>
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {e.expenseAccountCode ? `${e.expenseAccountCode} ${e.expenseAccountName}` : '—'}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors inline-block">
                          {Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filtered.length > 0 && !loading && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
              <p className="text-xs font-bold text-slate-500">
                Showing <span className="text-slate-900 dark:text-white">{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-slate-900 dark:text-white">{filtered.length}</span> entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                            currentPage === page 
                              ? 'bg-tea-600 text-white shadow-md shadow-tea-600/20' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-slate-400 text-xs px-1">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                <Plus size={16} className="text-tea-600" /> New Expense
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Date</p>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Amount</p>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Expense Account</p>
                  <select
                    value={form.expenseAccountId}
                    onChange={(e) => setForm(prev => ({ ...prev, expenseAccountId: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} • {a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendor</p>
                  <input
                    value={form.vendor}
                    onChange={(e) => setForm(prev => ({ ...prev, vendor: e.target.value }))}
                    placeholder="Supplier / vendor"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category</p>
                  <input
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Fuel, Fertilizer, Repair..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Method</p>
                  <input
                    value={form.paymentMethod}
                    onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    placeholder="Cash / Bank / Card"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Code Number</p>
                  <input
                    value={form.reference}
                    onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="e.g. EXP-1001"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes</p>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={save}
                disabled={saving || !form.expenseAccountId || !form.amount}
                className="mt-6 w-full py-4 bg-tea-600 hover:bg-tea-700 text-white rounded-lg font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-tea-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Wallet size={18} /> {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
