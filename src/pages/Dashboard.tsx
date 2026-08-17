import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Activity, Settings as SettingsIcon, Users, Truck, Building2, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isAdmin, isEstateRole } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

interface AdminStats {
  totalEstates: number;
  totalUsers: number;
  activeEstates: number;
}

interface EstateStats {
  estateName: string;
  estateStatus: string;
  estateCode: string;
  userCount: number;
  factoryName?: string;
}

export default function Dashboard() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [estateStats, setEstateStats] = useState<EstateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        if (isAdmin(role)) {
          // Admin: global counts
          const [{ count: estateCount }, { count: activeCount }, { count: userCount }] = await Promise.all([
            supabase.from('estates').select('*', { count: 'exact', head: true }),
            supabase.from('estates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          ]);
          setAdminStats({
            totalEstates: estateCount ?? 0,
            activeEstates: activeCount ?? 0,
            totalUsers: userCount ?? 0,
          });
        } else if (isEstateRole(role) && profile?.estate_id) {
          // Estate role: scoped estate info
          const [{ data: estate }, { count: userCount }] = await Promise.all([
            supabase
              .from('estates')
              .select('name, status, estate_code, factories(name)')
              .eq('id', profile.estate_id)
              .maybeSingle(),
            supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .eq('estate_id', profile.estate_id)
              .eq('status', 'active'),
          ]);
          if (estate) {
            setEstateStats({
              estateName: estate.name,
              estateStatus: estate.status,
              estateCode: estate.estate_code,
              userCount: userCount ?? 0,
              factoryName: (estate as any).factories?.name,
            });
          }
        }
      } catch (err) {
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [role, profile?.estate_id]);

  return (
    <div className="space-y-7 animate-in fade-in duration-500 pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {profile?.name?.split(' ')[0] ?? 'User'} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dateStr}</p>
          {isEstateRole(role) && estateStats && (
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Truck size={11} /> {estateStats.estateName} · {estateStats.estateCode}
            </span>
          )}
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Admin stats */}
        {isAdmin(role) && (
          <>
            <StatCard
              icon={<Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-50 dark:bg-blue-900/20"
              label="System Status"
              value="Online"
              loading={false}
            />
            <StatCard
              icon={<Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-50 dark:bg-purple-900/20"
              label="Total Estates"
              value={loading ? '—' : String(adminStats?.totalEstates ?? 0)}
              sub={loading ? undefined : `${adminStats?.activeEstates ?? 0} active`}
              loading={loading}
            />
            <StatCard
              icon={<Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-50 dark:bg-emerald-900/20"
              label="Active Users"
              value={loading ? '—' : String(adminStats?.totalUsers ?? 0)}
              loading={loading}
            />
          </>
        )}

        {/* Estate role stats */}
        {isEstateRole(role) && (
          <>
            <StatCard
              icon={<Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-50 dark:bg-blue-900/20"
              label="System Status"
              value="Online"
              loading={false}
            />
            <StatCard
              icon={<Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-50 dark:bg-purple-900/20"
              label="Estate Status"
              value={loading ? '—' : (estateStats?.estateStatus === 'active' ? 'Active' : 'Inactive')}
              sub={loading ? undefined : estateStats?.estateName}
              loading={loading}
            />
            <StatCard
              icon={<Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-50 dark:bg-emerald-900/20"
              label="Estate Users"
              value={loading ? '—' : String(estateStats?.userCount ?? 0)}
              sub="active members"
              loading={loading}
            />
            {estateStats?.factoryName && (
              <StatCard
                icon={<Building2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                iconBg="bg-amber-50 dark:bg-amber-900/20"
                label="Factory"
                value={estateStats.factoryName}
                loading={loading}
              />
            )}
          </>
        )}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          {/* Admin-only quick actions */}
          {isAdmin(role) && (
            <>
              <QuickAction to="/settings" icon={<SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Settings" />
              <QuickAction to="/accounts" icon={<UserCog className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Accounts" />
              <QuickAction to="/estates" icon={<Truck className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Estates" />
            </>
          )}

          {/* Estate Manager quick actions */}
          {role === 'estate_manager' && profile?.estate_id && (
            <>
              <QuickAction to={`/estates/${profile.estate_id}`} icon={<Truck className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="My Estate" />
              <QuickAction to="/accounts" icon={<UserCog className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Users" />
              <QuickAction to="/settings" icon={<SettingsIcon className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Settings" />
            </>
          )}

          {/* Estate Office quick actions */}
          {(role === 'estate_office') && profile?.estate_id && (
            <>
              <QuickAction to={`/estates/${profile.estate_id}`} icon={<Truck className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="My Estate" />
              <QuickAction to="/accounts" icon={<UserCog className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="Users" />
            </>
          )}

          {/* Field Officer / User quick actions */}
          {(role === 'field_officer' || role === 'user') && profile?.estate_id && (
            <QuickAction to={`/estates/${profile.estate_id}`} icon={<Truck className="w-6 h-6 text-slate-600 dark:text-slate-400 mb-2" />} label="My Estate" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub?: string
  loading: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`p-3 ${iconBg} rounded-2xl shrink-0`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className={`text-2xl font-black text-slate-900 dark:text-white ${loading ? 'animate-pulse' : ''}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all"
    >
      {icon}
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    </Link>
  );
}


