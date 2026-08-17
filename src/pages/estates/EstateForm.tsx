import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Shield, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { SUB_MODULES, type SubPermissionMatrix } from '@/store/useModulePermissionsStore';

function generateEstateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function EstateForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [factories, setFactories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    estate_code: generateEstateCode(),
    status: 'active',
    has_divisions: true,
    factory_id: '',
    latitude: '',
    longitude: '',
    location_name: '',
    provisioned_modules: {
      admin: SUB_MODULES.map(s => s.key),
      estate_manager: ['dashboard'],
      estate_office: ['dashboard'],
      field_officer: ['dashboard'],
      user: ['dashboard']
    } as SubPermissionMatrix
  });

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by your browser');
    toast.loading('Detecting GPS location...', { id: 'gps-load' });
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lon.toFixed(6) }));
        toast.success(`GPS Location set: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, { id: 'gps-load' });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then(r => r.json())
          .then(d => {
            if (d?.address) {
              const loc = d.address.city || d.address.town || d.address.village || d.address.county || '';
              if (loc) setFormData(prev => ({ ...prev, location_name: loc }));
            }
          })
          .catch(() => {});
      },
      err => {
        toast.error('Failed to get location: ' + err.message, { id: 'gps-load' });
      }
    );
  };

  useEffect(() => {
    const fetchFactories = async () => {
      try {
        const { data, error } = await supabase.from('factories').select('id, name').order('name');
        if (!error && data) {
          setFactories(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFactories();

    if (isEditing) {
      const fetchEstate = async () => {
        try {
          const { data, error } = await supabase.from('estates').select('*').eq('id', id).maybeSingle();
          if (error) throw error;
          if (data) {
            setFormData({
              name: data.name,
              estate_code: data.estate_code || '',
              status: data.status,
              has_divisions: data.has_divisions ?? true,
              factory_id: data.factory_id || '',
              latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : '',
              longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : '',
              location_name: data.location_name || '',
              provisioned_modules: data.provisioned_modules || {}
            });
          } else {
            toast.error('Estate not found');
            navigate('/estates');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load estate');
          navigate('/estates');
        } finally {
          setLoading(false);
        }
      };
      fetchEstate();
    }
  }, [id, isEditing, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Estate name is required');
    if (!formData.estate_code) return toast.error('Estate code is required');

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        estate_code: formData.estate_code.toUpperCase().trim(),
        status: formData.status,
        has_divisions: formData.has_divisions,
        factory_id: formData.factory_id || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        location_name: formData.location_name || null,
        provisioned_modules: formData.provisioned_modules
      };

      if (isEditing) {
        const { error } = await supabase
          .from('estates')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        toast.success('Estate updated successfully');
      } else {
        const { error } = await supabase
          .from('estates')
          .insert(payload);
        if (error) throw error;
        toast.success('Estate created successfully');
      }
      navigate('/estates');
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        toast.error('That estate code is already in use. Please choose a different one.');
      } else {
        toast.error('Error saving estate');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleAccess = (role: string, subKey: string) => {
    setFormData(prev => {
      const roleModules = prev.provisioned_modules[role as keyof SubPermissionMatrix] || [];
      const updatedRoleModules = roleModules.includes(subKey)
        ? roleModules.filter(k => k !== subKey)
        : [...roleModules, subKey];

      return {
        ...prev,
        provisioned_modules: {
          ...prev.provisioned_modules,
          [role]: updatedRoleModules
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/estates" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            {isEditing ? 'Edit Estate' : 'Add New Estate'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Update estate details and provision modules.' : 'Create a new tea estate and provision modules.'}
          </p>
        </div>
      </div>

      <Card className="w-full rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Estate Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estate Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Bogawantalawa Tea Estate"
            />
          </div>

          {/* Assigned Factory */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigned Factory</label>
            <select
              value={formData.factory_id}
              onChange={e => setFormData({ ...formData, factory_id: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">None (Standalone Estate)</option>
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Estate Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Estate Code
              <span className="ml-2 text-xs text-slate-400 font-normal">Users enter this code when logging in</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.estate_code}
                onChange={e => setFormData({ ...formData, estate_code: e.target.value.toUpperCase() })}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest font-bold uppercase"
                placeholder="e.g. BOGAWANT"
                maxLength={12}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, estate_code: generateEstateCode() })}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                title="Generate new code"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">Share this code with estate users so they can log in. Keep it private.</p>
          </div>

          {/* GPS Location & Weather Station Coordinates */}
          <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">GPS Coordinates (Weather Module)</h3>
                <p className="text-xs text-slate-500">Latitude & Longitude used to fetch precise estate weather forecasts.</p>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                Detect Current GPS
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="e.g. 6.9312"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="e.g. 80.7923"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Location / Region Name</label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={e => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="e.g. Nuwara Eliya Highlands"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Has Divisions Toggle */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <div className="flex h-6 items-center">
                <input
                  type="checkbox"
                  checked={formData.has_divisions}
                  onChange={e => setFormData({ ...formData, has_divisions: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Use Divisions Structure</p>
                <p className="text-xs text-slate-500 mt-1">
                  Check this if the estate is organized into Divisions which then contain Field Blocks. Uncheck if Field Blocks are managed directly under the Estate.
                </p>
              </div>
            </label>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Module Provisioning */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Module Provisioning</h3>
            
            {['estate_manager', 'estate_office', 'field_officer', 'user'].map(role => (
              <div key={role} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{role.replace('_', ' ')} Role Access</h4>
                <div className="grid grid-cols-2 gap-2">
                  {SUB_MODULES.map(sub => (
                    <label key={sub.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.provisioned_modules[role as keyof SubPermissionMatrix] || []).includes(sub.key)}
                        onChange={() => toggleModuleAccess(role, sub.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{sub.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/estates')}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Estate')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
