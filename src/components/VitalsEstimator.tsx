import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Camera,
  Check,
  Clock,
  Hand,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { playClinicalChime } from '../engine/audioFeedback';
import {
  EpisodeVitals,
  evaluateStayHomeVsHospital,
  getFastBreathingThreshold,
  interpretBloodPressure,
  interpretBloodSugar,
} from '../engine/triageEngine';
import {
  PpgFrameStatus,
  PpgSampleFrame,
  analyzePpgSamples,
  assessPpgFrameQuality,
} from '../utils/healthMath';
import { CyclicSighingPacer } from './CyclicSighingPacer';
import { StabilizationTimers } from './StabilizationTimers';

interface VitalsEstimatorProps {
  ageMonths: number;
  locale: AppLocale;
  initialVitals?: EpisodeVitals;
  onApplyVitals?: (vitals: EpisodeVitals) => void;
  onAnalyzeStandalone?: (vitals: EpisodeVitals) => void;
  onVitalsLogged?: (vitals: EpisodeVitals) => void;
}

export const VitalsEstimator: React.FC<VitalsEstimatorProps> = ({
  ageMonths,
  locale,
  initialVitals,
  onApplyVitals,
  onAnalyzeStandalone,
  onVitalsLogged,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [tab, setTab] = useState<'BP_SUGAR' | 'TAP' | 'PPG'>('BP_SUGAR');
  const [tapMode, setTapMode] = useState<'BREATH' | 'PULSE'>('BREATH');

  // Guided Blood Pressure & Blood Sugar state
  const [bpSystolic, setBpSystolic] = useState<string>(initialVitals?.bpSystolic?.toString() ?? '');
  const [bpDiastolic, setBpDiastolic] = useState<string>(initialVitals?.bpDiastolic?.toString() ?? '');
  const [glucose, setGlucose] = useState<string>(initialVitals?.bloodGlucoseMgDl?.toString() ?? '');
  const [sugarMode, setSugarMode] = useState<'FASTING' | 'RANDOM'>(initialVitals?.sugarMode ?? 'RANDOM');

  // 60s Tap-Timer state
  const [tapRunning, setTapRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);
  const tapTimerRef = useRef<number | null>(null);
  const tapStartRef = useRef<number>(0);

  // Camera rPPG state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ppgBufferRef = useRef<PpgSampleFrame[]>([]);
  const [ppgRunning, setPpgRunning] = useState(false);
  const [ppgSec, setPpgSec] = useState(0);
  const [ppgSamples, setPpgSamples] = useState<number[]>([]);
  const [ppgStatus, setPpgStatus] = useState<PpgFrameStatus | 'IDLE'>('IDLE');
  const [ppgResult, setPpgResult] = useState<{ bpm: number; sqi: number; hrvMs: number } | null>(null);
  const [ppgError, setPpgError] = useState('');

  const [hasOrganWarningSigns, setHasOrganWarningSigns] = useState(false);
  const [hasShockSigns, setHasShockSigns] = useState(false);
  const [isConscious, setIsConscious] = useState(true);
  const [showCalmPacer, setShowCalmPacer] = useState(false);
  const [showSugarTimer, setShowSugarTimer] = useState(false);

  const [savedNotice, setSavedNotice] = useState('');

  const fastThreshold = getFastBreathingThreshold(ageMonths);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) window.clearInterval(tapTimerRef.current);
      stopPpgCamera();
    };
  }, []);

  const computedTapBpm = (() => {
    if (taps.length < 2) return 0;
    const spanSec = Math.max(4, (taps[taps.length - 1] - taps[0]) / 1000);
    return Math.round(((taps.length - 1) / spanSec) * 60);
  })();

  const handleTap = () => {
    playClinicalChime('tap');
    const now = performance.now();
    if (!tapRunning) {
      tapStartRef.current = now;
      setTapRunning(true);
      setTaps([now]);
      setElapsedSec(0);
      if (tapTimerRef.current) window.clearInterval(tapTimerRef.current);
      tapTimerRef.current = window.setInterval(() => {
        const sec = Math.floor((performance.now() - tapStartRef.current) / 1000);
        setElapsedSec(sec);
        if (sec >= 60) {
          setTapRunning(false);
          if (tapTimerRef.current) window.clearInterval(tapTimerRef.current);
        }
      }, 250);
    } else {
      setTaps((prev) => [...prev, now]);
    }
  };

  const resetTap = () => {
    if (tapTimerRef.current) window.clearInterval(tapTimerRef.current);
    setTapRunning(false);
    setElapsedSec(0);
    setTaps([]);
  };

  const finalizePpgAnalysis = (frames: PpgSampleFrame[]) => {
    const analysis = analyzePpgSamples(frames);
    if (analysis.status === 'REJECTED') {
      setPpgResult(null);
      setPpgError(analysis.message);
      return;
    }
    setPpgError('');
    setPpgResult({ bpm: analysis.bpm, sqi: analysis.sqi, hrvMs: analysis.hrvMs });
    onVitalsLogged?.({
      measurementMethod: 'CAMERA_PPG',
      heartRate: analysis.bpm,
      signalQualityIndex: analysis.sqi,
    });
  };

  const stopPpgCamera = (analyzeIfCaptured = false) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setPpgRunning(false);
    setPpgStatus('IDLE');
    if (analyzeIfCaptured && ppgBufferRef.current.length > 0) {
      finalizePpgAnalysis(ppgBufferRef.current);
    }
  };

  const startPpgEstimate = async () => {
    setPpgError('');
    setPpgResult(null);
    setPpgSamples([]);
    setPpgSec(0);
    setPpgStatus('IDLE');
    ppgBufferRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setPpgError('Camera API unavailable in this browser. Use the Breath & Pulse Counter tab.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: 160, height: 120 },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: true } as MediaTrackConstraintSet],
          });
        } catch {
          // Torch optional on desktop/some cameras
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setPpgRunning(true);
      const startMs = performance.now();
      const rawBuffer: PpgSampleFrame[] = [];

      const sampleFrame = () => {
        const now = performance.now();
        const elapsed = (now - startMs) / 1000;
        setPpgSec(Math.min(30, Math.floor(elapsed)));

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, 64, 48);
            const img = ctx.getImageData(16, 12, 32, 24).data;
            let redSum = 0;
            let greenSum = 0;
            let blueSum = 0;
            const pxCount = img.length / 4;
            for (let i = 0; i < img.length; i += 4) {
              redSum += img[i];
              greenSum += img[i + 1];
              blueSum += img[i + 2];
            }
            const meanR = redSum / pxCount;
            const meanG = greenSum / pxCount;
            const meanB = blueSum / pxCount;

            rawBuffer.push({ t: elapsed, r: meanR, g: meanG, b: meanB });
            ppgBufferRef.current = rawBuffer;

            if (rawBuffer.length % 4 === 0) {
              setPpgStatus(assessPpgFrameQuality(meanR, meanG, meanB));
              setPpgSamples(
                rawBuffer
                  .slice(-60)
                  .map((frame) => (frame.r > frame.g * 1.25 ? frame.r : frame.r * 0.65 + frame.g * 0.35))
              );
            }
          }
        }

        if (elapsed >= 30) {
          stopPpgCamera(false);
          finalizePpgAnalysis(rawBuffer);
          return;
        }
        rafRef.current = requestAnimationFrame(sampleFrame);
      };

      rafRef.current = requestAnimationFrame(sampleFrame);
    } catch {
      setPpgError('Camera permission denied or unavailable. Use the Breath & Pulse Counter tab.');
      stopPpgCamera(false);
    }
  };

  const sysNum = bpSystolic ? Number(bpSystolic) : undefined;
  const diaNum = bpDiastolic ? Number(bpDiastolic) : undefined;
  const sugNum = glucose ? Number(glucose) : undefined;

  const bpEvaluation = interpretBloodPressure(sysNum, diaNum);
  const sugarEvaluation = interpretBloodSugar(sugNum, sugarMode);
  const stayHomeVerdict = evaluateStayHomeVsHospital({
    bpSystolic: sysNum,
    bpDiastolic: diaNum,
    bloodGlucoseMgDl: sugNum,
    hasOrganWarningSigns,
    hasShockSigns,
    isConsciousAbleToSwallow: isConscious,
  });
  const activeBreathRate = tapMode === 'BREATH' && computedTapBpm > 0 ? computedTapBpm : initialVitals?.respiratoryRate;
  const activeHeartRate =
    ppgResult?.bpm ?? (tapMode === 'PULSE' && computedTapBpm > 0 ? computedTapBpm : initialVitals?.heartRate);

  const buildVitalsPayload = (): EpisodeVitals => ({
    ...initialVitals,
    respiratoryRate: tapMode === 'BREATH' && computedTapBpm > 0 ? computedTapBpm : initialVitals?.respiratoryRate,
    heartRate:
      tapMode === 'PULSE' && computedTapBpm > 0
        ? computedTapBpm
        : ppgResult?.bpm ?? initialVitals?.heartRate,
    measurementMethod: ppgResult
      ? 'CAMERA_PPG'
      : computedTapBpm > 0
        ? 'TAP_TIMER'
        : 'MANUAL',
    signalQualityIndex: ppgResult?.sqi,
    bpSystolic: sysNum,
    bpDiastolic: diaNum,
    bloodGlucoseMgDl: sugNum,
    sugarMode,
  });

  const applyVitalsRecord = () => {
    const next = buildVitalsPayload();
    onApplyVitals?.(next);
    onVitalsLogged?.(next);
    setSavedNotice(s.vitalsSavedNotice);
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleAnalyzeClick = () => {
    const next = buildVitalsPayload();
    onVitalsLogged?.(next);
    onAnalyzeStandalone?.(next);
  };

  const hasAnyReading =
    Boolean(sysNum && diaNum) || Boolean(sugNum) || Boolean(activeBreathRate) || Boolean(activeHeartRate);

  const heroBpmDisplay = activeHeartRate ?? (ppgRunning ? '...' : '--');
  const heroQualityDisplay = ppgResult
    ? ppgResult.sqi >= 75
      ? 'Good'
      : 'Fair'
    : ppgRunning
      ? 'Sampling'
      : activeHeartRate
        ? 'Manual'
        : 'Ready';

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6 relative z-10">
      {/* LIVE OPTICAL PULSE / ECG TRACE HERO CARD — Matching Screenshots 5 & 6 */}
      <section className="glass-panel rounded-[32px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#55606E] dark:text-slate-400">
              {isUrdu ? 'براہِ راست نبض و دھڑکن اسکریننگ' : 'Optical Pulse & Live Waveform'}
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-metric text-6xl sm:text-7xl text-[#161A20] dark:text-white leading-none">
                {heroBpmDisplay}
              </span>
              <span className="text-xl font-light text-[#55606E] dark:text-slate-400">bpm</span>
            </div>
            <p className="text-[11px] text-[#55606E] dark:text-slate-400">
              {isUrdu
                ? 'تقریباً آپٹیکل نبض کا اندازہ — کیمرہ یا ویڈیو سے بی پی یا شوگر نہیں ناپی جا سکتی۔'
                : 'Approximate optical pulse screening estimate — camera/video CANNOT measure Blood Pressure or Blood Sugar.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (ppgRunning) {
                  stopPpgCamera(true);
                } else {
                  setTab('PPG');
                  startPpgEstimate();
                }
              }}
              className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-2"
            >
              {ppgRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {ppgRunning
                ? isUrdu
                  ? `روکیں (${ppgSec}s)`
                  : `Stop & Read (${ppgSec}/30s)`
                : isUrdu
                  ? '30s کیمرہ نبض شروع کریں'
                  : 'Start 30s Camera Pulse'}
            </button>
          </div>
        </div>

        {/* Frosted Electric-Azure ECG / PPG Waveform Trace Frame */}
        <div className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/45 dark:bg-black/40 p-4 sm:p-5">
          <div className="flex items-center justify-between text-[11px] text-[#55606E] dark:text-slate-400 mb-2">
            <span className="font-mono-tabular">
              {ppgRunning ? `Recording fingertip rPPG · ${ppgSec}s / 30s` : 'Optical PPG / ECG Lead Screening'}
            </span>
            <span>{ppgResult ? `SQI ${ppgResult.sqi}%` : 'Resting rhythm trace'}</span>
          </div>
          <div className="h-24 w-full flex items-center">
            {ppgSamples.length > 2 ? (
              <svg
                viewBox="0 0 360 72"
                className="w-full h-full stroke-[var(--accent)] fill-none drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points={buildSparkline(ppgSamples, 360, 72)} />
              </svg>
            ) : (
              <svg
                viewBox="0 0 360 72"
                className="w-full h-full stroke-[var(--accent)]/70 fill-none"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="0,42 36,42 46,35 54,42 62,42 68,48 76,12 84,60 92,42 106,33 120,42 162,42 172,35 180,42 188,42 194,48 202,12 210,60 218,42 232,33 246,42 292,42 302,35 310,42 318,42 324,48 332,12 340,60 348,42 360,42" />
              </svg>
            )}
          </div>
        </div>

        {/* 3-Column Metric Bar: Avg | HRV | Quality */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-black/8 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] p-4 text-center sm:text-left">
          <div>
            <div className="text-[11px] text-[#55606E] dark:text-slate-400">
              {isUrdu ? 'اوسط دھڑکن' : 'Avg Pulse'}
            </div>
            <div className="font-mono-tabular text-base sm:text-lg font-semibold mt-0.5">
              {activeHeartRate ? `${activeHeartRate} bpm` : '-- bpm'}
            </div>
          </div>
          <div className="border-x border-black/8 dark:border-white/10 px-3">
            <div className="text-[11px] text-[#55606E] dark:text-slate-400">
              {isUrdu ? 'تغیّر (HRV)' : 'HRV'}
            </div>
            <div className="font-mono-tabular text-base sm:text-lg font-semibold mt-0.5">
              {ppgResult ? `${ppgResult.hrvMs} ms` : '-- ms'}
            </div>
          </div>
          <div className="pl-1">
            <div className="text-[11px] text-[#55606E] dark:text-slate-400">
              {isUrdu ? 'معیار' : 'Quality'}
            </div>
            <div className="text-base sm:text-lg font-semibold text-[var(--accent)] mt-0.5">
              {heroQualityDisplay}
            </div>
          </div>
        </div>
      </section>

      {/* FULL CLINICAL VITALS & READING INTERPRETER */}
      <section className="glass-panel rounded-[32px] p-5 sm:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/8 dark:border-white/10 pb-5">
          <div>
            <h2 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu urdu-safe text-2xl' : ''}`}>
              {s.vitalsTitle}
            </h2>
            <p className={`text-xs text-[#55606E] dark:text-slate-400 mt-1 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
              {s.vitalsSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-black/5 dark:bg-white/10">
            {(
              [
                ['BP_SUGAR', s.vitalsTabBpSugar],
                ['TAP', s.vitalsTabTap],
                ['PPG', s.vitalsTabCamera],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`min-h-[40px] px-4 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  tab === id
                    ? 'azure-pill-active'
                    : 'text-[#55606E] dark:text-slate-300 hover:text-[#161A20] dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Clear Upper/Lower BP & Fasting/Random Blood Sugar */}
        {tab === 'BP_SUGAR' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Upper & Lower Blood Pressure */}
            <div className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-[var(--accent)]">
                  1. Blood Pressure (mmHg)
                </span>
                {sysNum && diaNum && (
                  <span className="font-mono-tabular text-sm font-semibold">
                    {sysNum} / {diaNum}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold">{s.upperBpLabel}</label>
                  <p className="text-[11px] text-[#55606E] dark:text-slate-400 mb-1.5">{s.upperBpHint}</p>
                  <input
                    type="number"
                    min={50}
                    max={260}
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full min-h-[46px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-black/30 px-3.5 font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold">{s.lowerBpLabel}</label>
                  <p className="text-[11px] text-[#55606E] dark:text-slate-400 mb-1.5">{s.lowerBpHint}</p>
                  <input
                    type="number"
                    min={30}
                    max={160}
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full min-h-[46px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-black/30 px-3.5 font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Blood Sugar (Fasting vs Random) */}
            <div className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/50 dark:bg-white/[0.04] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-[var(--accent)]">
                  2. {s.sugarLabel}
                </span>
                {sugNum && (
                  <span className="font-mono-tabular text-sm font-semibold">{sugNum} mg/dL</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-black/5 dark:bg-white/10">
                <button
                  type="button"
                  onClick={() => setSugarMode('FASTING')}
                  className={`min-h-[38px] rounded-full text-xs font-medium px-2 transition-all ${
                    sugarMode === 'FASTING'
                      ? 'azure-pill-active'
                      : 'text-[#55606E] dark:text-slate-300'
                  }`}
                >
                  {s.sugarTypeFasting}
                </button>
                <button
                  type="button"
                  onClick={() => setSugarMode('RANDOM')}
                  className={`min-h-[38px] rounded-full text-xs font-medium px-2 transition-all ${
                    sugarMode === 'RANDOM'
                      ? 'azure-pill-active'
                      : 'text-[#55606E] dark:text-slate-300'
                  }`}
                >
                  {s.sugarTypeRandom}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">{s.sugarLabel}</label>
                <input
                  type="number"
                  min={20}
                  max={900}
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder={sugarMode === 'FASTING' ? '92' : '130'}
                  className="w-full min-h-[46px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-black/30 px-3.5 font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-black/8 dark:border-white/10 text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOrganWarningSigns}
                    onChange={(e) => setHasOrganWarningSigns(e.target.checked)}
                    className="h-4 w-4 accent-[#DC2626] mt-0.5"
                  />
                  <span>
                    {isUrdu
                      ? 'ہائی بی پی خطرناک علامات (سینے میں درد، دھندلا پن، سن ہونا، سانس پھولنا)'
                      : 'Organ warning signs (chest pain, vision blur, numbness, severe headache)'}
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasShockSigns}
                    onChange={(e) => setHasShockSigns(e.target.checked)}
                    className="h-4 w-4 accent-[#DC2626] mt-0.5"
                  />
                  <span>
                    {isUrdu
                      ? 'کم بی پی صدمے کی علامات (ٹھنڈا پسینہ، غنودگی، نیم بے ہوشی)'
                      : 'Low BP shock signs (cold/clammy skin, confusion, fainting)'}
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isConscious}
                    onChange={(e) => setIsConscious(!e.target.checked)}
                    className="h-4 w-4 accent-[#DC2626] mt-0.5"
                  />
                  <span>
                    {isUrdu
                      ? 'مریض غنودگی یا بے ہوشی میں ہے (منہ میں ہرگز کوئی چیز نہ ڈالیں)'
                      : 'Drowsy / unconscious / unable to swallow safely'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 60s Guided Breath & Pulse Tap Counter */}
        {tab === 'TAP' && (
          <div className="flex flex-col items-center py-2">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => {
                  resetTap();
                  setTapMode('BREATH');
                }}
                className={`min-h-[42px] px-4 rounded-full text-xs font-medium border transition-all ${
                  tapMode === 'BREATH'
                    ? 'azure-pill-active border-transparent'
                    : 'border-black/15 dark:border-white/20 text-[#55606E] dark:text-slate-300'
                }`}
              >
                {s.breathCounterLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetTap();
                  setTapMode('PULSE');
                }}
                className={`min-h-[42px] px-4 rounded-full text-xs font-medium border transition-all ${
                  tapMode === 'PULSE'
                    ? 'azure-pill-active border-transparent'
                    : 'border-black/15 dark:border-white/20 text-[#55606E] dark:text-slate-300'
                }`}
              >
                {s.pulseCounterLabel}
              </button>
            </div>

            <button
              type="button"
              onClick={handleTap}
              className="w-52 h-52 rounded-full border-2 border-[var(--accent)] glass-panel hover:scale-[1.01] active:scale-[0.97] transition-transform flex flex-col items-center justify-center gap-2 select-none shadow-[0_0_40px_rgba(123,184,141,0.22)]"
            >
              <Hand className="h-7 w-7 text-[var(--accent)]" strokeWidth={1.75} />
              <span className="font-metric text-5xl">
                {computedTapBpm > 0 ? computedTapBpm : taps.length}
              </span>
              <span className="text-xs text-[#55606E] dark:text-slate-300 px-4 text-center">
                {computedTapBpm > 0
                  ? tapMode === 'BREATH'
                    ? 'breaths / min'
                    : 'beats / min'
                  : s.tapCircleHint}
              </span>
            </button>

            <div className="mt-4 flex items-center gap-6 text-xs text-[#55606E] dark:text-slate-400 font-mono-tabular">
              <span>Taps: {taps.length}</span>
              <span>Timer: {elapsedSec}s / 60s</span>
              <span>WHO Breath Cutoff: &gt;= {fastThreshold} bpm</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetTap}
                className="min-h-[44px] px-4 rounded-full border border-black/15 dark:border-white/20 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {s.resetCounterBtn}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Camera Finger Pulse */}
        {tab === 'PPG' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-[var(--accent)]">
                {isUrdu
                  ? 'صرف نبض کا تقریباً اندازہ — کیمرہ یا ویڈیو سے بلڈ پریشر یا شوگر نہیں ناپی جا سکتی۔'
                  : 'Approximate Pulse Screening Estimate Only — Video/camera CANNOT measure Blood Pressure or Blood Sugar.'}
              </p>
              <p className="text-[#55606E] dark:text-slate-300">{s.cameraDisclaimer}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-36 h-28 rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 bg-black shrink-0 flex items-center justify-center">
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover opacity-80" />
                <canvas ref={canvasRef} width={64} height={48} className="hidden" />
                {!ppgRunning && <Camera className="absolute h-6 w-6 text-white/70" />}
              </div>

              <div className="flex-1 w-full">
                <div className="h-20 w-full rounded-2xl border border-black/10 dark:border-white/15 bg-white/40 dark:bg-black/40 p-2 flex items-center">
                  {ppgSamples.length > 2 ? (
                    <svg
                      viewBox="0 0 240 60"
                      className="w-full h-full stroke-[var(--accent)] fill-none"
                      strokeWidth="2"
                    >
                      <polyline points={buildSparkline(ppgSamples, 240, 60)} />
                    </svg>
                  ) : (
                    <span className="text-xs text-[#55606E] dark:text-slate-400 mx-auto">
                      30s Optical Pulse Waveform (Screening Estimate)
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-mono-tabular text-[#55606E] dark:text-slate-400">
                  <span>Elapsed: {ppgSec}s / 30s</span>
                  {ppgResult && <span>Approx. Screening: {ppgResult.bpm} BPM (SQI {ppgResult.sqi}%)</span>}
                </div>
              </div>
            </div>

            {ppgRunning && ppgStatus !== 'IDLE' && (
              <div
                className={`rounded-xl px-4 py-2 text-xs font-medium border ${
                  ppgStatus === 'GOOD_FINGER'
                    ? 'border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-200'
                    : 'border-amber-600/35 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                }`}
              >
                {ppgStatus === 'GOOD_FINGER'
                  ? isUrdu
                    ? 'انگلی کی نبض واضح محسوس ہو رہی ہے — ہاتھ ساکت رکھیں'
                    : 'Good fingertip pulse detected — hold still'
                  : ppgStatus === 'NO_FINGER'
                    ? isUrdu
                      ? 'کیمرہ پر انگلی محسوس نہیں ہو رہی — عقبی کیمرہ اور فلیش پر ہلکی انگلی رکھیں'
                      : 'No finger detected — gently cover the rear lens & flash with your fingertip'
                    : ppgStatus === 'TOO_DARK'
                      ? isUrdu
                        ? 'روشنی بہت کم ہے — فلیش آن کریں یا روشن جگہ پر رکھیں'
                        : 'Too dark — turn on phone flash or move to brighter light'
                      : isUrdu
                        ? 'روشنی زیادہ تیز ہے — کیمرہ ہلکا سا ڈھانپیں'
                        : 'Glare / too bright — cover the lens gently without gaps'}
              </div>
            )}

            {ppgError && (
              <div
                role="alert"
                className="rounded-xl border border-amber-600/30 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200"
              >
                {ppgError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!ppgRunning ? (
                <button
                  type="button"
                  onClick={startPpgEstimate}
                  className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-2"
                >
                  <HeartPulse className="h-4 w-4" />{' '}
                  {isUrdu ? '30 سیکنڈ کیمرہ نبض شروع کریں' : 'Start 30s Camera Pulse Scan'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => stopPpgCamera(true)}
                  className="min-h-[44px] px-5 rounded-full border border-red-600 text-red-700 dark:text-red-400 text-xs font-medium"
                >
                  {s.stopCameraScanBtn}
                </button>
              )}
            </div>
          </div>
        )}

        {/* LIVE INTERPRETATION RESULT PANEL */}
        <div className="rounded-3xl border border-black/10 dark:border-white/15 bg-white/45 dark:bg-white/[0.04] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={`font-display text-lg font-medium flex items-center gap-2 ${isUrdu ? 'font-urdu urdu-safe text-xl' : ''}`}>
              <Activity className="h-4 w-4 text-[var(--accent)]" />
              {s.vitalsSummaryTitle}
            </h3>
            {!hasAnyReading && (
              <span className="text-xs text-[#55606E] dark:text-slate-400">
                {isUrdu ? 'اوپر کوئی بھی ریڈنگ درج کریں' : 'Enter any reading above to see instant analysis'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BP Clear Result */}
            <div className="rounded-2xl bg-white/70 dark:bg-black/30 border border-black/8 dark:border-white/10 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#55606E] dark:text-slate-400">
                  Blood Pressure
                </span>
                {sysNum && diaNum && (
                  <span
                    className={`font-semibold ${
                      bpEvaluation.status === 'CRISIS'
                        ? 'text-[#DC2626]'
                        : bpEvaluation.status === 'NORMAL'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {sysNum}/{diaNum} mmHg
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold">{isUrdu ? bpEvaluation.label_ur : bpEvaluation.label_en}</p>
              <p className={`text-xs text-[#55606E] dark:text-slate-300 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                {isUrdu ? bpEvaluation.guidance_ur : bpEvaluation.guidance_en}
              </p>
              {!isUrdu && (
                <p className="font-urdu urdu-safe text-xs text-[var(--accent)] pt-0.5" dir="rtl">
                  {bpEvaluation.label_ur} — {bpEvaluation.guidance_ur}
                </p>
              )}
            </div>

            {/* Sugar & Breathing/Pulse Result */}
            <div className="rounded-2xl bg-white/70 dark:bg-black/30 border border-black/8 dark:border-white/10 p-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#55606E] dark:text-slate-400">
                  Blood Sugar &amp; Rate
                </span>
                {sugNum && (
                  <span
                    className={`font-semibold ${
                      sugarEvaluation.status === 'CRITICAL' || sugarEvaluation.status === 'LOW'
                        ? 'text-[#DC2626]'
                        : sugarEvaluation.status === 'NORMAL'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {sugNum} mg/dL ({sugarMode === 'FASTING' ? 'Fasting' : 'Random'})
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold">{isUrdu ? sugarEvaluation.label_ur : sugarEvaluation.label_en}</p>
              <p className={`text-xs text-[#55606E] dark:text-slate-300 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                {isUrdu ? sugarEvaluation.guidance_ur : sugarEvaluation.guidance_en}
              </p>
              {!isUrdu && (
                <p className="font-urdu urdu-safe text-xs text-[var(--accent)] pt-0.5" dir="rtl">
                  {sugarEvaluation.label_ur}
                </p>
              )}

              {(activeBreathRate || activeHeartRate) && (
                <div className="pt-2 mt-2 border-t border-black/8 dark:border-white/10 text-xs flex flex-wrap gap-3">
                  {activeBreathRate && (
                    <span className={activeBreathRate >= fastThreshold ? 'text-[#DC2626] font-semibold' : ''}>
                      Breathing: {activeBreathRate}/min{' '}
                      {activeBreathRate >= fastThreshold ? '(Fast breathing Red-Flag)' : '(Normal)'}
                    </span>
                  )}
                  {activeHeartRate && <span>Pulse: {activeHeartRate} BPM</span>}
                </div>
              )}
            </div>
          </div>

          {activeBreathRate && activeBreathRate >= fastThreshold && (
            <div className="rounded-xl border border-red-600/30 bg-red-50 dark:bg-red-950/50 px-4 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {isUrdu
                  ? `تیز سانس (${activeBreathRate} فی منٹ) خطرناک علامت ہے۔ فوری ہسپتال جائیں۔`
                  : `Fast breathing (${activeBreathRate} breaths/min; cutoff >= ${fastThreshold}) triggers WHO Red-Flag priority.`}
              </span>
            </div>
          )}

          {/* Stay Home vs Go to Hospital Decision Box */}
          {hasAnyReading && (
            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                stayHomeVerdict.verdict === 'EMERGENCY_1122'
                  ? 'border-[#DC2626] bg-red-50/80 dark:bg-red-950/40'
                  : stayHomeVerdict.verdict === 'RECHECK_AND_CLINIC'
                    ? 'border-amber-600/40 bg-amber-50/80 dark:bg-amber-950/35'
                    : 'border-[var(--accent)]/30 bg-white/60 dark:bg-black/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  {isUrdu ? 'گھر رہیں یا ہسپتال جائیں؟' : 'Stay Home vs. Go to Hospital'}
                </span>
                <span className="text-xs font-semibold">
                  {isUrdu ? stayHomeVerdict.title_ur : stayHomeVerdict.title_en}
                </span>
              </div>
              <p className={`text-xs text-[#55606E] dark:text-slate-300 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                {isUrdu ? stayHomeVerdict.explanation_ur : stayHomeVerdict.explanation_en}
              </p>
              <ul className="space-y-1 text-xs">
                {(isUrdu ? stayHomeVerdict.actionSteps_ur : stayHomeVerdict.actionSteps_en).map((step) => (
                  <li key={step} className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                    • {step}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#55606E] dark:text-slate-400 italic">
                {isUrdu ? stayHomeVerdict.disclaimer_ur : stayHomeVerdict.disclaimer_en}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {onApplyVitals && (
              <button
                type="button"
                onClick={applyVitalsRecord}
                className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> {s.saveVitalsBtn}
              </button>
            )}
            {onAnalyzeStandalone && hasAnyReading && (
              <button
                type="button"
                onClick={handleAnalyzeClick}
                className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {s.analyzeVitalsBtn}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCalmPacer((v) => !v)}
              className="min-h-[44px] px-4 rounded-full border border-black/15 dark:border-white/20 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Wind className="h-3.5 w-3.5 text-[var(--accent)]" />{' '}
              {isUrdu ? 'سانس کی مشق (بی پی)' : 'Calm Breathing Pacer'}
            </button>
            {typeof sugNum === 'number' && sugNum < 70 && isConscious && (
              <button
                type="button"
                onClick={() => setShowSugarTimer((v) => !v)}
                className="min-h-[44px] px-4 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" /> {isUrdu ? '15-15 شوگر ٹائمر' : 'Start 15-15 Sugar Timer'}
              </button>
            )}
          </div>

          {showCalmPacer && <CyclicSighingPacer locale={locale} compact />}
          {showSugarTimer && <StabilizationTimers locale={locale} defaultFocus="SUGAR" />}

          {savedNotice && (
            <div role="status" className="text-xs font-medium text-[var(--accent)]">
              {savedNotice}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

function buildSparkline(samples: number[], width = 240, height = 60): string {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = Math.max(0.001, max - min);
  const padY = 6;
  const usableH = height - padY * 2;
  return samples
    .map((v, i) => {
      const x = (i / Math.max(1, samples.length - 1)) * width;
      const y = height - padY - ((v - min) / span) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
