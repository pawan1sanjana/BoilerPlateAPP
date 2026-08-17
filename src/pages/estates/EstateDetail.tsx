import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Truck, Users, Settings, Copy, CheckCircle2, XCircle,
  UserPlus, Edit, Archive, Trash2, Check, LayoutGrid, Loader2,
  Save, RefreshCw, Shield, MapPin, Key
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { SUB_MODULES, type SubPermissionMatrix, ALL_MODULES } from '@/store/useModulePermissionsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin, canManageEstate, canManageUsers, canConfigureModules, canAccessEstate, getRoleOptions } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import EstateStructureTab from './EstateStructureTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'structure', label: 'Structure', icon: MapPin },
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'modules', label: 'Module Access', icon: Settings },
] as const;
type Tab = typeof TABS[number]['id'];

const ROLES_TO_CONFIGURE = ['estate_manager', 'estate_office', 'field_officer', 'user'] as const;

const ROLE_COLORS: Record<string, string> = {
  estate_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  estate_office: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  field_officer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ── Invite User Modal ──────────────────────────────────────────────────────────
function InviteUserModal({ estate, onClose, onCreated, currentRole }: { estate: any; onClose: () => void; onCreated: () => void; currentRole: AppRole | null }) {
  const [form, setForm] = useState({ name: '', username: '', phone: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const roleOptions = getRoleOptions(currentRole).filter(r => r.value !== 'admin');

  // Synthetic email = {username}@{estateCode.toLowerCase()}.local
  const syntheticEmail = form.username.trim()
    ? `${form.username.trim().toLowerCase()}@${(estate.estate_code || 'estate').toLowerCase()}.local`
    : '';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.password) return toast.error('Name, username, and password are required.');
    if (!/^[a-z0-9_]+$/.test(form.username)) return toast.error('Username can only contain lowercase letters, numbers, and underscores.');
    setSaving(true);
    try {
      // Check if username already exists in this estate
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('estate_id', estate.id)
        .eq('username', form.username.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        toast.error('This username is already taken in this estate. Please choose another.');
        setSaving(false);
        return;
      }

      // Use the create-user Edge Function to bypass email confirmation
      // This creates the Supabase auth user as already-confirmed (no email needed)
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          email: syntheticEmail,
          password: form.password,
          data: { full_name: form.name }
        }
      });

      if (fnError || fnData?.error) {
        const msg = fnData?.error || fnError?.message || 'Failed to create auth user'
        throw new Error(msg)
      }

      const userId = fnData?.user?.user?.id;
      if (!userId) throw new Error('Could not get new user ID from server.');

      // Create the public.users profile row
      const { error: profileError } = await supabase.from('users').upsert({
        id: userId,
        name: form.name,
        email: syntheticEmail,
        username: form.username.trim().toLowerCase(),
        phone: form.phone || null,
        role: form.role,
        estate_id: estate.id,
        status: 'active',
      });
      if (profileError) throw profileError;

      toast.success(`Account for ${form.name} created! They can log in immediately.`);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Invite User to Estate</h3>
        <p className="text-xs text-slate-500 mb-5">Users log in with their <span className="font-semibold text-blue-600">username</span> + password (no email needed).</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input type="text" required placeholder="John Silva" value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Username <span className="text-xs text-slate-400 font-normal">(used to log in)</span>
            </label>
            <input type="text" required placeholder="john_silva" value={form.username}
              onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono" />
            {syntheticEmail && (
              <p className="text-[11px] text-slate-400">Internal ID: <span className="font-mono text-blue-500">{syntheticEmail}</span></p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone (optional)</label>
            <input type="tel" placeholder="+94 71 234 5678" value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input type="password" required placeholder="••••••••" value={form.password}
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
            <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              {roleOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Login instructions card */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-blue-700 dark:text-blue-400">Login credentials to share:</p>
            <p>Estate Code: <span className="font-mono font-bold">{estate.estate_code || '—'}</span></p>
            <p>Username: <span className="font-mono font-bold">{form.username || '—'}</span></p>
            <p>Password: <span className="italic">as set above</span></p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters.');
    
    setSaving(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: user.id,
          password: password,
        }
      });

      if (fnError || fnData?.error) {
        const msg = fnData?.error || fnError?.message || 'Failed to update password';
        throw new Error(msg);
      }

      toast.success(`Password for ${user.name} has been updated.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Reset Password</h3>
        <p className="text-xs text-slate-500 mb-5">Change password for <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span> ({user.username}).</p>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
            <input type="password" required minLength={6} placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}


// ── Main Estate Detail Page ───────────────────────────────────────────────────
export default function EstateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentProfile = useAuthStore(s => s.profile);
  const currentRole = currentProfile?.role as AppRole | null;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Estate data
  const [estate, setEstate] = useState<any>(null);
  const [loadingEstate, setLoadingEstate] = useState(true);

  // Accounts
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: any } | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);

  // Modules
  const [draftModules, setDraftModules] = useState<SubPermissionMatrix>({} as SubPermissionMatrix);
  const [savingModules, setSavingModules] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(ROLES_TO_CONFIGURE));

  // Inline edit for overview
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    status: 'active',
    has_divisions: true,
    latitude: '',
    longitude: '',
    location_name: ''
  });

  const fetchEstate = useCallback(async () => {
    if (!id) return;
    setLoadingEstate(true);
    try {
      const { data, error } = await supabase.from('estates').select('*, factories(name)').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) { navigate('/estates'); return; }

      // Check if user has access to this estate
      if (!isAdmin(currentRole) && !canAccessEstate(currentRole, currentProfile?.estate_id, data.id)) {
        toast.error('You do not have permission to view this estate.');
        navigate('/dashboard');
        return;
      }

      setEstate(data);
      setDraftModules(data.provisioned_modules || {});
      setEditForm({
        name: data.name,
        status: data.status,
        has_divisions: data.has_divisions ?? true,
        latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '',
        longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '',
        location_name: data.location_name || ''
      });
    } catch {
      toast.error('Failed to load estate');
      navigate('/estates');
    } finally {
      setLoadingEstate(false);
    }
  }, [id, navigate]);

  const fetchUsers = useCallback(async () => {
    if (!id) return;
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('estate_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [id]);

  useEffect(() => { fetchEstate(); }, [fetchEstate]);
  useEffect(() => { if (activeTab === 'accounts') fetchUsers(); }, [activeTab, fetchUsers]);

  // ── Overview Save ──
  const saveOverview = async () => {
    if (!editForm.name.trim()) return toast.error('Estate name is required');
    try {
      const updateData = {
        name: editForm.name,
        status: editForm.status,
        has_divisions: editForm.has_divisions,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
        location_name: editForm.location_name || null,
      };

      const { error } = await supabase.from('estates').update(updateData).eq('id', id!);
      if (error) throw error;
      setEstate((prev: any) => ({ ...prev, ...updateData }));
      setEditing(false);
      toast.success('Estate updated');
    } catch {
      toast.error('Failed to update estate');
    }
  };

  // ── Module Save ──
  const saveModules = async () => {
    setSavingModules(true);
    try {
      const { error } = await supabase.from('estates').update({ provisioned_modules: draftModules }).eq('id', id!);
      if (error) throw error;
      toast.success('Module access saved');
    } catch {
      toast.error('Failed to save module access');
    } finally {
      setSavingModules(false);
    }
  };

  const toggleSubModule = (role: string, subKey: string) => {
    setDraftModules(prev => {
      const current = new Set(prev[role as keyof SubPermissionMatrix] ?? []);
      if (current.has(subKey)) current.delete(subKey); else current.add(subKey);
      return { ...prev, [role]: Array.from(current) };
    });
  };

  // ── Account Actions ──
  const handleUserAction = async (type: string, user: any) => {
    try {
      if (type === 'archive') {
        await supabase.from('users').update({ status: 'inactive' }).eq('id', user.id);
        toast.success('Account archived');
      } else if (type === 'activate') {
        await supabase.from('users').update({ status: 'active' }).eq('id', user.id);
        toast.success('Account activated');
      } else if (type === 'approve') {
        await supabase.from('users').update({ status: 'active' }).eq('id', user.id);
        toast.success('Account approved');
      } else if (type === 'delete') {
        await supabase.from('users').delete().eq('id', user.id);
        toast.success('Account deleted');
      }
      fetchUsers();
    } catch {
      toast.error(`Failed to ${type} account`);
    } finally {
      setConfirmAction(null);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "User",
      cell: (user) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
          <div className="text-xs text-slate-400">{user.email}</div>
        </div>
      )
    },
    {
      header: "Role",
      cell: (user) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[user.role] || ROLE_COLORS.user}`}>
          {(user.role || 'user').replace(/_/g, ' ')}
        </span>
      )
    },
    {
      header: "Status",
      cell: (user) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          user.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : user.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {user.status}
        </span>
      )
    },
    {
      header: "Joined",
      cell: (user) => <span className="text-slate-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</span>
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right sticky right-0 bg-white dark:bg-slate-950 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]",
      cell: (user) => (
        <div className="flex justify-end gap-1">
          {canManageUsers(currentRole) && (
            <Link
              to={`/accounts/edit/${user.id}`}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit user"
            >
              <Edit size={15} />
            </Link>
          )}
          {canManageUsers(currentRole) && (
            <button
              onClick={() => setResetPasswordUser(user)}
              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Reset Password"
            >
              <Key size={15} />
            </button>
          )}
          {canManageUsers(currentRole) && user.status === 'pending' && (
            <button onClick={() => setConfirmAction({ type: 'approve', user })} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Approve">
              <Check size={15} />
            </button>
          )}
          {canManageUsers(currentRole) && user.status === 'active' ? (
            <button onClick={() => setConfirmAction({ type: 'archive', user })} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Archive">
              <Archive size={15} />
            </button>
          ) : canManageUsers(currentRole) && user.status === 'inactive' ? (
            <button onClick={() => setConfirmAction({ type: 'activate', user })} className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Activate">
              <CheckCircle2 size={15} />
            </button>
          ) : null}
          {isAdmin(currentRole) && (
            <button onClick={() => setConfirmAction({ type: 'delete', user })} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
              <Trash2 size={15} />
            </button>
          )}
          {!canManageUsers(currentRole) && <span className="text-xs text-slate-400 px-2">View only</span>}
        </div>
      )
    }
  ];

  if (loadingEstate) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!estate) return null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link to="/estates" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-500" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{estate.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                estate.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {estate.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                {estate.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              <span className="text-slate-400">Estate Code: </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{estate.estate_code || '—'}</span>
              {estate.estate_code && (
                <button onClick={() => { navigator.clipboard.writeText(estate.estate_code); toast.success('Copied!'); }} className="ml-1.5 text-slate-400 hover:text-blue-500 inline-flex items-center">
                  <Copy size={12} />
                </button>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.id === 'accounts' && users.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full">
                {users.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Overview */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <Card className="rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estate Information</h2>
            {!editing ? (
              canManageEstate(currentRole) && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Edit size={14} /> Edit
                </button>
              )
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={saveOverview} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  <Save size={14} /> Save
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estate Name</p>
              {editing ? (
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              ) : (
                <p className="font-semibold text-slate-900 dark:text-white">{estate.name}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
              {editing ? (
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  estate.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {estate.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {estate.status}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Structure</p>
              {editing ? (
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.has_divisions}
                    onChange={e => setEditForm(prev => ({ ...prev, has_divisions: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Uses Divisions</span>
                </label>
              ) : (
                <p className="font-medium text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                  {estate.has_divisions !== false ? (
                    <><CheckCircle2 size={14} className="text-green-500" /> Has Divisions</>
                  ) : (
                    <><XCircle size={14} className="text-amber-500" /> Direct to Field Blocks</>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estate Code</p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg text-sm tracking-widest">
                  {estate.estate_code || '—'}
                </span>
                {estate.estate_code && (
                  <button onClick={() => { navigator.clipboard.writeText(estate.estate_code); toast.success('Copied!'); }} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Copy size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">Share this code with estate users for login</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm">{new Date(estate.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Factory</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm">{estate.factories?.name || '—'}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{users.length || '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Total Users</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{users.filter(u => u.status === 'active').length || '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Active Users</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{users.filter(u => u.status === 'pending').length || '—'}</div>
                <div className="text-xs text-slate-500 mt-1">Pending Approval</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Structure */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'structure' && (
        <EstateStructureTab estate={estate} currentRole={currentRole} />
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Accounts */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} in this estate</p>
            {canManageUsers(currentRole) && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
              >
                <UserPlus size={15} /> Invite User
              </button>
            )}
          </div>

          <Card className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <DataTable
              columns={columns}
              data={users}
              loading={loadingUsers}
              emptyMessage="No users yet. Invite users to this estate using the button above, or users can self-register with the estate code."
            />
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Module Access */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Configure which modules each role can access in this estate.</p>
            {canConfigureModules(currentRole) && (
              <button onClick={saveModules} disabled={savingModules} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 active:scale-95 transition-all shadow-sm">
                {savingModules ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savingModules ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          {ROLES_TO_CONFIGURE.map(role => {
            const isExpanded = expandedRoles.has(role);
            const roleModules = new Set(draftModules[role as keyof SubPermissionMatrix] ?? []);
            const totalSubs = SUB_MODULES.length;
            const enabledSubs = SUB_MODULES.filter(s => roleModules.has(s.key)).length;

            return (
              <Card key={role} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedRoles(prev => {
                    const next = new Set(prev);
                    next.has(role) ? next.delete(role) : next.add(role);
                    return next;
                  })}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={16} className="text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white capitalize">{role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-slate-400">{enabledSubs} of {totalSubs} sub-modules enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(enabledSubs / totalSubs) * 100}%` }} />
                    </div>
                    <RefreshCw size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                    <div className="mb-3 flex justify-end gap-2">
                      {canConfigureModules(currentRole) && (
                        <>
                          <button type="button" onClick={() => {
                            const allKeys = SUB_MODULES.map(s => s.key);
                            setDraftModules(prev => ({ ...prev, [role]: allKeys }));
                          }} className="text-xs px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium">
                            Enable All
                          </button>
                          <button type="button" onClick={() => {
                            setDraftModules(prev => ({ ...prev, [role]: [] }));
                          }} className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium">
                            Disable All
                          </button>
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      {ALL_MODULES.map(mod => {
                        const modSubs = SUB_MODULES.filter(s => s.moduleKey === mod.key);
                        if (modSubs.length === 0) return null;
                        return (
                          <div key={mod.key}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{mod.label}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {modSubs.map(sub => (
                                <label key={sub.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={roleModules.has(sub.key)}
                                    disabled={!canConfigureModules(currentRole)}
                                    onChange={() => canConfigureModules(currentRole) && toggleSubModule(role, sub.key)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className={`text-sm ${canConfigureModules(currentRole) ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>{sub.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInviteModal && (
        <InviteUserModal 
          estate={estate} 
          currentRole={currentRole}
          onClose={() => setShowInviteModal(false)} 
          onCreated={() => {
            fetchUsers();
            setShowInviteModal(false);
          }} 
        />
      )}

      {/* ── Reset Password Modal ── */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {/* ── Confirm Action Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {confirmAction.type === 'delete' ? <Trash2 size={22} className="text-red-500" /> : <Archive size={22} className="text-amber-500" />}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white capitalize">{confirmAction.type} Account?</p>
              <p className="text-sm text-slate-500 mt-1">Are you sure you want to {confirmAction.type} <strong>{confirmAction.user.name}</strong>?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button
                onClick={() => handleUserAction(confirmAction.type, confirmAction.user)}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-medium transition-colors ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                Confirm
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
