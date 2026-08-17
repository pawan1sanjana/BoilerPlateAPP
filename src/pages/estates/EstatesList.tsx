import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Edit, CheckCircle2, XCircle, Shield, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin, canManageEstate } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function EstatesList() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;

  // Non-admin users are redirected straight to their own estate detail
  if (!isAdmin(role)) {
    if (profile?.estate_id) {
      return <Navigate to={`/estates/${profile.estate_id}`} replace />;
    }
    // Estate role user with no estate assigned — show info message
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Shield className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">No estate assigned to your account.</p>
          <p className="text-sm text-slate-500">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return <AdminEstatesList navigate={navigate} role={role} />;
}

function AdminEstatesList({ navigate, role }: { navigate: ReturnType<typeof useNavigate>; role: AppRole | null }) {
  const [estates, setEstates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEstates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estates')
        .select('*, factories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstates(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load estates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstates();
  }, [fetchEstates]);

  const columns: ColumnDef<any>[] = [
    {
      header: "Estate Name",
      cell: (estate) => (
        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-400" />
          {estate.name}
        </div>
      )
    },
    {
      header: "Estate Code",
      cell: (estate) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
            {estate.estate_code || '—'}
          </span>
          {estate.estate_code && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(estate.estate_code)
                toast.success('Estate code copied!')
              }}
              className="p-1 text-slate-400 hover:text-blue-500 rounded transition-colors"
              title="Copy code"
            >
              <Copy size={14} />
            </button>
          )}
        </div>
      )
    },
    {
      header: "Status",
      cell: (estate) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          estate.status === 'active' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-inset ring-green-500/20' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20'
        }`}>
          {estate.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {estate.status}
        </span>
      )
    },
    {
      header: "Factory",
      cell: (estate) => (
        <span className="text-slate-600 dark:text-slate-400">
          {estate.factories?.name || '—'}
        </span>
      )
    },
    {
      header: "Created Date",
      cell: (estate) => <span className="text-slate-500">{new Date(estate.created_at).toLocaleDateString()}</span>
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right sticky right-0 bg-white dark:bg-slate-950 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]",
      cell: (estate) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/estates/${estate.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
            title="Manage Estate"
          >
            <ExternalLink size={13} /> Manage
          </button>
          {/* Edit visible only for admin and estate_manager */}
          {canManageEstate(role) && (
            <button 
              onClick={() => navigate(`/estates/edit/${estate.id}`)}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit Estate"
            >
              <Edit size={18} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            Estates Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage tea estates and provision modules.</p>
        </div>
        {/* Add Estate only for admin */}
        {isAdmin(role) && (
          <div className="flex gap-3">
            <button onClick={() => navigate('/estates/new')} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-blue-500/30 flex items-center gap-2">
              <Plus size={18} />
              Add Estate
            </button>
          </div>
        )}
      </div>

      <Card className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <DataTable
          columns={columns}
          data={estates}
          loading={loading}
          emptyMessage="No estates found."
        />
      </Card>
    </div>
  );
}
