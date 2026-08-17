import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Navigation, MapPin, Play, Square, Trash2, Save, CheckCircle, AlertTriangle,
  Loader2, Signal, Target, ChevronDown, Info, Undo2, WifiOff, Wifi, Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import JSZip from 'jszip';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, LayersControl, Polygon, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Maths helpers ────────────────────────────────────────────────────────────
const DEG2RAD = Math.PI / 180;

/** Haversine distance in metres between two lat/lng points */
function haversine(a: any, b: any) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLng = (b.lng - a.lng) * DEG2RAD;
  const sin2 = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG2RAD) * Math.cos(b.lat * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sin2));
}

/** Shoelace formula – polygon area in m² then converted to hectares */
function calcArea(pts: any[]) {
  if (pts.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = pts[i].lng * Math.cos(pts[i].lat * DEG2RAD) * DEG2RAD * R;
    const yi = pts[i].lat * DEG2RAD * R;
    const xj = pts[j].lng * Math.cos(pts[j].lat * DEG2RAD) * DEG2RAD * R;
    const yj = pts[j].lat * DEG2RAD * R;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area / 2) / 10000; // m² → hectares
}

/** Build GeoJSON polygon from waypoints */
function toGeoJSON(waypoints: any[]) {
  if (waypoints.length < 3) return null;
  const coords = [...waypoints, waypoints[0]].map(w => [w.lng, w.lat]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { recorded_at: new Date().toISOString(), point_count: waypoints.length },
  };
}

// ─── Leaflet Real Map ─────────────────────────────────────────────────────────

function MapUpdater({ waypoints, livePos, existingPoly }: { waypoints: any[], livePos: any, existingPoly?: any }) {
  const map = useMap();
  useEffect(() => {
    let allPts: any[] = [];
    if (waypoints.length > 0) {
      allPts = livePos ? [...waypoints, livePos] : waypoints;
    } else if (existingPoly?.geometry?.coordinates?.[0]) {
      const coords = existingPoly.geometry.coordinates[0];
      allPts = coords.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      if (livePos) allPts.push(livePos);
    } else if (livePos) {
      allPts = [livePos];
    }
    
    if (allPts.length > 1) {
      const bounds = L.latLngBounds(allPts.map(p => [p.lat, p.lng]));
      if (bounds.isValid()) {
         map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
      }
    } else if (allPts.length === 1) {
      map.setView([allPts[0].lat, allPts[0].lng], 18);
    }
  }, [waypoints, livePos, existingPoly, map]);
  return null;
}

function PolygonMap({ waypoints, livePos, existingPoly }: { waypoints: any[], livePos: any, existingPoly?: any }) {
  const polyCoords = waypoints.map(w => [w.lat, w.lng] as [number, number]);
  let existingCoords: [number, number][] = [];
  if (existingPoly?.geometry?.coordinates?.[0]) {
    existingCoords = existingPoly.geometry.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
  }
  const defaultCenter: [number, number] = [6.9271, 80.7744]; // Fallback

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : (existingCoords.length > 0 ? existingCoords[0] : (livePos ? [livePos.lat, livePos.lng] : defaultCenter))} 
        zoom={15} 
        style={{ width: '100%', height: '100%', zIndex: 10 }}
        scrollWheelZoom={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Google Maps Satellite">
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              maxZoom={20}
              attribution='&copy; Google Maps'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street Map">
            <TileLayer
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
               maxZoom={19}
               crossOrigin="anonymous"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <MapUpdater waypoints={waypoints} livePos={livePos} existingPoly={existingPoly} />

        {/* Draw existing polygon */}
        {existingCoords.length >= 3 && (
          <Polygon positions={existingCoords} pathOptions={{ color: '#10b981', weight: 3, fillColor: '#10b981', fillOpacity: 0.2, dashArray: '4, 4' }} />
        )}

        {/* Draw waypoints as connected lines or polygon */}
        {polyCoords.length >= 3 ? (
          <Polygon positions={polyCoords} pathOptions={{ color: '#2563eb', weight: 3, fillColor: '#2563eb', fillOpacity: 0.3 }} />
        ) : polyCoords.length >= 2 ? (
          <Polyline positions={polyCoords} pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6, 4' }} />
        ) : null}

        {/* Draw waypoints as circles */}
        {polyCoords.map((pt, i) => (
          <CircleMarker key={i} center={pt} radius={5} pathOptions={{ color: 'white', weight: 1, fillColor: '#2563eb', fillOpacity: 1 }} />
        ))}

        {/* Live position */}
        {livePos && (
          <CircleMarker center={[livePos.lat, livePos.lng]} radius={7} pathOptions={{ color: 'white', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }} />
        )}
      </MapContainer>
    </div>
  );
}

