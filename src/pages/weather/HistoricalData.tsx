import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calendar, TrendingUp, Download, Loader2, MapPin, Activity, History, Thermometer, CloudRain, Sun, Building2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

function getCentroidFromPolygon(polygonCoordinates: any): { lat: number; lon: number } | null {
  if (!polygonCoordinates) return null;
  try {
    let polyData = polygonCoordinates;
    if (typeof polyData === 'string') polyData = JSON.parse(polyData);
    let rawCoords: any[] | null = null;
    if (polyData?.type === 'Feature' && polyData.geometry?.type === 'Polygon') {
      rawCoords = polyData.geometry.coordinates[0];
    } else if (polyData?.type === 'Polygon') {
      rawCoords = polyData.coordinates[0];
    } else if (Array.isArray(polyData)) {
      rawCoords = polyData;
    }

    if (rawCoords && rawCoords.length > 0) {
      let sumLat = 0;
      let sumLng = 0;
      let count = 0;
      rawCoords.forEach((c: any) => {
        if (c?.lat !== undefined && (c?.lng !== undefined || c?.lon !== undefined)) {
          sumLat += Number(c.lat);
          sumLng += Number(c.lng || c.lon);
          count++;
        } else if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number') {
          const firstIsLng = Math.abs(c[0]) > Math.abs(c[1]);
          const lat = firstIsLng ? c[1] : c[0];
          const lng = firstIsLng ? c[0] : c[1];
          sumLat += Number(lat);
          sumLng += Number(lng);
          count++;
        }
      });
      if (count > 0) {
        return { lat: sumLat / count, lon: sumLng / count };
      }
    }
  } catch (e) {
    console.error('Centroid parse error:', e);
  }
  return null;
}

