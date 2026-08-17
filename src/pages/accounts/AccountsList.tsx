import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, UserCog, Archive, Trash2, CheckCircle2, XCircle, Edit, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin, canManageUsers } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function AccountsList() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const canManage = canManageUsers(role);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: '', // 'archive', 'delete', 'unarchive', 'force-logout'
    user: null as any
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Build base query — only show accounts that are not tied to an estate
      const buildQuery = () => {
        let q = supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', activeTab).is('estate_id', null);
        return q;
      };

      const { count, error: countError } = await buildQuery();
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase
        .from('users')
        .select('*')
        .eq('status', activeTab)
        .is('estate_id', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await dataQuery;
      if (error) throw error;
      
      const mappedUsers = data?.map(u => ({
        ...u,
        status: u.status ?? 'active'
      })) || [];

      setUsers(mappedUsers);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, role, profile?.estate_id]);

  const fetchPendingCount = async () => {
    try {
      let q = supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('estate_id', null);
      const { count } = await q;
      setPendingCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch pending count", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingCount();
  }, [fetchUsers]);

  // Reset page to 1 when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const openConfirmModal = (type: string, user: any) => {
    setConfirmModal({ show: true, type, user });
  };

  const handleConfirmAction = async () => {
    const { type, user } = confirmModal;
    if (!user) return;

    try {
      if (type === 'archive' || type === 'unarchive' || type === 'approve') {
        const newStatus = type === 'archive' ? 'inactive' : 'active';
        const { error } = await supabase
          .from('users')
          .update({ status: newStatus })
          .eq('id', user.id);
          
        if (error) throw error;
        toast.success(`Account ${type}d successfully`);
        fetchUsers();
        if (type === 'approve' || user.status === 'pending') fetchPendingCount();
      } else if (type === 'delete') {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
          
        if (error) throw error;
        toast.success('Account deleted successfully');
        fetchUsers();
        if (user.status === 'pending') fetchPendingCount();
      } else if (type === 'force-logout') {
        const { error } = await supabase.rpc('force_logout_user', { target_user_id: user.id });
        if (error) throw error;
        toast.success(`Forced logout successfully triggered for ${user.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error during ${type} operation`);
    } finally {
      setConfirmModal({ show: false, type: '', user: null });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "User",
      cell: (user) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
      )
    },
    {
      header: "Role",
      cell: (user) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 capitalize">
          {user.role.replace('_', ' ')}
        </span>
      )
    },
    {
      header: "Status",
      cell: (user) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          user.status === 'active' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-1 ring-inset ring-green-500/20' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20'
        }`}>
          {user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {user.status}
        </span>
      )
    },
    {
      header: "Factory",
      cell: (user) => (
        user.factory ? (
          <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">
            {user.factory}
          </span>
        ) : (
          <span className="text-slate-400">---</span>
        )
      )
    },
    {
      header: "Created Date",
      cell: (user) => <span className="text-slate-500">{new Date(user.created_at).toLocaleDateString()}</span>
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right sticky right-0 bg-white dark:bg-slate-950 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]",
      cell: (user) => (
        <div className="flex justify-end gap-2">
          {/* Edit — admin and estate_manager only */}
          {canManage && (
            <Link 
              to={`/accounts/edit/${user.id}`}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit User"
            >
              <Edit size={18} />
            </Link>
          )}
          {/* Approve pending — managers only */}
          {canManage && user.status === 'pending' && (
            <button 
              onClick={() => openConfirmModal('approve', user)}
              className="p-2 rounded-lg transition-colors text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              title="Approve User"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          {/* Archive / Unarchive — managers only */}
          {canManage && user.status !== 'pending' && (
            <button 
              onClick={() => openConfirmModal(user.status === 'active' ? 'archive' : 'unarchive', user)}
              className={`p-2 rounded-lg transition-colors ${
                user.status === 'active' 
                  ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                  : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
              title={user.status === 'active' ? 'Archive User' : 'Unarchive User'}
            >
              <Archive size={18} />
            </button>
          )}
          {/* Force Logout — managers only */}
          {canManage && user.status === 'active' && (
            <button 
              onClick={() => openConfirmModal('force-logout', user)}
              className="p-2 rounded-lg transition-colors text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              title="Force Logout User"
            >
              <LogOut size={18} />
            </button>
          )}
          {/* Delete — admin only */}
          {isAdmin(role) && (
            <button 
              onClick={() => openConfirmModal('delete', user)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete User permanently"
            >
              <Trash2 size={18} />
            </button>
          )}
          {/* Read-only indicator for non-managers */}
          {!canManage && (
            <span className="text-xs text-slate-400 px-2 py-1">View only</span>
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
            <UserCog className="w-6 h-6 text-blue-500" />
            Accounts Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage system access, roles, and user profiles.</p>
        </div>
        {/* Register User — admin only (estate users are added via EstateDetail invite modal) */}
        {isAdmin(role) && (
          <div className="flex gap-3">
            <Link to="/accounts/new" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-blue-500/30 flex items-center gap-2">
              <UserPlus size={18} />
              Register User
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-2 font-semibold text-sm transition-colors relative ${
            activeTab === 'active' 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Active Accounts
          {activeTab === 'active' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-2 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
            activeTab === 'pending' 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Pending
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
          {activeTab === 'pending' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`pb-4 px-2 font-semibold text-sm transition-colors relative ${
            activeTab === 'inactive' 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Archived Accounts
          {activeTab === 'inactive' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></span>
          )}
        </button>
      </div>

      <Card className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage={`No ${activeTab} users found.`}
          pagination={{
            page,
            pageSize,
            totalCount,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            }
          }}
        />
      </Card>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center p-4 mb-4 ${
                confirmModal.type === 'delete' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500' 
                  : confirmModal.type === 'archive'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500'
                    : confirmModal.type === 'force-logout'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500'
              }`}>
                {confirmModal.type === 'delete' ? <Trash2 size={32} /> : confirmModal.type === 'archive' ? <Archive size={32} /> : confirmModal.type === 'force-logout' ? <LogOut size={32} /> : <CheckCircle2 size={32} />}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                {confirmModal.type.replace('-', ' ')} Account
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                {confirmModal.type === 'delete' 
                  ? `Are you sure you want to permanently delete ${confirmModal.user?.name}'s account? This action cannot be undone.`
                  : confirmModal.type === 'archive'
                    ? `Archiving ${confirmModal.user?.name}'s account will disable their access but keep their data. Proceed?`
                    : confirmModal.type === 'force-logout'
                      ? `This will instantly terminate all active sessions for ${confirmModal.user?.name} and require them to sign in again. Proceed?`
                      : `Restoring ${confirmModal.user?.name}'s account will re-enable their system access. Proceed?`}
              </p>
              <div className="flex w-full gap-3 mt-1">
                <button
                  onClick={() => setConfirmModal({ show: false, type: '', user: null })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold shadow-lg transition-colors ${
                    confirmModal.type === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                      : confirmModal.type === 'archive'
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                        : confirmModal.type === 'force-logout'
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
