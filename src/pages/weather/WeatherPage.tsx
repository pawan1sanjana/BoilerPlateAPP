import { useState, useEffect, useCallback } from 'react';
import {
  Cloud, MapPin, Thermometer, Droplets, Wind, Sun,
  AlertTriangle, Loader2, CheckCircle, Gauge, Compass,
  CloudRain, Snowflake, Activity, TrendingUp, Leaf, Shield, AlertOctagon,
  Navigation, ChevronRight, Sunrise, Sunset, Building2, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

// ── WMO Weather Code → Icon & Label ──
const WMO_CODES: Record<number, { label: string; emoji: string; color: string }> = {
  0:  { label: 'Clear Sky',          emoji: '☀️', color: 'text-amber-500' },
  1:  { label: 'Mainly Clear',       emoji: '🌤️', color: 'text-amber-400' },
  2:  { label: 'Partly Cloudy',      emoji: '⛅', color: 'text-slate-400' },
  3:  { label: 'Overcast',           emoji: '☁️', color: 'text-slate-500' },
  45: { label: 'Foggy',              emoji: '🌫️', color: 'text-slate-300' },
  48: { label: 'Depositing Ice Fog', emoji: '🌫️', color: 'text-slate-300' },
  51: { label: 'Light Drizzle',      emoji: '🌦️', color: 'text-blue-400' },
  61: { label: 'Slight Rain',        emoji: '🌧️', color: 'text-blue-500' },
  63: { label: 'Moderate Rain',      emoji: '🌧️', color: 'text-blue-600' },
  65: { label: 'Heavy Rain',         emoji: '🌧️', color: 'text-blue-700' },
  71: { label: 'Slight Snow',        emoji: '🌨️', color: 'text-sky-300' },
  80: { label: 'Rain Showers',       emoji: '🌦️', color: 'text-blue-400' },
  95: { label: 'Thunderstorm',       emoji: '⛈️', color: 'text-purple-600' },
  99: { label: 'Heavy Thunderstorm', emoji: '⛈️', color: 'text-purple-800' },
};

const getWMO = (code: number) => WMO_CODES[code] || { label: 'Unknown', emoji: '🌡️', color: 'text-slate-400' };

const getWindDirection = (degrees: number) => {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(degrees / 18.5) % 16];
};

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

const AgroRisks = ({ weather }: { weather: any }) => {
  const risks = [];
  if (!weather || Object.keys(weather).length === 0) return null;

  // 1. Heat Stress & Photosynthesis Inhibition
  if (weather.temperature > 32) {
    risks.push({ level: 'critical', icon: AlertOctagon, title: 'Thermal Inhibition', color: 'red', desc: 'Photosynthesis rate is slowing. Ensure shade management & irrigation.' });
  } else if (weather.temperature < 13) {
    risks.push({ level: 'high', icon: Snowflake, title: 'Dormancy Risk', color: 'sky', desc: 'Low temps may inhibit bud growth. Monitor for night frost in high altitudes.' });
  } else if (weather.temperature >= 18 && weather.temperature <= 28) {
    risks.push({ level: 'optimal', icon: CheckCircle, title: 'Optimal Plucking', color: 'emerald', desc: 'Ideal temperature for high-quality leaf processing.' });
  }

  // 2. Fungal & Blister Blight Risk (Humidity + Temperature)
  if (weather.humidity > 88) {
    risks.push({ level: 'high', icon: AlertTriangle, title: 'Blister Blight Alert', color: 'amber', desc: 'Critical fungal risk. Evaluate immediate fungicide application.' });
  }

  // 3. Logistics & Infrastructure (Wind/Rain)
  if (weather.windSpeed > 35) {
    risks.push({ level: 'high', icon: Wind, title: 'Wind Hazard', color: 'amber', desc: 'High winds. Secure nurseries and monitor shade tree stability.' });
  }
  
  if (weather.rainfall > 15) {
    risks.push({ level: 'high', icon: CloudRain, title: 'Erosion Warning', color: 'blue', desc: 'Significant runoff. Check drainage in sloped blocks.' });
  }

  if (risks.length === 0) {
    risks.push({ level: 'clear', icon: Shield, title: 'Safe Operations', color: 'emerald', desc: 'All meteorological factors favor standard maintenance.' });
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
        <Leaf size={16} className="text-blue-600" /> Agronomic Intelligence
      </h3>
      {risks.map((r, i) => (
        <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl border ${r.color === 'red' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : r.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20'}`}>
          <r.icon size={16} className={`mt-0.5 shrink-0 ${r.color === 'red' ? 'text-red-600' : r.color === 'amber' ? 'text-amber-600' : 'text-emerald-600'}`} />
          <div><p className={`text-[11px] font-black uppercase tracking-widest ${r.color === 'red' ? 'text-red-700' : r.color === 'amber' ? 'text-amber-700' : 'text-emerald-700'}`}>{r.title}</p><p className="text-[10px] text-slate-500 font-medium">{r.desc}</p></div>
        </div>
      ))}
    </div>
  );
};

const UVGauge = ({ index = 0 }: { index?: number }) => {
  const color = index <= 2 ? '#22c55e' : index <= 5 ? '#eab308' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-2xl font-black" style={{ color }}>{index}</div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">UV Index</p>
    </div>
  );
};

