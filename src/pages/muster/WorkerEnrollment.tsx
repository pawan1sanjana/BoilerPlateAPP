import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, ScanFace, Loader2,
  CheckCircle, RefreshCcw, Users, Search,
  Fingerprint, Trash2, Image as ImageIcon,
  X, ChevronRight, ShieldCheck, Activity, Zap, AlertCircle, FlipHorizontal
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import * as faceapi from '@vladmandic/face-api';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

const MODEL_URL = '/models';
const CAPTURE_COUNT = 6;          // total samples to capture
const CAPTURE_DELAY_MS = 180;     // ⚡ gap between samples (was 600)
const MAX_RETRIES_PER_SAMPLE = 6; // retries per sample
const MIN_CONFIDENCE = 0.3;       // TinyFaceDetector threshold
const QUALITY_THRESHOLD = 0.55;   // ⚡ accept slightly lower for speed
const CAMERA_WARMUP_MS = 500;     // ⚡ shorter warmup (was 1200)
const FRAME_BUFFER_SIZE = 2;      // ⚡ 2 frames is enough (was 4)
const FRAME_BUFFER_DELAY = 30;    // ⚡ ms between buffered frames (was 80)

const HUD_CSS = `
  @keyframes scanline {
    0% { top: 0%; opacity: 0; }
    5% { opacity: 1; }
    95% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  .animate-scanline {
    animation: scanline 4s linear infinite;
  }
  .pulse-ring {
    animation: pulse-ring 1.5s ease-out infinite;
  }
  .neural-grid {
    background-image: 
      linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
    background-size: 30px 30px;
  }
  /* Stable progress bar without layout shift */
  .capture-btn-fab {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;
  }
`;

