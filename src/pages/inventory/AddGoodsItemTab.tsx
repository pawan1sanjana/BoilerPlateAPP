import { useState, useEffect, useRef, useCallback } from "react";
import { 
  DollarSign, 
  Save, Box, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";


import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// ── Minimal QR renderer via QRServer API ──
function QRImage({ text, size = 152 }) {
  if (!text) return null;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=0f172a&bgcolor=f8fafc`;
  return <img src={url} alt="QR Code" width={size} height={size} className="rounded-xl mx-auto" />;
}

const CATEGORIES = [
  "Fertilizers & Chemicals", "Harvesting Tools", "Machinery Spares", 
  "Fuel & Lubricants", "Packaging Materials", "Safety Gear", "Nursery Supplies", "Factory Consumables"
];

export default function AddGoodsItem() {

  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const initialEstateId = (!isUserAdmin && profile?.estate_id) ? profile.estate_id : '';

  const [form, setForm] = useState({
    item_name: "", sku: "", category: "", location: "",
    description: "", quantity: "", unit: "pcs",
    unit_price: "", min_stock_level: "5", supplier_id: "",
    estate_id: initialEstateId
  });
  const [estates, setEstates] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState([]);
  const [qrText, setQrText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedItem, setSavedItem] = useState(null);
  const [toast, setToast] = useState(null);
  const debounceRef = useRef(null);

  // Load suppliers and estates on mount
  useEffect(() => {
    fetchSuppliers();
    if (isUserAdmin) {
      fetchEstates();
    }
  }, [isUserAdmin]);

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
      if (!error && data) setEstates(data);
    } catch (err) {
      console.error('Failed to load estates:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setSuppliers(data);
      }
    } catch (error) {
       console.error("Failed to load suppliers");
    }
  };

  // Debounced QR preview update
  const scheduleQRUpdate = useCallback((f) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const { item_name, sku, quantity, unit, location } = f;
      if (!item_name && !sku) { setQrText(""); return; }
      setQrText(`ITEM:NEW|NAME:${item_name}|SKU:${sku}|QTY:${quantity || 0} ${unit}|LOC:${location}`);
    }, 300);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    setForm(updated);
    scheduleQRUpdate(updated);
  };

  const autoSKU = () => {
    const prefix = form.category ? form.category.substring(0, 3).toUpperCase() : "ITM";
    const nameCode = form.item_name
      ? form.item_name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "XXX"
      : "XXX";
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const sku = `${prefix}-${nameCode}-${suffix}`;
    const updated = { ...form, sku };
    setForm(updated);
    scheduleQRUpdate(updated);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase.from('inventory_goods').insert(form).select().single();
      if (!error && data) {
        const item = data;
        setSavedItem(item as any);
        const realQR = `ITEM:${item.id}|NAME:${item.item_name}|SKU:${item.sku}|QTY:${item.quantity} ${item.unit}|LOC:${item.location}`;
        setQrText(realQR);
        showToast("Item created successfully!");
      } else {
        showToast(error?.message || "Failed to create item", "error");
      }
    } catch (error) {
      showToast("Connection error", "error");
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    if (!savedItem || !qrText) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${savedItem.sku || "item"}.png`;
    a.click();
  };

  const printQR = () => {
    if (!savedItem || !qrText) return;
    const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>QR Label - ${savedItem.item_name}</title>
    <style>body{font-family:'Outfit',sans-serif;text-align:center;padding:24px;background:#fff;} h2{font-size:16px;margin:12px 0 4px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;} p{font-size:12px;color:#64748b;margin:3px;font-weight:600;} .box{border:2px solid #e2e8f0;border-radius:24px;padding:32px;display:inline-block;min-width:240px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);} img{border-radius:16px;margin-bottom:8px;}</style>
    </head><body><div class="box">
    <img src="${imgUrl}" width="180">
    <h2>${savedItem.item_name}</h2>
    <p>SKU: <strong>${savedItem.sku}</strong></p>
    <p>STOCK: <strong>${savedItem.quantity} ${savedItem.unit}</strong></p>
    <p>LOCATION: <strong>${savedItem.location || "N/A"}</strong></p>
    <p style="margin-top:16px;font-size:10px;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;font-weight:900;">TeaERP Tactical Edge</p>
    </div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Inventory Item</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Add new items to the inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Form ── */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Box className="text-blue-500" size={20} /> Item Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="space-y-2">
                    <Label>Item Name <span className="text-red-500">*</span></Label>
                    <Input
                      type="text" name="item_name" required placeholder="e.g. Tactical Drill X2"
                      value={form.item_name} onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                      <Input
                        type="text" name="sku" required placeholder="e.g. TACT-882"
                        value={form.sku} onChange={handleChange}
                        className="font-mono uppercase"
                      />
                      <Button type="button" onClick={autoSKU} variant="outline">
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(val) => { setForm({ ...form, category: val }); scheduleQRUpdate({ ...form, category: val }); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      type="text" name="location" placeholder="e.g. WH-SEC-04"
                      value={form.location} onChange={handleChange}
                      className="uppercase"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Notes</Label>
                    <Input
                      name="description" placeholder="Technical details, maintenance intervals..."
                      value={form.description} onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <DollarSign className="text-emerald-500" size={20} /> Stock & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label>Initial Quantity</Label>
                    <Input type="number" name="quantity" required min="0" placeholder="0"
                      value={form.quantity} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={form.unit} onValueChange={(val) => { setForm({ ...form, unit: val }); scheduleQRUpdate({ ...form, unit: val }); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ltr">ltr</SelectItem>
                        <SelectItem value="box">box</SelectItem>
                        <SelectItem value="roll">roll</SelectItem>
                        <SelectItem value="pack">pack</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input type="number" name="unit_price" step="0.01" min="0" placeholder="0.00"
                      value={form.unit_price} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Stock Level</Label>
                    <Input type="number" name="min_stock_level" min="0"
                      value={form.min_stock_level} onChange={handleChange} />
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <Label>Supplier</Label>
                  <Select value={form.supplier_id} onValueChange={(val) => setForm({ ...form, supplier_id: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Supplier (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button
                type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Item
              </Button>
            </div>
          </form>
        </div>

        {/* ── Right: Live QR Preview ── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center mb-8 overflow-hidden transition-all">
                {qrText ? (
                  <div className="p-4 bg-white rounded-2xl shadow-xl animate-in zoom-in-90 duration-300">
                     <QRImage text={qrText} size={160} />
                  </div>
                ) : (
                  <div className="text-center text-slate-300 dark:text-slate-700">
                    <div className="text-6xl mb-4 opacity-20 flex justify-center">▦</div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting details</p>
                  </div>
                )}
              </div>

              {qrText && (
                <div className="space-y-4 mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col">
                    <Label className="text-xs text-slate-500 mb-1">Item Name</Label>
                    <span className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate">{form.item_name || "—"}</span>
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-xs text-slate-500 mb-1">SKU</Label>
                    <span className="text-sm font-mono font-bold text-blue-500">{form.sku || "—"}</span>
                  </div>
                </div>
              )}

              {/* Post-save actions */}
              {savedItem ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Button
                    onClick={downloadQR}
                    className="w-full"
                  >
                    Download Digital QR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={printQR}
                    className="w-full"
                  >
                    Print Label
                  </Button>
                </div>
              ) : (
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                   <p className="text-xs font-bold text-blue-600 dark:text-blue-400 text-center uppercase tracking-widest">Save item to generate QR</p>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 z-[999] ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
