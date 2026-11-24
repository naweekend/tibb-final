import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  Clock,
  Droplets,
  Dumbbell,
  Footprints,
  Leaf,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  Shuffle,
  Utensils,
} from 'lucide-react';
import { AppLocale } from '../data/trilingual';
import {
  VERIFIED_HOME_REMEDIES,
  buildPersonalizedPlanOffline,
  computeBmiAssessment,
  generatePersonalizedPlan,
} from '../data/remediesAndPlans';
import type {
  DailyWellnessLog,
  DietMealSlot,
  ExtendedPatientProfile,
  HomeRemedyItem,
  WellnessGoal,
} from '../types/clinical';
import { UnitSystem, formatWeightDisplay, kgToLbs } from '../utils/healthMath';

interface WellnessCoachViewProps {
  locale: AppLocale;
  person: ExtendedPatientProfile;
  wellness: DailyWellnessLog;
  onUpdateWellness: (next: DailyWellnessLog) => Promise<void>;
  onUpdatePersonGoal?: (goal: WellnessGoal) => Promise<void>;
}

const GOALS: Array<{ id: WellnessGoal; en: string; ur: string }> = [
  { id: 'BALANCED', en: 'Balanced Family Health', ur: 'متوازن روزانہ صحت' },
  { id: 'WEIGHT_LOSS', en: 'Weight Loss & Fat Burn', ur: 'وزن میں کمی' },
  { id: 'MUSCLE_GAIN', en: 'Muscle & Healthy Gain', ur: 'پٹھوں اور وزن میں اضافہ' },
  { id: 'DIABETES_CONTROL', en: 'Sugar Control (Low GI)', ur: 'شوگر کنٹرول غذا' },
  { id: 'BP_FRIENDLY', en: 'BP Friendly (Low Salt)', ur: 'بلڈ پریشر کے مطابق' },
  { id: 'ENERGY_STRENGTH', en: 'Energy & Stamina', ur: 'توانائی اور فٹنس' },
  { id: 'SENIOR_MOBILITY', en: 'Gentle Senior Mobility', ur: 'بزرگوں کے لیے ہلکی ورزش' },
];