export default function WorkerEnrollment() {

  // Model state
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [, setModelError] = useState(false);
  const [, setModelLoadProgress] = useState(0);

  // Worker selection
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [showWorkerPanel, setShowWorkerPanel] = useState(true);
  const [estates, setEstates] = useState([]);
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [enrollmentFilter, setEnrollmentFilter] = useState('all'); // all, enrolled, unenrolled

  // Camera & capture
  const [hasCamera, setHasCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const facingModeRef = useRef('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const isSwitchingRef = useRef(false);
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);
  useEffect(() => { isSwitchingRef.current = isSwitchingCamera; }, [isSwitchingCamera]);
  const [capturing, setCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedPreviews, setCapturedPreviews] = useState([]);
  const [capturedScores, setCapturedScores] = useState([]);

  // Live detection state
  const [liveDetection, setLiveDetection] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [faceAlignment, setFaceAlignment] = useState('');

  // Auto-capture state
  const [autoCapture, setAutoCapture] = useState(false);
  const autoCaptureTimerRef = useRef(null);
  const autoCaptureCountdownRef = useRef(null);
  const stableFrameCount = useRef(0);

  // Result
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrollError, setEnrollError] = useState('');
  const [captureLog, setCaptureLog] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const liveDetectionRef = useRef(false);
  const liveScoreRef = useRef(0);
  const capturingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { liveDetectionRef.current = liveDetection; }, [liveDetection]);
  useEffect(() => { liveScoreRef.current = liveScore; }, [liveScore]);
  useEffect(() => { capturingRef.current = capturing; }, [capturing]);

  // Detect mobile
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setModelLoadProgress(10);
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelLoadProgress(35);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoadProgress(60);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelLoadProgress(85);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        setModelLoadProgress(100);
        setModelsLoaded(true);
      } catch (err) {
        console.error('[Enrollment] model load error:', err);
        setModelError(true);
      }

      try {
        setLoadingWorkers(true);

        // ── Load workers from Supabase ──────────────────────────────────────
        const { data: workerData, error: workerErr } = await supabase
          .from('workforce')
          .select('*')
          .neq('status', 'archived')
          .order('first_name', { ascending: true });

        // ── Load estates ──────────────────────────────────────────────────
        try {
          const { data: estatesData, error: estatesErr } = await supabase
            .from('estates')
            .select('*')
            .order('name');
          if (!estatesErr && estatesData) {
            setEstates(estatesData);
          }
        } catch (e) {
          console.warn('[Enrollment] estates fetch error:', e);
        }

        if (!workerErr && workerData) {
          setWorkers(workerData);
        } else {
          console.warn('[Enrollment] workforce fetch error:', workerErr?.message);
        }

        // ── Load enrolled worker IDs ────────────────────────────────────────
        // Try Supabase face_descriptors table first, fall back to localStorage
        try {
          const { data: fdData } = await supabase
            .from('face_descriptors')
            .select('worker_id');
          if (fdData && fdData.length > 0) {
            setEnrolledIds(new Set(fdData.map((e: any) => String(e.worker_id))));
          } else {
            // localStorage fallback
            const stored = localStorage.getItem('face_descriptors');
            if (stored) {
              const parsed: { worker_id: string }[] = JSON.parse(stored);
              setEnrolledIds(new Set(parsed.map(e => String(e.worker_id))));
            }
          }
        } catch (_) {
          // localStorage fallback
          const stored = localStorage.getItem('face_descriptors');
          if (stored) {
            const parsed: { worker_id: string }[] = JSON.parse(stored);
            setEnrolledIds(new Set(parsed.map(e => String(e.worker_id))));
          }
        }
      } catch (err) {
        console.error('[Enrollment] fetch workers error:', err);
      } finally {
        setLoadingWorkers(false);
      }
    };
    init();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      } else if (selectedWorker) {
        startCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopCamera();
      stopLiveDetection();
      clearAutoCaptureTimers();
    };
  }, []);

  // ─── Auto-capture watcher ──────────────────────────────────────────────────
  useEffect(() => {
    if (!autoCapture || capturing || !liveDetection || capturedDescriptors.length >= CAPTURE_COUNT) {
      stableFrameCount.current = 0;
      return;
    }

    if (faceAlignment === 'centered' && liveScore >= QUALITY_THRESHOLD * 100) {
      stableFrameCount.current += 1;
      if (stableFrameCount.current >= 4) {
        // face is stable enough — trigger capture
        stableFrameCount.current = 0;
        captureSamples();
      }
    } else {
      stableFrameCount.current = 0;
    }
  }, [liveDetection, faceAlignment, liveScore, autoCapture, capturing]);

  const clearAutoCaptureTimers = () => {
    if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current);
    if (autoCaptureCountdownRef.current) clearInterval(autoCaptureCountdownRef.current);
  };

  // ─── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async (modeToUse = facingModeRef.current) => {
    if (isSwitchingRef.current) return;
    setIsSwitchingCamera(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported. Please use HTTPS or localhost.');
      }

      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: { ideal: modeToUse },
          width: { ideal: isMobile ? 1280 : 640 },
          height: { ideal: isMobile ? 720 : 480 },
          frameRate: { ideal: 30, min: 15 },
          // These hints help mobile cameras stabilize faster
          ...(isMobile && {
            focusMode: { ideal: 'continuous' },
            exposureMode: { ideal: 'continuous' },
            whiteBalanceMode: { ideal: 'continuous' },
          })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setHasCamera(true);
        startLiveDetection();
      }
    } catch (err) {
      // Fallback: try without advanced constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: modeToUse }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          streamRef.current = fallbackStream;
          setHasCamera(true);
          startLiveDetection();
        }
      } catch (fallbackErr) {
        console.error('[Enrollment] camera error:', fallbackErr);
        setHasCamera(false);
        setEnrollError(fallbackErr.message || `Camera unavailable: ${fallbackErr.name}`);
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) { console.warn(e); }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasCamera(false);
    stopLiveDetection();
  };

  const toggleCamera = () => {
    if (isSwitchingRef.current) return;
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    stopCamera();
    startCamera(nextMode);
  };

  const stopLiveDetection = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
  };

  // Reuse a single off-screen canvas for preview rendering (avoid GC pressure)
  const captureCanvasRef = useRef(null);
  const getCaptureCanvas = () => {
    if (!captureCanvasRef.current) captureCanvasRef.current = document.createElement('canvas');
    return captureCanvasRef.current;
  };

  const startLiveDetection = useCallback(() => {
    stopLiveDetection();
    // ⚡ 150ms tick — ~6 fps detection, smooth enough for HUD
    liveIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!video || !canvas || video.readyState < 3) return;

      try {
        // ⚡ inputSize 160 = 4x faster than 320, plenty for live HUD
        const dets = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 }));

        const count = dets.length;
        setLiveDetection(count > 0);

        if (count > 0) {
          const det = dets[0];
          const score = det.score || (det as any).detection?.score;
          setLiveScore(Math.round(score * 100));

          const box = det.box || (det as any).detection?.box;
          const vw = video.videoWidth, vh = video.videoHeight;
          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;
          const faceRatio = box.width / vw;

          let alignment = 'centered';
          if (faceRatio < 0.16) alignment = 'too_far';
          else if (faceRatio > 0.58) alignment = 'too_close';
          else if (centerX < vw * 0.28) alignment = 'right';
          else if (centerX > vw * 0.72) alignment = 'left';
          else if (centerY < vh * 0.22) alignment = 'down';
          else if (centerY > vh * 0.78) alignment = 'up';
          setFaceAlignment(alignment);
        } else {
          setLiveScore(0);
          setFaceAlignment('');
        }

        const w = video.offsetWidth, h = video.offsetHeight;
        if (w === 0 || h === 0) return;
        canvas.width = w; canvas.height = h;
        faceapi.matchDimensions(canvas, { width: w, height: h });
        const resized = faceapi.resizeResults(dets, { width: w, height: h });

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        const mirrorContext = facingModeRef.current === 'user';

        if (mirrorContext) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-w, 0);
        }

        resized.forEach(det => {
          const box = det.box || (det as any).detection?.box || det;
          const score = det.score || (det as any).detection?.score || 0;
          const quality = score >= QUALITY_THRESHOLD;
          const color = quality ? '#10b981' : '#f59e0b';

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.setLineDash([]);

          // Corner brackets
          const cs = 18;
          ctx.fillStyle = color;
          ctx.fillRect(box.x, box.y, cs, 3);
          ctx.fillRect(box.x, box.y, 3, cs);
          ctx.fillRect(box.x + box.width - cs, box.y, cs, 3);
          ctx.fillRect(box.x + box.width - 3, box.y, 3, cs);
          ctx.fillRect(box.x, box.y + box.height - 3, cs, 3);
          ctx.fillRect(box.x, box.y + box.height - cs, 3, cs);
          ctx.fillRect(box.x + box.width - cs, box.y + box.height - 3, cs, 3);
          ctx.fillRect(box.x + box.width - 3, box.y + box.height - cs, 3, cs);
        });

        if (mirrorContext) ctx.restore();
      } catch (err) {
        console.warn('[Enrollment] detection error:', err);
      }
    }, 150); // ⚡ 150ms tick (~6fps detection) — was 400ms
  }, []);

  // ─── Wait for video frame to be truly ready ────────────────────────────────
  const waitForVideoReady = (video: any, timeoutMs = 5000) => {
    return new Promise<void>((resolve, reject) => {
      if (video.readyState >= 4 && video.videoWidth > 0) { resolve(); return; }
      const start = Date.now();
      const check = () => {
        if (video.readyState >= 4 && video.videoWidth > 0) resolve();
        else if (Date.now() - start > timeoutMs) reject(new Error('Video not ready in time'));
        else requestAnimationFrame(check);
      };
      check();
    });
  };

  // ─── Frame Buffer: capture N frames, pick best descriptor ─────────────────
  // ⚡ Uses TinyFaceDetector (inputSize 224) — ~5x faster than SsdMobilenetv1
  const captureFrameBuffer = async (video) => {
    const candidates = [];

    // Run FRAME_BUFFER_SIZE detections with tiny delays between frames
    for (let f = 0; f < FRAME_BUFFER_SIZE; f++) {
      if (f > 0) await new Promise(r => setTimeout(r, FRAME_BUFFER_DELAY));
      if (video.readyState < 4) continue;

      const det = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,          // ⚡ 224 is 2x faster than 320, still reliable
          scoreThreshold: MIN_CONFIDENCE
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (det) candidates.push({ det, score: det.detection.score });
    }

    if (candidates.length === 0) return null;

    // Pick the sharpest frame
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    // Reuse persistent canvas — avoids repeated allocation
    const tempCanvas = getCaptureCanvas();
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    if (facingModeRef.current === 'user') {
      ctx.save();
      ctx.translate(tempCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    }

    const preview = tempCanvas.toDataURL('image/jpeg', 0.75); // ⚡ lower JPEG quality = faster encoding
    return { descriptor: best.det.descriptor, score: best.score, preview };
  };

  // ─── Capture Samples ───────────────────────────────────────────────────────
  const captureSamples = async () => {
    if (!selectedWorker || capturingRef.current) return;
    setCapturing(true);
    setCaptureProgress(0);
    setCapturedDescriptors([]);
    setCapturedPreviews([]);
    setCapturedScores([]);
    setEnrollError('');
    setEnrollResult(null);
    setCaptureLog([{
      ts: new Date().toLocaleTimeString(),
      msg: `Face Scan link for ${selectedWorker.first_name}...`,
      type: 'info'
    }]);

    const video = videoRef.current;
    if (!video) { setCapturing(false); return; }

    try {
      await waitForVideoReady(video);
    } catch {
      setEnrollError('Camera not ready. Wait a moment and try again.');
      setEnrollResult('error');
      setCapturing(false);
      return;
    }

    // Extended warmup for mobile auto-focus / auto-exposure to settle
    setCaptureLog(prev => [{
      ts: new Date().toLocaleTimeString(),
      msg: 'Stabilizing camera...',
      type: 'info'
    }, ...prev]);
    await new Promise(r => setTimeout(r, CAMERA_WARMUP_MS));

    let successCount = 0;
    const descriptors = [];
    const previews = [];
    const scores = [];

    for (let i = 0; i < CAPTURE_COUNT; i++) {
      let sampleCaptured = false;
      let retries = 0;

      while (!sampleCaptured && retries < MAX_RETRIES_PER_SAMPLE) {
        if (retries > 0) {
          setCaptureLog(prev => [{
            ts: new Date().toLocaleTimeString(),
            msg: `Retry ${retries}/${MAX_RETRIES_PER_SAMPLE} for Sample ${i + 1}`,
            type: 'warn'
          }, ...prev]);
          await new Promise(r => setTimeout(r, 80)); // ⚡ was 200ms
        }

        if (video.readyState < 4 || video.videoWidth === 0) {
          retries++;
          await new Promise(r => setTimeout(r, 80)); // ⚡ was 250ms
          continue;
        }

        // Use frame buffer for shake tolerance — pick best of multiple frames
        const result = await captureFrameBuffer(video);

        if (result) {
          const scorePct = Math.round(result.score * 100);

          if (scorePct < QUALITY_THRESHOLD * 100) {
            retries++;
            await new Promise(r => setTimeout(r, 60)); // ⚡ skip log for low-quality, retry fast
            continue;
          }

          descriptors.push(Array.from(result.descriptor));
          previews.push(result.preview);
          scores.push(scorePct);

          successCount++;
          sampleCaptured = true;

          setCaptureProgress(successCount);
          setCapturedDescriptors([...descriptors]);
          setCapturedPreviews([...previews]);
          setCapturedScores([...scores]);

          setCaptureLog(prev => [{
            ts: new Date().toLocaleTimeString(),
            msg: `Sample ${i + 1} captured ✓ (${scorePct}% quality)`,
            type: 'success'
          }, ...prev]);
        } else {
          retries++;
        }
      }

      if (!sampleCaptured) {
        setCaptureLog(prev => [{
          ts: new Date().toLocaleTimeString(),
          msg: `Sample ${i + 1} failed — keep face steady`,
          type: 'error'
        }, ...prev]);
      } else if (i < CAPTURE_COUNT - 1) {
        await new Promise(r => setTimeout(r, CAPTURE_DELAY_MS));
      }
    }

    setCapturing(false);

    if (successCount < 3) {
      setEnrollError(`Only ${successCount}/${CAPTURE_COUNT} samples captured. Improve lighting and hold steady.`);
      setEnrollResult('error');
    } else {
      setCaptureLog(prev => [{
        ts: new Date().toLocaleTimeString(),
        msg: `Done — ${successCount} samples ready to save.`,
        type: 'info'
      }, ...prev]);
    }
  };

  const saveEnrollment = async () => {
    if (!selectedWorker || capturedDescriptors.length < 3) return;
    setEnrolling(true);
    setEnrollResult(null);

    const workerId = String(selectedWorker.worker_id || selectedWorker.id);

    try {
      // Try Supabase face_descriptors table
      let saved = false;
      try {
        const { error } = await supabase
          .from('face_descriptors')
          .upsert(
            { worker_id: workerId, descriptors: capturedDescriptors, updated_at: new Date().toISOString() },
            { onConflict: 'worker_id' }
          );
        if (!error) saved = true;
        else console.warn('[Enrollment] Supabase upsert error:', error.message);
      } catch (_) { /* table may not exist — fallback below */ }

      // localStorage fallback (always update so FaceAttendance can read it)
      const existing: { worker_id: string; descriptors: number[][] }[] = JSON.parse(
        localStorage.getItem('face_descriptors') || '[]'
      );
      const idx = existing.findIndex(e => e.worker_id === workerId);
      const entry = { worker_id: workerId, descriptors: capturedDescriptors };
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      localStorage.setItem('face_descriptors', JSON.stringify(existing));

      setEnrollResult('success');
      setEnrolledIds(prev => new Set([...prev, workerId]));
      if (!saved) console.info('[Enrollment] Saved to localStorage (Supabase table not available)');
    } catch (err) {
      console.error('[Enrollment] save error:', err);
      setEnrollResult('error');
      setEnrollError('Save failed — check console for details');
    } finally {
      setEnrolling(false);
    }
  };

  const deleteEnrollment = async (workerId: string) => {
    if (!window.confirm('Delete face scan signature? Worker must re-enroll.')) return;
    try {
      // Remove from Supabase
      await supabase.from('face_descriptors').delete().eq('worker_id', workerId);
    } catch (_) { /* ignore */ }
    // Always remove from localStorage too
    const existing: { worker_id: string }[] = JSON.parse(
      localStorage.getItem('face_descriptors') || '[]'
    );
    localStorage.setItem(
      'face_descriptors',
      JSON.stringify(existing.filter(e => e.worker_id !== workerId))
    );
    setEnrolledIds(prev => { const n = new Set(prev); n.delete(String(workerId)); return n; });
  };

  const resetCapture = () => {
    setCapturedDescriptors([]);
    setCapturedPreviews([]);
    setCapturedScores([]);
    setCaptureProgress(0);
    setCapturing(false);
    setEnrollResult(null);
    setEnrollError('');
    setCaptureLog([]);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const filteredWorkers = workers.filter(w => {
    const q = searchQuery.toLowerCase();
    const wid = String(w.worker_id || w.id);
    const isEnrolled = enrolledIds.has(wid);

    const matchesSearch = `${w.first_name} ${w.last_name}`.toLowerCase().includes(q) ||
      String(w.worker_id || '').toLowerCase().includes(q);

    const matchesEstate = isUserAdmin 
      ? (selectedEstateFilter === 'all' || w.estate_id === selectedEstateFilter)
      : (w.estate_id === profile?.estate_id);

    const matchesEnrollment = 
      enrollmentFilter === 'all' ? true :
      enrollmentFilter === 'enrolled' ? isEnrolled :
      !isEnrolled;

    return matchesSearch && matchesEstate && matchesEnrollment;
  });

  const avgQuality = capturedScores.length > 0
    ? Math.round(capturedScores.reduce((a, b) => a + b, 0) / capturedScores.length)
    : 0;

  const alignmentLabel = () => {
    if (capturing) return '● Capturing...';
    if (!liveDetection) return 'Point camera at face';
    if (faceAlignment === 'too_far') return '↑ Move Closer';
    if (faceAlignment === 'too_close') return '↓ Move Back';
    if (faceAlignment === 'centered') return autoCapture ? '✓ Hold Steady — Auto Capture' : '✓ Face Aligned — Tap Capture';
    return `Move ${faceAlignment === 'left' ? '← Left' : faceAlignment === 'right' ? '→ Right' : faceAlignment === 'up' ? '↑ Up' : '↓ Down'}`;
  };

  const progressPct = (captureProgress / CAPTURE_COUNT) * 100;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-16 px-0 sm:px-2">
      <style>{HUD_CSS}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">
            Face Scan Enrollment
          </h1>
        </div>
      </div>

      {/* ── Mobile: Worker selector (collapsible) ── */}
      <div className="lg:hidden mb-3">
        <button
          onClick={() => setShowWorkerPanel(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 premium-card text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <Users size={16} />
            {selectedWorker
              ? `${selectedWorker.first_name} ${selectedWorker.last_name}`
              : 'Select Worker'}
          </span>
          <ChevronRight
            size={16}
            className={`transition-transform ${showWorkerPanel ? 'rotate-90' : ''}`}
          />
        </button>

        {showWorkerPanel && (
          <div className="premium-card mt-2 p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tea-500/30"
                />
              </div>
              <div className="flex gap-2">
                {isUserAdmin ? (
                  <select
                    value={selectedEstateFilter}
                    onChange={(e) => setSelectedEstateFilter(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300"
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
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300 opacity-70 cursor-not-allowed"
                  >
                    {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                      <option key={estate.id} value={estate.id}>{estate.name}</option>
                    ))}
                    {!estates.find(e => e.id === profile?.estate_id) && (
                      <option value={profile?.estate_id || ''}>Assigned Estate</option>
                    )}
                  </select>
                )}
                <select
                  value={enrollmentFilter}
                  onChange={(e) => setEnrollmentFilter(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Status</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="unenrolled">Not Enrolled</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {loadingWorkers ? (
                <div className="text-center py-6">
                  <Loader2 size={24} className="animate-spin text-tea-500/40 mx-auto mb-2" />
                </div>
              ) : filteredWorkers.length === 0 ? (
                <p className="text-center text-[11px] text-slate-400 py-4 uppercase tracking-widest">No matches</p>
              ) : filteredWorkers.map(worker => {
                const wid = String(worker.worker_id || worker.id);
                const isEnrolled = enrolledIds.has(wid);
                const isSelected = selectedWorker?.id === worker.id;
                return (
                  <div
                    key={worker.id}
                    onClick={() => {
                      setSelectedWorker(worker);
                      setShowWorkerPanel(false);
                      if (!hasCamera) startCamera();
                      resetCapture();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-tea-600 border-tea-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {worker.first_name?.[0]}{worker.last_name?.[0]}
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {worker.worker_id || `W-${worker.id}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEnrolled ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${isSelected ? 'bg-white/20 text-white border-white/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'}`}>Enrolled</span>
                          <ShieldCheck size={14} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                        </div>
                      ) : (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${isSelected ? 'bg-white/20 text-white border-white/20' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">

        {/* ── Desktop Sidebar ── */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Users size={14} /> Workers Directory
              </h2>
              <span className="text-[9px] font-black bg-tea-50 dark:bg-tea-900/20 text-tea-600 dark:text-tea-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {filteredWorkers.length} total
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-tea-500/30"
                />
              </div>
              <div className="flex gap-2">
                {isUserAdmin ? (
                  <select
                    value={selectedEstateFilter}
                    onChange={(e) => setSelectedEstateFilter(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300"
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
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300 opacity-70 cursor-not-allowed"
                  >
                    {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                      <option key={estate.id} value={estate.id}>{estate.name}</option>
                    ))}
                    {!estates.find(e => e.id === profile?.estate_id) && (
                      <option value={profile?.estate_id || ''}>Assigned Estate</option>
                    )}
                  </select>
                )}
                <select
                  value={enrollmentFilter}
                  onChange={(e) => setEnrollmentFilter(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none appearance-none text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Status</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="unenrolled">Not Enrolled</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {loadingWorkers ? (
                <div className="text-center py-12">
                  <Loader2 size={28} className="animate-spin text-tea-500/40 mx-auto mb-2" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Loading...</p>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">No matches</p>
                </div>
              ) : filteredWorkers.map(worker => {
                const wid = String(worker.worker_id || worker.id);
                const isEnrolled = enrolledIds.has(wid);
                const isSelected = selectedWorker?.id === worker.id;

                return (
                  <div
                    key={worker.id}
                    onClick={() => {
                      setSelectedWorker(worker);
                      if (!hasCamera) startCamera();
                      resetCapture();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group border ${
                      isSelected
                        ? 'bg-tea-600 border-tea-600 text-white shadow-lg shadow-tea-600/20'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-tea-200 dark:hover:border-tea-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {worker.first_name?.[0]}{worker.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {worker.worker_id || `W-${worker.id}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEnrolled ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isSelected ? 'bg-white/20 text-white border-white/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'}`}>Enrolled</span>
                          <ShieldCheck size={14} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                          {!isSelected && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteEnrollment(wid); }}
                              className="p-1 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Enrollment"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isSelected ? 'bg-white/20 text-white border-white/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50'}`}>Pending</span>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-white/50' : 'text-slate-300 dark:text-slate-600'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Capture Log — desktop */}
          {captureLog.length > 0 && (
            <div className="premium-card p-4 space-y-2 max-h-48 overflow-y-auto bg-slate-900 border-indigo-500/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 mb-2">
                <Activity size={12} /> Live Log
              </p>
              {captureLog.map((entry, i) => (
                <div key={i} className={`flex items-start gap-2 text-[10px] font-mono ${
                  entry.type === 'success' ? 'text-emerald-400'
                  : entry.type === 'error' ? 'text-rose-400'
                  : entry.type === 'warn' ? 'text-amber-400'
                  : 'text-indigo-300/40'
                }`}>
                  <span className="opacity-30 shrink-0">{entry.ts}</span>
                  <span className="leading-relaxed">{entry.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Main Panel ── */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedWorker ? (
            <div className="premium-card p-10 sm:p-16 flex flex-col items-center justify-center text-center opacity-50 space-y-4 min-h-[260px] sm:min-h-[400px]">
              <Fingerprint size={40} className="text-slate-400 opacity-40 mb-2" />
              <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Select a Worker</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {isMobile ? 'Tap the selector above' : 'Choose from the directory to begin enrollment'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">

              {/* Active Worker Context */}
              <div className="premium-card p-3 sm:p-4 flex items-center justify-between bg-slate-900 border-indigo-500/20 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-sm border border-indigo-500/20">
                    {selectedWorker.first_name?.[0]}{selectedWorker.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-black uppercase text-white tracking-tight leading-none mb-1 text-sm">
                      {selectedWorker.first_name} {selectedWorker.last_name}
                    </p>
                    <p className="text-[10px] uppercase font-bold text-indigo-400/60 tracking-widest">
                      {selectedWorker.worker_id || `W-${selectedWorker.id}`}
                    </p>
                  </div>
                </div>

                {/* Auto-capture toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoCapture(v => !v)}
                    title="Auto-capture when face is stable"
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      autoCapture
                        ? 'bg-tea-500/20 border-tea-500/40 text-tea-400'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                    }`}
                  >
                    <Zap size={11} /> Auto
                  </button>
                  <button
                    onClick={() => { setSelectedWorker(null); stopCamera(); }}
                    className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Camera Console */}
              <div className="premium-card p-1 sm:p-1.5 overflow-hidden">
                {/* Camera height: full viewport-ish on mobile, fixed on desktop */}
                <div className="relative w-full bg-black rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 sm:border-4 border-slate-900 dark:border-slate-800 shadow-2xl"
                  style={{ height: isMobile ? 'min(70vw, 360px)' : '520px' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className={`absolute inset-0 w-full h-full z-10 pointer-events-none ${hasCamera ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {/* HUD */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none neural-grid">
                    {hasCamera && <div className="absolute left-0 right-0 h-[2px] bg-tea-500/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-30 animate-scanline" />}

                    {/* Top row */}
                    <div className="flex justify-between items-start p-3 sm:p-4">
                      {/* Quality badge */}
                      <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 text-white">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Zap size={10} className="text-tea-400" />
                          <span className="text-[7px] font-black uppercase tracking-widest text-tea-400">Quality</span>
                        </div>
                        <div className="text-[8px] font-black flex items-center justify-between gap-4">
                          <span className="text-slate-400">Live</span>
                          <span className={liveScore >= QUALITY_THRESHOLD * 100 ? 'text-emerald-400' : 'text-amber-400'}>{liveScore}%</span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex gap-2 pointer-events-auto">
                        {/* Flip camera */}
                        {hasCamera && !capturing && (
                          <button
                            onClick={toggleCamera}
                            disabled={isSwitchingCamera}
                            className="bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 capture-btn-fab"
                            title="Flip Camera"
                          >
                            <FlipHorizontal size={16} className={isSwitchingCamera ? 'animate-spin' : ''} />
                          </button>
                        )}

                        {/* Face lock indicator */}
                        <div className={`px-3 py-2 rounded-xl border backdrop-blur-md text-white flex items-center gap-2 transition-all duration-500 ${
                          liveDetection ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/60 border-white/10 opacity-40'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${liveDetection ? 'bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse' : 'bg-white/20'}`} />
                          <span className="text-[8px] font-black uppercase tracking-[0.15em]">
                            {liveDetection ? 'Locked' : 'Searching'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center: alignment guidance */}
                    <div className="flex-1 flex items-center justify-center">
                      {!liveDetection && hasCamera && (
                        <div className="w-28 h-36 sm:w-36 sm:h-44 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center">
                          <ScanFace size={32} className="text-white/20" />
                        </div>
                      )}
                    </div>

                    {/* Bottom: status label + FAB capture button */}
                    <div className="flex items-end justify-between p-3 sm:p-4">
                      <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300 max-w-[60%] leading-relaxed ${
                        faceAlignment === 'centered' ? 'text-emerald-400' : 'text-amber-400'
                      } opacity-90`}>
                        {alignmentLabel()}
                      </p>

                      {/* Big capture FAB — easy to tap on mobile */}
                      <button
                        onClick={captureSamples}
                        disabled={!hasCamera || !modelsLoaded || capturing || enrolling}
                        className="pointer-events-auto capture-btn-fab relative bg-tea-600 hover:bg-tea-700 active:scale-90 text-white rounded-full shadow-2xl shadow-tea-600/40 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ width: 60, height: 60 }}
                        title="Capture"
                      >
                        {capturing
                          ? <Loader2 size={22} className="animate-spin" />
                          : <Camera size={22} />}
                        {/* Pulse ring when face locked */}
                        {liveDetection && faceAlignment === 'centered' && !capturing && (
                          <span className="absolute inset-0 rounded-full border-2 border-tea-400 pulse-ring" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* No camera placeholder */}
                  {!hasCamera && (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-700 z-10 p-8">
                      <Loader2 size={40} className="animate-spin text-tea-500/30 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center">Initializing camera...</p>
                      {enrollError && (
                        <p className="mt-3 text-rose-400 text-[10px] text-center opacity-80">{enrollError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {(capturing || capturedPreviews.length > 0) && (
                <div className="space-y-1.5 px-1 animate-in slide-in-from-top-2 duration-500">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-tea-600">
                      {capturing ? 'Capturing...' : 'Samples Ready'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-tea-600">
                      {captureProgress}/{CAPTURE_COUNT}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      className="h-full bg-tea-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sample Previews & Action Buttons */}
              <div className="premium-card p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <ImageIcon size={12} /> Face Scan Samples
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Mobile auto-capture toggle */}
                    <button
                      onClick={() => setAutoCapture(v => !v)}
                      className={`sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                        autoCapture
                          ? 'bg-tea-500/10 border-tea-500/30 text-tea-600'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Zap size={10} /> Auto
                    </button>
                    {capturedScores.length > 0 && (
                      <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        avgQuality >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : avgQuality >= 65 ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}>
                        Avg {avgQuality}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnails — 3 columns on mobile, 6 on sm+ */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {Array.from({ length: CAPTURE_COUNT }).map((_, i) => (
                    capturedPreviews[i] ? (
                      <div key={i} className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden border-2 border-tea-500 shadow-lg shadow-tea-500/10 animate-in zoom-in-95">
                        <img src={capturedPreviews[i]} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-1">
                          <span className="text-[8px] font-black text-emerald-400">{capturedScores[i]}%</span>
                        </div>
                        <div className="absolute top-1 right-1 bg-tea-600 text-white text-[7px] font-black w-4 h-4 rounded-md flex items-center justify-center">
                          {i + 1}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className={`aspect-square rounded-xl sm:rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                        capturing && captureProgress === i ? 'border-tea-500 bg-tea-50/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                      }`}>
                        {capturing && captureProgress === i
                          ? <Loader2 size={14} className="text-tea-500 animate-spin" />
                          : <ImageIcon size={14} className="text-slate-300 dark:text-slate-600" />}
                      </div>
                    )
                  ))}
                </div>

                {/* Action Buttons */}
                {capturedDescriptors.length >= 3 && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={saveEnrollment}
                      disabled={enrolling}
                      className="flex-1 bg-tea-600 hover:bg-tea-700 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {enrolling ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving Signature...</>
                      ) : (
                        <><CheckCircle size={16} /> Save Face Signature</>
                      )}
                    </button>
                    
                    <button
                      onClick={resetCapture}
                      disabled={enrolling}
                      className="sm:w-auto px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <RefreshCcw size={16} /> Retry
                    </button>
                  </div>
                )}
                
                {/* Result Feedback */}
                {enrollResult === 'success' && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-bottom-2">
                    <CheckCircle size={20} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Enrollment Complete</p>
                      <p className="text-[10px] font-bold opacity-80 mt-0.5">{selectedWorker?.first_name} is now registered for face scan login.</p>
                    </div>
                  </div>
                )}

                {enrollResult === 'error' && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3 border border-rose-200 dark:border-rose-800 animate-in slide-in-from-bottom-2">
                    <AlertCircle size={20} className="shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Enrollment Failed</p>
                      <p className="text-[10px] font-bold opacity-80 mt-0.5">{enrollError}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
