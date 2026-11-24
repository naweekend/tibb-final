import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Droplets, Flame, HeartPulse, Pause, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';

interface StabilizationTimersProps {
  locale: AppLocale;
  defaultFocus?: 'BURN' | 'SEIZURE' | 'BLEEDING' | 'SUGAR' | 'HEART_CHILD';
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const StabilizationTimers: React.FC<StabilizationTimersProps> = ({ locale, defaultFocus = 'BURN' }) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [focus, setFocus] = useState<'BURN' | 'SEIZURE' | 'BLEEDING' | 'SUGAR' | 'HEART_CHILD'>(defaultFocus);

  // 1. Burn 20-minute countdown (1200s)
  const [burnLeftSec, setBurnLeftSec] = useState(1200);
  const [burnRunning, setBurnRunning] = useState(false);

  // 2. Seizure stopwatch (red-flag at 300s = 5 min)
  const [seizureSec, setSeizureSec] = useState(0);
  const [seizureRunning, setSeizureRunning] = useState(false);

  // 3. Bleeding direct pressure / tourniquet timestamp
  const [pressureMinutes, setPressureMinutes] = useState(0);
  const [pressureRunning, setPressureRunning] = useState(false);
  const [tourniquetTime, setTourniquetTime] = useState<string | null>(null);

  // 4. 15-15 Low Blood Sugar countdown (900s)
  const [sugarLeftSec, setSugarLeftSec] = useState(900);
  const [sugarRunning, setSugarRunning] = useState(false);

