import { useState, useEffect } from 'react';
import { MapPin, Layers, Loader2, RefreshCw, Search, Download, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { MapContainer, TileLayer, LayersControl, Polygon, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import { addPdfHeader, addPdfFootersToAllPages, autoTable, dateSuffix } from '@/lib/exportUtils';

// Keep the area calculation helper
const getBlockArea = (block: any) => {
  const dbArea = Number(block.area_hectares) || Number(block.area);
  if (dbArea) return dbArea;
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

// Map Auto-zoom Component
function MapUpdater({ selectedId, blockPolygons }: any) {
  const map = useMap();
  useEffect(() => {
    if (selectedId) {
      const selectedPoly = blockPolygons.find((p: any) => p.id === selectedId);
      if (selectedPoly) {
        const bounds = L.latLngBounds(selectedPoly.positions);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
      }
    } else if (blockPolygons.length > 0) {
      const allPositions = blockPolygons.flatMap((p: any) => p.positions);
      const bounds = L.latLngBounds(allPositions);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedId, blockPolygons, map]);
  return null;
}

export default function FieldMapPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
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

  const fetchBlocks = async () => {
    if (!isUserAdmin && !profile?.estate_id) return;
    setLoading(true);
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
      setBlocks(data || []);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUserAdmin || profile?.estate_id) {
      fetchBlocks();
    }
  }, [profile?.estate_id, selectedEstateFilter, isUserAdmin]);

  const blockPolygons = blocks.map((block: any) => {
    let coords = null;
    try {
      let polyData = block.polygon_coordinates;
      if (typeof polyData === 'string') polyData = JSON.parse(polyData);
      
      if (polyData?.type === 'Feature' && polyData.geometry?.type === 'Polygon') {
        coords = polyData.geometry.coordinates[0];
      } else if (polyData?.type === 'Polygon') {
        coords = polyData.coordinates[0];
      } else if (Array.isArray(polyData)) {
        coords = polyData;
      }
      
      if (coords?.length > 0) {
        const latLngs = coords.map((c: any) => {
          if (c?.lat && (c?.lng || c?.lon)) return [c.lat, c.lng || c.lon];
          if (Array.isArray(c) && c.length >= 2) return typeof c[0] === 'number' ? [c[1], c[0]] : null;
          return null;
        }).filter(Boolean);

        if (latLngs.length > 0) {
           return { 
             id: block.id, 
             name: block.name, 
             division: block.divisions?.name, 
             positions: latLngs, 
             area: getBlockArea(block)
           };
        }
      }
    } catch (e) { }
    return null;
  }).filter(Boolean);

  const filteredBlocks = blocks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.divisions?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportMapReport = async () => {
    const mapElement = document.getElementById('estate-map-container');
    if (!mapElement) return;

    setExporting(true);
    try {
      const mapCanvas = mapElement.querySelector('canvas.leaflet-zoom-animated') as HTMLCanvasElement;
      if (!mapCanvas) throw new Error("Map boundaries not rendered.");

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = mapCanvas.width;
      exportCanvas.height = mapCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          ctx.drawImage(mapCanvas, 0, 0);
      }

      const imgData = exportCanvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      const startY = addPdfHeader(pdf, {
        title: 'Estate GIS Analysis Report',
        subtitle: 'Interactive estate map and block registry overview.',
        recordCount: `${blocks.length} Total Blocks`
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 16;
      const mapWidth = pageWidth - (margin * 2);
      const mapHeightImage = (exportCanvas.height * mapWidth) / exportCanvas.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      const remainingHeight = pageHeight - startY - 20; 
      
      let finalMapHeight = mapHeightImage;
      let finalMapWidth = mapWidth;
      
      if (finalMapHeight > remainingHeight) {
         finalMapHeight = remainingHeight;
         finalMapWidth = (exportCanvas.width * finalMapHeight) / exportCanvas.height;
      }

      const mapX = margin + (mapWidth - finalMapWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', mapX, startY + 5, finalMapWidth, finalMapHeight);
      
      pdf.addPage();
      
      const nextY = addPdfHeader(pdf, {
        title: 'Block Details',
        subtitle: 'Detailed list of mapped and unmapped field blocks.',
        compact: true
      });
      
      const tableData = blocks.map((b: any) => {
        const hasMap = blockPolygons.some((p: any) => p.id === b.id);
        const area = getBlockArea(b);
        return [
          b.name,
          b.divisions?.name || 'Estate Division',
          b.status || 'Active',
          hasMap ? 'Yes' : 'No',
          hasMap ? `${area.toFixed(2)} ha` : '-'
        ];
      });
      
      autoTable(pdf, {
        head: [['Block Name', 'Division', 'Status', 'Mapped', 'Area']],
        body: tableData,
        startY: nextY + 5,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: margin, right: margin }
      });
      
      addPdfFootersToAllPages(pdf);

      pdf.save(`GIS-Report-${dateSuffix()}.pdf`);
    } catch (err: any) {
      alert('PDF Export Failed: ' + (err.message || 'Check console for details.'));
    } finally {
      setExporting(false);
    }
  };

  const exportGeoJSON = () => {
    const features = blocks.filter((b: any) => blockPolygons.some((p: any) => p.id === b.id)).map((b: any) => {
      let coords = b.polygon_coordinates;
      if (typeof coords === 'string') {
        try { coords = JSON.parse(coords); } catch (e) {}
      }
      
      let geometry = coords;
      if (coords?.type === 'Feature') {
        geometry = coords.geometry;
      } else if (Array.isArray(coords)) {
        geometry = {
          type: 'Polygon',
          coordinates: [coords.map((c: any) => {
             const lng = c.lng || c.lon || (typeof c[0] === 'number' ? c[0] : 0);
             const lat = c.lat || (typeof c[1] === 'number' ? c[1] : 0);
             return [lng, lat];
          })]
        };
      } else if (coords?.type === 'Polygon') {
        geometry = coords;
      }
      
      return {
        type: 'Feature',
        properties: {
          id: b.id,
          name: b.name,
          division: b.divisions?.name || 'Estate Division',
          status: b.status || 'Active',
          area_ha: getBlockArea(b)
        },
        geometry: geometry
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Estate-Map-${dateSuffix()}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-0 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            Field Map
          </h1>
          <p className="text-slate-500 text-sm mt-1">Interactive estate map and block registry.</p>
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

          <div className="relative z-[200]">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:border-blue-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} className="text-blue-500" />}
              Export Options
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => { setExportMenuOpen(false); exportMapReport(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Layers size={16} className="text-blue-500" />
                  Export as PDF
                </button>
                <button
                  onClick={() => { setExportMenuOpen(false); exportGeoJSON(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
                >
                  <Download size={16} className="text-emerald-500" />
                  Export GeoJSON
                </button>
              </div>
            )}
          </div>
          <button
            onClick={fetchBlocks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Map */}
        <div className="w-full lg:w-2/3 h-[500px] lg:h-full relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900/50 flex-shrink-0" id="estate-map-container">
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10">
               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
          ) : (
            <MapContainer
              center={[6.9271, 80.7744]}
              zoom={13}
              style={{ width: '100%', height: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              preferCanvas={true}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Maps Satellite">
                  <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={20} />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Street Map">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
                </LayersControl.BaseLayer>
              </LayersControl>

              <MapUpdater selectedId={selectedBlockId} blockPolygons={blockPolygons} />

              {blockPolygons.map((bp: any) => {
                const isSelected = selectedBlockId === bp.id;
                return (
                  <Polygon 
                    key={bp.id} 
                    positions={bp.positions} 
                    pathOptions={{ 
                      color: isSelected ? '#3b82f6' : '#64748b', 
                      weight: isSelected ? 3 : 2, 
                      fillColor: isSelected ? '#3b82f6' : '#94a3b8', 
                      fillOpacity: isSelected ? 0.4 : 0.2,
                    }}
                    eventHandlers={{ click: () => setSelectedBlockId(bp.id) }}
                  >
                    <Tooltip sticky>
                      <div className="text-center">
                        <p className="font-bold text-sm text-slate-800">{bp.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase">{bp.division || 'Estate'}</p>
                      </div>
                    </Tooltip>
                  </Polygon>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Right Column: Block List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 lg:h-full h-[400px]">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Field Blocks ({filteredBlocks.length})</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search blocks..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar min-h-0">
            {filteredBlocks.length === 0 ? (
               <p className="text-center text-sm text-slate-500 py-8">No blocks found.</p>
            ) : (
              <>
                {(() => {
                  const mappedBlocks = filteredBlocks.filter((b: any) => blockPolygons.some((p: any) => p.id === b.id));
                  const unmappedBlocks = filteredBlocks.filter((b: any) => !blockPolygons.some((p: any) => p.id === b.id));

                  const renderBlock = (block: any) => {
                    const isSelected = selectedBlockId === block.id;
                    const hasMap = blockPolygons.some((p: any) => p.id === block.id);
                    return (
                      <button
                        key={block.id}
                        onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                        className={`w-full text-left p-3 rounded-lg flex items-start justify-between gap-3 transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 shrink-0 ${isSelected ? 'text-blue-500' : hasMap ? 'text-slate-400' : 'text-slate-200 dark:text-slate-700'}`}>
                            <MapPin size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium text-sm truncate ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {block.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{block.divisions?.name || 'Estate Division'}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                           <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{getBlockArea(block).toFixed(2)} ha</p>
                           <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                             block.status?.toLowerCase() === 'active' 
                               ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                               : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                           }`}>
                             {block.status || 'Active'}
                           </span>
                        </div>
                      </button>
                    );
                  };

                  return (
                    <>
                      {mappedBlocks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Mapped ({mappedBlocks.length})</h4>
                          <div className="space-y-1">
                            {mappedBlocks.map(renderBlock)}
                          </div>
                        </div>
                      )}
                      
                      {unmappedBlocks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-4">Not Mapped ({unmappedBlocks.length})</h4>
                          <div className="space-y-1">
                            {unmappedBlocks.map(renderBlock)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