export const WellnessCoachView: React.FC<WellnessCoachViewProps> = ({
  locale,
  person,
  wellness,
  onUpdateWellness,
  onUpdatePersonGoal,
}) => {
  const isUrdu = locale === 'ur';

  const bmiAssessment = useMemo(
    () => computeBmiAssessment(person.weightKg, person.heightCm, person.ageMonths),
    [person.weightKg, person.heightCm, person.ageMonths]
  );

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(person.preferredUnitSystem ?? 'METRIC');
  const [subTab, setSubTab] = useState<'DIET' | 'WORKOUT' | 'REMEDIES'>('DIET');
  const [selectedGoal, setSelectedGoal] = useState<WellnessGoal>(
    wellness.plan?.goal ??
      person.preferredGoal ??
      (person.chronicConditions.some((c) => c.includes('DIABETES'))
        ? 'DIABETES_CONTROL'
        : person.chronicConditions.includes('HYPERTENSION')
          ? 'BP_FRIENDLY'
          : person.ageMonths >= 60 * 12
            ? 'SENIOR_MOBILITY'
            : bmiAssessment.recommendedGoal)
  );
  const [generating, setGenerating] = useState(false);
  const [menuVariationSeed, setMenuVariationSeed] = useState(0);

  // Workout Stopwatch
  const [timerSec, setTimerSec] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Home Remedies filter
  const [remedyCat, setRemedyCat] = useState<'ALL' | HomeRemedyItem['category']>('ALL');

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSec((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // Ensure older saved plans without alternatives seamlessly get rich offline swaps attached
  const fallbackWithAlts = useMemo(
    () => buildPersonalizedPlanOffline(person, selectedGoal, menuVariationSeed),
    [person, selectedGoal, menuVariationSeed]
  );

  const activePlan = useMemo(() => {
    if (!wellness.plan) return fallbackWithAlts;
    const enrichedMeals: DietMealSlot[] = wellness.plan.dietMeals.map((slot) => {
      if (slot.alternatives && slot.alternatives.length > 1) return slot;
      const match = fallbackWithAlts.dietMeals.find((m) => m.slot === slot.slot);
      const currentOpt = {
        title_en: slot.title_en,
        title_ur: slot.title_ur,
        portions_en: slot.portions_en,
        portions_ur: slot.portions_ur,
        caloriesApprox: slot.caloriesApprox,
      };
      const mergedAlts = [
        currentOpt,
        ...(match?.alternatives ?? []).filter((a) => a.title_en !== currentOpt.title_en),
      ];
      return {
        ...slot,
        selectedOptionIndex: slot.selectedOptionIndex ?? 0,
        alternatives: mergedAlts,
      };
    });
    return { ...wellness.plan, dietMeals: enrichedMeals };
  }, [wellness.plan, fallbackWithAlts]);

  const handleSelectGoal = async (goal: WellnessGoal) => {
    setSelectedGoal(goal);
    if (onUpdatePersonGoal) {
      await onUpdatePersonGoal(goal);
    }
  };

  const handleGeneratePlan = async (nextSeed = menuVariationSeed) => {
    setGenerating(true);
    try {
      const nextPlan = await generatePersonalizedPlan(person, selectedGoal, nextSeed);
      await onUpdateWellness({
        ...wellness,
        waterGoalMl: nextPlan.dailyWaterGoalMl,
        stepGoal: nextPlan.dailyStepsGoal,
        plan: nextPlan,
        updatedAtIso: new Date().toISOString(),
      });
      if (onUpdatePersonGoal) {
        await onUpdatePersonGoal(selectedGoal);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapMealOption = async (slotName: DietMealSlot['slot']) => {
    const updatedMeals = activePlan.dietMeals.map((meal) => {
      if (meal.slot !== slotName || !meal.alternatives || meal.alternatives.length < 2) return meal;
      const nextIdx = ((meal.selectedOptionIndex ?? 0) + 1) % meal.alternatives.length;
      const nextOpt = meal.alternatives[nextIdx];
      return {
        ...meal,
        ...nextOpt,
        selectedOptionIndex: nextIdx,
      };
    });
    await onUpdateWellness({
      ...wellness,
      plan: {
        ...activePlan,
        dietMeals: updatedMeals,
      },
      updatedAtIso: new Date().toISOString(),
    });
  };

  const handleShuffleAllMeals = async () => {
    const nextSeed = menuVariationSeed + 1;
    setMenuVariationSeed(nextSeed);
    const rotated = buildPersonalizedPlanOffline(person, selectedGoal, nextSeed);
    await onUpdateWellness({
      ...wellness,
      waterGoalMl: rotated.dailyWaterGoalMl,
      stepGoal: rotated.dailyStepsGoal,
      plan: rotated,
      updatedAtIso: new Date().toISOString(),
    });
  };

  const toggleMealDone = async (slot: string) => {
    const exists = wellness.mealsChecked.includes(slot);
    const nextMeals = exists
      ? wellness.mealsChecked.filter((s) => s !== slot)
      : [...wellness.mealsChecked, slot];
    await onUpdateWellness({
      ...wellness,
      mealsChecked: nextMeals,
      updatedAtIso: new Date().toISOString(),
    });
  };

  const toggleWorkoutDone = async () => {
    await onUpdateWellness({
      ...wellness,
      workoutDone: !wellness.workoutDone,
      updatedAtIso: new Date().toISOString(),
    });
  };

  const filteredRemedies = VERIFIED_HOME_REMEDIES.filter((r) =>
    remedyCat === 'ALL' ? true : r.category === remedyCat
  );

  const fmtTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const deltaFromStartKg =
    person.baselineWeightKg && person.weightKg
      ? Math.round((person.weightKg - person.baselineWeightKg) * 10) / 10
      : null;
  const deltaDisplay =
    deltaFromStartKg === null
      ? null
      : unitSystem === 'IMPERIAL'
        ? `${deltaFromStartKg > 0 ? `+${kgToLbs(deltaFromStartKg)}` : `-${kgToLbs(Math.abs(deltaFromStartKg))}`} lbs`
        : `${deltaFromStartKg > 0 ? `+${deltaFromStartKg}` : deltaFromStartKg} kg`;

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-8 relative z-10">
      {/* Header + Body-Mass Ratio Guidance + Editable Goal Selector */}
      <section className="glass-panel rounded-[32px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <h1 className={`font-display text-2xl sm:text-3xl font-medium ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
              {isUrdu
                ? `${person.name} — ذاتی غذا، ورزش اور گھریلو علاج`
                : `Personal Diet, Workout & Remedies — ${person.name}`}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1">
              {isUrdu
                ? 'قد، وزن، دائمی بیماریوں اور آپ کی مرضی کے ہدف کے مطابق تیار کردہ پلان (متبادل کھانوں کے ساتھ)۔'
                : 'South Asian BMI & diet/workout plan with rotating Desi meal swaps tailored to conditions & allergies.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-[var(--surface-muted)]">
            {(
              [
                ['DIET', isUrdu ? 'غذا پلان' : 'Diet Plan', Utensils],
                ['WORKOUT', isUrdu ? 'ورزش و قدم' : 'Workout & Steps', Dumbbell],
                ['REMEDIES', isUrdu ? 'گھریلو ٹوٹکے' : 'Home Remedies', Leaf],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                className={`min-h-[40px] px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  subTab === id
                    ? 'azure-pill-active'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live South Asian Body-Mass Ratio Summary + Unit Switch */}
        <div className="espresso-card rounded-2xl p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#7BB88D] inline-flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                {isUrdu ? 'جسمانی وزن کا تناسب (BMI)' : 'BODY-MASS RATIO & GOAL ADVICE'}
              </span>
              {bmiAssessment.bmi !== null && (
                <span className="font-mono-tabular font-semibold text-[#F2EFE4]">
                  BMI {bmiAssessment.bmi} · {isUrdu ? bmiAssessment.label_ur : bmiAssessment.label_en}
                </span>
              )}
              {bmiAssessment.idealMinKg !== null && bmiAssessment.idealMaxKg !== null && (
                <span className="font-mono-tabular text-[#A6BAB2]/80">
                  Ideal: {formatWeightDisplay(bmiAssessment.idealMinKg, unitSystem)}–
                  {formatWeightDisplay(bmiAssessment.idealMaxKg, unitSystem)}
                </span>
              )}
              {deltaDisplay && deltaFromStartKg !== 0 && (
                <span className="font-mono-tabular text-[#7BB88D]">({deltaDisplay} since start)</span>
              )}
            </div>
            <p className={`text-xs text-[#A6BAB2]/90 leading-relaxed ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
              {isUrdu ? bmiAssessment.advice_ur : bmiAssessment.advice_en}
            </p>
          </div>
          <div className="md:col-span-4 flex flex-wrap md:flex-col items-start md:items-end justify-between gap-2 text-xs font-mono-tabular text-[#7BB88D]">
            <div className="inline-flex rounded-full p-0.5 bg-white/10 text-[10px]">
              <button
                type="button"
                onClick={() => setUnitSystem('METRIC')}
                className={`px-2.5 py-0.5 rounded-full ${unitSystem === 'METRIC' ? 'bg-[#F2EFE4] text-[#0F1F1C] font-semibold' : 'text-[#A6BAB2]'}`}
              >
                kg/cm
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('IMPERIAL')}
                className={`px-2.5 py-0.5 rounded-full ${unitSystem === 'IMPERIAL' ? 'bg-[#F2EFE4] text-[#0F1F1C] font-semibold' : 'text-[#A6BAB2]'}`}
              >
                lbs/ft
              </button>
            </div>
            <span>Water: {activePlan.dailyWaterGoalMl} ml/day</span>
            <span>Steps: {activePlan.dailyStepsGoal.toLocaleString()}/day</span>
          </div>
        </div>

        {/* Goal Strip & Generate / Shuffle Triggers */}
        {subTab !== 'REMEDIES' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGoal(g.id)}
                  className={`min-h-[38px] px-4 rounded-full text-xs font-medium border transition-colors ${
                    selectedGoal === g.id
                      ? 'azure-pill-active border-transparent'
                      : 'border-[var(--border)] text-[var(--muted)]'
                  }`}
                >
                  {isUrdu ? g.ur : g.en}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {subTab === 'DIET' && (
                <button
                  type="button"
                  onClick={handleShuffleAllMeals}
                  className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5 hover:border-[var(--accent)]"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {isUrdu ? 'نیا مینو چنیں' : 'Rotate Full Menu'}
                </button>
              )}
              <button
                type="button"
                disabled={generating}
                onClick={() => handleGeneratePlan(menuVariationSeed)}
                className="min-h-[44px] px-6 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating
                  ? isUrdu
                    ? 'پلان تیار ہو رہا ہے...'
                    : 'Tailoring Plan...'
                  : isUrdu
                    ? 'نیا پلان اپڈیٹ کریں'
                    : 'Update Diet & Workout Plan'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* DIET TAB */}
      {subTab === 'DIET' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {activePlan.dietMeals.map((meal) => {
              const checked = wellness.mealsChecked.includes(meal.slot);
              const totalOpts = meal.alternatives?.length ?? 1;
              const currentIdx = (meal.selectedOptionIndex ?? 0) + 1;
              return (
                <div
                  key={meal.slot}
                  className={`glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4 transition-all ${
                    checked ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span className="font-semibold uppercase tracking-wider text-[var(--accent)]">
                        {meal.slot}
                      </span>
                      <span className="font-mono-tabular">~{meal.caloriesApprox} kcal</span>
                    </div>
                    <h3 className={`font-display text-lg font-medium ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                      {isUrdu ? meal.title_ur : meal.title_en}
                    </h3>
                    <p className={`text-xs text-[var(--muted)] ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                      {isUrdu ? meal.portions_ur : meal.portions_en}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {totalOpts > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSwapMealOption(meal.slot)}
                        className="min-h-[40px] px-3.5 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5 hover:border-[var(--accent)]"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {isUrdu ? `تبدیل (${currentIdx}/${totalOpts})` : `Swap (${currentIdx}/${totalOpts})`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleMealDone(meal.slot)}
                      className={`flex-1 min-h-[40px] px-4 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 border ${
                        checked
                          ? 'azure-pill-active border-transparent'
                          : 'border-[var(--border)] hover:border-[var(--accent)]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {checked ? (isUrdu ? 'کھا لیا گیا' : 'Completed') : isUrdu ? 'مکمل نشان لگائیں' : 'Mark Eaten'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4 space-y-5">
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-[var(--accent)]" />
                  {isUrdu ? 'روزانہ پانی کا ہدف' : 'Daily Water Goal'}
                </span>
                <span className="font-mono-tabular text-xs font-semibold">
                  {wellness.waterMl} / {activePlan.dailyWaterGoalMl} ml
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateWellness({
                      ...wellness,
                      waterMl: wellness.waterMl + 250,
                      updatedAtIso: new Date().toISOString(),
                    })
                  }
                  className="flex-1 min-h-[42px] rounded-full azure-pill-active text-xs font-semibold"
                >
                  +250 ml
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateWellness({
                      ...wellness,
                      waterMl: Math.max(0, wellness.waterMl - 250),
                      updatedAtIso: new Date().toISOString(),
                    })
                  }
                  className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs"
                >
                  -250
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                {isUrdu ? 'احتیاطی غذائی ہدایات' : 'Condition & Allergy Safeguards'}
              </h3>
              <ul className="space-y-2 text-xs text-[var(--muted)]">
                {(isUrdu ? activePlan.avoidNotes_ur : activePlan.avoidNotes_en).map((n) => (
                  <li key={n} className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                    • {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT & STEPS TAB */}
      {subTab === 'WORKOUT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            {activePlan.workoutRoutine.map((ex, i) => (
              <div key={ex.name_en} className="glass-panel rounded-3xl p-6 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-[var(--accent)] font-semibold">
                    0{i + 1} · {ex.intensity} · {ex.durationOrReps}
                  </div>
                  <h3 className={`font-display text-lg font-medium ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                    {isUrdu ? ex.name_ur : ex.name_en}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">{ex.tip_en}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel rounded-3xl p-6 space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                <Clock className="h-4 w-4" />
                <span>{isUrdu ? 'ورزش اسٹاپ واچ' : 'Guided Session Timer'}</span>
              </div>
              <div className="font-metric text-6xl text-[var(--ink)]">{fmtTimer(timerSec)}</div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setTimerRunning((r) => !r)}
                  className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {timerRunning ? (isUrdu ? 'روکیں' : 'Pause') : isUrdu ? 'ورزش شروع' : 'Start Workout'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSec(0);
                  }}
                  className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>

              <button
                type="button"
                onClick={toggleWorkoutDone}
                className={`w-full min-h-[44px] rounded-full text-xs font-semibold border inline-flex items-center justify-center gap-2 ${
                  wellness.workoutDone
                    ? 'bg-emerald-700 text-white border-transparent'
                    : 'border-[var(--border)]'
                }`}
              >
                <Check className="h-4 w-4" />
                {wellness.workoutDone
                  ? isUrdu
                    ? 'آج کی ورزش مکمل ہو گئی!'
                    : 'Today’s Workout Marked Complete'
                  : isUrdu
                    ? 'آج کی ورزش مکمل کریں'
                    : 'Complete Today’s Workout'}
              </button>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-[var(--accent)]" />
                  {isUrdu ? 'آج کے قدم' : 'Steps Logged Today'}
                </span>
                <span className="font-mono-tabular">
                  {wellness.steps.toLocaleString()} / {activePlan.dailyStepsGoal.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() =>
                      onUpdateWellness({
                        ...wellness,
                        steps: wellness.steps + inc,
                        updatedAtIso: new Date().toISOString(),
                      })
                    }
                    className="min-h-[40px] rounded-full border border-[var(--border)] text-xs font-medium hover:border-[var(--accent)]"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFIED HOME REMEDIES TAB (12 Comprehensive Protocols) */}
      {subTab === 'REMEDIES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['ALL', isUrdu ? `تمام گھریلو علاج (${VERIFIED_HOME_REMEDIES.length})` : `All Remedies (${VERIFIED_HOME_REMEDIES.length})`],
                ['FEVER_THROAT', isUrdu ? 'بخار، کھانسی اور گلا' : 'Fever, Cough & Sinus'],
                ['STOMACH_HYDRATION', isUrdu ? 'معدہ، قبض اور او آر ایس' : 'Stomach, Gut & ORS'],
                ['HEAT_SKIN', isUrdu ? 'گرمی، جلنا اور زخم' : 'Heat, Burns & Cuts'],
                ['PAIN_RECOVERY', isUrdu ? 'موچ اور سر درد' : 'Sprains & Headache'],
                ['STRESS_SLEEP', isUrdu ? 'نیند اور سکون' : 'Sleep & Calm'],
              ] as const
            ).map(([cat, lbl]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setRemedyCat(cat)}
                className={`min-h-[38px] px-4 rounded-full text-xs font-medium border ${
                  remedyCat === cat
                    ? 'azure-pill-active border-transparent'
                    : 'border-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRemedies.map((rem) => (
              <article key={rem.id} className="glass-panel rounded-3xl p-6 space-y-3">
                <h3 className={`font-display text-xl font-medium ${isUrdu ? 'font-urdu urdu-safe text-2xl' : ''}`}>
                  {isUrdu ? rem.title_ur : rem.title_en}
                </h3>
                <p className={`text-xs font-medium text-[var(--accent)] ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                  {isUrdu ? rem.ingredients_ur : rem.ingredients_en}
                </p>
                <ol className="space-y-1.5 text-xs list-decimal list-inside text-[var(--ink)]">
                  {(isUrdu ? rem.steps_ur : rem.steps_en).map((step) => (
                    <li key={step} className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <span className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                    {isUrdu ? rem.caution_ur : rem.caution_en}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