  // 5. Heart attack / child checklist states
  const [heartChecks, setHeartChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!burnRunning) return;
    const id = window.setInterval(() => {
      setBurnLeftSec((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [burnRunning]);

  useEffect(() => {
    if (!seizureRunning) return;
    const id = window.setInterval(() => {
      setSeizureSec((v) => v + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [seizureRunning]);

  useEffect(() => {
    if (!pressureRunning) return;
    const id = window.setInterval(() => {
      setPressureMinutes((v) => v + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [pressureRunning]);

  useEffect(() => {
    if (!sugarRunning) return;
    const id = window.setInterval(() => {
      setSugarLeftSec((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sugarRunning]);

  return (
    <section
      dir={isUrdu ? 'rtl' : 'ltr'}
      className="rounded-3xl border-2 border-[#DC2626]/30 bg-[var(--surface)] p-5 sm:p-6 space-y-5"
    >
      <div className="border-b border-[var(--border)] pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
          <Clock className="h-4 w-4" />
          <span>{s.farHospitalTitle}</span>
        </div>
        <p className={`text-xs text-[var(--muted)] mt-1 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
          {s.farHospitalSubtitle}
        </p>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['BURN', isUrdu ? 'جلنے پر ٹھنڈا پانی (20 منٹ)' : 'Burn Cooling (20m)'],
            ['SEIZURE', isUrdu ? 'دورے کا دورانیہ (5 منٹ الرٹ)' : 'Seizure Stopwatch'],
            ['BLEEDING', isUrdu ? 'خون روکنے کا وقت' : 'Bleeding / Tourniquet'],
            ['SUGAR', isUrdu ? 'کم شوگر 15-15 ٹائمر' : 'Low Sugar 15-15'],
            ['HEART_CHILD', isUrdu ? 'دل کا دورہ / بچے کی حفاظت' : 'Heart / Child Checklist'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFocus(id)}
            className={`min-h-[38px] px-3.5 rounded-full text-xs font-medium border transition-colors ${
              focus === id
                ? 'azure-pill-active border-transparent'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. Burn 20-Minute Cool Water Timer */}
      {focus === 'BURN' && (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-[var(--accent)]" />
                {isUrdu ? 'جلی ہوئی جگہ پر صاف بہتا ٹھنڈا پانی (20 منٹ)' : 'Cool Running Water Burn Cooling Timer (20 min)'}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                {isUrdu
                  ? 'برف، ٹوتھ پیسٹ، مکھن یا تیل ہرگز نہ لگائیں۔ صرف صاف ٹھنڈا پانی بہائیں۔'
                  : 'Never apply toothpaste, butter, oil, or ice. Keep clean cool (not freezing) water running gently.'}
              </p>
            </div>
            <div className="font-mono-tabular text-3xl font-bold text-[var(--ink)] shrink-0">
              {formatClock(burnLeftSec)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBurnRunning((r) => !r)}
              className="min-h-[42px] px-5 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1.5"
            >
              {burnRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {burnRunning ? (isUrdu ? 'روکیں' : 'Pause') : (isUrdu ? '20 منٹ ٹائمر شروع کریں' : 'Start 20-Min Cooling')}
            </button>
            <button
              type="button"
              onClick={() => {
                setBurnRunning(false);
                setBurnLeftSec(1200);
              }}
              className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {isUrdu ? 'ری سیٹ' : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Seizure Duration Stopwatch */}
      {focus === 'SEIZURE' && (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                {isUrdu ? 'دورے یا جھٹکوں کا دورانیہ ٹائمر' : 'Seizure Duration Stopwatch'}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                {isUrdu
                  ? 'مریض کو ایک کروٹ پر لٹائیں۔ منہ میں چمچ، انگلی یا پانی ہرگز نہ ڈالیں۔'
                  : 'Turn gently onto side (recovery position). NEVER force spoons, fingers, or water into the mouth.'}
              </p>
            </div>
            <div
              className={`font-mono-tabular text-3xl font-bold shrink-0 ${
                seizureSec >= 300 ? 'text-[#DC2626]' : 'text-[var(--ink)]'
              }`}
            >
              {formatClock(seizureSec)}
            </div>
          </div>

          {seizureSec >= 300 && (
            <div role="alert" className="rounded-xl bg-[#DC2626] text-white px-4 py-2.5 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {isUrdu
                  ? '5 منٹ سے زیادہ ہو گئے ہیں! یہ انتہائی ہنگامی حالت ہے — فوراً 1122 پر کال کر کے ہسپتال پہنچائیں۔'
                  : 'Seizure >= 5 minutes! Status epilepticus Red Flag — emergency ambulance / hospital required NOW.'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSeizureRunning((r) => !r)}
              className="min-h-[42px] px-5 rounded-full bg-[#DC2626] text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              {seizureRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {seizureRunning ? (isUrdu ? 'روکیں' : 'Stop Timing') : (isUrdu ? 'ٹائمر شروع کریں' : 'Start Seizure Timer')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSeizureRunning(false);
                setSeizureSec(0);
              }}
              className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {isUrdu ? 'صفر کریں' : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Bleeding Direct Pressure & Tourniquet Timestamp Logger */}
      {focus === 'BLEEDING' && (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Droplets className="h-4 w-4 text-[#DC2626]" />
                {isUrdu ? 'خون روکنے کے دباؤ اور ٹورنیکے کا وقت' : 'Direct Pressure & Emergency Tourniquet Log'}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                {isUrdu
                  ? 'صاف کپڑے سے زخم پر مضبوط مسلسل دباؤ رکھیں۔ اگر خون بھیگ جائے تو اوپر نیا کپڑا رکھیں، پرانا نہ ہٹائیں۔'
                  : 'Apply firm continuous pressure with clean cloth. Add new layers on top if soaked through without lifting.'}
              </p>
            </div>
            <div className="font-mono-tabular text-3xl font-bold shrink-0">{formatClock(pressureMinutes)}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPressureRunning((r) => !r)}
              className="min-h-[42px] px-5 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1.5"
            >
              {pressureRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {pressureRunning ? (isUrdu ? 'دباؤ ٹائمر روکیں' : 'Pause Timer') : (isUrdu ? 'مسلسل دباؤ شروع' : 'Track Pressure Time')}
            </button>

            <button
              type="button"
              onClick={() => setTourniquetTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}
              className="min-h-[42px] px-4 rounded-full border border-[#DC2626] text-[#DC2626] text-xs font-semibold"
            >
              {isUrdu ? 'ٹورنیکے باندھنے کا وقت ریکارڈ کریں' : 'Log Tourniquet Applied Time'}
            </button>

            {tourniquetTime && (
              <span className="font-mono-tabular text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                {isUrdu ? `ٹورنیکے وقت: ${tourniquetTime}` : `Tourniquet Time: ${tourniquetTime} (Show Doctor)`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Low Blood Sugar 15-15 Timer */}
      {focus === 'SUGAR' && (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                {isUrdu ? 'کم شوگر کا 15-15 اصول ٹائمر (15 منٹ)' : 'Low Blood Sugar 15-15 Rule Timer (15 min)'}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                {isUrdu
                  ? 'صرف ہوش میں ہونے پر 15 گرام تیز میٹھا دیں۔ نیم بے ہوش یا بے ہوش شخص کے منہ میں ہرگز کوئی مشروب یا چیز نہ ڈالیں۔'
                  : 'Conscious only: 15g fast sugar (3 tsp sugar in water or half glass juice), then recheck in 15 min. NEVER put food/liquid into an unconscious mouth.'}
              </p>
            </div>
            <div className="font-mono-tabular text-3xl font-bold shrink-0">{formatClock(sugarLeftSec)}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSugarRunning((r) => !r)}
              className="min-h-[42px] px-5 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1.5"
            >
              {sugarRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {sugarRunning ? (isUrdu ? 'روکیں' : 'Pause') : (isUrdu ? '15 منٹ ٹائمر شروع' : 'Start 15-Min Recheck Timer')}
            </button>
            <button
              type="button"
              onClick={() => {
                setSugarRunning(false);
                setSugarLeftSec(900);
              }}
              className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs font-medium"
            >
              {isUrdu ? 'ری سیٹ' : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Heart Attack & Pediatric En-Route Monitoring Checklist */}
      {focus === 'HEART_CHILD' && (
        <div className="rounded-2xl bg-[var(--surface-muted)] p-5 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-[#DC2626]" />
            {isUrdu ? 'راستے میں حفاظت کی چیک لسٹ (دل کا درد / چھوٹا بچہ)' : 'En-Route Safety Checklist (Suspected Heart Attack / Young Child)'}
          </h4>
          {[
            {
              id: 'sit',
              en: 'Keep person resting upright or semi-reclined (never make chest-pain patient walk or climb stairs).',
              ur: 'مریض کو آرام سے سہارا دے کر بٹھائیں (سینے کے درد میں مریض کو ہرگز چلائیں یا سیڑھیاں نہ چڑھائیں)۔',
            },
            {
              id: 'clothes',
              en: 'Loosen tight collar, dupatta, or belt; keep calm airflow without crowding.',
              ur: 'کالر، دوپٹہ یا بیلٹ ڈھیلا کریں اور مریض کے ارد گرد ہجوم نہ لگائیں۔',
            },
            {
              id: 'child_warm',
              en: 'If infant/child: keep skin warm against parent chest; offer small sips of ORS only if fully awake and able to swallow.',
              ur: 'اگر بچہ ہے تو جسم گرم رکھیں؛ صرف مکمل ہوش میں ہونے پر او آر ایس کے چھوٹے گھونٹ دیں۔',
            },
            {
              id: 'cpr_ready',
              en: 'If unresponsive and not breathing normally, begin hands-only chest compressions while rescue 1122 is on the phone.',
              ur: 'اگر سانس رک جائے اور ہوش نہ ہو تو 1122 کی ہدایت پر فوری سینے کو دبانا (CPR) شروع کریں۔',
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3.5 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={Boolean(heartChecks[item.id])}
                onChange={(e) => setHeartChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                className="h-4 w-4 accent-[#2E7D5B] mt-0.5"
              />
              <span className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>{isUrdu ? item.ur : item.en}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
};