// ─── Accuracy Badge ────────────────────────────────────────────────────────────
function AccuracyBadge({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return null;
  const great = accuracy <= 5;
  const good = accuracy <= 15;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      great ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
      good  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
               'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      <Signal size={12} />
      {accuracy.toFixed(1)}m
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BoundaryTracker() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [blockDropOpen, setBlockDropOpen] = useState(false);

  const [tracking, setTracking] = useState(false);
  const [livePos, setLivePos] = useState<any>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSupported, setGpsSupported] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [waypoints, setWaypoints] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: string, message: string } | null>(null);
  const [existingPoly, setExistingPoly] = useState<any>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastCaptRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MIN_DIST_METERS = 3; // Auto capture every 3 meters

  const showToast = useCallback((type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

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

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);
  const autoSaveImport = useCallback(async (pts: any[], formatName: string) => {
    setWaypoints(pts);
    if (!selectedBlock) {
       showToast('success', `Imported ${formatName} with ${pts.length} points. Select a block and click Save to store in database.`);
       return;
    }
    setSaving(true);
    try {
      const geojson = toGeoJSON(pts);
      const { data, error } = await supabase
        .from('field_blocks')
        .update({ polygon_coordinates: geojson })
        .eq('id', selectedBlock.id)
        .select();

      if (error) {
        showToast('error', error.message || 'Failed to auto-save imported boundary.');
      } else if (!data || data.length === 0) {
        showToast('error', 'Failed to save boundary. You may not have permission to modify this block.');
      } else {
        setExistingPoly(geojson);
        showToast('success', `Imported ${formatName} and saved directly to "${selectedBlock.name}"!`);
        setWaypoints([]);
        if (lastCaptRef.current) lastCaptRef.current = null;
      }
    } catch {
      showToast('error', 'Network error during auto-save.');
    } finally {
      setSaving(false);
    }
  }, [selectedBlock, showToast]);

  // ── Import GeoJSON / KML / KMZ / CSV ────────────────────────────────────────
  const parseKML = useCallback((content: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      const coordinatesNode = xmlDoc.getElementsByTagName("coordinates")[0];
      
      if (coordinatesNode && coordinatesNode.textContent) {
        const coordsStr = coordinatesNode.textContent.trim();
        const points = coordsStr.split(/\s+/).map(pair => {
          const parts = pair.split(',');
          if (parts.length >= 2) {
            return [parseFloat(parts[0]), parseFloat(parts[1])];
          }
          return null;
        }).filter(p => p !== null && !isNaN(p[0]) && !isNaN(p[1]));

        if (points.length >= 3) {
           const isClosed = points[0]![0] === points[points.length-1]![0] && points[0]![1] === points[points.length-1]![1];
           const parsedPoints = isClosed ? points.slice(0, -1) : points;
           
           const newWaypoints = parsedPoints.map((pt) => {
               if(pt) {
                  return { lat: pt[1], lng: pt[0], accuracy: 0, ts: Date.now(), loaded: true }
               }
               return null;
           }).filter(Boolean);
           autoSaveImport(newWaypoints, 'KML');
        } else {
           showToast('error', 'Not enough valid coordinates in KML.');
        }
      } else {
         showToast('error', 'Could not find <coordinates> tag in KML.');
      }
    } catch (err: any) {
      showToast('error', 'Error parsing KML: ' + err.message);
    }
  }, [autoSaveImport, showToast]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const resetInput = () => { if (fileInputRef.current) fileInputRef.current.value = ''; };

    if (fileName.endsWith('.kmz')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const zip = new JSZip();
          const contents = await zip.loadAsync(event.target?.result as ArrayBuffer);
          const kmlFile = Object.values(contents.files).find(f => f.name.toLowerCase().endsWith('.kml'));
          if (!kmlFile) {
            showToast('error', 'No KML file found inside the KMZ archive.');
            return;
          }
          const kmlText = await kmlFile.async('text');
          parseKML(kmlText);
        } catch (err: any) {
          showToast('error', 'Error reading KMZ: ' + err.message);
        } finally {
          resetInput();
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
            const data = JSON.parse(content);
            let coords = null;
            if (data.type === 'FeatureCollection' && data.features.length > 0) {
              const polyFeature = data.features.find((f: any) => f.geometry?.type === 'Polygon');
              if (polyFeature) coords = polyFeature.geometry.coordinates[0];
            } else if (data.type === 'Feature' && data.geometry?.type === 'Polygon') {
              coords = data.geometry.coordinates[0];
            } else if (data.type === 'Polygon') {
              coords = data.coordinates[0];
            }

            if (coords && coords.length >= 3) {
              const newWaypoints = coords.slice(0, -1).map((pt: any[]) => ({ lat: pt[1], lng: pt[0], accuracy: 0, ts: Date.now(), loaded: true }));
              autoSaveImport(newWaypoints, 'GeoJSON');
            } else {
               showToast('error', 'Could not find Polygon coordinates in GeoJSON.');
            }
          } 
          else if (fileName.endsWith('.kml')) {
            parseKML(content);
          }
          else if (fileName.endsWith('.csv')) {
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
            if (lines.length < 3) throw new Error('Not enough coordinates in CSV.');

            const headerParts = lines[0].toLowerCase().split(',');
            const isHeader = isNaN(parseFloat(headerParts[0]));
            const isLngLat = isHeader && headerParts[0].includes('lng');
            
            const startIndex = isHeader ? 1 : 0;
            const points = [];

            for (let i = startIndex; i < lines.length; i++) {
              const parts = lines[i].split(',').map(s => parseFloat(s.trim()));
              if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                let lat, lng;
                if (isLngLat) { lng = parts[0]; lat = parts[1]; }
                else { lat = parts[0]; lng = parts[1]; }
                points.push({ lat, lng, accuracy: 0, ts: Date.now(), loaded: true });
              }
            }

            if (points.length >= 3) {
               const isClosed = points[0].lat === points[points.length-1].lat && points[0].lng === points[points.length-1].lng;
               const parsedPoints = isClosed ? points.slice(0, -1) : points;
               autoSaveImport(parsedPoints, 'CSV');
            } else {
               showToast('error', 'Not enough valid coordinates in CSV.');
            }
          } else {
            showToast('error', 'Unsupported file format.');
          }
        } catch (err: any) {
          showToast('error', 'Error parsing file: ' + err.message);
        } finally {
           resetInput();
        }
      };
      reader.readAsText(file);
    }
  }, [parseKML, autoSaveImport, showToast]);


  // ── Fetch blocks ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!isUserAdmin && !profile?.estate_id) {
        setLoadingBlocks(false);
        return;
      }
      setLoadingBlocks(true);
      try {
        let query = supabase
          .from('field_blocks')
          .select('*, divisions(name)')
          .order('name');
          
        if (selectedEstateFilter !== 'all') {
          query = query.eq('estate_id', selectedEstateFilter);
        } else if (!isUserAdmin && profile?.estate_id) {
          query = query.eq('estate_id', profile.estate_id);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const formattedBlocks = (data || []).map(b => ({
          ...b,
          division_name: b.divisions?.name || 'No Division'
        }));
        
        setBlocks(formattedBlocks);
        setSelectedBlock(null);
      } catch (err: any) {
        showToast('error', 'Failed to load blocks: ' + err.message);
      } finally {
        setLoadingBlocks(false);
      }
    })();
    return () => stopWatch();
  }, [profile?.estate_id, showToast, stopWatch, selectedEstateFilter, isUserAdmin]);

  // ── Load existing polygon when block changes ─────────────────────────────
  useEffect(() => {
    if (!selectedBlock) { setExistingPoly(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('field_blocks')
          .select('polygon_coordinates')
          .eq('id', selectedBlock.id)
          .maybeSingle();
          
        if (!error && data?.polygon_coordinates) {
          setExistingPoly(data.polygon_coordinates);
        } else {
          setExistingPoly(null);
        }
      } catch { setExistingPoly(null); }
    })();
    setWaypoints([]);
    lastCaptRef.current = null;
  }, [selectedBlock]);

  // ── GPS Watch ────────────────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsSupported(false);
      showToast('error', 'Geolocation is not supported on this device.');
      return;
    }
    setGpsError(null);
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLivePos(pt);
        setAccuracy(pos.coords.accuracy);

        const last = lastCaptRef.current;
        if (!last || haversine(last, pt) >= MIN_DIST_METERS) {
          setWaypoints(prev => [...prev, { ...pt, ts: Date.now() }]);
          lastCaptRef.current = pt;
        }
      },
      (err) => {
        setGpsError(err.message);
        showToast('error', `GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, [showToast]);

  const stopTracking = useCallback(() => {
    stopWatch();
    setTracking(false);
    showToast('success', `Tracking stopped. ${waypoints.length} points captured.`);
  }, [stopWatch, waypoints.length, showToast]);

  // ── Manual point capture ────────────────────────────────────────────────────
  const captureCurrentPos = useCallback(() => {
    if (!livePos) { showToast('error', 'No live position available yet.'); return; }
    setWaypoints(prev => [...prev, { ...livePos, ts: Date.now(), manual: true }]);
    lastCaptRef.current = livePos;
    showToast('success', 'Manual point captured!');
  }, [livePos, showToast]);

  const undoLast = useCallback(() => {
    setWaypoints(prev => prev.slice(0, -1));
  }, []);

  // ── Save to database ────────────────────────────────────────────────────────
  const saveBoundary = useCallback(async () => {
    if (!selectedBlock) { showToast('error', 'Select a block first.'); return; }
    if (waypoints.length < 3) { showToast('error', 'Need at least 3 points to form a boundary.'); return; }
    setSaving(true);
    try {
      const geojson = toGeoJSON(waypoints);
      const { data, error } = await supabase
        .from('field_blocks')
        .update({ polygon_coordinates: geojson })
        .eq('id', selectedBlock.id)
        .select();

      if (error) {
        showToast('error', error.message || 'Failed to save boundary.');
      } else if (!data || data.length === 0) {
        showToast('error', 'Failed to save boundary. You may not have permission to modify this block.');
      } else {
        setExistingPoly(geojson);
        showToast('success', `Boundary for "${selectedBlock.name}" saved!`);
        setWaypoints([]);
        lastCaptRef.current = null;
      }
    } catch {
      showToast('error', 'Network error saving boundary.');
    } finally {
      setSaving(false);
    }
  }, [selectedBlock, waypoints, showToast]);

  // ── Load existing polygon as waypoints ────────────────────────────────────
  const loadExistingAsWaypoints = useCallback(() => {
    if (!existingPoly?.geometry?.coordinates?.[0]) return;
    const coords = existingPoly.geometry.coordinates[0].slice(0, -1);
    setWaypoints(coords.map(([lng, lat]: [number, number]) => ({ lat, lng, accuracy: 0, ts: Date.now(), loaded: true })));
    showToast('success', 'Existing boundary loaded for editing.');
  }, [existingPoly, showToast]);

  // ── Computed values ─────────────────────────────────────────────────────────
  const areaHa = calcArea(waypoints);
  const canSave = selectedBlock && waypoints.length >= 3;

  return (
    <div className="space-y-6 max-w-6xl mx-auto mb-10 p-4 sm:p-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-semibold animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-500" />
            Boundary Tracker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Walk field boundaries to map blocks in real-time
          </p>
        </div>
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
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            !gpsSupported ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            tracking ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
            'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {!gpsSupported ? <WifiOff size={14} /> : tracking ? <Wifi size={14} /> : <WifiOff size={14} />}
            {!gpsSupported ? 'GPS N/A' : tracking ? 'Tracking Active' : 'Ready'}
          </span>
          <AccuracyBadge accuracy={accuracy} />
        </div>
      </div>

      {/* ── Main Interface (Two Column Layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Controls & Actions */}
        <div className="space-y-6">
          
          {/* Block Selector */}
          <Card className="w-full rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">1. Select Field Block</h3>
            <p className="text-xs text-slate-500 mb-4">Choose the block you want to map.</p>

            <div className="relative mb-4">
              <button
                onClick={() => setBlockDropOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <span className={`text-sm ${selectedBlock ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500'}`}>
                  {loadingBlocks ? 'Loading blocks…' : selectedBlock ? `${selectedBlock.name} (${selectedBlock.division_name})` : 'Select a block...'}
                </span>
                {loadingBlocks
                  ? <Loader2 size={16} className="animate-spin text-slate-400" />
                  : <ChevronDown size={16} className={`text-slate-400 transition-transform ${blockDropOpen ? 'rotate-180' : ''}`} />
                }
              </button>

              {blockDropOpen && !loadingBlocks && (
                <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {blocks.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">No blocks found</p>
                  ) : (
                    <>
                      {(() => {
                        const hasCoords = (b: any) => {
                          if (!b.polygon_coordinates) return false;
                          let coords = b.polygon_coordinates;
                          if (typeof coords === 'string') {
                            try { coords = JSON.parse(coords); } catch (e) { return false; }
                          }
                          if (coords?.type === 'Feature' && coords.geometry?.type === 'Polygon') return true;
                          if (coords?.type === 'Polygon') return true;
                          if (Array.isArray(coords) && coords.length > 0) return true;
                          return false;
                        };
                        const mappedBlocks = blocks.filter(b => hasCoords(b));
                        const unmappedBlocks = blocks.filter(b => !hasCoords(b));

                        const renderBlockBtn = (b: any) => (
                          <button
                            key={b.id}
                            onClick={() => { setSelectedBlock(b); setBlockDropOpen(false); }}
                            className={`w-full flex flex-col px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                              selectedBlock?.id === b.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{b.name}</span>
                            <span className="text-xs text-slate-500">{b.division_name} Division</span>
                          </button>
                        );

                        return (
                          <>
                            {mappedBlocks.length > 0 && (
                              <div className="py-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-1">Mapped ({mappedBlocks.length})</h4>
                                {mappedBlocks.map(renderBlockBtn)}
                              </div>
                            )}
                            {unmappedBlocks.length > 0 && (
                              <div className="py-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-1">Not Mapped ({unmappedBlocks.length})</h4>
                                {unmappedBlocks.map(renderBlockBtn)}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Existing Block Status */}
            {selectedBlock && (
              <div className={`p-4 rounded-2xl border ${
                existingPoly
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
              }`}>
                <div className="flex items-start gap-3">
                  {existingPoly ? <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" /> : <Info size={18} className="text-slate-400 mt-0.5 shrink-0" />}
                  <div>
                    <p className={`text-sm font-medium ${existingPoly ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {existingPoly ? 'Boundary exists' : 'No boundary recorded'}
                    </p>
                    {existingPoly && waypoints.length === 0 && (
                      <button onClick={loadExistingAsWaypoints} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-1 block">
                        Load existing boundary for editing
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Action Center */}
          <Card className={`w-full rounded-3xl p-6 shadow-sm border transition-colors ${
            tracking ? 'border-blue-300 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">2. Record Boundary</h3>
            <p className="text-xs text-slate-500 mb-4">Walk the perimeter of the field.</p>
            
            {gpsError && (
              <div className="flex items-center gap-3 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <p className="text-red-800 dark:text-red-300 font-medium">{gpsError}</p>
              </div>
            )}

            {!tracking ? (
              <button
                onClick={startTracking}
                disabled={!gpsSupported}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                <Play size={18} /> Start Walking
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={captureCurrentPos}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-blue-500 text-blue-700 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <Target size={18} /> Force Capture Corner
                </button>
                <button
                  onClick={stopTracking}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors"
                >
                  <Square size={18} /> Stop Tracking
                </button>
              </div>
            )}

            {waypoints.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Save Data</h3>
                    <p className="text-xs text-slate-500">Points captured: {waypoints.length}</p>
                  </div>
                  <button onClick={undoLast} className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
                    <Undo2 size={14} /> Undo Last
                  </button>
                </div>
                
                <button
                  onClick={saveBoundary}
                  disabled={!canSave || saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50 mb-3"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Save Boundary'}
                </button>
                
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-xs text-slate-500">Or import existing file</p>
                   <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors bg-white dark:bg-slate-900"
                  >
                    <Upload size={14} /> Import File
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".geojson,.json,.kml,.kmz,.csv" 
                    className="hidden" 
                  />
                </div>

                {waypoints.length > 0 && waypoints.length < 3 && (
                  <p className="text-xs text-amber-600 text-center mt-3 font-medium">Walk further to capture at least 3 points.</p>
                )}
              </div>
            )}
            
            {waypoints.length === 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                   <p className="text-xs text-slate-500">Already have boundary data?</p>
                   <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors bg-white dark:bg-slate-900"
                  >
                    <Upload size={14} /> Import File
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".geojson,.json,.kml,.kmz,.csv" 
                    className="hidden" 
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Map & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full min-h-[500px]">
            
            {/* Map Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">Live Map Preview</span>
              </div>
              <div className="flex items-center gap-3">
                {waypoints.length > 0 && (
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                    {waypoints.length} Points
                  </span>
                )}
                {waypoints.length > 0 && (
                  <button onClick={() => { setWaypoints([]); lastCaptRef.current = null; }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Clear Map">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 w-full relative bg-slate-100 dark:bg-slate-950">
              <PolygonMap waypoints={waypoints} livePos={livePos} existingPoly={existingPoly} />
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex flex-col items-center py-4 px-2">
                <p className="text-xs font-medium text-slate-500">Estimated Area</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {waypoints.length >= 3 ? areaHa.toFixed(3) : '—'}<span className="text-sm text-slate-500 ml-1">ha</span>
                </p>
              </div>
              <div className="flex flex-col items-center py-4 px-2">
                <p className="text-xs font-medium text-slate-500">Signal Accuracy</p>
                <div className="mt-1">
                  {accuracy !== null ? <AccuracyBadge accuracy={accuracy} /> : <span className="text-sm font-bold text-slate-400">—</span>}
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
