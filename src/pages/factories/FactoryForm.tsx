import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';

function generateFactoryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function FactoryForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: generateFactoryCode(),
    status: 'active'
  });

  useEffect(() => {
    if (isEditing) {
      const fetchFactory = async () => {
        try {
          const { data, error } = await supabase.from('factories').select('*').eq('id', id).maybeSingle();
          if (error) throw error;
          if (data) {
            setFormData({
              name: data.name,
              code: data.code || '',
              status: data.status
            });
          } else {
            toast.error('Factory not found');
            navigate('/factories');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load factory');
          navigate('/factories');
        } finally {
          setLoading(false);
        }
      };
      fetchFactory();
    }
  }, [id, isEditing, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Factory name is required');
    if (!formData.code) return toast.error('Factory code is required');

    setSaving(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('factories')
          .update({
            name: formData.name,
            code: formData.code.toUpperCase().trim(),
            status: formData.status
          })
          .eq('id', id);
        if (error) throw error;
        toast.success('Factory updated successfully');
      } else {
        const { error } = await supabase
          .from('factories')
          .insert({
            name: formData.name,
            code: formData.code.toUpperCase().trim(),
            status: formData.status
          });
        if (error) throw error;
        toast.success('Factory created successfully');
      }
      navigate('/factories');
    } catch (err: any) {
      console.error(err);
      if (err.code === '23505') {
        toast.error('That factory code is already in use. Please choose a different one.');
      } else {
        toast.error('Error saving factory');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/factories" className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" />
            {isEditing ? 'Edit Factory' : 'Add New Factory'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Update factory details.' : 'Create a new tea factory.'}
          </p>
        </div>
      </div>

      <Card className="w-full rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Factory Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Factory Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Bogawantalawa Processing Center"
            />
          </div>

          {/* Factory Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Factory Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest font-bold uppercase"
                placeholder="e.g. BGAWNT"
                maxLength={10}
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, code: generateFactoryCode() })}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                title="Generate new code"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">A unique short code for the factory.</p>
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

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/factories')}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Factory')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
