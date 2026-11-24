import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  MapPin,
  Navigation,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { computeBmiAssessment } from '../data/remediesAndPlans';
import { AppLocale, I18N } from '../data/trilingual';
import { getAvailableDistricts, getFacilityAreaAnchors, sanitizePlainText } from '../engine/triageEngine';
import {
  UnitSystem,
  cmToFtIn,
  ftInToCm,
  kgToLbs,
  lbsToKg,
} from '../utils/healthMath';
import type {
  BloodGroup,
  ExtendedPatientProfile,
  FrequentPlace,
  RelationshipType,
  WellnessGoal,
} from '../types/clinical';

interface PersonOnboardingModalProps {
  isOpen: boolean;
  canClose: boolean;
  fullPage?: boolean;
  accountId: string;
  workspace: 'GHARANA' | 'BHU';
  locale: AppLocale;
  initialProfile?: ExtendedPatientProfile | null;
  onSave: (profile: ExtendedPatientProfile) => Promise<void>;
  onClose: () => void;
}

const RELATIONSHIPS: Array<{ id: RelationshipType; en: string; ur: string }> = [
  { id: 'Self', en: 'Self', ur: 'خود' },
  { id: 'Mother', en: 'Mother', ur: 'والدہ' },
  { id: 'Father', en: 'Father', ur: 'والد' },
  { id: 'Child', en: 'Child', ur: 'بچہ' },
  { id: 'Spouse', en: 'Spouse', ur: 'شریکِ حیات' },
  { id: 'Other', en: 'Patient', ur: 'مریض' },
];

