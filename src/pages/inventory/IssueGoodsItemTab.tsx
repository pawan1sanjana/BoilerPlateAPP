import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Save, Box, AlertCircle, Camera, QrCode, X,
  CheckCircle2, Upload, RotateCcw, ShieldOff, ScanLine
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

// ── Scanner states ──
type ScannerState = 'idle' | 'initializing' | 'active' | 'error_permission' | 'error_device';

interface ScanSuccess {
  name: string;
  sku: string;
  itemId: string;
}

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
    
    // Quick fade out for a pleasant "beep"
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    console.error('Beep failed:', err);
  }
};


export default function IssueGoodsItem() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const initialEstateId = (!isUserAdmin && profile?.estate_id) ? profile.estate_id : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  // Scanner state machine
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [scanSuccess, setScanSuccess] = useState<ScanSuccess | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartedRef = useRef(false);
  const isDecodingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    itemId: '',
    quantity: '',
    issuedTo: '',
    block_id: '',
    notes: '',
    estate_id: initialEstateId
  });

  useEffect(() => {
    fetchInventory();
    fetchBlocks();
    if (isUserAdmin) fetchEstates();

    return () => {
      stopScanner(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserAdmin]);

  /** Pick the best built-in camera from the list of available devices */
  const pickBestCamera = (cameras: { id: string; label: string }[]) => {
    if (cameras.length === 0) return null;
    if (cameras.length === 1) return cameras[0];

    const label = (c: { label: string }) => c.label.toLowerCase();

    // Tier 1: mobile back / environment-facing camera
    const backCam = cameras.find(c =>
      label(c).includes('back') ||
      label(c).includes('rear') ||
      label(c).includes('environment')
    );
    if (backCam) return backCam;

    // Tier 2: integrated / built-in webcam (common on laptops)
    const builtIn = cameras.find(c =>
      label(c).includes('integrated') ||
      label(c).includes('built-in') ||
      label(c).includes('facetime') ||
      label(c).includes('internal') ||
      label(c).includes('hd camera')
    );
    if (builtIn) return builtIn;

    // Tier 3: exclude known external / virtual cameras
    const notExternal = cameras.find(c =>
      !label(c).includes('usb') &&
      !label(c).includes('external') &&
      !label(c).includes('obs') &&
      !label(c).includes('virtual') &&
      !label(c).includes('manycam') &&
      !label(c).includes('snap')
    );
    if (notExternal) return notExternal;

    // Fallback: first available camera
    return cameras[0];
  };

  const startScanner = async () => {
    setScanError(null);
    setScannerState('initializing');

    try {
      // Enumerate cameras and choose the best built-in one
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setScannerState('error_device');
        return;
      }

      const chosen = pickBestCamera(cameras);
      if (!chosen) {
        setScannerState('error_device');
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      if (isStartedRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        isStartedRef.current = false;
      }

      // Use explicit deviceId — avoids picking an external/USB camera
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
          if (isDecodingRef.current) return;
          isDecodingRef.current = true;
          handleDecoded(decodedText);
          await stopScanner();
          isDecodingRef.current = false;
        },
        () => {} // frame error — ignore
      );

      isStartedRef.current = true;
      setScannerState('active');
    } catch (err: any) {
      const msg: string = err?.message || '';
      isStartedRef.current = false;
      if (
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('notallowed') ||
        msg.toLowerCase().includes('denied')
      ) {
        setScannerState('error_permission');
      } else if (
        msg.toLowerCase().includes('device') ||
        msg.toLowerCase().includes('notfound') ||
        msg.toLowerCase().includes('no cameras')
      ) {
        setScannerState('error_device');
      } else {
        setScannerState('error_device');
        console.error('Failed to start scanner:', err);
      }
    }
  };


  const stopScanner = async (silent = false) => {
    if (scannerRef.current && isStartedRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        if (!silent) console.error(err);
      }
      isStartedRef.current = false;
    }
    if (!silent) setScannerState('idle');
  };

  const handleDecoded = (decodedText: string) => {
    try {
      const parts = decodedText.split('|');
      const itemPart = parts.find(p => p.startsWith('ITEM:'));
      const namePart = parts.find(p => p.startsWith('NAME:'));
      const skuPart  = parts.find(p => p.startsWith('SKU:'));

      if (!itemPart) {
        setScanError('This QR code is not a valid inventory item. Please try again.');
        setScannerState('idle');
        return;
      }

      const itemId = itemPart.split(':').slice(1).join(':');

      // Validate that we actually have this item in inventory
      const matchedItem = inventory.find(i => i.id.toString() === itemId);
      const displayName = namePart ? namePart.substring(5) : matchedItem?.item_name || 'Unknown Item';
      const displaySku  = skuPart  ? skuPart.substring(4)  : matchedItem?.sku || '';

      setForm(prev => ({ ...prev, itemId }));
      setScanSuccess({ name: displayName, sku: displaySku, itemId });
      setScanError(null);
      setScannerState('idle');
      
      // Play success audio feedback
      playSuccessBeep();
      
      // Auto-focus the quantity input for faster data entry
      setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 100);
    } catch {
      setScanError('Failed to parse QR code. Please try again.');
      setScannerState('idle');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    setScanError(null);
    setScannerState('initializing');

    try {
      const reader = new Html5Qrcode('qr-file-reader');
      const result = await reader.scanFile(file, false);
      reader.clear();
      handleDecoded(result);
    } catch {
      setScannerState('idle');
      setScanError('Could not read a QR code from this image. Make sure the QR code is visible and clear.');
    }
  };

  const resetScan = async () => {
    await stopScanner();
    setScanSuccess(null);
    setScanError(null);
    setForm(prev => ({ ...prev, itemId: '' }));
  };

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('*');
      if (!error && data) setEstates(data);
    } catch (error) {
      console.error('Failed to load estates:', error);
    }
  };

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase.from('field_blocks').select('*');
      if (!error && data) setBlocks(data);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('inventory_goods').select('*').order('created_at', { ascending: false });
      if (!error && data) setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const selectedItem = inventory.find(i => i.id.toString() === form.itemId);
      if (!selectedItem) throw new Error('Item not found');

      const issueQty = Number(form.quantity);
      if (issueQty <= 0 || issueQty > Number(selectedItem.quantity)) {
        throw new Error('Invalid issue quantity');
      }

      const { error: issueError } = await supabase.from('issued_goods').insert({
        item_id: form.itemId,
        quantity: issueQty,
        issued_to: form.issuedTo,
        department: blocks.find(b => b.id.toString() === form.block_id)?.name || form.block_id || 'N/A',
        notes: form.notes,
        estate_id: form.estate_id || initialEstateId
      });
      if (issueError) throw issueError;

      const { error: updateError } = await supabase.from('inventory_goods').update({
        quantity: Number(selectedItem.quantity) - issueQty
      }).eq('id', form.itemId);
      if (updateError) throw updateError;

      navigate('/inventory');
    } catch (error) {
      console.error('Failed to issue item:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = inventory.find(i => i.id.toString() === form.itemId);

  const currentEstateId = form.estate_id || initialEstateId;
  const availableBlocks = blocks.filter(b => !b.estate_id || b.estate_id.toString() === currentEstateId?.toString());

  // ── Derived UI flags ──
  const isInitializing = scannerState === 'initializing';
  const isActive       = scannerState === 'active';
  const isPermErr      = scannerState === 'error_permission';
  const isDeviceErr    = scannerState === 'error_device';

  return (
    <div className="space-y-6">
      {/* Hidden div for file-based QR scanning */}
      <div id="qr-file-reader" className="hidden" />

      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Issue Goods</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Assign inventory items</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Box size={20} className="text-blue-500" /> Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <form onSubmit={handleIssueItem} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Select Item */}
                    <div className="space-y-2">
                      <Label>Select Item</Label>
                      <Select value={form.itemId} onValueChange={(val) => setForm({ ...form, itemId: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an item to issue" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.item_name} ({item.sku}) — Stock: {item.quantity} {item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label>Quantity to Issue</Label>
                      <Input
                        ref={quantityInputRef}
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={selectedItem?.quantity || undefined}
                        required
                        placeholder="Enter quantity"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      />
                      {selectedItem && (
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          Available: <span className="text-emerald-600">{selectedItem.quantity} {selectedItem.unit}</span>
                        </p>
                      )}
                    </div>

                    {/* Issued To */}
                    <div className="space-y-2">
                      <Label>Issued To (Person/ID)</Label>
                      <Input
                        type="text"
                        required
                        placeholder="E.g., John Doe or EMP001"
                        value={form.issuedTo}
                        onChange={(e) => setForm({ ...form, issuedTo: e.target.value })}
                      />
                    </div>

                    {/* Estate */}
                    {isUserAdmin && (
                      <div className="space-y-2">
                        <Label>Assigned Estate <span className="text-red-500">*</span></Label>
                        <Select required value={form.estate_id} onValueChange={(val) => setForm({ ...form, estate_id: val })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Estate" />
                          </SelectTrigger>
                          <SelectContent>
                            {estates.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Assigned Sector (Block) */}
                    <div className="space-y-2">
                      <Label>Assigned Sector</Label>
                      <Select value={form.block_id} onValueChange={(val) => setForm({ ...form, block_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sector" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBlocks.length > 0 ? (
                            availableBlocks.map(b => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                {b.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No sectors available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes / Reason</Label>
                    <Input
                      type="text"
                      placeholder="Optional details"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  {selectedItem && Number(form.quantity) > Number(selectedItem.quantity) && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                      <AlertCircle size={20} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Insufficient Stock</p>
                        <p className="text-xs mt-1">You cannot issue more than the available quantity.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="submit"
                      disabled={saving || !form.itemId || !form.quantity || !form.issuedTo || (!!selectedItem && Number(form.quantity) > Number(selectedItem.quantity))}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2"
                    >
                      {saving ? (
                        <><Loader2 size={16} className="animate-spin mr-2" />Processing...</>
                      ) : (
                        <><Save size={16} className="mr-2" />Issue Goods</>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: QR Scanner */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <QrCode size={20} className="text-emerald-500" /> Scan QR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* ── Persistent Scan Success Badge ── */}
              {scanSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">Item Scanned</p>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate max-w-[160px]">{scanSuccess.name}</p>
                        <p className="text-[10px] font-mono text-emerald-600 mt-0.5">{scanSuccess.sku}</p>
                      </div>
                    </div>
                    <button
                      onClick={resetScan}
                      title="Clear scan & re-scan"
                      className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/40 text-emerald-600 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <button
                    onClick={resetScan}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <RotateCcw size={11} /> Scan a Different Item
                  </button>
                </div>
              )}

              {/* ── Scan Error Banner ── */}
              {scanError && !isPermErr && !isDeviceErr && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">{scanError}</p>
                </div>
              )}

              {/* ── Permission Denied Error ── */}
              {isPermErr && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldOff size={20} className="text-red-500 shrink-0" />
                    <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Camera Access Denied</p>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                    Please allow camera access in your browser settings, then tap <strong>Try Again</strong>.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-[10px] font-black uppercase tracking-wider" onClick={() => setScannerState('idle')}>
                      Dismiss
                    </Button>
                    <Button size="sm" className="flex-1 text-[10px] font-black uppercase tracking-wider bg-red-600 hover:bg-red-700" onClick={startScanner}>
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* ── No Camera Device Error ── */}
              {isDeviceErr && !isPermErr && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Camera size={18} className="text-slate-400" />
                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">No Camera Found</p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Use the image upload option below to scan a QR code from a saved photo.</p>
                  <Button size="sm" variant="ghost" className="text-[10px] font-black uppercase tracking-wider w-full" onClick={() => setScannerState('idle')}>
                    Dismiss
                  </Button>
                </div>
              )}

              {/* ── Idle State ── */}
              {!isActive && !isInitializing && !isPermErr && !isDeviceErr && !scanSuccess && (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all hover:scale-105">
                    <Camera className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium px-4">Scan the QR code on an inventory item to auto-fill the issue details.</p>
                </div>
              )}

              {/* ── Idle (with previous scan cleared) ── */}
              {!isActive && !isInitializing && !isPermErr && !isDeviceErr && scanSuccess === null && scanError && (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <Camera className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  </div>
                </div>
              )}

              {/* ── Camera Viewport ──
                   CRITICAL: shown for BOTH 'initializing' and 'active' states.
                   Html5Qrcode requires a visible (non-display:none) container
                   to attach the video stream. Spinner overlays on top during init. */}
              <div className={(isInitializing || isActive) ? 'block space-y-4' : 'hidden'}>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 aspect-[4/3]">

                  {/* The video target — always mounted, never hidden */}
                  <div
                    id="qr-reader"
                    className="w-full h-full flex items-center justify-center bg-black overflow-hidden [&>video]:max-w-full [&>video]:max-h-full"
                  />

                  {/* Spinner overlay — shown on top while camera is initializing */}
                  {isInitializing && (
                    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 animate-in fade-in">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <Loader2 size={26} className="animate-spin text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initializing Camera...</p>
                    </div>
                  )}

                  {/* Scan overlays — shown once camera is active */}
                  {isActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Dim overlay with rounded square cutout */}
                      <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
                        <div className="w-[56%] aspect-square rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
                      </div>

                      {/* Corner brackets */}
                      {[
                        'top-[22%] left-[22%] border-t-2 border-l-2 rounded-tl-lg',
                        'top-[22%] right-[22%] border-t-2 border-r-2 rounded-tr-lg',
                        'bottom-[22%] left-[22%] border-b-2 border-l-2 rounded-bl-lg',
                        'bottom-[22%] right-[22%] border-b-2 border-r-2 rounded-br-lg',
                      ].map((cls, i) => (
                        <div key={i} className={`absolute w-6 h-6 border-emerald-400 ${cls}`} />
                      ))}

                      {/* Animated scan line */}
                      <div
                        className="absolute left-[22%] right-[22%] h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                        style={{ animation: 'scanline 1.8s ease-in-out infinite', top: '35%' }}
                      />
                      <style>{`
                        @keyframes scanline {
                          0%   { top: 24%; opacity: 0; }
                          10%  { opacity: 1; }
                          90%  { opacity: 1; }
                          100% { top: 76%; opacity: 0; }
                        }
                      `}</style>

                      {/* Scanning label */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          <ScanLine size={12} className="text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Scanning…</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => stopScanner()}
                  className="w-full h-11 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest font-black text-[10px] border-2"
                >
                  <X size={16} /> Cancel Scanning
                </Button>
              </div>

              {/* ── Camera Start Button (shown when idle, not errored) ── */}
              {!isActive && !isInitializing && !isPermErr && !isDeviceErr && (
                <Button
                  onClick={startScanner}
                  className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 uppercase tracking-widest font-black text-[10px]"
                >
                  <QrCode size={16} className="mr-2" />
                  {scanSuccess ? 'Scan Again' : 'Start Camera'}
                </Button>
              )}

              {/* ── Image Upload Fallback (always visible except when camera is active/initializing) ── */}
              {!isActive && !isInitializing && (
                <>
                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 border-t border-slate-100 dark:border-slate-800" />
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">or</span>
                    <div className="flex-1 border-t border-slate-100 dark:border-slate-800" />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    id="qr-file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 rounded-xl uppercase tracking-widest font-black text-[10px] border-dashed"
                  >
                    <Upload size={14} className="mr-2" />
                    Upload QR Image
                  </Button>
                  <p className="text-center text-[10px] text-slate-400 font-medium">
                    Can't use camera? Upload a photo of the QR code instead.
                  </p>
                </>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
