import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, Wind } from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { playClinicalChime, speakOfflineGuidance } from '../engine/audioFeedback';

interface CyclicSighingPacerProps {
  locale: AppLocale;
  compact?: boolean;
}

type BreathPhase = 'READY' | 'INHALE_1' | 'INHALE_2' | 'EXHALE';

const PHASE_TIMINGS: Record<Exclude<BreathPhase, 'READY'>, { durationMs: number; en: string; ur: string; scale: number }> = {
  INHALE_1: {
    durationMs: 2200,
    en: 'Inhale gently through nose...',
    ur: 'ناک سے آہستہ سانس اندر کھینچیں...',
    scale: 1.15,
  },
  INHALE_2: {
    durationMs: 1300,
    en: 'Second quick top-up sip in!',
    ur: 'مزید ہلکا سا سانس اندر بھریں!',
    scale: 1.32,
  },
  EXHALE: {
    durationMs: 6000,
    en: 'Long slow exhale through mouth...',
    ur: 'منہ سے آہستہ لمبا سانس باہر نکالیں...',
    scale: 0.88,
  },
};

export const CyclicSighingPacer: React.FC<CyclicSighingPacerProps> = ({ locale, compact = false }) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<BreathPhase>('READY');
  const [cycles, setCycles] = useState(0);
  const [voiceCues, setVoiceCues] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    const activePhase: Exclude<BreathPhase, 'READY'> = phase === 'READY' ? 'INHALE_1' : phase;
    if (phase === 'READY') {
      setPhase('INHALE_1');
      return;
    }

    const meta = PHASE_TIMINGS[activePhase];
    playClinicalChime('tap');
    if (voiceCues) {
      speakOfflineGuidance(isUrdu ? meta.ur : meta.en, isUrdu ? 'ur-PK' : 'en-US').catch(() => {});
    }

    timerRef.current = window.setTimeout(() => {
      if (activePhase === 'INHALE_1') {
        setPhase('INHALE_2');
      } else if (activePhase === 'INHALE_2') {
        setPhase('EXHALE');
      } else {
        setCycles((c) => c + 1);
        setPhase('INHALE_1');
      }
    }, meta.durationMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [running, phase, voiceCues, isUrdu]);

  const activeScale = phase === 'READY' ? 1 : PHASE_TIMINGS[phase].scale;
  const phaseLabel =
    phase === 'READY'
      ? isUrdu
        ? 'شروع کرنے کے لیے دبائیں'
        : 'Press Start to Begin'
      : isUrdu
        ? PHASE_TIMINGS[phase].ur
        : PHASE_TIMINGS[phase].en;

  const handleToggle = () => {
    if (running) {
      setRunning(false);
      setPhase('READY');
    } else {
      setPhase('INHALE_1');
      setRunning(true);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setPhase('READY');
    setCycles(0);
  };

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className={`rounded-3xl border border-[var(--accent)]/25 glass-panel ${
        compact ? 'p-4' : 'p-6'
      } space-y-4`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`font-display text-lg font-medium flex items-center gap-2 ${isUrdu ? 'font-urdu urdu-safe text-xl' : ''}`}>
            <Wind className="h-4 w-4 text-[var(--accent)]" />
            {s.calmPacerTitle}
          </h3>
          <p className={`text-xs text-[var(--muted)] mt-0.5 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
            {s.calmPacerSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVoiceCues((v) => !v)}
          className={`min-h-[36px] px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 ${
            voiceCues
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
              : 'border-[var(--border)] text-[var(--muted)]'
          }`}
        >
          <Volume2 className="h-3.5 w-3.5" /> {voiceCues ? (isUrdu ? 'آواز فعال' : 'Audio On') : isUrdu ? 'آواز بند' : 'Audio Off'}
        </button>
      </div>

      <div className="flex flex-col items-center py-3 space-y-4">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <div
            style={{
              transform: `scale(${activeScale})`,
              transitionDuration: phase === 'EXHALE' ? '5800ms' : phase === 'INHALE_2' ? '1100ms' : '2000ms',
            }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--surface-muted)] to-[var(--accent-soft)] border-2 border-[var(--accent)]/60  transition-transform ease-in-out flex items-center justify-center text-center px-3 shadow-md"
          >
            <span className="font-mono-tabular text-xs font-semibold text-[var(--ink)]">
              {phase === 'READY' ? '2+1 : 6s' : phase === 'EXHALE' ? 'EXHALE' : phase === 'INHALE_2' ? 'SIP IN' : 'INHALE'}
            </span>
          </div>
        </div>

        <p className={`text-sm font-medium text-center ${isUrdu ? 'font-urdu urdu-safe text-base' : ''}`}>
          {phaseLabel}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-2"
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? (isUrdu ? 'روکیں' : 'Pause') : isUrdu ? 'شروع کریں' : 'Start Cyclic Sighing'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {isUrdu ? 'دوبارہ' : 'Reset'}
          </button>

          <span className="font-mono-tabular text-xs text-[var(--muted)] px-2">
            {isUrdu ? `مکمل چکر: ${cycles}` : `Cycles: ${cycles}`}
          </span>
        </div>
      </div>
    </div>
  );
};
