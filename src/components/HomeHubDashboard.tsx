import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Droplets,
  Dumbbell,
  FileText,
  Footprints,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Moon,
  PhoneCall,
  Play,
  Plus,
  Scale,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { computeBmiAssessment } from '../data/remediesAndPlans';
import { AppLocale } from '../data/trilingual';
import type { StoredEpisode, StoredLabRecord, StoredMedicineAlarm } from '../db/encryptedVault';
import { sortFacilities } from '../engine/triageEngine';
import type {
  DailyDoctorCheckIn,
  DailyWellnessLog,
  ExtendedPatientProfile,
  SavedPersonReport,
} from '../types/clinical';
import {
  UnitSystem,
  computeDailyReadinessScore,
  computeSleepDurationHours,
  createStepDetectorState,
  formatTime12h,
  formatWeightDisplay,
  getLocalDateKey,
  kgToLbs,
  lbsToKg,
  processMotionSample,
  safePercent,
  sanitizeSleepHours,
  sleepHoursToQuality,
} from '../utils/healthMath';

interface HomeHubDashboardProps {
  locale: AppLocale;
  activePerson: ExtendedPatientProfile;
  allPeople: ExtendedPatientProfile[];
  wellness: DailyWellnessLog;
  alarms: StoredMedicineAlarm[];
  episodes: StoredEpisode[];
  labs: StoredLabRecord[];
  reports: SavedPersonReport[];
  onUpdateWellness: (next: DailyWellnessLog) => Promise<void>;
  onUpdatePersonWeight?: (weightKg: number) => Promise<void>;
  onEditActivePerson?: () => void;
  onMarkReminderDone: (alarm: StoredMedicineAlarm) => Promise<void>;
  onSwitchPerson: (personId: string) => void;
  onNavigate: (tab: 'HOME' | 'CHECKUP' | 'COACH' | 'VITALS' | 'ALARMS' | 'RECORDS' | 'BHU') => void;
  onTriggerSos: (placeIndex?: number) => void;
}

const SLEEP_PRESET_HOURS = [5, 6, 7, 8, 9] as const;
const SLEEP_QUALITY_LABELS: Array<{ score: 1 | 2 | 3 | 4 | 5; en: string; ur: string }> = [
  { score: 1, en: 'Poor', ur: 'ناقص' },
  { score: 2, en: 'Light', ur: 'کچی نیند' },
  { score: 3, en: 'Fair', ur: 'مناسب' },
  { score: 4, en: 'Good', ur: 'اچھی' },
  { score: 5, en: 'Deep', ur: 'گہری نیند' },
];

