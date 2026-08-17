import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, Leaf, Droplets, Calendar, Map as MapIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface FieldDataProps {
  selectedBlockId?: string;
  blockName?: string;
  onDataUpdate?: (data: any) => void;
  blocks?: any[];
}

const getBlockArea = (block: any) => {
  if (!block.polygon_coordinates) return 0;
  
  let latLngs: [number, number][] = [];
  try {
    let polyData = block.polygon_coordinates;
    if (typeof polyData === 'string') polyData = JSON.parse(polyData);
    let rawCoords = null;
    if (polyData?.type === 'Feature' && polyData.geometry?.type === 'Polygon') {
      rawCoords = polyData.geometry.coordinates[0];
    } else if (polyData?.type === 'Polygon') {
      rawCoords = polyData.coordinates[0];
    } else if (Array.isArray(polyData)) {
      rawCoords = polyData;
    }
    if (rawCoords?.length > 0) {
      latLngs = rawCoords.map((c: any) => {
        if (c?.lat && (c?.lng || c?.lon)) return [c.lat, c.lng || c.lon];
        if (Array.isArray(c) && c.length >= 2) return typeof c[0] === 'number' ? [c[1], c[0]] : null;
        return null;
      }).filter(Boolean);
    }
  } catch(e) { return 0; }
  
  if (latLngs.length < 3) return 0;
  let area = 0;
  const R = 6378137;
  for (let i = 0; i < latLngs.length; i++) {
    const p1 = latLngs[i];
    const p2 = latLngs[(i + 1) % latLngs.length];
    const lat1 = p1[0] * Math.PI / 180;
    const lng1 = p1[1] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const lng2 = p2[1] * Math.PI / 180;
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * R * R / 2) / 10000;
};

export default function FieldData({ selectedBlockId, blockName, onDataUpdate, blocks = [] }: FieldDataProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [computedArea, setComputedArea] = useState<number>(0);
  const [formData, setFormData] = useState({
    clone: '',
    year_of_planting: '',
    soil_type: '',
  });

  useEffect(() => {
    if (!selectedBlockId) return;

    const fetchBlockDetails = async () => {
      setLoading(true);
      setIsEditing(false); // Reset edit mode on block change
      try {
        if (selectedBlockId === 'all') {
          const totalArea = blocks.reduce((sum, b) => sum + getBlockArea(b), 0);
          setComputedArea(totalArea);
          setFormData({
            clone: 'Multiple Clones',
            year_of_planting: 'Various',
            soil_type: 'Various',
          });
        } else {
          const { data, error } = await supabase
            .from('field_blocks')
            .select('*')
            .eq('id', selectedBlockId)
            .single();

          if (error) throw error;

          setComputedArea(getBlockArea(data));

          setFormData({
            clone: data?.clone || '',
            year_of_planting: data?.year_of_planting?.toString() || '',
            soil_type: data?.soil_type || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch block details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlockDetails();
  }, [selectedBlockId, blocks]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!selectedBlockId) return;
    setSaving(true);
    try {
      const updates = {
        clone: formData.clone || null,
        year_of_planting: formData.year_of_planting ? parseInt(formData.year_of_planting) : null,
        soil_type: formData.soil_type || null,
      };

      const { error } = await supabase
        .from('field_blocks')
        .update(updates)
        .eq('id', selectedBlockId);

      if (error) throw error;
      toast.success('Block details updated successfully');
      setIsEditing(false);
      onDataUpdate?.({ type: 'details_updated', blockId: selectedBlockId, ...updates });
    } catch (error: any) {
      toast.error('Failed to update details: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-blue-500" />
            Block Details {blockName ? `- ${blockName}` : ''}
          </h3>
          
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Details
              </button>
            </div>
          ) : (
            selectedBlockId !== 'all' && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Details
              </button>
            )
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Leaf size={16} className="text-emerald-500" /> Clone
              </label>
              <input
                type="text"
                name="clone"
                value={formData.clone}
                onChange={handleChange}
                placeholder="e.g. TRI 2025"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" /> Year of Planting (YOP)
              </label>
              <input
                type="number"
                name="year_of_planting"
                value={formData.year_of_planting}
                onChange={handleChange}
                placeholder="e.g. 2015"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Droplets size={16} className="text-amber-500" /> Soil Type
              </label>
              <select
                name="soil_type"
                value={formData.soil_type}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="">Select Soil Type</option>
                <option value="clay">Clay</option>
                <option value="loam">Loam</option>
                <option value="sandy_loam">Sandy Loam</option>
                <option value="lateritic">Lateritic</option>
                <option value="red_yellow_podzolic">Red-Yellow Podzolic</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <MapIcon size={16} className="text-indigo-500" /> Area (Hectares)
              </label>
              <div className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed flex justify-between items-center">
                <span>{computedArea > 0 ? computedArea.toFixed(2) : 'Not mapped'}</span>
                <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">Auto-detected</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Leaf size={16} className="text-emerald-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Clone</span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{formData.clone || '-'}</p>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-blue-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Year of Planting</span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{formData.year_of_planting || '-'}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Droplets size={16} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Soil Type</span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white capitalize">{formData.soil_type ? formData.soil_type.replace(/_/g, ' ') : '-'}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <MapIcon size={16} className="text-indigo-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Area (Hectares)</span>
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{computedArea > 0 ? computedArea.toFixed(2) : '-'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Environmental data placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center">
         <p className="text-slate-500 text-sm">
           Environmental health metrics and weather history visualizations will appear here.
         </p>
         <button 
           onClick={() => onDataUpdate?.({ test: true, blockId: selectedBlockId })}
           className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
         >
           Test Data Update
         </button>
      </div>
    </div>
  );
}