export default function HistoricalData() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [selectedPeriod, setSelectedPeriod] = useState('30'); // days
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [location, setLocation] = useState<{latitude: number, longitude: number}>({ latitude: 6.93, longitude: 80.79 });
  const [loading, setLoading] = useState(true);
  const [estates, setEstates] = useState<{ id: string; name: string; latitude?: number | null; longitude?: number | null }[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);

  // 1. Fetch active estates
  useEffect(() => {
    supabase.from('estates').select('id, name, latitude, longitude').eq('status', 'active').order('name').then(({ data }) => {
      if (data) setEstates(data);
    });
  }, []);

  // Set default estate filter based on role
  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  // 2. Fetch field blocks when selected estate changes
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        let query = supabase.from('field_blocks').select('id, name, polygon_coordinates, estate_id, divisions(name)').order('name');
        if (selectedEstateFilter !== 'all') {
          query = query.eq('estate_id', selectedEstateFilter);
        } else if (!isUserAdmin && profile?.estate_id) {
          query = query.eq('estate_id', profile.estate_id);
        }
        const { data, error } = await query;
        if (!error && data) {
          setBlocks(data);
        } else {
          setBlocks([]);
        }
        setSelectedBlock('all');
      } catch (err) {
        console.error('Error fetching blocks for historical weather:', err);
      }
    };
    fetchBlocks();
  }, [selectedEstateFilter, isUserAdmin, profile]);

  // 3. Compute coordinates when estate or block changes
  useEffect(() => {
    let targetLat = 6.93;
    let targetLon = 80.79;

    const selectedEst = estates.find(e => e.id === selectedEstateFilter);
    if (selectedEst && selectedEst.latitude !== null && selectedEst.latitude !== undefined &&
        selectedEst.longitude !== null && selectedEst.longitude !== undefined) {
      targetLat = Number(selectedEst.latitude);
      targetLon = Number(selectedEst.longitude);
    }

    if (selectedBlock !== 'all') {
      const selectedBlk = blocks.find(b => b.id === selectedBlock);
      if (selectedBlk) {
        const centroid = getCentroidFromPolygon(selectedBlk.polygon_coordinates);
        if (centroid) {
          targetLat = centroid.lat;
          targetLon = centroid.lon;
        }
      }
    } else if (!selectedEst?.latitude || !selectedEst?.longitude) {
      const centroids = blocks
        .map(b => getCentroidFromPolygon(b.polygon_coordinates))
        .filter((c): c is { lat: number; lon: number } => c !== null);

      if (centroids.length > 0) {
        targetLat = centroids.reduce((sum, c) => sum + c.lat, 0) / centroids.length;
        targetLon = centroids.reduce((sum, c) => sum + c.lon, 0) / centroids.length;
      }
    }

    setLocation({ latitude: targetLat, longitude: targetLon });
  }, [selectedEstateFilter, selectedBlock, estates, blocks]);

  const fetchHistoricalData = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${getPastDate(parseInt(selectedPeriod))}&end_date=${getCurrentDate()}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum&temperature_unit=celsius&timezone=auto`
      );
      const data = await response.json();
      
      const chartData = (data.daily?.time || []).map((date: string, idx: number) => {
        const baseDay = {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: date,
          temp: Math.round(data.daily.temperature_2m_mean[idx] * 10) / 10,
          tempMax: Math.round(data.daily.temperature_2m_max[idx] * 10) / 10,
          tempMin: Math.round(data.daily.temperature_2m_min[idx] * 10) / 10,
          humidity: Math.round(data.daily.relative_humidity_2m_mean[idx]),
          rainfall: Math.round(data.daily.precipitation_sum[idx] * 10) / 10,
        };

        return baseDay;
      });

      setHistoricalData(chartData);
    } catch (error) {
      console.error('Historical data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (location) {
      fetchHistoricalData(location.latitude, location.longitude);
    }
  }, [location, fetchHistoricalData]);

  const getCurrentDate = () => new Date().toISOString().split('T')[0];
  const getPastDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  const getStats = () => {
    if (historicalData.length === 0) return [];
    const avgTemp = (historicalData.reduce((a, b) => a + b.temp, 0) / historicalData.length).toFixed(1);
    const totalRainfall = historicalData.reduce((a, b) => a + b.rainfall, 0).toFixed(0);
    const sunnyDays = historicalData.filter(d => d.rainfall === 0).length;
    return [
      { label: 'Avg Temperature', value: `${avgTemp}°C`, i: Thermometer, color: 'text-orange-500' },
      { label: 'Total Rainfall', value: `${totalRainfall} mm`, i: CloudRain, color: 'text-blue-500' },
      { label: 'Sunny Days', value: `${sunnyDays}/${historicalData.length}`, i: Sun, color: 'text-amber-500' }
    ];
  };

  const stats = getStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-1">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Climate Records</h1>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1">
            <History size={14} className="text-blue-500" /> Historical weather patterns and trends by estate
          </p>
        </div>
      </div>

      {/* Modern Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Building2 size={14} /> Select Estate</label>
            <select
              value={selectedEstateFilter}
              onChange={(e) => setSelectedEstateFilter(e.target.value)}
              disabled={!isUserAdmin && !!profile?.estate_id}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isUserAdmin && <option value="all">All Active Estates</option>}
              {estates.map((est) => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Calendar size={14} /> Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last Quarter</option>
              <option value="365">Last Year</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><MapPin size={14} /> Target Block</label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Estate Blocks</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name} {block.divisions?.name ? `(${block.divisions.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Activity size={14} /> Analysis Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="temperature">Thermal Distribution</option>
              <option value="rainfall">Precipitation Cycle</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <Download size={16} /> Export Intelligence
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Climate database...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 group hover:scale-[1.02] transition-all">
                <stat.i size={16} className={`${stat.color} mb-3`} />
                <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Graphical Intelligence */}
          <div className="grid grid-cols-1 gap-6">
             {selectedMetric === 'temperature' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2"><Thermometer size={16} className="text-orange-500" /> Thermal Distribution Analysis</h3>
                   </div>
                   <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <AreaChart data={historicalData}>
                          <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickMargin={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             )}

             {selectedMetric === 'rainfall' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-8 flex items-center gap-2"><CloudRain size={16} className="text-blue-500" /> Precipitation Intensity Chart</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickMargin={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                        <Tooltip contentStyle={{ borderRadius: '16px' }} />
                        <Bar dataKey="rainfall" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
             )}


          </div>

          {/* Tactical Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
             {[
               { t: 'Thermal Integrity', d: 'Historical stability shows optimal plucking windows around early morning cycles.', i: 'Photosynthesis remains efficient within 18°C-26°C range.' },
               { t: 'Precipitation Patterns', d: 'Rainfall spikes correlate directly with flushing surges in sloped estate blocks.', i: 'Ensure drainage maintenance before peak monsoon intervals.' }
             ].map(insight => (
                <div key={insight.t} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 border-l-4 border-l-blue-500">
                   <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{insight.t}</h4>
                   <p className="text-sm text-slate-500 font-medium mb-4">{insight.d}</p>
                   <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">💡 {insight.i}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