export const HomeHubDashboard: React.FC<HomeHubDashboardProps> = ({
  locale,
  activePerson,
  allPeople,
  wellness,
  alarms,
  episodes,
  labs,
  reports,
  onUpdateWellness,
  onUpdatePersonWeight,
  onEditActivePerson,
  onMarkReminderDone,
  onSwitchPerson,
  onNavigate,
  onTriggerSos,
}) => {
  const isUrdu = locale === 'ur';
  const todayKey = getLocalDateKey();

  const [focusTab, setFocusTab] = useState<'REMINDERS' | 'RECOMMENDED'>('REMINDERS');
  const [bellOpen, setBellOpen] = useState(false);
  const bellContainerRef = useRef<HTMLDivElement | null>(null);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(activePerson.preferredUnitSystem ?? 'METRIC');
  const [selectedPlaceIdx, setSelectedPlaceIdx] = useState(0);
  const [checkInSaved, setCheckInSaved] = useState(false);

  useEffect(() => {
    setUnitSystem(activePerson.preferredUnitSystem ?? 'METRIC');
    setSelectedPlaceIdx(0);
    setCheckInSaved(false);
  }, [activePerson.id, activePerson.preferredUnitSystem]);

  useEffect(() => {
    if (!bellOpen && !checkInModalOpen) return;
    const handlePointerDown = (evt: MouseEvent) => {
      if (bellOpen && bellContainerRef.current && !bellContainerRef.current.contains(evt.target as Node)) {
        setBellOpen(false);
      }
    };
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        setBellOpen(false);
        setCheckInModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bellOpen, checkInModalOpen]);

  // Filtered motion pedometer
  const needsIosPermission =
    typeof window !== 'undefined' &&
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission ===
      'function';

  const [sensorActive, setSensorActive] = useState<boolean>(!needsIosPermission);
  const [sensorSensitivity, setSensorSensitivity] = useState<'NORMAL' | 'SENSITIVE'>('NORMAL');
  const [motionStateLabel, setMotionStateLabel] = useState<'STATIONARY' | 'WALKING'>('STATIONARY');
  const [liveBufferedSteps, setLiveBufferedSteps] = useState(0);

  const pendingStepDeltaRef = useRef(0);
  const flushTimerRef = useRef<number | null>(null);
  const stationaryTimerRef = useRef<number | null>(null);
  const stepDetectorRef = useRef(createStepDetectorState());
  const sensitivityRef = useRef<'NORMAL' | 'SENSITIVE'>(sensorSensitivity);
  const latestWellnessRef = useRef(wellness);
  const updateWellnessRef = useRef(onUpdateWellness);

  useEffect(() => {
    sensitivityRef.current = sensorSensitivity;
  }, [sensorSensitivity]);

  useEffect(() => {
    latestWellnessRef.current = wellness;
  }, [wellness]);

  useEffect(() => {
    updateWellnessRef.current = onUpdateWellness;
  }, [onUpdateWellness]);

  useEffect(() => {
    if (!sensorActive || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;

    const flushSteps = () => {
      const delta = pendingStepDeltaRef.current;
      if (delta <= 0) return;
      pendingStepDeltaRef.current = 0;
      setLiveBufferedSteps(0);
      const curr = latestWellnessRef.current;
      void updateWellnessRef.current({
        ...curr,
        steps: curr.steps + delta,
        updatedAtIso: new Date().toISOString(),
      });
    };

    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const now = Date.now();
      const { stepDetected } = processMotionSample(
        stepDetectorRef.current,
        acc.x ?? 0,
        acc.y ?? 0,
        acc.z ?? 0,
        now,
        sensitivityRef.current
      );

      if (stepDetected) {
        pendingStepDeltaRef.current += 1;
        setLiveBufferedSteps(pendingStepDeltaRef.current);
        setMotionStateLabel('WALKING');

        if (stationaryTimerRef.current) window.clearTimeout(stationaryTimerRef.current);
        stationaryTimerRef.current = window.setTimeout(() => setMotionStateLabel('STATIONARY'), 2600);

        if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = window.setTimeout(flushSteps, 1500);
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      if (stationaryTimerRef.current) window.clearTimeout(stationaryTimerRef.current);
      flushSteps();
    };
  }, [sensorActive]);

  const handleEnableIosMotion = async () => {
    try {
      const fn = (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> })
        .requestPermission;
      if (fn) {
        const res = await fn();
        if (res === 'granted') setSensorActive(true);
      }
    } catch {
      // manual +500 fallback remains active
    }
  };

  // Safe sleep hours & Bedtime/Wake-time calculator
  const sanitizedWellnessSleep = sanitizeSleepHours(wellness.sleepHours);
  const [sleepDraft, setSleepDraft] = useState<string>(String(sanitizedWellnessSleep));
  const [showSleepEditor, setShowSleepEditor] = useState(false);
  const [bedTime24, setBedTime24] = useState<string>(wellness.dailyCheckIn?.bedTime24 ?? '23:30');
  const [wakeTime24, setWakeTime24] = useState<string>(wellness.dailyCheckIn?.wakeTime24 ?? '06:30');

  useEffect(() => {
    setSleepDraft(String(sanitizeSleepHours(wellness.sleepHours)));
  }, [wellness.sleepHours, activePerson.id]);

  const [checkInSleepHours, setCheckInSleepHours] = useState<number>(
    sanitizeSleepHours(wellness.dailyCheckIn?.sleepHours ?? sanitizedWellnessSleep)
  );
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(
    wellness.dailyCheckIn?.sleepQuality ?? sleepHoursToQuality(sanitizedWellnessSleep)
  );

  const commitSleepHours = (nextHours: number) => {
    const clean = sanitizeSleepHours(nextHours);
    setSleepDraft(String(clean));
    setCheckInSleepHours(clean);
    void onUpdateWellness({
      ...wellness,
      sleepHours: clean,
      updatedAtIso: new Date().toISOString(),
    });
  };

  // Daily Doctor Check-In state
  const existingCheckIn = wellness.dailyCheckIn;
  const [feelingWeightChange, setFeelingWeightChange] = useState<'LOSING' | 'SAME' | 'GAINING'>(
    existingCheckIn?.weightFeeling ?? 'SAME'
  );

  const initialMetricWeight = existingCheckIn?.currentWeightKg ?? activePerson.weightKg;
  const [todayWeightInput, setTodayWeightInput] = useState<string>(
    initialMetricWeight
      ? String(unitSystem === 'IMPERIAL' ? kgToLbs(initialMetricWeight) : Math.round(initialMetricWeight * 10) / 10)
      : ''
  );

  useEffect(() => {
    const baseVal = wellness.dailyCheckIn?.currentWeightKg ?? activePerson.weightKg;
    if (baseVal) {
      setTodayWeightInput(
        String(unitSystem === 'IMPERIAL' ? kgToLbs(baseVal) : Math.round(baseVal * 10) / 10)
      );
    } else {
      setTodayWeightInput('');
    }
  }, [activePerson.id, activePerson.weightKg, unitSystem, wellness.dailyCheckIn?.currentWeightKg]);

  const [energyLevel, setEnergyLevel] = useState<'LOW' | 'STEADY' | 'STRONG'>(
    existingCheckIn?.energyLevel ?? 'STEADY'
  );
  const [newSymptomsNote, setNewSymptomsNote] = useState<string>(existingCheckIn?.symptomsNote ?? '');

  useEffect(() => {
    const ci = wellness.dailyCheckIn;
    const cleanSleep = sanitizeSleepHours(ci?.sleepHours ?? wellness.sleepHours);
    setFeelingWeightChange(ci?.weightFeeling ?? 'SAME');
    setEnergyLevel(ci?.energyLevel ?? 'STEADY');
    setNewSymptomsNote(ci?.symptomsNote ?? '');
    setBedTime24(ci?.bedTime24 ?? '23:30');
    setWakeTime24(ci?.wakeTime24 ?? '06:30');
    setCheckInSleepHours(cleanSleep);
    setSleepQuality(ci?.sleepQuality ?? sleepHoursToQuality(cleanSleep));
  }, [activePerson.id, wellness.id]);

  // Offline Saved Places
  const places = activePerson.frequentPlaces ?? [];
  const activePlace = places[selectedPlaceIdx] ?? places[0];

  const offlineFacilities = useMemo(() => {
    if (!activePlace) return [];
    const coords =
      typeof activePlace.lat === 'number' && typeof activePlace.lng === 'number'
        ? { lat: activePlace.lat, lng: activePlace.lng }
        : undefined;
    return sortFacilities('RED', activePerson.ageMonths <= 60, coords, activePlace.district).facilities.slice(0, 2);
  }, [activePlace, activePerson.ageMonths]);

  const personAlarms = alarms.filter((a) => a.patientId === activePerson.id && a.enabled);
  const dueReminders = personAlarms.filter((a) => !a.adherenceDates.includes(todayKey));

  const totalDisplaySteps = wellness.steps + liveBufferedSteps;
  const readiness = computeDailyReadinessScore({
    waterMl: wellness.waterMl,
    waterGoalMl: wellness.waterGoalMl,
    steps: totalDisplaySteps,
    stepGoal: wellness.stepGoal,
    sleepHours: sanitizedWellnessSleep,
    activeAlarmsCount: personAlarms.length,
    dueAlarmsCount: dueReminders.length,
  });

  const bmiAssessment = useMemo(
    () => computeBmiAssessment(activePerson.weightKg, activePerson.heightCm, activePerson.ageMonths),
    [activePerson.weightKg, activePerson.heightCm, activePerson.ageMonths]
  );

  const baselineWeightKg = activePerson.baselineWeightKg ?? activePerson.weightKg;
  const parsedInputNum = todayWeightInput ? Number(todayWeightInput) : undefined;
  const liveWeightKg =
    parsedInputNum && Number.isFinite(parsedInputNum) && parsedInputNum > 0
      ? unitSystem === 'IMPERIAL'
        ? lbsToKg(parsedInputNum)
        : parsedInputNum
      : undefined;
  const weightDeltaKg =
    baselineWeightKg && liveWeightKg ? Math.round((liveWeightKg - baselineWeightKg) * 10) / 10 : null;
  const weightDeltaDisplay =
    weightDeltaKg === null
      ? null
      : unitSystem === 'IMPERIAL'
        ? `${weightDeltaKg > 0 ? `+${kgToLbs(weightDeltaKg)}` : weightDeltaKg < 0 ? `-${kgToLbs(Math.abs(weightDeltaKg))}` : '0'} lbs`
        : `${weightDeltaKg > 0 ? `+${weightDeltaKg}` : weightDeltaKg} kg`;

  const addWater = (deltaMl: number) => {
    void onUpdateWellness({
      ...wellness,
      waterMl: Math.max(0, wellness.waterMl + deltaMl),
      updatedAtIso: new Date().toISOString(),
    });
  };

  const addSteps = (delta: number) => {
    void onUpdateWellness({
      ...wellness,
      steps: Math.max(0, wellness.steps + delta),
      updatedAtIso: new Date().toISOString(),
    });
  };

  const handleApplyBedWakeTimes = () => {
    const computedHrs = computeSleepDurationHours(bedTime24, wakeTime24);
    commitSleepHours(computedHrs);
    setSleepQuality(sleepHoursToQuality(computedHrs));
    setShowSleepEditor(false);
  };

  const handleSaveDoctorCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const measuredKg = liveWeightKg ? Math.max(1, Math.min(250, Math.round(liveWeightKg * 100) / 100)) : undefined;
    const computedDelta =
      baselineWeightKg && measuredKg ? Math.round((measuredKg - baselineWeightKg) * 10) / 10 : undefined;
    const finalSleep = sanitizeSleepHours(checkInSleepHours);
    const payload: DailyDoctorCheckIn = {
      answeredDateKey: todayKey,
      weightFeeling: feelingWeightChange,
      currentWeightKg: measuredKg,
      weightDeltaKg: computedDelta,
      sleepHours: finalSleep,
      bedTime24,
      wakeTime24,
      sleepQuality,
      energyLevel,
      symptomsNote: newSymptomsNote.trim() || undefined,
      answeredAtIso: new Date().toISOString(),
    };
    await onUpdateWellness({
      ...wellness,
      sleepHours: finalSleep,
      dailyCheckIn: payload,
      updatedAtIso: new Date().toISOString(),
    });
    if (measuredKg && onUpdatePersonWeight) {
      await onUpdatePersonWeight(measuredKg);
    }
    setCheckInSaved(true);
  };

  const latestEp = episodes.find((e) => e.patientId === activePerson.id);
  const latestLab = labs.find((l) => l.patientId === activePerson.id);
  const displayPulse = wellness.restingHr ?? latestEp?.heartRate ?? '--';
  const displaySugar = wellness.lastSugarMgDl ?? latestLab?.fastingGlucose ?? '--';

  const sleepWholeHrs = Math.floor(sanitizedWellnessSleep);
  const sleepMins = Math.round((sanitizedWellnessSleep - sleepWholeHrs) * 60);
  const sleepFormatted = `${sleepWholeHrs}h ${sleepMins > 0 ? `${sleepMins}m` : '00m'}`;

  const mealTargetCount = wellness.plan?.dietMeals.length ?? 4;
  const totalGoals = mealTargetCount + 3;
  const completedGoals =
    Math.min(mealTargetCount, wellness.mealsChecked.length) +
    (wellness.workoutDone ? 1 : 0) +
    (wellness.waterMl >= wellness.waterGoalMl ? 1 : 0) +
    (totalDisplaySteps >= wellness.stepGoal ? 1 : 0);

  // Compact Step Ring geometry (30px radius -> crisp 76px widget)
  const ringRadius = 29;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const stepPct = readiness.stepsPct;
  const strokeDashoffset = ringCircumference - (stepPct / 100) * ringCircumference;

  const initials =
    activePerson.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'TB';

  const nextDue = dueReminders[0];
  const checkInDoneToday = existingCheckIn?.answeredDateKey === todayKey;

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="max-w-6xl mx-auto relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN (Mockup Botanical Hub: Fits Compactly Together on One Screen) */}
        <div className="lg:col-span-7 space-y-2.5 sm:space-y-3">
          {/* 1. Compact Greeting Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onEditActivePerson}
                aria-label="Edit active member profile"
                className="w-10 h-10 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center font-display text-xs font-semibold text-[var(--accent)] shrink-0 tactile-press"
              >
                {initials}
              </button>
              <div className="min-w-0 leading-tight">
                <p className={`text-[11px] text-[var(--muted)] ${isUrdu ? 'font-urdu urdu-safe text-xs' : ''}`}>
                  {isUrdu ? 'خوش آمدید' : 'Welcome Back'}
                </p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="font-display text-sm sm:text-base font-semibold truncate">{activePerson.name}</h1>
                  {bmiAssessment.bmi !== null && (
                    <span className="text-[11px] font-mono-tabular text-[var(--accent)]">
                      BMI {bmiAssessment.bmi}
                      {activePerson.weightKg ? ` · ${formatWeightDisplay(activePerson.weightKg, unitSystem)}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div ref={bellContainerRef} className="relative flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setBellOpen((b) => !b)}
                aria-label={isUrdu ? 'الارم اور یاددہانیاں' : 'View due reminders'}
                aria-expanded={bellOpen}
                className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/80 flex items-center justify-center relative tactile-press"
              >
                <Bell className="h-4 w-4 text-[var(--ink)]" />
                {dueReminders.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#DC2626] text-white font-mono-tabular text-[10px] font-semibold flex items-center justify-center">
                    {dueReminders.length}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-12 z-40 w-72 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{isUrdu ? 'آج کی یاددہانیاں' : 'Today’s Reminders'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        onNavigate('ALARMS');
                      }}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      {isUrdu ? 'تمام دیکھیں' : 'Manage All'}
                    </button>
                  </div>
                  {dueReminders.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      {personAlarms.length === 0
                        ? isUrdu
                          ? 'ابھی کوئی الارم سیٹ نہیں ہے۔'
                          : 'No medicine or checkup alarms set.'
                        : isUrdu
                          ? 'آج کے تمام الارم مکمل ہو چکے ہیں۔'
                          : 'All scheduled reminders cleared today.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {dueReminders.slice(0, 3).map((rem) => (
                        <div
                          key={rem.id}
                          className="rounded-xl bg-[var(--surface-muted)] px-2.5 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{rem.medicineLabel}</div>
                            <div className="text-[10px] font-mono-tabular text-[var(--muted)]">
                              {formatTime12h(rem.time24h)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void onMarkReminderDone(rem)}
                            className="min-h-[28px] px-2.5 rounded-full azure-pill-active text-[10px] font-semibold shrink-0"
                          >
                            {isUrdu ? 'مکمل' : 'Done'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Daily Insights + Progress Score % */}
          <section className="flex items-end justify-between gap-3">
            <div>
              <h2
                className={`font-display text-2xl sm:text-[2.1rem] font-normal leading-[1.04] tracking-tight ${
                  isUrdu ? 'font-urdu urdu-safe text-2xl' : ''
                }`}
              >
                {isUrdu ? (
                  <>
                    روزانہ
                    <br />
                    صحت کا خلاصہ
                  </>
                ) : (
                  <>
                    Daily
                    <br />
                    Insights
                  </>
                )}
              </h2>
            </div>

            <div className="text-end shrink-0">
              <p className="text-[11px] text-[var(--muted)] mb-0.5">{isUrdu ? 'آج کی پیشرفت' : 'Progress Score'}</p>
              <div className="inline-flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent)] flex items-center justify-center">
                  <Leaf className="h-3.5 w-3.5" />
                </span>
                <span className="font-metric text-3xl sm:text-[2.5rem] leading-none text-[var(--ink)]">
                  {readiness.score}
                  <span className="text-xl sm:text-2xl text-[var(--muted)]">%</span>
                </span>
              </div>
            </div>
          </section>

          {/* 3. Segmented Pill Switcher (Reminders | Recommended) */}
          <div
            role="tablist"
            aria-label={isUrdu ? 'روزانہ توجہ' : 'Daily focus switcher'}
            className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/65 p-1 grid grid-cols-2 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={focusTab === 'REMINDERS'}
              onClick={() => setFocusTab('REMINDERS')}
              className={`min-h-[38px] rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                focusTab === 'REMINDERS' ? 'azure-pill-active font-semibold' : 'text-[var(--muted)]'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {isUrdu
                ? `یاددہانیاں (${dueReminders.length})`
                : `Reminders${dueReminders.length ? ` (${dueReminders.length})` : ''}`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={focusTab === 'RECOMMENDED'}
              onClick={() => setFocusTab('RECOMMENDED')}
              className={`min-h-[38px] rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                focusTab === 'RECOMMENDED' ? 'azure-pill-active font-semibold' : 'text-[var(--muted)]'
              }`}
            >
              {isUrdu ? 'تجویز کردہ عمل' : 'Recommended'}
            </button>
          </div>

          {/* 4. Featured Botanical Mist Session / Reminder Banner */}
          <section className="featured-mist-card rounded-[20px] px-3.5 py-3 flex items-center justify-between gap-3">
            {focusTab === 'REMINDERS' ? (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface)]/75 border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate">
                      {nextDue
                        ? nextDue.medicineLabel
                        : isUrdu
                          ? 'آج کے لیے کوئی بقایا الارم نہیں'
                          : 'All scheduled reminders clear today'}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] truncate">
                      {nextDue
                        ? `${formatTime12h(nextDue.time24h)} · ${nextDue.kind ?? 'MEDICINE'}`
                        : personAlarms.length === 0
                          ? isUrdu
                            ? 'دوا، ورزش یا فالو اپ الارم لگائیں'
                            : 'Set medicine, exercise, or checkup alerts'
                          : `${personAlarms.length} active schedules completed`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (nextDue ? void onMarkReminderDone(nextDue) : onNavigate('ALARMS'))}
                  aria-label={nextDue ? 'Mark reminder complete' : 'Open Alarms'}
                  className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/85 flex items-center justify-center text-[var(--ink)] shrink-0 tactile-press"
                >
                  {nextDue ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)]/85 flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold truncate">
                      {isUrdu ? 'اے آئی طبی معائنہ و پُرسکون سانس' : 'Guided Triage & Breath Focus'}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] truncate">
                      {isUrdu
                        ? '2 منٹ · علامات کی جانچ اور گھریلو علاج'
                        : '2 min · Symptom check, camera chat & Desi remedies'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('CHECKUP')}
                  aria-label="Open Triage and Camera Chat"
                  className="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/85 flex items-center justify-center text-[var(--ink)] shrink-0 tactile-press"
                >
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                </button>
              </>
            )}
          </section>

          {/* 5. COMPACT 2x2 BENTO GRID (Side-by-Side on BOTH Mobile & Desktop like Mockup!) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Card 1: Daily Steps Ring */}
            <section className="glass-panel rounded-[22px] p-3.5 flex flex-col justify-between gap-2 min-h-[164px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium truncate">{isUrdu ? 'روزانہ قدم' : 'Daily Steps'}</span>
                <Footprints className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-[76px] h-[76px] flex items-center justify-center">
                  <svg className="w-[76px] h-[76px] -rotate-90" viewBox="0 0 72 72" aria-hidden="true">
                    <defs>
                      <linearGradient id="tibbStepArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#B8E0C2" />
                        <stop offset="100%" stopColor="#6AA882" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="36"
                      cy="36"
                      r={ringRadius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      className="text-[var(--surface-muted)]"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={ringRadius}
                      fill="none"
                      stroke="url(#tibbStepArcGrad)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute font-metric text-base text-[var(--ink)]">{stepPct}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    sensorActive
                      ? setSensorSensitivity((s) => (s === 'NORMAL' ? 'SENSITIVE' : 'NORMAL'))
                      : void handleEnableIosMotion()
                  }
                  title={sensorActive ? 'Toggle Std / Pocket motion sensitivity' : 'Enable motion step sensor'}
                  className="min-w-0 text-left truncate text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <span className="font-mono-tabular font-medium text-[var(--ink)]">
                    {totalDisplaySteps.toLocaleString()}
                  </span>
                  <span className="text-[10px]">
                    /{wellness.stepGoal >= 1000 ? `${(wellness.stepGoal / 1000).toFixed(1)}k` : wellness.stepGoal}
                  </span>
                  <span className="block text-[9px] text-[var(--muted)]">
                    {sensorActive
                      ? motionStateLabel === 'WALKING'
                        ? isUrdu
                          ? 'چل رہے ہیں'
                          : 'Walking'
                        : sensorSensitivity === 'NORMAL'
                          ? 'Auto · Std'
                          : 'Auto · Pocket'
                      : 'Tap Enable'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => addSteps(500)}
                  className="min-h-[28px] px-2.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/60 text-[10px] font-semibold shrink-0 tactile-press"
                >
                  +500
                </button>
              </div>
            </section>

            {/* Card 2: Progress Goals */}
            <section className="glass-panel rounded-[22px] p-3.5 flex flex-col justify-between gap-2 min-h-[164px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium truncate">{isUrdu ? 'صحت کے اہداف' : 'Progress'}</span>
                <Leaf className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" aria-hidden="true" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-metric text-3xl leading-none text-[var(--ink)]">{completedGoals}</span>
                  <span className="font-metric text-base text-[var(--muted)]">/{totalGoals}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${safePercent(completedGoals, totalGoals)}%`,
                      background: 'linear-gradient(90deg, #B8E0C2 0%, #6AA882 100%)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted)] truncate">
                  {isUrdu ? 'غذا، ورزش اور پانی' : 'Meals, workout & water'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('COACH')}
                className="w-full min-h-[36px] rounded-full azure-pill-active text-xs font-semibold tactile-press"
              >
                {isUrdu ? 'اہداف کھولیں' : 'Open Goals'}
              </button>
            </section>

            {/* Card 3: Your Check-In (Warm Sunlit Botanical Glow Card) */}
            <section className="thought-glow-card relative overflow-hidden rounded-[22px] p-3.5 flex flex-col justify-between gap-2 min-h-[164px]">
              <svg
                viewBox="0 0 120 120"
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-24 opacity-25"
              >
                <circle cx="60" cy="38" r="16" fill="currentColor" />
                <path d="M26 112 C28 78, 42 66, 60 66 C78 66, 92 78, 94 112 Z" fill="currentColor" />
              </svg>

              <div className="relative z-10 flex items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium truncate">
                  {isUrdu ? 'آج کا حال' : 'Your Check-In'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('CHECKUP')}
                  aria-label="Open AI Symptom and Camera Chat"
                  className="w-7 h-7 rounded-full border border-current/25 flex items-center justify-center opacity-85 hover:opacity-100 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              </div>

              <p
                className={`relative z-10 text-xs font-medium leading-snug line-clamp-2 ${
                  isUrdu ? 'font-urdu urdu-safe text-xs' : ''
                }`}
              >
                {checkInDoneToday
                  ? isUrdu
                    ? `${existingCheckIn.sleepHours} گھنٹے نیند · توانائی ${existingCheckIn.energyLevel ?? 'STEADY'}`
                    : `${existingCheckIn.sleepHours}h sleep · ${(existingCheckIn.energyLevel ?? 'STEADY').toLowerCase()} energy`
                  : isUrdu
                    ? 'وزن، نیند اور علامات درج کریں'
                    : 'Log weight, sleep & daily symptoms'}
              </p>

              <button
                id="daily-checkin-trigger"
                type="button"
                onClick={() => setCheckInModalOpen(true)}
                className="relative z-10 w-full min-h-[34px] rounded-full bg-[#F1EFE4]/92 text-[#112520] text-[11px] font-semibold inline-flex items-center justify-center gap-1 tactile-press"
              >
                {checkInDoneToday ? (isUrdu ? 'ترمیم کریں' : 'Update Check-In') : isUrdu ? 'روزانہ سوالنامہ' : 'Check In'}
              </button>
            </section>

            {/* Card 4: Daily Wellness (Heart · Blood Sugar · Sleep) */}
            <section className="glass-panel rounded-[22px] p-3.5 flex flex-col justify-between gap-2 min-h-[164px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs sm:text-sm font-medium truncate">
                  {isUrdu ? 'روزانہ صحت' : 'Daily Wellness'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSleepEditor((s) => !s)}
                  className="min-h-[26px] px-2 rounded-full border border-[var(--border)] text-[10px] font-medium text-[var(--muted)] inline-flex items-center gap-1 shrink-0"
                >
                  <Clock className="h-2.5 w-2.5 text-[var(--accent)]" />
                  {isUrdu ? 'نیند' : 'Sleep'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center my-auto">
                <button
                  type="button"
                  onClick={() => onNavigate('VITALS')}
                  className="flex flex-col items-center gap-1 py-1 rounded-xl hover:bg-[var(--surface-muted)]/55 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--surface-muted)]/85 border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Heart className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">{isUrdu ? 'دل' : 'Heart'}</span>
                  <span className="font-metric text-xs text-[var(--ink)]">{displayPulse}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('VITALS')}
                  className="flex flex-col items-center gap-1 py-1 rounded-xl hover:bg-[var(--surface-muted)]/55 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--surface-muted)]/85 border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Droplets className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">{isUrdu ? 'شوگر' : 'Sugar'}</span>
                  <span className="font-metric text-xs text-[var(--ink)]">{displaySugar}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSleepEditor((s) => !s)}
                  className="flex flex-col items-center gap-1 py-1 rounded-xl hover:bg-[var(--surface-muted)]/55 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-[var(--surface-muted)]/85 border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Moon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">{isUrdu ? 'نیند' : 'Sleep'}</span>
                  <span className="font-metric text-xs text-[var(--ink)] whitespace-nowrap">{sleepFormatted}</span>
                </button>
              </div>

              {showSleepEditor && (
                <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      aria-label="Decrease sleep 0.5h"
                      onClick={() => commitSleepHours(sanitizedWellnessSleep - 0.5)}
                      className="h-7 w-7 rounded-full border border-[var(--border)] flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Sleep hours"
                      value={sleepDraft}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (/^\d{0,2}(\.\d?)?$/.test(raw)) setSleepDraft(raw);
                      }}
                      onBlur={() => {
                        const val = Number(sleepDraft);
                        if (sleepDraft === '' || !Number.isFinite(val)) {
                          setSleepDraft(String(sanitizedWellnessSleep));
                        } else {
                          commitSleepHours(val);
                        }
                      }}
                      className="w-10 text-center bg-transparent border-b border-[var(--border)] font-mono-tabular text-xs"
                    />
                    <button
                      type="button"
                      aria-label="Increase sleep 0.5h"
                      onClick={() => commitSleepHours(sanitizedWellnessSleep + 0.5)}
                      className="h-7 w-7 rounded-full border border-[var(--border)] flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      aria-label="Bedtime"
                      value={bedTime24}
                      onChange={(e) => setBedTime24(e.target.value)}
                      className="flex-1 min-w-0 min-h-[30px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-1 font-mono-tabular text-[10px]"
                    />
                    <input
                      type="time"
                      aria-label="Wake time"
                      value={wakeTime24}
                      onChange={(e) => setWakeTime24(e.target.value)}
                      className="flex-1 min-w-0 min-h-[30px] rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-1 font-mono-tabular text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBedWakeTimes}
                      className="min-h-[30px] px-2 rounded-full azure-pill-active text-[10px] font-semibold shrink-0"
                    >
                      {computeSleepDurationHours(bedTime24, wakeTime24)}h
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN (Compact Hydration, Offline Nearest Hospitals & Family Pulse — Visible Beside Hub on Desktop!) */}
        <div className="lg:col-span-5 space-y-2.5 sm:space-y-3">
          {/* Hydration Tracker */}
          <section className="glass-panel rounded-[22px] p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                <Droplets className="h-4 w-4 text-[var(--accent)]" />
                <span>{isUrdu ? 'پانی کی مقدار' : 'Hydration'}</span>
              </div>
              <span className="font-mono-tabular text-xs text-[var(--muted)]">
                {wellness.waterMl} / {wellness.waterGoalMl} ml
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${safePercent(wellness.waterMl, wellness.waterGoalMl)}%`,
                  background: 'linear-gradient(90deg, #95CEA4 0%, #589772 100%)',
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addWater(250)}
                className="min-h-[38px] rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-1 tactile-press"
              >
                <Plus className="h-3.5 w-3.5" /> 250 ml
              </button>
              <button
                type="button"
                onClick={() => addWater(500)}
                className="min-h-[38px] rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/50 text-xs font-medium inline-flex items-center justify-center gap-1 tactile-press"
              >
                <Plus className="h-3.5 w-3.5" /> 500 ml
              </button>
            </div>
          </section>

          {/* Offline Emergency Hospitals */}
          <section className="espresso-card rounded-[22px] p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#95CEA4] flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {isUrdu ? 'آف لائن ایمرجنسی ہسپتال' : 'OFFLINE HOSPITALS'}
                </span>
                <h3 className="font-display text-sm font-medium text-[#F3F1E8] truncate">
                  {isUrdu ? 'محفوظ مقامات سے قریبی مرکز' : 'Nearest From Saved Places'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onEditActivePerson && (
                  <button
                    type="button"
                    onClick={onEditActivePerson}
                    className="text-[11px] font-medium text-[#95CEA4] hover:underline"
                  >
                    {places.length > 0 ? (isUrdu ? 'ترمیم' : 'Edit') : '+ Place'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onTriggerSos(selectedPlaceIdx)}
                  className="min-h-[32px] px-3 rounded-full bg-[#DC2626] hover:bg-red-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                >
                  <PhoneCall className="h-3 w-3" /> 1122
                </button>
              </div>
            </div>

            {places.length === 0 ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#B6C9BE]">
                  {isUrdu ? 'قریبی ہسپتالوں کے لیے مقام شامل کریں۔' : 'Pin Home or Work for zero-internet hospital routing.'}
                </p>
                {onEditActivePerson && (
                  <button
                    type="button"
                    onClick={onEditActivePerson}
                    className="min-h-[34px] px-3.5 rounded-full bg-[#F1EFE4] text-[#112520] text-xs font-semibold shrink-0"
                  >
                    {isUrdu ? 'مقام' : 'Pin'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {places.map((pl, idx) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => setSelectedPlaceIdx(idx)}
                      className={`min-h-[28px] px-2.5 rounded-full text-[11px] font-medium border transition-colors ${
                        idx === selectedPlaceIdx
                          ? 'bg-[#F1EFE4] text-[#112520] border-transparent font-semibold'
                          : 'border-[#E5EEE0]/20 text-[#B6C9BE]'
                      }`}
                    >
                      {pl.label} ({pl.district})
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {offlineFacilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="rounded-xl bg-[#102620]/80 border border-[#E5EEE0]/14 px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F3F1E8] truncate">
                          {isUrdu ? fac.name_ur : fac.name_en}
                        </div>
                        <div className="text-[10px] text-[#B6C9BE] font-mono-tabular truncate">
                          {fac.district}
                          {typeof fac.distanceKm === 'number' ? ` · ${fac.distanceKm} km` : ''}
                        </div>
                      </div>
                      <a
                        href={`tel:${fac.phone}`}
                        className="min-h-[30px] px-2.5 rounded-full bg-[#95CEA4] text-[#102620] text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <PhoneCall className="h-3 w-3" /> {isUrdu ? 'کال' : 'Call'}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Family Health Pulse + Quick Navigation */}
          <section className="glass-panel rounded-[22px] p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[var(--accent)]" />
                {isUrdu ? 'خاندان کی صحت' : 'Family Pulse'}
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('BHU')}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                {isUrdu ? 'دیہی ڈسپنسری' : 'Dispensary / BHU'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-1.5">
              {allPeople.map((person) => {
                const pEp = episodes.find((e) => e.patientId === person.id);
                const pDue = alarms.filter(
                  (a) => a.patientId === person.id && a.enabled && !a.adherenceDates.includes(todayKey)
                ).length;
                const selected = person.id === activePerson.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onSwitchPerson(person.id)}
                    className={`rounded-xl px-3 py-2 text-left border transition-colors ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-muted)]/40 hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold truncate">{person.name}</span>
                      <span className="text-[10px] text-[var(--muted)] shrink-0">{person.relationship}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--muted)] flex items-center gap-1.5">
                      <span>{pEp ? pEp.triageTier : 'Clear'}</span>
                      {pDue > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[var(--accent)] font-semibold">{pDue} due</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onNavigate('COACH')}
                className="min-h-[38px] px-3 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-1.5 tactile-press"
              >
                <Dumbbell className="h-3.5 w-3.5" />
                {isUrdu ? 'غذا و ورزش' : 'Diet & Workout'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('RECORDS')}
                className="min-h-[38px] px-3 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/45 text-xs font-medium inline-flex items-center justify-center gap-1.5 tactile-press"
              >
                <FileText className="h-3.5 w-3.5" />
                {isUrdu ? 'رپورٹس' : `Reports (${reports.filter((r) => r.personId === activePerson.id).length})`}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* FOCUSED DAILY DOCTOR CHECK-IN MODAL (Keeps Main Screen Clean per Hick's Law) */}
      {checkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            id="daily-checkin-form"
            onSubmit={handleSaveDoctorCheckIn}
            className="w-full sm:max-w-lg glass-panel rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                  {isUrdu ? 'روزانہ ڈاکٹر چیک اِن' : 'Daily Doctor Check-In'}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {isUrdu
                    ? 'وزن، نیند اور علامات درج کریں۔'
                    : 'Track weight delta, sleep quality & daily symptoms.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close check-in"
                onClick={() => setCheckInModalOpen(false)}
                className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Weight Row */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold">
                  {isUrdu ? 'وزن میں تبدیلی کیسا محسوس ہو رہی ہے؟' : 'Weight trend & today’s reading'}
                </label>
                <div className="inline-flex rounded-full p-0.5 bg-[var(--surface-muted)] text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setUnitSystem('METRIC')}
                    className={`px-2.5 py-0.5 rounded-full ${unitSystem === 'METRIC' ? 'azure-pill-active' : 'text-[var(--muted)]'}`}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSystem('IMPERIAL')}
                    className={`px-2.5 py-0.5 rounded-full ${unitSystem === 'IMPERIAL' ? 'azure-pill-active' : 'text-[var(--muted)]'}`}
                  >
                    lbs
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['LOSING', isUrdu ? 'کم ہو رہا' : 'Losing'],
                    ['SAME', isUrdu ? 'برابر' : 'Same'],
                    ['GAINING', isUrdu ? 'بڑھ رہا' : 'Gaining'],
                  ] as const
                ).map(([code, lbl]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setFeelingWeightChange(code)}
                    className={`min-h-[38px] rounded-xl border text-xs font-medium ${
                      feelingWeightChange === code
                        ? 'azure-pill-active border-transparent font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-muted)]/60'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <input
                  type="number"
                  min={unitSystem === 'IMPERIAL' ? 2 : 1}
                  max={unitSystem === 'IMPERIAL' ? 550 : 250}
                  step={0.1}
                  value={todayWeightInput}
                  onChange={(e) => setTodayWeightInput(e.target.value)}
                  placeholder={unitSystem === 'IMPERIAL' ? '150.0 lbs' : '68.0 kg'}
                  className="flex-1 min-h-[40px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3 font-mono-tabular text-sm"
                />
                {weightDeltaDisplay !== null && (
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)] shrink-0">
                    {weightDeltaDisplay}
                  </span>
                )}
              </div>
            </div>

            {/* Sleep Row */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold">
                {isUrdu ? 'گزشتہ رات نیند؟' : 'Last night’s sleep & quality'}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {SLEEP_PRESET_HOURS.map((hrs) => {
                  const active = Math.abs(checkInSleepHours - hrs) < 0.35;
                  return (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        setCheckInSleepHours(hrs);
                        setSleepQuality(sleepHoursToQuality(hrs));
                      }}
                      className={`min-h-[38px] rounded-xl border font-mono-tabular text-xs font-semibold ${
                        active ? 'azure-pill-active border-transparent' : 'border-[var(--border)] bg-[var(--surface-muted)]/60'
                      }`}
                    >
                      {hrs === 9 ? '9h+' : `${hrs}h`}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SLEEP_QUALITY_LABELS.map((q) => (
                  <button
                    key={q.score}
                    type="button"
                    onClick={() => setSleepQuality(q.score)}
                    className={`min-h-[28px] px-2.5 rounded-full border text-[11px] font-medium ${
                      sleepQuality === q.score
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--muted)]'
                    }`}
                  >
                    {isUrdu ? q.ur : q.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Row */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold">{isUrdu ? 'توانائی کی سطح' : 'Energy level today'}</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['LOW', isUrdu ? 'کم' : 'Low'],
                    ['STEADY', isUrdu ? 'متوازن' : 'Steady'],
                    ['STRONG', isUrdu ? 'بہترین' : 'Strong'],
                  ] as const
                ).map(([lvl, lbl]) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEnergyLevel(lvl)}
                    className={`min-h-[38px] rounded-xl border text-xs font-medium ${
                      energyLevel === lvl
                        ? 'azure-pill-active border-transparent font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-muted)]/60'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptom Note */}
            <div>
              <label className="block text-xs font-semibold mb-1">
                {isUrdu ? 'کوئی نئی علامت؟ (اختیاری)' : 'Any new discomfort? (Optional)'}
              </label>
              <input
                type="text"
                maxLength={140}
                value={newSymptomsNote}
                onChange={(e) => setNewSymptomsNote(e.target.value)}
                placeholder={isUrdu ? 'مثلاً ہلکا سر درد یا تھکاوٹ' : 'e.g. mild headache, fatigue'}
                className="w-full min-h-[40px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-3 text-xs"
              />
            </div>

            {checkInSaved && (
              <div className="rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/35 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-medium text-[var(--accent)]">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {isUrdu
                    ? 'چیک اِن محفوظ ہو گیا!'
                    : `Saved (${checkInSleepHours}h sleep · ${bmiAssessment.label_en}).`}
                </span>
                {newSymptomsNote.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setCheckInModalOpen(false);
                      onNavigate('CHECKUP');
                    }}
                    className="underline font-semibold"
                  >
                    {isUrdu ? 'معائنہ کھولیں' : 'AI Checkup'}
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-full azure-pill-active text-xs sm:text-sm font-semibold tactile-press"
              >
                {isUrdu ? 'محفوظ کریں' : 'Save Daily Check-In'}
              </button>
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium"
              >
                {isUrdu ? 'بند' : 'Done'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
