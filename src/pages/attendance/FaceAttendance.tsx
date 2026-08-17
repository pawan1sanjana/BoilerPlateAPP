import { useState, useEffect, useRef } from 'react';
import {
  Camera, UserCheck, Loader2, RefreshCcw,
  CheckCircle, CircleX, ArrowLeft, History, Users,
  LogOut, AlertCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import * as faceapi from '@vladmandic/face-api';

// ── Detection settings ────────────────────────────────────────────────────────
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
);
const DETECTION_INTERVAL_MS = isMobile ? 300 : 500;
const MATCH_THRESHOLD = 0.52;
const MODEL_URL = '/models';

// ── Types ─────────────────────────────────────────────────────────────────────
type StatusType = 'idle' | 'scanning' | 'success' | 'error' | 'warning';
type AttendanceMode = 'check-in' | 'check-out';
type ScanResult = 'success' | 'error' | null;

interface Worker {
  id: number | string;
  worker_id?: string;
  first_name: string;
  last_name: string;
  category?: string;
}

interface DetectedWorker {
  name: string;
  id: number | string;
  workerId: string;
  role: string;
  confidence: string;
  rawWorker: Worker;
}

interface AttendanceLog {
  id: number;
  name: string;
  workerId: string;
  time: string;
  confidence: string;
  status: string;
}

interface GpsLocation {
  lat: number;
  lng: number;
}

// ── HUD animations ────────────────────────────────────────────────────────────
const HUD_CSS = `
  @keyframes face-scan-line {
    0%   { top: 5%;  opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { top: 95%; opacity: 0; }
  }
  .face-scan-line { animation: face-scan-line 3s linear infinite; }
`;

