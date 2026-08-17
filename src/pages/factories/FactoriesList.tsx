import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useNavigate } from 'react-router-dom';

export default function FactoriesList() {
  const navigate = useNavigate();
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFactories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFactories(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load factories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFactories();
  }, [fetchFactories]);

  const columns: ColumnDef<any>[] = [
    {
      header: "Factory Name",
      cell: (factory) => (
        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          {factory.name}
        </div>
      )
    },
    {
      header: "Code",
      cell: (factory) => (
        <span className="font-mono text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
          {factory.code || '—'}
        </span>
      )
    },
    {
      header: "Status",
      cell: (factory) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          factory.status === 'active' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-inset ring-green-500/20' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20'
        }`}>
          {factory.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {factory.status}
        </span>
      )
    },
    {
      header: "Created Date",
      cell: (factory) => <span className="text-slate-500">{new Date(factory.created_at).toLocaleDateString()}</span>
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right sticky right-0 bg-white dark:bg-slate-950 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]",
      cell: (factory) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => navigate(`/factories/edit/${factory.id}`)}
            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit Factory"
          >
            <Edit size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" />
            Factories Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage tea factories and assign them to estates.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchFactories()} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => navigate('/factories/new')} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-blue-500/30 flex items-center gap-2">
            <Plus size={18} />
            Add Factory
          </button>
        </div>
      </div>

      <Card className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <DataTable
          columns={columns}
          data={factories}
          loading={loading}
          emptyMessage="No factories found."
        />
      </Card>
    </div>
  );
}
