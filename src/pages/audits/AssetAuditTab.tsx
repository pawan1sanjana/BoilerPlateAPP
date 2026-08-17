import { useState, useEffect, useRef } from 'react';
import { 
  Scan, Camera, Image as ImageIcon, ClipboardCheck, AlertCircle, Loader2, Save, X, History, Search, Keyboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

const playSuccessBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    console.error('Beep failed:', err);
  }
};

export default function AssetAuditTab() {
  const { profile } = useAuthStore();
  
  const [scanMode, setScanMode] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  
  const [scannedAsset, setScannedAsset] = useState<any>(null);
  const [auditData, setAuditData] = useState({
    condition_status: 'good',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecentAudits();
    fetchAvailableAssets();
  }, [profile?.estate_id]);

  const fetchAvailableAssets = async () => {
    try {
      let query = supabase.from('physical_assets').select('id, asset_name, serial_number');
      if (profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }
      const { data } = await query;
      if (data) setAvailableAssets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentAudits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_audits')
        .select('*')
        .order('audit_date', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        // Manually fetch user details to avoid PostgREST foreign key errors
        const userIds = [...new Set(data.map((a: any) => a.audited_by).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
            
          if (usersData) {
            usersData.forEach((u: any) => {
              usersMap[u.id] = u;
            });
          }
        }
        
        const mappedData = data.map((audit: any) => ({
          ...audit,
          users: audit.audited_by ? { full_name: usersMap[audit.audited_by]?.name } : null
        }));
        
        setRecentAudits(mappedData);
      }
    } catch (err) {
      console.error('Failed to load audits', err);
    } finally {
      setLoading(false);
    }
  };

  const pickBestCamera = (cameras: { id: string; label: string }[]) => {
    if (cameras.length === 0) return null;
    if (cameras.length === 1) return cameras[0];
    const label = (c: { label: string }) => c.label.toLowerCase();
    const backCam = cameras.find(c => label(c).includes('back') || label(c).includes('rear') || label(c).includes('environment'));
    if (backCam) return backCam;
    const builtIn = cameras.find(c => label(c).includes('integrated') || label(c).includes('built-in') || label(c).includes('facetime') || label(c).includes('internal') || label(c).includes('hd camera'));
    if (builtIn) return builtIn;
    const notExternal = cameras.find(c => !label(c).includes('usb') && !label(c).includes('external') && !label(c).includes('obs') && !label(c).includes('virtual') && !label(c).includes('manycam') && !label(c).includes('snap'));
    if (notExternal) return notExternal;
    return cameras[0];
  };

  const startScanner = async () => {
    try {
      setScanError('');
      setScanMode(true);
      
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setScanError('No cameras found.');
        setScanMode(false);
        return;
      }
      
      const chosen = pickBestCamera(cameras);
      if (!chosen) {
        setScanError('No suitable camera found.');
        setScanMode(false);
        return;
      }

      setTimeout(async () => {
        if (!document.getElementById('qr-reader')) return;
        
        scannerRef.current = new Html5Qrcode('qr-reader');
        await scannerRef.current.start(
          { deviceId: { exact: chosen.id } },
          { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return { width: Math.floor(minEdge * 0.7), height: Math.floor(minEdge * 0.7) };
            }
          },
          async (decodedText) => {
            stopScanner();
            handleQRScanned(decodedText);
          },
          () => {
            // Ignore frame errors
          }
        );
      }, 100);
    } catch (err: any) {
      setScanError(err?.message || 'Failed to start camera. Please check permissions.');
      setScanMode(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
      }).catch(console.error);
    }
    setScanMode(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      setScanError('');
      const reader = new Html5Qrcode('qr-file-reader');
      const decodedText = await reader.scanFile(file, true);
      handleQRScanned(decodedText);
    } catch (err) {
      setScanError('Could not read a QR code from this image.');
    }
  };

  const handleQRScanned = async (text: string) => {
    try {
      const data = JSON.parse(text);
      if (!data.type || !data.id) throw new Error('Invalid format');
      
      let assetInfo = null;
      if (data.type === 'physical') {
        const { data: asset } = await supabase.from('physical_assets').select('*').eq('id', data.id).single();
        if (asset) assetInfo = { ...asset, auditType: 'physical', displayName: asset.asset_name };
      } else if (data.type === 'biological') {
        toast.error('Audit scanner is only available for physical assets');
        return;
      }
      
      if (assetInfo) {
        setScannedAsset(assetInfo);
        setAuditData({ condition_status: assetInfo.asset_condition || 'good', notes: '' });
        playSuccessBeep();
      } else {
        toast.error('Asset not found in database');
      }
    } catch (err) {
      toast.error('Invalid QR Code');
    }
  };

  const submitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        asset_id: scannedAsset.id,
        asset_type: scannedAsset.auditType,
        estate_id: scannedAsset.estate_id || profile?.estate_id || null,
        audited_by: profile?.id,
        condition_status: auditData.condition_status,
        notes: auditData.notes
      };
      
      const { error } = await supabase.from('asset_audits').insert(payload);
      if (error) throw error;
      
      // Update asset condition if physical
      if (scannedAsset.auditType === 'physical') {
        await supabase.from('physical_assets').update({ asset_condition: auditData.condition_status }).eq('id', scannedAsset.id);
      }
      
      toast.success('Audit logged successfully');
      setScannedAsset(null);
      fetchRecentAudits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAudits = recentAudits.filter(a => {
    const searchLow = searchTerm.toLowerCase();
    return (a.asset_type?.toLowerCase().includes(searchLow)) || 
           (a.condition_status?.toLowerCase().includes(searchLow)) ||
           (a.users?.full_name?.toLowerCase().includes(searchLow));
  });

  const columns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (log) => (
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
          {new Date(log.audit_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Type",
      cell: (log) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
          {log.asset_type}
        </span>
      )
    },
    {
      header: "Condition",
      cell: (log) => {
        let color = "text-slate-500";
        if (log.condition_status === 'excellent' || log.condition_status === 'good') color = "text-emerald-600 dark:text-emerald-400";
        if (log.condition_status === 'poor' || log.condition_status === 'missing') color = "text-red-600 dark:text-red-400";
        
        return (
          <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>
            {log.condition_status}
          </span>
        );
      }
    },
    {
      header: "Auditor",
      cell: (log) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.users?.full_name || 'System'}</span>
    },
    {
      header: "Notes",
      cell: (log) => <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{log.notes || '—'}</p>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit">Asset Audit Scanner</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Scan QR codes to verify asset existence and update condition</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scanner / Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            {!scannedAsset && !scanMode && !manualMode && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-800">
                  <Scan size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-1">Scan Asset QR</h3>
                <p className="text-xs text-slate-500 mb-6 px-4">Use your device camera to scan a physical asset QR label.</p>
                
                <div className="space-y-3">
                  <Button onClick={startScanner} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2">
                    <Camera size={18} /> Start Camera Scanner
                  </Button>
                  
                  <div className="relative flex justify-center items-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase">OR</span>
                  </div>
                  
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <Button variant="outline" className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700">
                      <ImageIcon size={18} /> Upload QR Image
                    </Button>
                  </div>
                  
                  <Button variant="outline" onClick={() => { setManualMode(true); setScanError(''); }} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700">
                    <Keyboard size={18} /> Enter Manually
                  </Button>
                </div>
                
                {scanError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                    <AlertCircle size={14} /> {scanError}
                  </div>
                )}
                
                <div id="qr-file-reader" className="hidden" />
              </div>
            )}

            {scanMode && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Scanning...</h3>
                  <button onClick={stopScanner} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={16}/></button>
                </div>
                <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-blue-500/30" />
              </div>
            )}

            {manualMode && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Manual Asset Selection</h3>
                  <button onClick={() => setManualMode(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={16}/></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Asset</label>
                    <select 
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="">-- Choose an asset --</option>
                      {availableAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.asset_name} ({a.serial_number || 'No S/N'})</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    onClick={() => {
                      if (selectedAssetId) {
                        setManualMode(false);
                        handleQRScanned(JSON.stringify({ type: 'physical', id: selectedAssetId }));
                      } else {
                        toast.error('Please select an asset first');
                      }
                    }} 
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  >
                    Start Audit
                  </Button>
                </div>
              </div>
            )}

            {scannedAsset && (
              <form onSubmit={submitAudit} className="animate-in fade-in duration-300">
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                      <ClipboardCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Asset Verified</p>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{scannedAsset.displayName}</h3>
                      <p className="text-xs font-bold text-slate-500">{scannedAsset.auditType === 'physical' ? scannedAsset.serial_number : scannedAsset.estate_name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setScannedAsset(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={16}/></button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Asset Condition</label>
                    <select 
                      value={auditData.condition_status}
                      onChange={(e) => setAuditData({...auditData, condition_status: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor / Damaged</option>
                      <option value="missing">Missing / Not Found</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Audit Notes</label>
                    <textarea 
                      rows={3}
                      placeholder="Add observations, damage reports, or exact location..."
                      value={auditData.notes}
                      onChange={(e) => setAuditData({...auditData, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                    Submit Audit Log
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Right Column: Recent Audits History */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <History size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Recent Audits</h3>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
            
            <div className="flex-1 p-0">
              <DataTable
                columns={columns}
                data={filteredAudits}
                loading={loading}
                emptyMessage="No recent audit logs found"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