export default function RealtimeWeather() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [estates, setEstates] = useState<{ id: string; name: string; latitude?: number | null; longitude?: number | null; location_name?: string | null }[]>([]);
  const [selectedEstateFilter, setSelectedEstateFilter] = useState<string>('all');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('all');

  const [locationName, setLocationName] = useState('Estate Location');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: string, text: string} | null>(null);
  const [showGPSModal, setShowGPSModal] = useState(false);

  const [current, setCurrent] = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);

  const showMsg = (type: string, text: string) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3500); };

  // 1. Fetch active estates with DB GPS coordinates
  useEffect(() => {
    supabase.from('estates').select('id, name, latitude, longitude, location_name').eq('status', 'active').order('name').then(({ data }) => {
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
        setSelectedBlockId('all');
      } catch (err) {
        console.error('Error fetching blocks for weather:', err);
      }
    };
    fetchBlocks();
  }, [selectedEstateFilter, isUserAdmin, profile]);

  const fetchWeather = useCallback(async (lat: number, lon: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,dew_point_2m,pressure_msl,cloud_cover` +
        `&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
        `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=7&past_days=0`;
      const res = await fetch(url);
      const data = await res.json();
      
      setCurrent({
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        rainfall: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        windDegrees: data.current.wind_direction_10m,
        dewPoint: data.current.dew_point_2m,
        pressure: data.current.pressure_msl,
        cloudCover: data.current.cloud_cover,
        wmoCode: data.current.weather_code,
      });

      const hTimes = data.hourly.time;
      const startIdx = hTimes.findIndex((t: string) => new Date(t) >= new Date());
      setHourly(hTimes.slice(startIdx, startIdx + 12).map((t: string, i: number) => ({
        time: new Date(t).getHours() + ':00',
        temp: Math.round(data.hourly.temperature_2m[startIdx + i]),
        precip: data.hourly.precipitation_probability[startIdx + i],
        code: data.hourly.weather_code[startIdx + i],
      })));

      setDaily(data.daily.time.map((t: string, i: number) => {
        const d = new Date(t);
        return {
          dateNum: d.getDate(),
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
          rain: data.daily.precipitation_sum[i],
          code: data.daily.weather_code[i],
          uv: data.daily.uv_index_max[i],
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
        };
      }));

      if (!silent) showMsg('success', 'Satellite Sync Success');
    } catch { showMsg('error', 'API Connection Error'); }
    finally { setLoading(false); }
  }, []);

  // Recalculate coordinates & refetch weather whenever estate or block selection changes
  useEffect(() => {
    let targetLat = 6.93;
    let targetLon = 80.79;
    let computedName = 'Estate Location';

    const selectedEst = estates.find(e => e.id === selectedEstateFilter);
    if (selectedEst) {
      computedName = selectedEst.location_name ? `${selectedEst.name} (${selectedEst.location_name})` : selectedEst.name;
      if (selectedEst.latitude !== null && selectedEst.latitude !== undefined &&
          selectedEst.longitude !== null && selectedEst.longitude !== undefined) {
        targetLat = Number(selectedEst.latitude);
        targetLon = Number(selectedEst.longitude);
      }
    } else if (selectedEstateFilter === 'all') {
      computedName = 'All Estates (Highland Region)';
    }

    if (selectedBlockId !== 'all') {
      const selectedBlk = blocks.find(b => b.id === selectedBlockId);
      if (selectedBlk) {
        computedName = selectedEst ? `${selectedEst.name} — ${selectedBlk.name}` : selectedBlk.name;
        const centroid = getCentroidFromPolygon(selectedBlk.polygon_coordinates);
        if (centroid) {
          targetLat = centroid.lat;
          targetLon = centroid.lon;
        }
      }
    } else if (!selectedEst?.latitude || !selectedEst?.longitude) {
      // Fallback: Find average centroid of available blocks if estate lat/lon is not stored in DB
      const centroids = blocks
        .map(b => getCentroidFromPolygon(b.polygon_coordinates))
        .filter((c): c is { lat: number; lon: number } => c !== null);

      if (centroids.length > 0) {
        targetLat = centroids.reduce((sum, c) => sum + c.lat, 0) / centroids.length;
        targetLon = centroids.reduce((sum, c) => sum + c.lon, 0) / centroids.length;
      }
    }

    setLocationName(computedName);
    fetchWeather(targetLat, targetLon);
  }, [selectedEstateFilter, selectedBlockId, estates, blocks, fetchWeather]);

  const detectLocation = () => {
    setShowGPSModal(false);
    if (!navigator.geolocation) return showMsg('error', 'GPS not supported');
    navigator.geolocation.getCurrentPosition(
      pos => { 
        const { latitude: lat, longitude: lon } = pos.coords;
        fetchWeather(lat, lon); 
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then(r=>r.json()).then(d=> {
           const a = d.address; setLocationName(a.city || a.town || a.village || 'Your Estate');
        });
      },
      () => showMsg('error', 'Location Access Denied')
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 p-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Weather Forecast</h1>
          <p className="text-slate-500 text-sm font-medium flex items-center gap-2 mt-1"><Cloud size={14} className="text-blue-500" /> Real-time atmospheric conditions and forecasts by estate</p>
        </div>
        <button onClick={() => setShowGPSModal(true)} className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 rounded-2xl shadow-xl shadow-blue-500/20 text-[10px] uppercase font-black tracking-widest"><Navigation size={16} /> Detect Sync Location</button>
      </div>

      {/* Estate & Block Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-500" /> Select Estate
            </label>
            <select
              value={selectedEstateFilter}
              onChange={(e) => setSelectedEstateFilter(e.target.value)}
              disabled={!isUserAdmin && !!profile?.estate_id}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isUserAdmin && <option value="all">All Active Estates</option>}
              {estates.map((est) => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-blue-500" /> Micro-Climate Field Block
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Blocks (Estate Centroid)</option>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name} {block.divisions?.name ? `(${block.divisions.name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message && <div className={`fixed top-4 right-4 z-[500] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 ${message.type === 'success' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}><CheckCircle size={16} /><span className="text-sm font-bold">{message.text}</span></div>}

      {/* Hero Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative">
        {loading ? <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Satellite Feeds for {locationName}...</p></div> : current && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex items-center gap-8">
              <div className="text-8xl select-none">{getWMO(current.wmoCode).emoji}</div>
              <div>
                <div className="flex items-baseline gap-2"><h2 className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">{current.temperature}°</h2><span className="text-3xl font-bold text-slate-400">c</span></div>
                <p className={`text-xl font-black uppercase tracking-tight ${getWMO(current.wmoCode).color}`}>{getWMO(current.wmoCode).label}</p>
                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2 uppercase tracking-widest"><MapPin size={12} className="text-blue-500" /> {locationName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-2xl">
              {[{l:'Feels Like', v:current.feelsLike+'°', i:Thermometer, c:'text-orange-500'}, {l:'Humidity', v:current.humidity+'%', i:Droplets, c:'text-blue-500'}, {l:'Rainfall', v:current.rainfall+'mm', i:CloudRain, c:'text-sky-500'}, {l:'Pressure', v:current.pressure+'hPa', i:Gauge, c:'text-indigo-500'}].map((s: any)=>(
                <div key={s.l} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800"><s.i size={14} className={`${s.c} mb-2`} /><p className="text-xl font-black">{s.v}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.l}</p></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 12-HOUR FORECAST GRID (TWO ROWS) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
         <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={16} className="text-sky-500" /> 12-Hour Micro-Trend</h3>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {hourly.map((h, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all border ${i === 0 ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-[1.03]' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}>
                 <p className={`text-[9px] font-black uppercase tracking-widest ${i === 0 ? 'text-blue-100' : 'text-slate-400'}`}>{i === 0 ? 'Now' : h.time}</p>
                 <span className="text-3xl select-none">{getWMO(h.code).emoji}</span>
                 <p className="text-lg font-black">{h.temp}°</p>
                 <div className="flex items-center gap-1.5"><Droplets size={10} className={i===0?'text-white':'text-blue-500'} /><span className={`text-[10px] font-bold ${i===0?'text-white':'text-slate-400'}`}>{h.precip}%</span></div>
              </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-DAY TACTICAL OUTLOOK */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-8 flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> 7-Day Precision Outlook</h3>
          <div className="space-y-3">
             {daily.map((d, i) => {
               const wmo = getWMO(d.code);
               return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${i === 0 ? 'bg-blue-50/30 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:scale-[1.01]'}`}>
                  <div className="flex items-center gap-4 w-32 shrink-0">
                    <span className="text-3xl">{wmo.emoji}</span>
                    <div><p className={`text-[11px] font-black uppercase tracking-tight ${i === 0 ? 'text-blue-700' : 'text-slate-700 dark:text-slate-300'}`}>{i === 0 ? 'Today' : `${d.dateNum} ${d.dayName}`}</p><p className="text-[9px] font-black text-slate-400 uppercase">{wmo.label}</p></div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 px-8">
                     <div className="hidden md:flex flex-col gap-1 w-full max-w-[120px]">
                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase px-1"><span>{d.min}°</span><span>{d.max}°</span></div>
                        <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-400 to-orange-400 rounded-full w-full" /></div>
                     </div>
                     <div className="flex items-center gap-1.5 text-blue-500 font-black"><Droplets size={12} /><p className="text-xs">{d.rain}<span className="text-[9px] ml-0.5 font-bold">mm</span></p></div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-4">
                     <div><p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{d.max}°</p><p className="text-[9px] font-black text-slate-400 uppercase mt-1">High</p></div>
                     <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
               );
             })}
          </div>
        </div>

        <div className="space-y-6">
           <AgroRisks weather={current || {}} />
           
           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-6 flex items-center gap-2"><Sun size={16} className="text-amber-400" /> Solar Cycle</h3>
              {daily[0] && (
                <div className="space-y-5">
                   <div className="flex items-center justify-between text-center">
                      <div><Sunrise size={20} className="text-amber-500 mx-auto mb-1" /><p className="text-lg font-black">{new Date(daily[0].sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sunrise</p></div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                      <div><Sunset size={20} className="text-orange-500 mx-auto mb-1" /><p className="text-lg font-black">{new Date(daily[0].sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sunset</p></div>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-200 via-orange-400 to-slate-400 rounded-full" style={{ width: '65%' }} /></div>
                </div>
              )}
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 grid grid-cols-2 gap-4">
              <div className="text-center"><Wind size={18} className="text-emerald-500 mx-auto mb-2" /><p className="text-xl font-black">{current?.windSpeed}<span className="text-[9px] ml-0.5 text-slate-400">km/h</span></p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wind Speed</p></div>
              <div className="text-center"><Compass size={18} className="text-blue-600 mx-auto mb-2" /><p className="text-xl font-black">{getWindDirection(current?.windDegrees || 0)}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direction</p></div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"><UVGauge index={daily[0]?.uv || 0} /></div>
        </div>
      </div>

      {/* GPS MODAL */}
      {showGPSModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
             <div className="p-8 text-center text-slate-900 dark:text-white">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600"><Navigation size={40} className="animate-pulse" /></div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Geo-Precision Sync</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mt-4">We need absolute GPS coordinates to calibrate hyper-local climate predictions for your specific estate blocks.</p>
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-800/40 flex flex-col gap-3">
                <button onClick={detectLocation} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-blue-500/20">Authorize Satellite Link</button>
                <button onClick={() => setShowGPSModal(false)} className="text-[10px] font-black uppercase text-slate-400 py-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Keep Manual Fallback</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
