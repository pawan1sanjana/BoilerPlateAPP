import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Loader2 } from 'lucide-react';
import FieldData from '../../components/GISMapping/FieldData';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

import toast from 'react-hot-toast';

export default function FieldDataPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [estates, setEstates] = useState<any[]>([]);

  useEffect(() => {
    const fetchEstates = async () => {
      try {
        const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
        if (!error && data) setEstates(data);
      } catch (err) {
        console.error('Failed to load estates:', err);
      }
    };
    fetchEstates();
  }, []);

  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!isUserAdmin && !profile?.estate_id) return;
      setLoading(true);
      try {
        let query = supabase
          .from('field_blocks')
          .select('id, name, divisions(name)')
          .order('name');
          
        if (selectedEstateFilter !== 'all') {
          query = query.eq('estate_id', selectedEstateFilter);
        } else if (!isUserAdmin && profile?.estate_id) {
          query = query.eq('estate_id', profile.estate_id);
        }
          
        const { data, error } = await query;
        if (error) throw error;
        setBlocks(data || []);
        if (data && data.length > 0) {
          setSelectedBlockId('all');
        } else {
          setSelectedBlockId(null);
        }
      } catch (error) {
        console.error('Failed to fetch blocks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlocks();
  }, [profile?.estate_id, selectedEstateFilter, isUserAdmin]);

  const handleDataUpdate = async (data: any) => {
    if (data.type === 'details_updated') return;
    
    try {
      const testData = {
        block_id: data.blockId,
        temperature: parseFloat((20 + Math.random() * 10).toFixed(1)),
        humidity: parseFloat((60 + Math.random() * 30).toFixed(1)),
        soil_moisture: parseFloat((40 + Math.random() * 20).toFixed(1)),
        precipitation: Math.random() > 0.7 ? parseFloat((Math.random() * 10).toFixed(1)) : 0
      };
      
      const { error } = await supabase
        .from('block_environmental_data')
        .insert(testData);
        
      if (error) throw error;
      toast.success('Test weather data added successfully!');
      console.log('Weather data added:', testData);
    } catch (err: any) {
      console.error('Failed to add weather data:', err);
      toast.error('Failed to add weather data. Did you apply the migration?');
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="animate-fade-in relative space-y-6 p-4 sm:p-0 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            Field Data Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Environmental health metrics, soil mapping, and 5-day weather history
          </p>
        </div>
        
        {/* Block Selector */}
        <div className="flex items-center gap-3">
          {isUserAdmin ? (
            <select
              value={selectedEstateFilter}
              onChange={(e) => setSelectedEstateFilter(e.target.value)}
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none"
            >
              <option value="all">All Estates</option>
              {estates.map(estate => (
                <option key={estate.id} value={estate.id}>{estate.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={profile?.estate_id || ''}
              disabled
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none opacity-70 cursor-not-allowed"
            >
              {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                <option key={estate.id} value={estate.id}>{estate.name}</option>
              ))}
              {!estates.find(e => e.id === profile?.estate_id) && (
                <option value={profile?.estate_id || ''}>Assigned Estate</option>
              )}
            </select>
          )}

          <span className="text-sm font-medium text-slate-500">Block:</span>
          <div className="relative">
            <select
              value={selectedBlockId || ''}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              disabled={loading || blocks.length === 0}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <option value="">Loading blocks...</option>
              ) : blocks.length === 0 ? (
                <option value="">No blocks available</option>
              ) : (
                <>
                  <option value="all">All Blocks</option>
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name} {block.divisions?.name ? `(${block.divisions.name})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {selectedBlockId ? (
          <FieldData 
            selectedBlockId={selectedBlockId} 
            blockName={selectedBlockId === 'all' ? 'All Blocks' : selectedBlock?.name} 
            onDataUpdate={handleDataUpdate}
            blocks={blocks}
          />
        ) : (
          <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm">Please select a block to view field data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