export default function FaceAttendance() {
  const navigate = useNavigate();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Face Scan Engine\u2026');
  const [statusType, setStatusType] = useState<StatusType>('idle');
  const [mode, setMode] = useState<AttendanceMode>('check-in');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // ── Worker / matcher state ───────────────────────────────────────────────────
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [isInitializingMatcher, setIsInitializingMatcher] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);

  // ── Scan state ───────────────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [detectedWorker, setDetectedWorker] = useState<DetectedWorker | null>(null);
  const [isFacePresent, setIsFacePresent] = useState(false);

  // ── Attendance log state ─────────────────────────────────────────────────────
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // ── GPS ──────────────────────────────────────────────────────────────────────
  const locationRef = useRef<GpsLocation | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mutable refs that mirror state (avoid stale-closure issues in intervals)
  const hasCameraRef = useRef(false);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const modelsLoadedRef = useRef(false);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const isSwitchingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { hasCameraRef.current = hasCamera; }, [hasCamera]);
  useEffect(() => { faceMatcherRef.current = faceMatcher; }, [faceMatcher]);
  useEffect(() => { modelsLoadedRef.current = modelsLoaded; }, [modelsLoaded]);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
  useEffect(() => { isSwitchingRef.current = isSwitchingCamera; }, [isSwitchingCamera]);

  // ── GPS helper ────────────────────────────────────────────────────────────────
  const getPreciseLocation = (): Promise<GpsLocation | null> =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(locationRef.current);
      const timeout = setTimeout(() => resolve(locationRef.current), 3000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          const loc: GpsLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          locationRef.current = loc;
          resolve(loc);
        },
        (err) => {
          clearTimeout(timeout);
          console.warn('[FaceAttendance] GPS lock failed', err);
          resolve(locationRef.current);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

  // ── Initialization ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus('Loading neural network weights\u2026', 'idle');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ]);
        modelsLoadedRef.current = true;
        setModelsLoaded(true);
        setStatus(
          hasCameraRef.current
            ? 'Models ready \u2014 syncing worker profiles\u2026'
            : 'Models ready \u2014 awaiting camera\u2026',
          'idle'
        );
        await fetchWorkers();
      } catch (err) {
        console.error('[FaceAttendance] model load error:', err);
        setStatus('Model load failed \u2014 check /public/models/ folder.', 'error');
      }
    };

    startWebcam('user');
    loadModels();
    fetchTodayLogs();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        (err) => console.warn('[FaceAttendance] GPS denied', err)
      );
    }

    const handleVisibility = () => {
      if (document.hidden) { stopWebcam(); stopDetection(); }
      else startWebcam(facingModeRef.current);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopWebcam();
      stopDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build face matcher whenever models or workers change ──────────────────────
  useEffect(() => {
    if (modelsLoaded && workers.length > 0) buildFaceMatcher(workers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded, workers]);

  const buildFaceMatcher = async (workerList: Worker[]) => {
    setIsInitializingMatcher(true);
    setStatus('Building facial recognition index\u2026', 'idle');
    try {
      const labeled = await loadLabeledDescriptors(workerList);
      setEnrolledCount(labeled.length);
      if (labeled.length > 0) {
        const matcher = new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
        faceMatcherRef.current = matcher;
        setFaceMatcher(matcher);
        setStatus(`Face Scan engine online \u2014 ${labeled.length} worker(s) enrolled`, 'idle');
      } else {
        setStatus('No enrolled workers found. Enroll workers first.', 'warning');
      }
    } catch (err) {
      console.error('[FaceAttendance] matcher build error:', err);
      setStatus('Recognition index failed \u2014 detection-only mode active', 'warning');
    } finally {
      setIsInitializingMatcher(false);
    }
  };

  const loadLabeledDescriptors = async (
    _workerList: Worker[]
  ): Promise<faceapi.LabeledFaceDescriptors[]> => {
    // 1. Try Supabase face_descriptors table
    try {
      const { data: fdData } = await supabase
        .from('face_descriptors')
        .select('worker_id, descriptors');
      if (fdData && fdData.length > 0) {
        return fdData.map(({ worker_id, descriptors }: { worker_id: string; descriptors: number[][] }) => {
          const float32s = descriptors.map((d) => new Float32Array(d));
          return new faceapi.LabeledFaceDescriptors(String(worker_id), float32s);
        });
      }
    } catch (_) { /* fall through */ }

    // 2. localStorage fallback (written by WorkerEnrollment)
    try {
      const stored = localStorage.getItem('face_descriptors');
      if (stored) {
        const parsed: { worker_id: string; descriptors: number[][] }[] = JSON.parse(stored);
        if (parsed.length > 0) {
          return parsed.map(({ worker_id, descriptors }) => {
            const float32s = descriptors.map((d) => new Float32Array(d));
            return new faceapi.LabeledFaceDescriptors(String(worker_id), float32s);
          });
        }
      }
    } catch (_) { /* ignore parse errors */ }

    // 3. Fallback: load from /labels/<id>/1.png - 5.png
    const labels = [...new Set(_workerList.map((w) => String(w.worker_id || w.id)).filter(Boolean))];
    const results = await Promise.allSettled(
      labels.map(async (label) => {
        const descs: Float32Array[] = [];
        for (let i = 1; i <= 5; i++) {
          try {
            const img = await faceapi.fetchImage(`/labels/${label}/${i}.png`);
            const det = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (det) descs.push(det.descriptor);
          } catch (_) { /* skip missing */ }
        }
        return descs.length > 0
          ? new faceapi.LabeledFaceDescriptors(label, descs)
          : null;
      })
    );
    return results
      .filter(
        (r): r is PromiseFulfilledResult<faceapi.LabeledFaceDescriptors> =>
          r.status === 'fulfilled' && r.value !== null
      )
      .map((r) => r.value);
  };

  // ── Webcam ────────────────────────────────────────────────────────────────────
  const startWebcam = async (modeToUse: 'user' | 'environment' = facingModeRef.current) => {
    if (isSwitchingRef.current) return;
    setIsSwitchingCamera(true);
    isSwitchingRef.current = true;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Camera API unavailable \u2014 use Chrome/Edge on localhost', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: modeToUse,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });
        hasCameraRef.current = true;
        setHasCamera(true);
        setStatus(
          modelsLoadedRef.current
            ? 'Camera active \u2014 position your face in the frame'
            : 'Camera active \u2014 loading models\u2026',
          'idle'
        );
        startDetection();
      }
    } catch (err: unknown) {
      console.error('[FaceAttendance] camera error:', err);
      hasCameraRef.current = false;
      setHasCamera(false);
      const name = (err as any)?.name ?? '';
      const msg =
        name === 'NotAllowedError'  ? 'Camera permission denied \u2014 allow access and refresh' :
        name === 'NotFoundError'    ? 'No camera found \u2014 plug in a webcam and refresh' :
        name === 'NotReadableError' ? 'Camera in use by another app \u2014 close other apps and refresh' :
        `Camera error (${name}) \u2014 refresh and allow camera access`;
      setStatus(msg, 'error');
    } finally {
      setIsSwitchingCamera(false);
      isSwitchingRef.current = false;
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    hasCameraRef.current = false;
    setHasCamera(false);
  };

  const toggleCamera = () => {
    if (isSwitchingRef.current) return;
    const next: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    facingModeRef.current = next;
    stopDetection();
    stopWebcam();
    startWebcam(next);
  };

  // ── Detection loop ────────────────────────────────────────────────────────────
  const startDetection = () => {
    stopDetection();
    detectionIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !hasCameraRef.current || !modelsLoadedRef.current) return;
      if (video.readyState < 3) return;

      try {
        const detections = await faceapi.detectAllFaces(
          video,
          isMobile
            ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        );

        setIsFacePresent(detections.length > 0);

        const dw = video.videoWidth;
        const dh = video.videoHeight;
        if (!dw || !dh) return;

        canvas.width = dw;
        canvas.height = dh;
        faceapi.matchDimensions(canvas, { width: dw, height: dh });

        const resized = faceapi.resizeResults(detections, { width: dw, height: dh });
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, dw, dh);

        const mirror = facingModeRef.current === 'user';
        if (mirror) { ctx.save(); ctx.scale(-1, 1); ctx.translate(-dw, 0); }

        resized.forEach((det) => {
          const box = (det as any).box ?? (det as any).detection?.box ?? det;
          const cs = 20;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          // TL
          ctx.beginPath(); ctx.moveTo(box.x, box.y + cs); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cs, box.y); ctx.stroke();
          // TR
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cs, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cs); ctx.stroke();
          // BL
          ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cs); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cs, box.y + box.height); ctx.stroke();
          // BR
          ctx.beginPath(); ctx.moveTo(box.x + box.width - cs, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cs); ctx.stroke();
        });

        if (mirror) ctx.restore();
      } catch (_) { /* skip frame */ }
    }, DETECTION_INTERVAL_MS);
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const setStatus = (msg: string, type: StatusType = 'idle') => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workforce')
        .select('*')
        .neq('status', 'archived')
        .order('first_name', { ascending: true });
      if (!error && data) setWorkers(data);
      else console.warn('[FaceAttendance] fetchWorkers error:', error?.message);
    } catch (err) { console.error('[FaceAttendance] fetchWorkers:', err); }
  };

  const fetchTodayLogs = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          created_at,
          worker_id,
          status,
          workforce ( first_name, last_name )
        `)
        .eq('auth_method', 'face')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        const mappedLogs: AttendanceLog[] = data.map((d: any) => ({
          id: d.id,
          name: d.workforce ? `${d.workforce.first_name} ${d.workforce.last_name}` : 'Unknown',
          workerId: d.worker_id,
          time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: 'N/A',
          status: 'Verified'
        }));
        setLogs(mappedLogs);
        setTodayCount(mappedLogs.length);
      }
    } catch (_) { /* endpoint may not exist yet */ }
  };

  // ── Scan / Authenticate ───────────────────────────────────────────────────────
  const startScan = async () => {
    if (!isFacePresent) {
      setStatus('No face detected \u2014 position yourself in frame', 'warning');
      return;
    }
    if (!faceMatcherRef.current) {
      setStatus('Recognition index not ready \u2014 wait or enroll workers first', 'warning');
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setDetectedWorker(null);
    setStatus('Authenticating face scan signature\u2026', 'scanning');

    try {
      type FaceDetWithDesc = faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
      >;
      const captures: FaceDetWithDesc[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const dets = await faceapi
          .detectAllFaces(
            videoRef.current!,
            isMobile
              ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
              : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();
        if (dets.length > 0) captures.push(dets[0] as FaceDetWithDesc);
        await new Promise((r) => setTimeout(r, 120));
      }

      if (captures.length === 0) {
        setStatus('Detection failed \u2014 please try again', 'error');
        setScanResult('error');
        setShowResultModal(true);
        return;
      }

      const best = captures.reduce((a, b) =>
        a.detection.score > b.detection.score ? a : b
      );
      const match = faceMatcherRef.current!.findBestMatch(best.descriptor);

      if (match.label !== 'unknown') {
        const worker = workers.find(
          (w) => String(w.worker_id) === match.label || String(w.id) === match.label
        );

        if (worker) {
          const conf = ((1 - match.distance) * 100).toFixed(1);

          setStatus('Neural-Sync in progress\u2026', 'scanning');
          await new Promise((r) => setTimeout(r, 800));
          setStatus('Analyzing liveness signature\u2026', 'scanning');
          await new Promise((r) => setTimeout(r, 1000));

          setScanResult('success');
          setDetectedWorker({
            name: `${worker.first_name} ${worker.last_name}`,
            id: worker.id,
            workerId: worker.worker_id || `W-${worker.id}`,
            role: worker.category || 'Field Worker',
            confidence: `${conf}%`,
            rawWorker: worker,
          });
          setShowResultModal(true);
          setStatus('Identity confirmed \u2014 review attendance', 'success');
        } else {
          setScanResult('error');
          setShowResultModal(true);
          setStatus('Face matched but worker record not found', 'error');
        }
      } else {
        setScanResult('error');
        setShowResultModal(true);
        setStatus('Identity not recognized \u2014 not enrolled or poor match', 'error');
      }
    } catch (err) {
      console.error('[FaceAttendance] scan error:', err);
      setScanResult('error');
      setShowResultModal(true);
      setStatus('Scan error \u2014 please retry', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const submitAttendance = async () => {
    if (!detectedWorker) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const freshLoc = await getPreciseLocation();
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
      
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', detectedWorker.workerId)
        .eq('date', today)
        .maybeSingle();

      let dbError = null;

      if (mode === 'check-in') {
        if (existingRecord?.check_in_time) {
          throw new Error('Duplicate Activity: Already checked in today.');
        }
        const { error } = await supabase.from('attendance').insert({
          worker_id: detectedWorker.workerId,
          date: today,
          check_in_time: currentTime,
          check_in_latitude: freshLoc?.lat ?? null,
          check_in_longitude: freshLoc?.lng ?? null,
          check_in_method: 'face'
        });
        dbError = error;
      } else {
        // check-out
        if (!existingRecord || !existingRecord.check_in_time) {
          throw new Error('Must check in before checking out.');
        }
        if (existingRecord.check_out_time) {
          throw new Error('Duplicate Activity: Already checked out today.');
        }
        const { error } = await supabase.from('attendance').update({
          check_out_time: currentTime,
          check_out_latitude: freshLoc?.lat ?? null,
          check_out_longitude: freshLoc?.lng ?? null,
          check_out_method: 'face'
        }).eq('id', existingRecord.id);
        dbError = error;
      }
      
      if (dbError) throw dbError;

      const entry: AttendanceLog = {
        id: Date.now(),
        name: detectedWorker.name,
        workerId: detectedWorker.workerId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: detectedWorker.confidence,
        status: 'Verified',
      };
      setLogs((prev) => [entry, ...prev.slice(0, 49)]);
      setTodayCount((prev) => prev + 1);
      setShowResultModal(false);
      resetScan();
    } catch (err: unknown) {
      console.error('Submission failed', err);
      const errMsg = (err as any)?.message || '';
      const displayMsg = (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('duplicate'))
        ? 'Duplicate Activity: Worker is already checked in/out for today.'
        : errMsg || 'Face Scan link failed';
      setSubmissionError(displayMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setDetectedWorker(null);
    setShowResultModal(false);
    setSubmissionError(null);
    setStatus(hasCamera ? 'Ready \u2014 position face in frame' : 'Camera offline', 'idle');
  };

  // ── Status colour helpers ─────────────────────────────────────────────────────
  const statusColors: Record<StatusType, string> = {
    idle:     'text-slate-300',
    scanning: 'text-amber-400 animate-pulse',
    success:  'text-emerald-400',
    error:    'text-rose-400',
    warning:  'text-amber-400',
  };

  const statusBadge: Record<StatusType, string> = {
    idle:     'bg-white/10 text-white/70 border-white/10',
    scanning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    success:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error:    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    warning:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black sm:bg-zinc-950 sm:flex sm:items-center sm:justify-center z-50">
      <div className="w-full h-full sm:w-[420px] sm:h-[850px] sm:max-h-[90vh] sm:rounded-[3rem] sm:border-[12px] sm:border-zinc-900 sm:shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black text-white overflow-hidden flex flex-col font-sans select-none relative">
        <style>{HUD_CSS}</style>

        {/* ── Camera Viewport ── */}
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full z-10 pointer-events-none transition-opacity duration-700 ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* No-camera / loading state */}
          {!hasCamera && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 z-10 gap-4">
              {!modelsLoaded
                ? <Loader2 size={44} className="animate-spin text-yellow-400" />
                : <Camera size={50} className="opacity-40" />}
              <p className="text-xs uppercase tracking-widest font-semibold">
                {!modelsLoaded ? 'Starting Engine\u2026' : 'Camera Access Required'}
              </p>
            </div>
          )}

          {/* Top gradient bar */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 flex justify-between items-start p-5">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div className="flex flex-col items-center gap-1 max-w-[60%]">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border ${statusBadge[statusType]} text-center truncate w-full`}>
                {statusMessage}
              </span>
              {isFacePresent && !isScanning && (
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest drop-shadow-md">
                  Face Detected
                </span>
              )}
              {enrolledCount > 0 && (
                <span className="text-[9px] text-white/30 uppercase tracking-widest">
                  {enrolledCount} enrolled
                </span>
              )}
            </div>

            <button
              onClick={toggleCamera}
              disabled={isSwitchingCamera || !hasCamera}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
            >
              <RefreshCcw size={18} className={`text-white ${isSwitchingCamera ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Scanning line animation */}
          {isScanning && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              <div className="face-scan-line absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
            </div>
          )}

          {/* Camera crosshair guide */}
          {hasCamera && !isScanning && !showResultModal && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-25">
              <div className="w-56 h-56 border border-white/30 rounded-[2.5rem] relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/40" />
              </div>
            </div>
          )}

          {/* Today's log strip at bottom of viewport */}
          {logs.length > 0 && (
            <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-2 px-4">
              <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex-shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
                  >
                    <CheckCircle size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-white/80">{log.name.split(' ')[0]}</span>
                    <span className="text-[9px] text-white/40">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Controls ── */}
        <div className="h-52 bg-black z-20 flex flex-col justify-center items-center pb-6 pt-3 shrink-0">
          {/* Mode selector */}
          <div className="flex gap-10 mb-5 text-[11px] font-black tracking-widest uppercase">
            <button
              onClick={() => setMode('check-in')}
              className={`transition-all duration-300 ${mode === 'check-in' ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-white/40'}`}
            >
              Check-In
            </button>
            <button
              onClick={() => setMode('check-out')}
              className={`transition-all duration-300 ${mode === 'check-out' ? 'text-rose-400 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'text-white/40'}`}
            >
              Check-Out
            </button>
          </div>

          {/* Shutter row */}
          <div className="flex items-center justify-between w-full px-12 max-w-md mx-auto">
            {/* History link */}
            <Link
              to="/muster/directory"
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            >
              <History size={20} className="text-white" />
            </Link>

            {/* Shutter button */}
            <div className="relative flex items-center justify-center">
              <div className={`absolute rounded-full border-[3px] transition-colors duration-300 inset-0 ${isScanning ? 'border-amber-400' : mode === 'check-out' ? 'border-rose-500' : 'border-white'}`} />
              <button
                onClick={startScan}
                disabled={isScanning || !modelsLoaded || !hasCamera || isInitializingMatcher}
                className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center p-1.5 focus:outline-none disabled:opacity-40 transition-transform active:scale-95"
              >
                <div
                  className={`w-full h-full rounded-full transition-all duration-300 ${
                    isScanning
                      ? 'bg-amber-500 scale-[0.38] rounded-xl'
                      : mode === 'check-in'
                      ? 'bg-white'
                      : 'bg-rose-500'
                  }`}
                />
              </button>
            </div>

            {/* Today count badge */}
            <div className="w-12 h-12 flex items-center justify-center flex-col gap-0.5">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                <Users size={12} className="text-white/30" />
                <span className="text-[9px] font-black text-white/50">{todayCount}</span>
              </div>
            </div>
          </div>

          {/* Hint text */}
          <p className={`mt-4 text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300 ${statusColors[statusType]}`}>
            {isScanning ? 'Scanning\u2026' : isFacePresent ? 'Tap to authenticate' : 'Position face in frame'}
          </p>
        </div>

        {/* ── Confirmation Modal ── */}
        {showResultModal && (
          <div className="absolute inset-0 z-[300] flex flex-col justify-end bg-black/60 backdrop-blur-sm pb-8 px-4">
            <div className="w-full max-w-sm mx-auto rounded-[2.5rem] bg-zinc-900 overflow-hidden shadow-2xl">
              {scanResult === 'success' && detectedWorker ? (
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="p-8 text-center border-b border-white/5">
                    <div
                      className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 border-[3px] ${
                        mode === 'check-out'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <UserCheck size={36} />
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${mode === 'check-out' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {mode === 'check-out' ? 'Check-Out Scanned' : 'Check-In Scanned'}
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                      {detectedWorker.name}
                    </h3>
                    <p className="text-white/40 text-xs font-semibold mt-1 uppercase tracking-widest">
                      {detectedWorker.workerId} &middot; {detectedWorker.role}
                    </p>
                    <p className="text-white/30 text-[10px] mt-1">
                      Confidence: <span className="text-emerald-400 font-bold">{detectedWorker.confidence}</span>
                    </p>
                  </div>

                  {/* Body */}
                  <div className="p-8 space-y-3">
                    {submissionError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                        <AlertCircle className="text-rose-500 shrink-0" size={16} />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 leading-tight">
                          {submissionError}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={submitAttendance}
                      disabled={isSubmitting}
                      className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        mode === 'check-out'
                          ? 'bg-rose-600 hover:bg-rose-500'
                          : 'bg-yellow-500 text-black hover:bg-yellow-400'
                      }`}
                    >
                      {isSubmitting
                        ? <Loader2 className="animate-spin" size={16} />
                        : mode === 'check-out'
                        ? <LogOut size={16} />
                        : <CheckCircle size={16} />}
                      {mode === 'check-out' ? 'Confirm Check-Out' : 'Log Attendance'}
                    </button>
                    <button
                      onClick={resetScan}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl bg-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ) : (
                /* Not recognized */
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 border-[3px] border-rose-500/20">
                    <CircleX size={40} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                    Not Recognized
                  </h3>
                  <p className="text-white/40 text-xs font-medium mb-8 max-w-[200px] mx-auto leading-relaxed">
                    Ensure your face is clearly in frame and well-lit, then try again.
                  </p>
                  <button
                    onClick={resetScan}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