const BLOOD_GROUPS: BloodGroup[] = ['Unknown', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const CHRONIC_OPTIONS: Array<{ id: string; en: string; ur: string }> = [
  { id: 'DIABETES_T2', en: 'Diabetes (Type 2)', ur: 'ذیابیطس (ٹائپ 2)' },
  { id: 'DIABETES_T1', en: 'Diabetes (Type 1)', ur: 'ذیابیطس (ٹائپ 1)' },
  { id: 'HYPERTENSION', en: 'High Blood Pressure', ur: 'بلند فشارِ خون' },
  { id: 'ASTHMA', en: 'Asthma / Breathing', ur: 'دمہ / سانس' },
  { id: 'HEART_DISEASE', en: 'Heart Condition', ur: 'دل کا مرض' },
  { id: 'KIDNEY_DISEASE', en: 'Kidney Condition', ur: 'گردوں کا مرض' },
  { id: 'THYROID_PCOS', en: 'Thyroid / Hormonal', ur: 'تھائیرائیڈ / ہارمونز' },
  { id: 'JOINT_PAIN', en: 'Joint / Back Pain', ur: 'جوڑوں یا کمر کا درد' },
];

const GOAL_OPTIONS: Array<{ id: WellnessGoal; en: string; ur: string; desc_en: string }> = [
  { id: 'BALANCED', en: 'Balanced Health', ur: 'متوازن صحت', desc_en: 'Steady nutrition & daily walk' },
  { id: 'WEIGHT_LOSS', en: 'Weight Loss', ur: 'وزن میں کمی', desc_en: 'Calorie deficit & fat-burn walk' },
  { id: 'MUSCLE_GAIN', en: 'Muscle & Weight Gain', ur: 'پٹھوں اور وزن میں اضافہ', desc_en: 'High protein & strength work' },
  { id: 'DIABETES_CONTROL', en: 'Sugar Control', ur: 'شوگر کنٹرول', desc_en: 'Low-GI Desi meals & post-meal walk' },
  { id: 'BP_FRIENDLY', en: 'BP Friendly', ur: 'بلڈ پریشر کنٹرول', desc_en: 'Low sodium & calm stamina' },
  { id: 'SENIOR_MOBILITY', en: 'Senior Mobility', ur: 'بزرگوں کی نقل و حرکت', desc_en: 'Gentle joint & balance exercises' },
];

const DIETARY_PREFS = [
  'Low Sugar',
  'Low Salt',
  'High Protein',
  'Vegetarian',
  'Light Home Desi Meals',
];

export const PersonOnboardingModal: React.FC<PersonOnboardingModalProps> = ({
  isOpen,
  canClose,
  fullPage = false,
  accountId,
  workspace,
  locale,
  initialProfile,
  onSave,
  onClose,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';
  const anchors = useMemo(() => getFacilityAreaAnchors(), []);
  const districts = useMemo(() => getAvailableDistricts(), []);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState(initialProfile?.name ?? '');
  const [relationship, setRelationship] = useState<RelationshipType>(
    initialProfile?.relationship ?? (workspace === 'BHU' ? 'Other' : 'Self')
  );
  const [ageUnit, setAgeUnit] = useState<'YEARS' | 'MONTHS'>(
    initialProfile && initialProfile.ageMonths < 24 ? 'MONTHS' : 'YEARS'
  );
  const [ageValue, setAgeValue] = useState<string>(
    initialProfile
      ? String(initialProfile.ageMonths < 24 ? initialProfile.ageMonths : Math.round(initialProfile.ageMonths / 12))
      : '28'
  );
  const [sex, setSex] = useState<'M' | 'F' | 'O'>(initialProfile?.sex ?? 'F');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(initialProfile?.bloodGroup ?? 'Unknown');

  const initialHeightCm = initialProfile?.heightCm ?? 168;
  const initialWeightKg = initialProfile?.weightKg ?? 68;
  const initialImperialH = cmToFtIn(initialHeightCm);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile?.preferredUnitSystem ?? 'METRIC');
  const [canonicalHeightCm, setCanonicalHeightCm] = useState<number | undefined>(
    initialProfile?.heightCm ?? 168
  );
  const [canonicalWeightKg, setCanonicalWeightKg] = useState<number | undefined>(
    initialProfile?.weightKg ?? 68
  );

  // Separate UI draft fields so switching units never compounds rounding errors
  const [heightCmStr, setHeightCmStr] = useState<string>(String(initialHeightCm));
  const [heightFtStr, setHeightFtStr] = useState<string>(String(initialImperialH.feet));
  const [heightInStr, setHeightInStr] = useState<string>(String(initialImperialH.inches));
  const [weightKgStr, setWeightKgStr] = useState<string>(String(initialWeightKg));
  const [weightLbsStr, setWeightLbsStr] = useState<string>(String(kgToLbs(initialWeightKg)));

  const [preferredGoal, setPreferredGoal] = useState<WellnessGoal>(initialProfile?.preferredGoal ?? 'BALANCED');
  const [goalManuallyChosen, setGoalManuallyChosen] = useState<boolean>(Boolean(initialProfile?.preferredGoal));
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(initialProfile?.dietaryPreferences ?? []);

  const [chronicConditions, setChronicConditions] = useState<string[]>(initialProfile?.chronicConditions ?? []);
  const [allergiesText, setAllergiesText] = useState<string>(initialProfile?.allergies.join(', ') ?? '');
  const [isPregnantOrLactating, setIsPregnantOrLactating] = useState<boolean>(
    initialProfile?.isPregnantOrLactating ?? false
  );
  const [dailyMedicinesNote, setDailyMedicinesNote] = useState<string>(initialProfile?.dailyMedicinesNote ?? '');
  const [priorLabNotes, setPriorLabNotes] = useState<string>(initialProfile?.priorLabNotes ?? '');
  const [emergencyContact, setEmergencyContact] = useState<string>(initialProfile?.emergencyContact ?? '');

  // Step 4: Frequent Places for zero-internet nearest-hospital rescue routing (all Pakistan + custom city)
  const [frequentPlaces, setFrequentPlaces] = useState<FrequentPlace[]>(
    initialProfile?.frequentPlaces?.length ? initialProfile.frequentPlaces : []
  );
  const [placeLabel, setPlaceLabel] = useState('Home');
  const [locationQuery, setLocationQuery] = useState('');
  const [placeAnchorId, setPlaceAnchorId] = useState(anchors[0]?.id ?? '');
  const [customCityMode, setCustomCityMode] = useState(false);
  const [customDistrict, setCustomDistrict] = useState('');
  const [placeLandmark, setPlaceLandmark] = useState('');
  const [placeCoords, setPlaceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);

  const [guardianConsent, setGuardianConsent] = useState<boolean>(Boolean(initialProfile?.onboardingCompleted));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredAnchors = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return anchors;
    return anchors.filter(
      (a) => a.label.toLowerCase().includes(q) || a.district.toLowerCase().includes(q) || a.tehsil.toLowerCase().includes(q)
    );
  }, [anchors, locationQuery]);

  const parsedAgeNum = Math.max(0, Number(ageValue) || 0);
  const ageMonths =
    ageUnit === 'MONTHS' ? Math.min(24, Math.round(parsedAgeNum)) : Math.min(1440, Math.round(parsedAgeNum * 12));
  const bmiInfo = computeBmiAssessment(canonicalWeightKg, canonicalHeightCm, ageMonths);

  if (!isOpen) return null;

  const handleSwitchUnitSystem = (nextUnit: UnitSystem) => {
    if (nextUnit === unitSystem) return;
    setUnitSystem(nextUnit);
    if (nextUnit === 'IMPERIAL') {
      if (canonicalHeightCm && canonicalHeightCm > 0) {
        const { feet, inches } = cmToFtIn(canonicalHeightCm);
        setHeightFtStr(String(feet));
        setHeightInStr(String(inches));
      }
      if (canonicalWeightKg && canonicalWeightKg > 0) {
        setWeightLbsStr(String(kgToLbs(canonicalWeightKg)));
      }
    } else {
      if (canonicalHeightCm && canonicalHeightCm > 0) {
        setHeightCmStr(String(Math.round(canonicalHeightCm * 10) / 10));
      }
      if (canonicalWeightKg && canonicalWeightKg > 0) {
        setWeightKgStr(String(Math.round(canonicalWeightKg * 10) / 10));
      }
    }
  };

  const handleHeightCmInput = (val: string) => {
    setHeightCmStr(val);
    const n = Number(val);
    if (val === '' || !Number.isFinite(n) || n <= 0) {
      setCanonicalHeightCm(undefined);
    } else {
      setCanonicalHeightCm(n);
      const { feet, inches } = cmToFtIn(n);
      setHeightFtStr(String(feet));
      setHeightInStr(String(inches));
    }
  };

  const handleHeightFtInInput = (ftVal: string, inVal: string) => {
    setHeightFtStr(ftVal);
    setHeightInStr(inVal);
    const ft = Number(ftVal) || 0;
    const inch = Number(inVal) || 0;
    const cm = ftInToCm(ft, inch);
    if (cm > 0) {
      setCanonicalHeightCm(cm);
      setHeightCmStr(String(cm));
    } else {
      setCanonicalHeightCm(undefined);
    }
  };

  const handleWeightKgInput = (val: string) => {
    setWeightKgStr(val);
    const n = Number(val);
    if (val === '' || !Number.isFinite(n) || n <= 0) {
      setCanonicalWeightKg(undefined);
    } else {
      setCanonicalWeightKg(n);
      setWeightLbsStr(String(kgToLbs(n)));
    }
  };

  const handleWeightLbsInput = (val: string) => {
    setWeightLbsStr(val);
    const n = Number(val);
    if (val === '' || !Number.isFinite(n) || n <= 0) {
      setCanonicalWeightKg(undefined);
    } else {
      const kg = lbsToKg(n);
      setCanonicalWeightKg(kg);
      setWeightKgStr(String(Math.round(kg * 10) / 10));
    }
  };

  const toggleCondition = (id: string) => {
    setChronicConditions((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleDietPref = (pref: string) => {
    setDietaryPreferences((prev) => (prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]));
  };

  const handleCaptureGpsForPlace = () => {
    if (!navigator.geolocation) return;
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlaceCoords({
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
        });
        setCapturingGps(false);
      },
      () => {
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAddPlace = () => {
    const anchor = anchors.find((a) => a.id === placeAnchorId) ?? filteredAnchors[0] ?? anchors[0];
    const cleanCustomDistrict = sanitizePlainText(customDistrict);
    const cleanLandmark = sanitizePlainText(placeLandmark);
    const chosenDistrict = customCityMode && cleanCustomDistrict ? cleanCustomDistrict : anchor?.district ?? 'Islamabad';
    const chosenArea = cleanLandmark || (customCityMode ? cleanCustomDistrict : anchor?.tehsil) || 'Local Area';
    if (!chosenDistrict && !placeCoords) return;

    const cleanLabel = sanitizePlainText(placeLabel) || 'Home';
    const nextPlace: FrequentPlace = {
      id: `plc_${crypto.randomUUID().slice(0, 8)}`,
      label: cleanLabel.slice(0, 28),
      district: chosenDistrict.slice(0, 48),
      areaOrLandmark: chosenArea.slice(0, 80),
      lat: placeCoords?.lat ?? (!customCityMode ? anchor?.lat : undefined),
      lng: placeCoords?.lng ?? (!customCityMode ? anchor?.lng : undefined),
    };
    setFrequentPlaces((prev) => [...prev.slice(0, 4), nextPlace]);
    setPlaceLabel((prevLabel) => (prevLabel === 'Home' ? 'Work / University' : 'Frequent Place'));
    setPlaceLandmark('');
    setPlaceCoords(null);
  };

  const handleSave = async () => {
    const cleanName = sanitizePlainText(name);
    if (!cleanName) {
      setError(isUrdu ? 'براہِ کرم نام درج کریں۔' : 'Please enter your name or nickname.');
      setStep(1);
      return;
    }

    if (ageMonths < 216 && !guardianConsent) {
      setError(
        isUrdu
          ? '18 سال سے کم عمر فرد کا ریکارڈ محفوظ کرنے کے لیے والدین یا سرپرست کی اجازت درکار ہے۔'
          : 'Parent or guardian consent is required before saving a profile for someone under 18.'
      );
      setStep(1);
      return;
    }

    // Auto-append unsaved place draft if user hasn't explicitly clicked Add Place yet
    let finalPlaces = [...frequentPlaces];
    if (finalPlaces.length === 0) {
      const cleanCustomDistrict = sanitizePlainText(customDistrict);
      const anchor = anchors.find((a) => a.id === placeAnchorId) ?? filteredAnchors[0];
      if (customCityMode && cleanCustomDistrict) {
        finalPlaces.push({
          id: `plc_${crypto.randomUUID().slice(0, 8)}`,
          label: sanitizePlainText(placeLabel) || 'Home',
          district: cleanCustomDistrict.slice(0, 48),
          areaOrLandmark: sanitizePlainText(placeLandmark) || cleanCustomDistrict,
          lat: placeCoords?.lat,
          lng: placeCoords?.lng,
        });
      } else if (anchor) {
        finalPlaces.push({
          id: `plc_${crypto.randomUUID().slice(0, 8)}`,
          label: sanitizePlainText(placeLabel) || 'Home',
          district: anchor.district,
          areaOrLandmark: sanitizePlainText(placeLandmark) || anchor.tehsil,
          lat: placeCoords?.lat ?? anchor.lat,
          lng: placeCoords?.lng ?? anchor.lng,
        });
      }
    }

    const finalGoal = goalManuallyChosen ? preferredGoal : bmiInfo.recommendedGoal;

    setSaving(true);
    setError('');
    try {
      const safeH = canonicalHeightCm ? Math.max(30, Math.min(240, Math.round(canonicalHeightCm * 10) / 10)) : undefined;
      const safeW = canonicalWeightKg ? Math.max(1, Math.min(250, Math.round(canonicalWeightKg * 100) / 100)) : undefined;
      const profile: ExtendedPatientProfile = {
        id: initialProfile?.id ?? `person_${crypto.randomUUID().slice(0, 10)}`,
        accountId,
        name: cleanName.slice(0, 60),
        relationship,
        ageMonths,
        sex,
        bloodGroup,
        heightCm: safeH,
        weightKg: safeW,
        baselineWeightKg: initialProfile?.baselineWeightKg ?? safeW,
        preferredUnitSystem: unitSystem,
        preferredGoal: finalGoal,
        dietaryPreferences,
        priorLabNotes: sanitizePlainText(priorLabNotes).slice(0, 300),
        frequentPlaces: finalPlaces,
        onboardingCompleted: true,
        isPregnantOrLactating: sex === 'F' ? isPregnantOrLactating : false,
        chronicConditions,
        allergies: allergiesText
          .split(',')
          .map((x) => sanitizePlainText(x))
          .filter(Boolean)
          .slice(0, 8),
        dailyMedicinesNote: sanitizePlainText(dailyMedicinesNote).slice(0, 240),
        emergencyContact: sanitizePlainText(emergencyContact).slice(0, 60),
        workspace,
        createdAtIso: initialProfile?.createdAtIso ?? new Date().toISOString(),
      };
      await onSave(profile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const containerClasses = fullPage
    ? 'min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-4 sm:p-8'
    : 'fixed inset-0 z-50 bg-[#0F1F1C]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';

  const completionPct = step * 25;

  return (
    <div role="dialog" aria-modal="true" aria-label={s.onboardingTitle} className={containerClasses}>
      <div
        dir={isUrdu ? 'rtl' : 'ltr'}
        className="w-full max-w-3xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] p-6 sm:p-10 shadow-2xl space-y-6 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className={`font-display text-2xl sm:text-3xl font-semibold ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                {initialProfile
                  ? isUrdu
                    ? 'پروفائل میں ترمیم'
                    : 'Update Health Profile'
                  : isUrdu
                    ? 'ڈاکٹر کی طرز پر مکمل طبی تعارف'
                    : 'Doctor-Style Clinical Intake'}
              </h2>
              <p className={`text-xs sm:text-sm text-[var(--muted)] ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                {s.onboardingSubtitle}
              </p>
            </div>
          </div>

          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border)] flex items-center justify-center tactile-press"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Zeigarnik Completion Bar & 4-Step Nav */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)]">
              {isUrdu ? `تعارف ${completionPct}% مکمل` : `Profile ${completionPct}% complete`}
            </span>
            <span className="font-mono-tabular text-[var(--accent)]">{step} / 4</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { n: 1, label: isUrdu ? '1. شناخت و عمر' : '1. Identity' },
              { n: 2, label: isUrdu ? '2. قد، وزن و ہدف' : '2. BMI & Plan Goal' },
              { n: 3, label: isUrdu ? '3. بیماریاں و رپورٹس' : '3. History & Labs' },
              { n: 4, label: isUrdu ? '4. روزمرہ مقامات' : '4. Saved Places' },
            ].map((item) => (
              <button
                key={item.n}
                type="button"
                onClick={() => setStep(item.n as 1 | 2 | 3 | 4)}
                className={`min-h-[42px] rounded-xl px-3 text-center font-medium transition-colors border ${
                  step === item.n
                    ? 'azure-pill-active border-transparent font-semibold'
                    : 'bg-[var(--surface-muted)]/60 text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* STEP 1: Identity & Age */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold mb-2">
                {isUrdu ? 'پورا نام یا گھر کا نام *' : 'Full Name or Nickname *'}
              </label>
              <input
                type="text"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isUrdu ? 'مثلاً حمزہ، عائشہ، امی جان' : 'e.g. Ayesha, Hamza, Ammi'}
                className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">
                {isUrdu ? 'رشتہ / حیثیت' : 'Relationship'}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {RELATIONSHIPS.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => setRelationship(rel.id)}
                    className={`min-h-[44px] rounded-xl px-2 text-xs font-medium border transition-colors ${
                      relationship === rel.id
                        ? 'azure-pill-active border-transparent'
                        : 'border-[var(--border)] bg-[var(--surface-muted)]'
                    }`}
                  >
                    {isUrdu ? rel.ur : rel.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isUrdu ? 'عمر' : 'Age'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={ageValue}
                    onChange={(e) => setAgeValue(e.target.value)}
                    className="w-20 min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 font-mono-tabular text-sm"
                  />
                  <div className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-muted)]">
                    <button
                      type="button"
                      onClick={() => setAgeUnit('YEARS')}
                      className={`rounded-lg text-xs font-medium ${
                        ageUnit === 'YEARS'
                          ? 'azure-pill-active'
                          : ''
                      }`}
                    >
                      {isUrdu ? 'سال' : 'Yrs'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgeUnit('MONTHS')}
                      className={`rounded-lg text-xs font-medium ${
                        ageUnit === 'MONTHS'
                          ? 'azure-pill-active'
                          : ''
                      }`}
                    >
                      {isUrdu ? 'ماہ' : 'Mos'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isUrdu ? 'جنس' : 'Biological Sex'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['F', isUrdu ? 'خاتون' : 'Female'],
                      ['M', isUrdu ? 'مرد' : 'Male'],
                      ['O', isUrdu ? 'دیگر' : 'Other'],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSex(val)}
                      className={`min-h-[46px] rounded-xl border text-xs font-medium ${
                        sex === val
                          ? 'azure-pill-active border-transparent'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2">
                  {isUrdu ? 'بلڈ گروپ' : 'Blood Group'}
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {ageMonths < 216 && (
              <label className="flex items-start gap-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-3.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardianConsent}
                  onChange={(e) => setGuardianConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#2E7D5B]"
                />
                <span className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                  {isUrdu
                    ? 'تصدیق کریں کہ آپ والدین یا قانونی سرپرست کی حیثیت سے 18 سال سے کم عمر فرد کا ریکارڈ محفوظ کرنے کی اجازت دیتے ہیں۔'
                    : 'Parent / Guardian Consent: I confirm I am the parent or authorized guardian consenting to store local encrypted health records for this minor (<18 years).'}
                </span>
              </label>
            )}
          </div>
        )}

        {/* STEP 2: Height, Weight (Metric / Imperial), Live BMI Assessment & Diet/Workout Choice */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {isUrdu ? 'پیمائش کی اکائی منتخب کریں' : 'Measurement Units'}
              </span>
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--surface-muted)]">
                <button
                  type="button"
                  onClick={() => handleSwitchUnitSystem('METRIC')}
                  className={`min-h-[34px] px-3.5 rounded-full text-xs font-medium ${
                    unitSystem === 'METRIC' ? 'azure-pill-active' : 'text-[var(--muted)]'
                  }`}
                >
                  Metric (cm / kg)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUnitSystem('IMPERIAL')}
                  className={`min-h-[34px] px-3.5 rounded-full text-xs font-medium ${
                    unitSystem === 'IMPERIAL' ? 'azure-pill-active' : 'text-[var(--muted)]'
                  }`}
                >
                  Imperial (ft·in / lbs)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unitSystem === 'METRIC' ? (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    {isUrdu ? 'قد (سینٹی میٹر)' : 'Height (cm)'}
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={240}
                    step={0.5}
                    value={heightCmStr}
                    onChange={(e) => handleHeightCmInput(e.target.value)}
                    placeholder="168"
                    className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-mono-tabular text-base"
                  />
                  {canonicalHeightCm ? (
                    <p className="text-[11px] text-[var(--muted)] mt-1 font-mono-tabular">
                      = {cmToFtIn(canonicalHeightCm).feet}&apos;{cmToFtIn(canonicalHeightCm).inches}&quot;
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    {isUrdu ? 'قد (فٹ اور انچ)' : 'Height (Feet & Inches)'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={heightFtStr}
                        onChange={(e) => handleHeightFtInInput(e.target.value, heightInStr)}
                        aria-label="Height feet"
                        className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 pr-8 font-mono-tabular text-base"
                      />
                      <span className="absolute right-3 top-3.5 text-xs text-[var(--muted)]">ft</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={11}
                        value={heightInStr}
                        onChange={(e) => handleHeightFtInInput(heightFtStr, e.target.value)}
                        aria-label="Height inches"
                        className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 pr-8 font-mono-tabular text-base"
                      />
                      <span className="absolute right-3 top-3.5 text-xs text-[var(--muted)]">in</span>
                    </div>
                  </div>
                  {canonicalHeightCm ? (
                    <p className="text-[11px] text-[var(--muted)] mt-1 font-mono-tabular">
                      = {Math.round(canonicalHeightCm * 10) / 10} cm
                    </p>
                  ) : null}
                </div>
              )}

              {unitSystem === 'METRIC' ? (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    {isUrdu ? 'موجودہ وزن (کلوگرام)' : 'Current Weight (kg)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={250}
                    step={0.5}
                    value={weightKgStr}
                    onChange={(e) => handleWeightKgInput(e.target.value)}
                    placeholder="68"
                    className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-mono-tabular text-base"
                  />
                  {canonicalWeightKg ? (
                    <p className="text-[11px] text-[var(--muted)] mt-1 font-mono-tabular">
                      = {kgToLbs(canonicalWeightKg)} lbs
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-2">
                    {isUrdu ? 'موجودہ وزن (پاؤنڈز lbs)' : 'Current Weight (lbs)'}
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={550}
                    step={0.5}
                    value={weightLbsStr}
                    onChange={(e) => handleWeightLbsInput(e.target.value)}
                    placeholder="150"
                    className="w-full min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-mono-tabular text-base"
                  />
                  {canonicalWeightKg ? (
                    <p className="text-[11px] text-[var(--muted)] mt-1 font-mono-tabular">
                      = {Math.round(canonicalWeightKg * 10) / 10} kg
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Live Doctor BMI & Body-Mass Ratio Recommendation */}
            <div className="rounded-2xl espresso-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7BB88D]">
                  {isUrdu ? 'ڈاکٹر جسمانی وزن و BMI مشورہ' : 'Doctor Body-Mass Ratio Assessment'}
                </span>
                {bmiInfo.bmi !== null && (
                  <span className="font-mono-tabular text-sm font-semibold text-[#F2EFE4]">
                    BMI {bmiInfo.bmi} kg/m²
                  </span>
                )}
              </div>
              <p className={`text-sm font-semibold ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                {isUrdu ? bmiInfo.label_ur : bmiInfo.label_en}
              </p>
              <p className={`text-xs text-[#A6BAB2]/85 leading-relaxed ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                {isUrdu ? bmiInfo.advice_ur : bmiInfo.advice_en}
              </p>
              <div className="pt-2 border-t border-[#F2EFE4]/15 flex flex-wrap gap-6 text-xs font-mono-tabular text-[#7BB88D]">
                <span>Water Target: {bmiInfo.recommendedWaterMl} ml/day</span>
                <span>Steps Target: {bmiInfo.recommendedSteps.toLocaleString()} steps/day</span>
              </div>
            </div>

            {/* Goal & Diet/Workout Choice (Editable Anytime Later) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold">
                {isUrdu
                  ? 'اپنی خوراک اور ورزش کا ہدف منتخب کریں (بعد میں تبدیل ہو سکتا ہے)'
                  : 'Choose Your Diet & Workout Focus (Editable anytime later)'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {GOAL_OPTIONS.map((g) => {
                  const active = (goalManuallyChosen ? preferredGoal : bmiInfo.recommendedGoal) === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setPreferredGoal(g.id);
                        setGoalManuallyChosen(true);
                      }}
                      className={`rounded-2xl p-3.5 text-left border transition-colors ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{isUrdu ? g.ur : g.en}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">{g.desc_en}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold">
                {isUrdu ? 'غذائی ترجیحات (اختیاری)' : 'Dietary Preferences (Optional)'}
              </label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_PREFS.map((pref) => {
                  const active = dietaryPreferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => toggleDietPref(pref)}
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'azure-pill-active border-transparent'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Major Diseases, Allergies, Medicines & Prior Lab Reports */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2">
                {isUrdu ? 'موجودہ یا پرانی بیماریاں منتخب کریں' : 'Major Conditions or Chronic Illnesses'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CHRONIC_OPTIONS.map((opt) => {
                  const active = chronicConditions.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleCondition(opt.id)}
                      className={`min-h-[42px] rounded-xl border px-3 text-xs font-medium text-start flex items-center justify-between gap-2 ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]'
                      }`}
                    >
                      <span className="truncate">{isUrdu ? opt.ur : opt.en}</span>
                      {active && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {sex === 'F' && (
              <label className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPregnantOrLactating}
                  onChange={(e) => setIsPregnantOrLactating(e.target.checked)}
                  className="h-4 w-4 accent-[#2E7D5B]"
                />
                <span>
                  {isUrdu
                    ? 'حمل یا دودھ پلانے کی حالت (مادرانہ حفاظتی اصول فعال کرنے کے لیے)'
                    : 'Currently pregnant or breastfeeding (enables maternal danger-sign guard)'}
                </span>
              </label>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isUrdu ? 'الرجی (کوئی معلوم الرجی)' : 'Known Allergies (comma separated)'}
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً پینسلین، دھول' : 'e.g. Penicillin, Peanuts, Dust'}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  {isUrdu ? 'ہنگامی رابطہ (ICE نام / نمبر)' : 'Emergency Contact (ICE Name / Relation)'}
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={isUrdu ? 'مثلاً بھائی طارق — 1122' : 'e.g. Tariq (Brother) — Rescue 1122'}
                  className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {isUrdu
                  ? 'پرانی لیب رپورٹس یا سابقہ طبی مسائل (مثلاً HbA1c، کولیسٹرول، سرجری)'
                  : 'Previous Lab Results or Medical History Notes (HbA1c, CBC, Surgeries)'}
              </label>
              <textarea
                rows={2}
                maxLength={280}
                value={priorLabNotes}
                onChange={(e) => setPriorLabNotes(e.target.value)}
                placeholder={
                  isUrdu
                    ? 'مثلاً Hb 11.2، فاسٹنگ شوگر 118، یا پرانا کوئی آپریشن'
                    : 'e.g. Last fasting sugar 115 mg/dL, mild anemia (Hb 11.4), knee pain'
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {isUrdu
                  ? 'ڈاکٹر کی تجویز کردہ روزانہ دوائیں (صرف ریکارڈ کے لیے)'
                  : 'Doctor-Prescribed Daily Medicines (record only for alerts & slips)'}
              </label>
              <input
                type="text"
                maxLength={240}
                value={dailyMedicinesNote}
                onChange={(e) => setDailyMedicinesNote(e.target.value)}
                placeholder={isUrdu ? 'مثلاً صبح بلڈ پریشر کی گولی' : 'e.g. Morning BP medicine prescribed by cardiologist'}
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-sm"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Frequent Everyday Locations (Offline Nearest Hospitals) */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--accent)]" />
                {isUrdu
                  ? 'روزمرہ مقامات محفوظ کریں (انٹرنیٹ نہ ہونے پر ہنگامی مدد کے لیے)'
                  : 'Save Everyday Locations (For Zero-Internet Emergencies)'}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {isUrdu
                  ? 'جہاں آپ زیادہ وقت گزارتے ہیں (گھر، دفتر، یونیورسٹی) وہ علاقے محفوظ کریں تاکہ بغیر انٹرنیٹ بھی قریبی ترین ہسپتال فوراً دکھایا جا سکے۔'
                  : 'Save 1–3 exact places where you spend most time (Home, Work, Campus). Even with zero internet in an emergency, Tibb instantly ranks the nearest verified hospitals to that spot.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    {isUrdu ? 'جگہ کا نام' : 'Place Name'}
                  </label>
                  <input
                    type="text"
                    maxLength={28}
                    value={placeLabel}
                    onChange={(e) => setPlaceLabel(e.target.value)}
                    placeholder="Home / Office / Campus"
                    className="w-full min-h-[42px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold">
                      {isUrdu ? 'شہر / ضلع تلاش کریں' : `City & Area (${districts.length} Cities)`}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomCityMode((m) => !m)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      {customCityMode ? (isUrdu ? 'فہرست سے چنیں' : 'Choose from list') : isUrdu ? '+ نیا شہر لکھیں' : '+ Custom City'}
                    </button>
                  </div>
                  {customCityMode ? (
                    <input
                      type="text"
                      maxLength={48}
                      value={customDistrict}
                      onChange={(e) => setCustomDistrict(e.target.value)}
                      placeholder={isUrdu ? 'مثلاً میرپور، رحیم یار خان، مردان' : 'e.g. Mirpur, Mardan, Rahim Yar Khan'}
                      className="w-full min-h-[42px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="search"
                        value={locationQuery}
                        onChange={(e) => {
                          setLocationQuery(e.target.value);
                          const q = e.target.value.trim().toLowerCase();
                          const firstMatch = anchors.find(
                            (a) => a.label.toLowerCase().includes(q) || a.district.toLowerCase().includes(q)
                          );
                          if (firstMatch) setPlaceAnchorId(firstMatch.id);
                        }}
                        placeholder={isUrdu ? 'شہر تلاش کریں (لاہور، کراچی، سوات...)' : 'Search city/area (Lahore, Karachi, Peshawar...)'}
                        className="w-full min-h-[38px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
                      />
                      <select
                        value={placeAnchorId}
                        onChange={(e) => setPlaceAnchorId(e.target.value)}
                        className="w-full min-h-[40px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
                      >
                        {filteredAnchors.length === 0 ? (
                          <option value="">No match — use Custom City</option>
                        ) : (
                          filteredAnchors.map((anc) => (
                            <option key={anc.id} value={anc.id}>
                              {anc.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold mb-1.5">
                    {isUrdu ? 'مخصوص پتہ / نشانی (اختیاری)' : 'Street / Mohalla / Landmark (Optional)'}
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={placeLandmark}
                    onChange={(e) => setPlaceLandmark(e.target.value)}
                    placeholder="e.g. Street 4, Gulberg III or Main Bazaar"
                    className="w-full min-h-[42px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleCaptureGpsForPlace}
                    disabled={capturingGps}
                    className="w-full min-h-[42px] px-3 rounded-xl border border-[var(--border)] text-xs font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {placeCoords ? 'GPS Pinned' : capturingGps ? 'Pinning...' : 'Pin GPS'}
                  </button>
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddPlace}
                    className="w-full min-h-[42px] px-3 rounded-xl azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> {isUrdu ? 'محفوظ کریں' : 'Add Place'}
                  </button>
                </div>
              </div>
            </div>

            {frequentPlaces.length > 0 && (
              <div className="space-y-2">
                {frequentPlaces.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold">{pl.label}</span>
                      <span className="text-[var(--muted)]">
                        {' '}· {pl.areaOrLandmark}, {pl.district}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFrequentPlaces((prev) => prev.filter((x) => x.id !== pl.id))}
                      aria-label="Remove place"
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 p-4 text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <p className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                {isUrdu
                  ? 'اس فرد کی تمام چیٹس، وزن کی تبدیلی، محفوظ مقامات اور رپورٹس صرف آپ کے فون میں انکرپٹڈ محفوظ رہتی ہیں۔'
                  : 'All chat threads, daily weight progress, saved locations, and reports remain strictly isolated and encrypted inside this device vault.'}
              </p>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev === 4 ? 3 : prev === 3 ? 2 : 1))}
                className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {isUrdu ? 'پیچھے' : 'Back'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <HeartHandshake className="h-4 w-4 text-[var(--accent)]" /> {isUrdu ? 'مکمل پرائیویسی' : 'Encrypted Profile'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 4))}
                className="min-h-[44px] px-6 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5 tactile-press"
              >
                {isUrdu ? 'اگلا مرحلہ' : 'Next'} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="min-h-[46px] px-7 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 tactile-press"
              >
                <Check className="h-4 w-4" />{' '}
                {saving ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') : isUrdu ? 'محفوظ کریں اور شروع کریں' : 'Complete Intake & Enter Hub'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
