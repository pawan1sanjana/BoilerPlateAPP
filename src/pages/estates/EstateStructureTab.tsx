import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Loader2, MapPin, Grid, Layers, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { canManageEstate } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

interface EstateStructureTabProps {
  estate: any;
  currentRole: AppRole | null;
}

export default function EstateStructureTab({ estate, currentRole }: EstateStructureTabProps) {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  // Forms
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [divisionForm, setDivisionForm] = useState({ name: '', status: 'active' });
  const [editingDivision, setEditingDivision] = useState<string | null>(null);

  const [showAddBlock, setShowAddBlock] = useState<string | null>(null); // division_id or 'estate'
  const [blockForm, setBlockForm] = useState({ name: '', status: 'active' });
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  const canEdit = canManageEstate(currentRole);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (estate.has_divisions) {
        const { data: divData, error: divError } = await supabase
          .from('divisions')
          .select('*')
          .eq('estate_id', estate.id)
          .order('name');
        if (divError) throw divError;
        setDivisions(divData || []);
      }

      const { data: blkData, error: blkError } = await supabase
        .from('field_blocks')
        .select('*')
        .eq('estate_id', estate.id)
        .order('name');
      if (blkError) throw blkError;
      setBlocks(blkData || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load structure data');
    } finally {
      setLoading(false);
    }
  }, [estate.id, estate.has_divisions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDivision = (id: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Handlers for Divisions ──
  const saveDivision = async (id?: string) => {
    if (!divisionForm.name.trim()) return toast.error('Name required');
    try {
      if (id) {
        const { error } = await supabase.from('divisions').update(divisionForm).eq('id', id);
        if (error) throw error;
        toast.success('Division updated');
        setEditingDivision(null);
      } else {
        const { error } = await supabase.from('divisions').insert({ ...divisionForm, estate_id: estate.id });
        if (error) throw error;
        toast.success('Division added');
        setShowAddDivision(false);
      }
      setDivisionForm({ name: '', status: 'active' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving division');
    }
  };

  const deleteDivision = async (id: string) => {
    if (!confirm('Delete this division and ALL its field blocks?')) return;
    try {
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Division deleted');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete division');
    }
  };

  // ── Handlers for Field Blocks ──
  const saveBlock = async (division_id: string | null, id?: string) => {
    if (!blockForm.name.trim()) return toast.error('Name required');
    try {
      if (id) {
        const { error } = await supabase.from('field_blocks').update(blockForm).eq('id', id);
        if (error) throw error;
        toast.success('Block updated');
        setEditingBlock(null);
      } else {
        const { error } = await supabase.from('field_blocks').insert({
          ...blockForm,
          estate_id: estate.id,
          division_id
        });
        if (error) throw error;
        toast.success('Block added');
        setShowAddBlock(null);
      }
      setBlockForm({ name: '', status: 'active' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving block');
    }
  };

  const deleteBlock = async (id: string) => {
    if (!confirm('Delete this field block?')) return;
    try {
      const { error } = await supabase.from('field_blocks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Block deleted');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete block');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  // Common render function for blocks
  const renderBlocks = (division_id: string | null) => {
    const parentId = division_id || 'estate';
    const divisionBlocks = blocks.filter(b => b.division_id === division_id);
    
    return (
      <div className="space-y-2 mt-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
        {divisionBlocks.length === 0 && !showAddBlock && (
          <p className="text-sm text-slate-400 italic">No field blocks yet.</p>
        )}
        
        {divisionBlocks.map(block => (
          <div key={block.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {editingBlock === block.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input autoFocus value={blockForm.name} onChange={e => setBlockForm({ ...blockForm, name: e.target.value })} className="flex-1 text-sm px-2 py-1 border rounded border-slate-300 dark:border-slate-700 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <select value={blockForm.status} onChange={e => setBlockForm({ ...blockForm, status: e.target.value })} className="text-sm px-2 py-1 border rounded border-slate-300 dark:border-slate-700 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button onClick={() => saveBlock(division_id, block.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save size={16} /></button>
                <button onClick={() => setEditingBlock(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Grid size={16} className="text-green-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{block.name}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${block.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {block.status}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => { setBlockForm({ name: block.name, status: block.status }); setEditingBlock(block.id); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => deleteBlock(block.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {showAddBlock === parentId ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed mt-2">
            <input autoFocus placeholder="Block name" value={blockForm.name} onChange={e => setBlockForm({ ...blockForm, name: e.target.value })} className="flex-1 text-sm px-2 py-1 border rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            <button onClick={() => saveBlock(division_id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save size={16} /></button>
            <button onClick={() => setShowAddBlock(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={16} /></button>
          </div>
        ) : (
          canEdit && (
            <button onClick={() => { setBlockForm({ name: '', status: 'active' }); setShowAddBlock(parentId); }} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 px-2 py-1 rounded hover:bg-blue-50">
              <Plus size={14} /> Add Block
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estate Structure</h2>
          <p className="text-sm text-slate-500">Manage {estate.has_divisions ? 'Divisions and Field Blocks' : 'Field Blocks'} in this estate.</p>
        </div>
        {canEdit && estate.has_divisions && !showAddDivision && (
          <button onClick={() => { setDivisionForm({ name: '', status: 'active' }); setShowAddDivision(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
            <Plus size={15} /> Add Division
          </button>
        )}
      </div>

      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 md:p-6">
        
        {/* Has Divisions = FALSE -> Render blocks directly */}
        {!estate.has_divisions && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="text-blue-500" />
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{estate.name} Field Blocks</h3>
            </div>
            {renderBlocks(null)}
          </div>
        )}

        {/* Has Divisions = TRUE -> Render divisions */}
        {estate.has_divisions && (
          <div className="space-y-4">
            {showAddDivision && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
                <input autoFocus placeholder="Division name" value={divisionForm.name} onChange={e => setDivisionForm({ ...divisionForm, name: e.target.value })} className="flex-1 text-sm px-3 py-2 border rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={() => saveDivision()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Save</button>
                <button onClick={() => setShowAddDivision(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            )}

            {divisions.length === 0 && !showAddDivision && (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-slate-100 dark:border-slate-800">
                <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm">No divisions registered yet.</p>
              </div>
            )}

            {divisions.map(div => {
              const isExpanded = expandedDivisions.has(div.id);
              const divBlocks = blocks.filter(b => b.division_id === div.id);
              
              return (
                <div key={div.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    
                    {editingDivision === div.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input autoFocus value={divisionForm.name} onChange={e => setDivisionForm({ ...divisionForm, name: e.target.value })} className="flex-1 text-sm px-2 py-1 border rounded border-slate-300 dark:border-slate-700 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        <select value={divisionForm.status} onChange={e => setDivisionForm({ ...divisionForm, status: e.target.value })} className="text-sm px-2 py-1 border rounded border-slate-300 dark:border-slate-700 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={() => saveDivision(div.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save size={16} /></button>
                        <button onClick={() => setEditingDivision(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => toggleDivision(div.id)} className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                        <Layers size={18} className="text-blue-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{div.name}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${div.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {div.status}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">{divBlocks.length} Blocks</span>
                      </button>
                    )}

                    {!editingDivision && canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setDivisionForm({ name: div.name, status: div.status }); setEditingDivision(div.id); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={15} /></button>
                        <button onClick={() => deleteDivision(div.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 bg-slate-50 dark:bg-slate-900/30">
                      {renderBlocks(div.id)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </Card>
    </div>
  );
}
