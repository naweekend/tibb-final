import DOMPurify from 'dompurify';
import { z } from 'zod';
import drapBlocklist from '../data/drap_blocklist.json';
import diseaseReference from '../data/disease_reference.json';
import emergencyFirstAidList from '../data/emergency_first_aid.json';
import facilitiesData from '../data/facilities.pk.json';
import whoHomeCare from '../data/who_home_care.json';

export type Sex = 'M' | 'F' | 'O';
export type TemperatureBand = 'NORMAL' | 'MILD_FEVER' | 'HIGH_FEVER';
export type HydrationStatus = 'NORMAL' | 'REDUCED_FLUIDS' | 'UNABLE_TO_DRINK';
export type BodyRegion = 'HEAD_NECK' | 'CHEST' | 'ABDOMEN' | 'SKIN_LIMBS' | 'GENERAL_FEVER';
export type TriageTier = 'GREEN' | 'AMBER' | 'RED';
export type EmergencyCategory =
  | 'CHEST_PAIN'
  | 'STROKE_FAST'
  | 'BREATHING_DISTRESS'
  | 'SEIZURE_CONVULSIONS'
  | 'UNCONTROLLED_BLEEDING'
  | 'SEVERE_BURN'
  | 'CHOKING'
  | 'UNCONSCIOUS_FAINTING'
  | 'MATERNAL_EMERGENCY'
  | 'PEDIATRIC_DANGER';

export const PatientProfileSchema = z.object({
  id: z.string().min(1).max(64),
  accountId: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  ageMonths: z.number().int().min(0).max(1440),
  sex: z.enum(['M', 'F', 'O']),
  isPregnantOrLactating: z.boolean().default(false),
  chronicConditions: z.array(z.string().max(48)).max(10).default([]),
  allergies: z.array(z.string().max(48)).max(10).default([]),
  workspace: z.enum(['GHARANA', 'BHU']).default('GHARANA'),
});

export type PatientProfile = z.infer<typeof PatientProfileSchema>;

export const VitalsSchema = z.object({
  respiratoryRate: z.number().min(4).max(120).optional(),
  heartRate: z.number().min(25).max(240).optional(),
  measurementMethod: z.enum(['TAP_TIMER', 'CAMERA_PPG', 'MANUAL', 'NONE']).default('NONE'),
  signalQualityIndex: z.number().min(0).max(100).optional(),
  bpSystolic: z.number().min(50).max(260).optional(),
  bpDiastolic: z.number().min(30).max(160).optional(),
  bloodGlucoseMgDl: z.number().min(20).max(900).optional(),
  sugarMode: z.enum(['FASTING', 'RANDOM']).optional(),
});

export type EpisodeVitals = z.infer<typeof VitalsSchema>;

export const TriageAnswersSchema = z.object({
  unableToDrink: z.boolean().default(false),
  vomitsEverything: z.boolean().default(false),
  convulsions: z.boolean().default(false),
  lethargicOrUnconscious: z.boolean().default(false),
  chestIndrawingOrStridor: z.boolean().default(false),
  crushingChestPain: z.boolean().default(false),
  strokeFastSigns: z.boolean().default(false),
  severeShortnessOfBreath: z.boolean().default(false),
  uncontrolledBleeding: z.boolean().default(false),
  stiffNeckOrPetechialRash: z.boolean().default(false),
  pregnancyDangerSigns: z.boolean().default(false),
  moderateDehydration: z.boolean().default(false),
  bloodInStoolOrVomit: z.boolean().default(false),
  burnOrDeepWound: z.boolean().default(false),
  heatExhaustionSigns: z.boolean().default(false),
  persistentCoughOver14Days: z.boolean().default(false),
  primaryComplaint: z
    .enum(['FEVER', 'COUGH_COLD', 'DIARRHEA', 'MINOR_WOUND', 'MINOR_BURN', 'HEAT_EXHAUSTION', 'CHRONIC_FLARE'])
    .default('FEVER'),
});

export type TriageAnswers = z.infer<typeof TriageAnswersSchema>;

export interface EpisodeInput {
  patient: PatientProfile;
  bodyRegion: BodyRegion;
  durationHours: number;
  temperatureBand: TemperatureBand;
  hydrationStatus: HydrationStatus;
  vitals: EpisodeVitals;
  answers: TriageAnswers;
  district?: string;
  userCoords?: { lat: number; lng: number };
  emergencyOverrideCategory?: EmergencyCategory;
}

export interface FacilityRecord {
  id: string;
  name_en: string;
  name_ur: string;
  tier: 'TERTIARY' | 'DHQ_THQ' | 'RHC_BHU';
  district: string;
  tehsil: string;
  emergency24x7: boolean;
  pediatricEmergency: boolean;
  phone: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

export interface HomeCareProtocol {
  id: string;
  title_en: string;
  title_ur: string;
  title_roman: string;
  steps_en: string[];
  steps_ur: string[];
  steps_roman: string[];
  contraindications_en: string[];
  contraindications_ur: string[];
  allowedNumericClaims: string[];
  escalation_warning_en: string;
  escalation_warning_ur: string;
  sourceCitation: string;
}

export interface EmergencyFirstAidProtocol {
  id: EmergencyCategory;
  title_en: string;
  title_ur: string;
  do_now_en: string[];
  do_now_ur: string[];
  do_not_en: string[];
  do_not_ur: string[];
  sourceCitation: string;
}

export interface DiseaseReferenceCard {
  id: string;
  category: string;
  title_en: string;
  title_ur: string;
  verified_facts_en: string[];
  verified_facts_ur: string[];
  allowedNumericClaims: string[];
  linkedHomeCareId: string;
}

export interface RedFlagReason {
  code: string;
  label_en: string;
  label_ur: string;
  source: 'WHO_IMCI' | 'WHO_ETAT' | 'MATERNAL' | 'VITALS';
}

export interface TriageEvaluationResult {
  tier: TriageTier;
  redFlags: RedFlagReason[];
  amberReasons: string[];
  fastBreathingThreshold: number;
  isFastBreathing: boolean;
  matchedHomeCare: HomeCareProtocol | null;
  emergencyFirstAid: EmergencyFirstAidProtocol | null;
  matchedDiseaseRef: DiseaseReferenceCard;
  recommendedFacilities: FacilityRecord[];
  locationRequired: boolean;
  referralSlip: {
    referralToken: string;
    ageBracket: string;
    tier: TriageTier;
    primaryFlag: string;
    facilityId: string;
    createdAtIso: string;
  };
  symptomCategory: string;
}

export interface GroundingAuditResult {
  passed: boolean;
  sanitizedText: string;
  violations: string[];
  amrBlocked: boolean;
}

const BIDI_REGEX = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g;
const INVISIBLE_REGEX = /[\u200B-\u200D\uFEFF]/g;

export function getFastBreathingThreshold(ageMonths: number): number {
  if (ageMonths < 2) return 60;
  if (ageMonths < 12) return 50;
  if (ageMonths <= 60) return 40;
  return 30;
}

export function getAgeBracket(ageMonths: number): string {
  if (ageMonths < 2) return '0-2m';
  if (ageMonths < 12) return '2-11m';
  if (ageMonths <= 60) return '1-5y';
  if (ageMonths <= 216) return '6-18y';
  if (ageMonths <= 720) return '19-60y';
  return '60y+';
}

export function stripUnsafeCharacters(raw: string): string {
  return raw.replace(BIDI_REGEX, '').replace(INVISIBLE_REGEX, '').trim();
}

export function sanitizePlainText(raw: string): string {
  const noBidi = stripUnsafeCharacters(raw);
  const purifier = DOMPurify as unknown as {
    sanitize?: (dirty: string, cfg: { ALLOWED_TAGS: string[]; ALLOWED_ATTR: string[] }) => string;
  };
  if (typeof purifier.sanitize === 'function') {
    return purifier.sanitize(noBidi, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  return noBidi.replace(/<[^>]*>/g, '').trim();
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getEmergencyFirstAid(category: EmergencyCategory): EmergencyFirstAidProtocol {
  const list = emergencyFirstAidList as EmergencyFirstAidProtocol[];
  return list.find((item) => item.id === category) ?? list[0];
}

/**
 * Instant multilingual offline Red-Flag detector for direct text/voice emergencies (EN, Roman Urdu, Urdu Script).
 */
export function detectEmergencyFromText(rawText: string): {
  isEmergency: boolean;
  category?: EmergencyCategory;
  reason_en?: string;
  reason_ur?: string;
} {
  const t = rawText.toLowerCase();

  if (/(chest pain|heart attack|crushing|left arm pain|seenay mein dard|seene me dard|سینے میں درد|دل کا دورہ)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'CHEST_PAIN',
      reason_en: 'Severe chest pain / suspected cardiac emergency',
      reason_ur: 'سینے میں شدید درد یا دل کے دورے کی ممکنہ علامت',
    };
  }
  if (/(choking|swallowed|stuck in throat|gala band|گلے میں|سانس رک)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'CHOKING',
      reason_en: 'Airway choking / obstruction reported',
      reason_ur: 'گلے میں کوئی چیز پھنسنے یا سانس رکنے کی علامت',
    };
  }
  if (/(stroke|face droop|slurred|one side weak|falij|فالج|چہرہ ٹیڑھا|زبان لڑکھڑ)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'STROKE_FAST',
      reason_en: 'Sudden stroke warning signs (FAST)',
      reason_ur: 'فالج کی فوری علامات',
    };
  }
  if (/(seizure|convulsion|fits|mirgi|jhatkay|دورے|جھٹکے|مرگی)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'SEIZURE_CONVULSIONS',
      reason_en: 'Active seizures / convulsions reported',
      reason_ur: 'دورے یا جھٹکے پڑنے کی علامت',
    };
  }
  if (/(heavy bleeding|uncontrolled bleeding|blood won't stop|tez khoon|khoon beh|خون بہہ|شدید خون)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'UNCONTROLLED_BLEEDING',
      reason_en: 'Severe / uncontrolled bleeding reported',
      reason_ur: 'شدید یا نہ رکنے والا خون بہنا',
    };
  }
  if (/(unconscious|not waking|fainted|not breathing|behosh|بے ہوش|ہوش میں نہیں)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'UNCONSCIOUS_FAINTING',
      reason_en: 'Unconscious or unresponsive patient',
      reason_ur: 'مریض کا بے ہوش یا غیر جوابی ہونا',
    };
  }
  if (/(severe burn|electric shock|acid burn|electrocuted|جھلس|تیزاب|بجلی کا جھٹکا|بڑا زخم)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'SEVERE_BURN',
      reason_en: 'Severe thermal, chemical, or electrical burn',
      reason_ur: 'شدید جلنے یا کرنٹ لگنے کی ہنگامی حالت',
    };
  }
  if (/(can't breathe|cannot breathe|struggling to breathe|gasping|blue lips|saans nahi|saans phool|سانس نہیں آ|سانس بند|تیز سانس)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'BREATHING_DISTRESS',
      reason_en: 'Severe breathing difficulty / respiratory distress',
      reason_ur: 'سانس لینے میں شدید دشواری',
    };
  }
  if (/(pregnant.*bleed|pregnancy.*bleed|labor pain|حمل.*خون)/i.test(t)) {
    return {
      isEmergency: true,
      category: 'MATERNAL_EMERGENCY',
      reason_en: 'Pregnancy or postpartum emergency warning',
      reason_ur: 'دورانِ حمل یا زچگی ہنگامی علامت',
    };
  }

  return { isEmergency: false };
}

export function interpretBloodPressure(systolic?: number, diastolic?: number): {
  status: 'NONE' | 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH_1' | 'HIGH_2' | 'CRISIS';
  label_en: string;
  label_ur: string;
  guidance_en: string;
  guidance_ur: string;
} {
  if (!systolic || !diastolic) {
    return {
      status: 'NONE',
      label_en: 'Enter both Upper & Lower BP numbers',
      label_ur: 'اوپر اور نیچے دونوں بلڈ پریشر نمبر درج کریں',
      guidance_en: 'Example: Upper 120, Lower 80 mmHg.',
      guidance_ur: 'مثال: اوپر 120 اور نیچے 80 درج کریں۔',
    };
  }
  if (systolic >= 180 || diastolic >= 120) {
    return {
      status: 'CRISIS',
      label_en: 'Hypertensive Crisis (Emergency)',
      label_ur: 'انتہائی خطرناک ہائی بلڈ پریشر (فوری ایمرجنسی)',
      guidance_en: 'Seek emergency hospital care immediately, especially with headache, chest pain, or blurred vision.',
      guidance_ur: 'فوری ایمرجنسی ہسپتال جائیں، خاص طور پر اگر سر درد، سینے میں درد یا نظر دھندلی ہو۔',
    };
  }
  if (systolic < 90 || diastolic < 60) {
    return {
      status: 'LOW',
      label_en: 'Low Blood Pressure (Hypotension)',
      label_ur: 'کم بلڈ پریشر (لو بی پی)',
      guidance_en: 'Lie down with legs slightly raised; seek urgent care if dizzy, fainting, or cold/clammy.',
      guidance_ur: 'لیٹ جائیں اور ٹانگیں ہلکی اونچی رکھیں؛ چکر یا بے ہوشی میں فوری ہسپتال جائیں۔',
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      status: 'HIGH_2',
      label_en: 'High Blood Pressure (Stage 2)',
      label_ur: 'ہائی بلڈ پریشر (دوسرا درجہ)',
      guidance_en: 'Visit a doctor today for proper medical evaluation. Do not adjust prescriptions on your own.',
      guidance_ur: 'آج ہی ڈاکٹر سے معائنہ کروائیں۔ خود سے دوا تبدیل نہ کریں۔',
    };
  }
  if (systolic >= 130 || diastolic >= 80) {
    return {
      status: 'HIGH_1',
      label_en: 'High Blood Pressure (Stage 1)',
      label_ur: 'ہائی بلڈ پریشر (پہلا درجہ)',
      guidance_en: 'Recheck calmly after 5 minutes of rest and share log with your clinic doctor.',
      guidance_ur: '5 منٹ آرام کے بعد دوبارہ چیک کریں اور اپنے ڈاکٹر کو ریکارڈ دکھائیں۔',
    };
  }
  if (systolic >= 120 && diastolic < 80) {
    return {
      status: 'ELEVATED',
      label_en: 'Slightly Elevated BP',
      label_ur: 'ہلکا سا بڑھا ہوا بلڈ پریشر',
      guidance_en: 'Upper reading is mildly elevated while lower reading is normal. Monitor over the week.',
      guidance_ur: 'اوپر والا نمبر ہلکا سا زیادہ ہے جبکہ نیچے والا نارمل ہے۔ ہفتے بھر نگرانی کریں۔',
    };
  }
  return {
    status: 'NORMAL',
    label_en: 'Normal Blood Pressure',
    label_ur: 'نارمل بلڈ پریشر',
    guidance_en: 'Both upper (systolic) and lower (diastolic) readings are within healthy resting range.',
    guidance_ur: 'اوپر اور نیچے دونوں نمبر صحت مند اور نارمل حد میں ہیں۔',
  };
}

export function interpretBloodSugar(mgDl?: number, mode: 'FASTING' | 'RANDOM' = 'RANDOM'): {
  status: 'NONE' | 'LOW' | 'NORMAL' | 'BORDERLINE' | 'HIGH' | 'CRITICAL';
  label_en: string;
  label_ur: string;
  guidance_en: string;
  guidance_ur: string;
} {
  if (!mgDl) {
    return {
      status: 'NONE',
      label_en: 'Enter glucometer reading',
      label_ur: 'شوگر کی ریڈنگ درج کریں',
      guidance_en: 'Select Fasting (8h no food) or Random.',
      guidance_ur: 'نہار منہ یا کھانے کے بعد کی قسم منتخب کریں۔',
    };
  }
  if (mgDl < 70) {
    return {
      status: 'LOW',
      label_en: mgDl < 54 ? 'Severe Low Sugar (Emergency)' : 'Low Blood Sugar (Hypoglycemia)',
      label_ur: 'کم شوگر (فوری توجہ درکار)',
      guidance_en:
        mgDl < 54
          ? 'Emergency low sugar. If conscious, give quick sugar (glucose water/juice) immediately and seek urgent medical care.'
          : 'If alert, take 15g fast sugar (3 tsp sugar in water or half glass juice) and recheck in 15 minutes.',
      guidance_ur:
        'شوگر کم ہے۔ اگر مریض ہوش میں ہو تو فوراً میٹھا پانی یا جوس دیں اور 15 منٹ بعد دوبارہ چیک کریں۔',
    };
  }
  if (mgDl >= 300) {
    return {
      status: 'CRITICAL',
      label_en: 'Very High Blood Sugar (Urgent)',
      label_ur: 'انتہائی زیادہ شوگر (فوری ڈاکٹر سے رجوع کریں)',
      guidance_en: 'Visit an emergency clinic urgently, especially if vomiting, abdominal pain, or fast breathing occurs.',
      guidance_ur: 'فوری ہسپتال یا کلینک جائیں، خاص طور پر اگر قے، پیٹ درد یا تیز سانس ہو۔',
    };
  }

  if (mode === 'FASTING') {
    if (mgDl <= 99) {
      return {
        status: 'NORMAL',
        label_en: 'Normal Fasting Sugar',
        label_ur: 'نہار منہ شوگر نارمل ہے',
        guidance_en: 'Within normal fasting range (70–99 mg/dL).',
        guidance_ur: 'نہار منہ شوگر نارمل حد (70 تا 99) میں ہے۔',
      };
    }
    if (mgDl <= 125) {
      return {
        status: 'BORDERLINE',
        label_en: 'Borderline Fasting (Prediabetes Range)',
        label_ur: 'بارڈر لائن شوگر',
        guidance_en: 'Between 100–125 mg/dL fasting. Discuss repeat lab test with your doctor.',
        guidance_ur: 'نہار منہ 100 تا 125 بارڈر لائن ہے۔ ڈاکٹر سے لیب ٹیسٹ کا مشورہ کریں۔',
      };
    }
    return {
      status: 'HIGH',
      label_en: 'High Fasting Sugar',
      label_ur: 'نہار منہ شوگر زیادہ ہے',
      guidance_en: 'Fasting reading >= 126 mg/dL. Schedule a clinic review.',
      guidance_ur: 'نہار منہ شوگر 126 یا اس سے زائد ہے، ڈاکٹر سے معائنہ کروائیں۔',
    };
  }

  if (mgDl <= 140) {
    return {
      status: 'NORMAL',
      label_en: 'Normal Random Blood Sugar',
      label_ur: 'کھانے کے بعد شوگر نارمل ہے',
      guidance_en: 'Within healthy post-meal range.',
      guidance_ur: 'شوگر نارمل حد میں ہے۔',
    };
  }
  if (mgDl < 200) {
    return {
      status: 'BORDERLINE',
      label_en: 'Elevated Random Sugar',
      label_ur: 'شوگر ہلکی بڑھی ہوئی ہے',
      guidance_en: 'Consider checking an empty-stomach (fasting) sugar reading tomorrow morning.',
      guidance_ur: 'کل صبح نہار منہ دوبارہ شوگر چیک کریں۔',
    };
  }
  return {
    status: 'HIGH',
    label_en: 'High Blood Sugar',
    label_ur: 'شوگر زیادہ ہے',
    guidance_en: 'Reading >= 200 mg/dL. Consult your physician for evaluation.',
    guidance_ur: 'شوگر 200 سے زیادہ ہے، معالج سے مشورہ کریں۔',
  };
}

export interface StayHomeEvaluationInput {
  bpSystolic?: number;
  bpDiastolic?: number;
  bloodGlucoseMgDl?: number;
  hasOrganWarningSigns?: boolean; // chest pain, SOB, back pain, numbness/weakness, vision/speech change, severe headache/confusion
  hasShockSigns?: boolean; // confusion, cold clammy/pale skin, rapid shallow breathing, weak rapid pulse, fainting
  isConsciousAbleToSwallow?: boolean;
}

export function evaluateStayHomeVsHospital(input: StayHomeEvaluationInput): {
  verdict: 'STAY_HOME' | 'RECHECK_AND_CLINIC' | 'EMERGENCY_1122';
  title_en: string;
  title_ur: string;
  explanation_en: string;
  explanation_ur: string;
  actionSteps_en: string[];
  actionSteps_ur: string[];
  disclaimer_en: string;
  disclaimer_ur: string;
} {
  const {
    bpSystolic,
    bpDiastolic,
    bloodGlucoseMgDl,
    hasOrganWarningSigns = false,
    hasShockSigns = false,
    isConsciousAbleToSwallow = true,
  } = input;

  // 1. Severe Low Sugar (< 70 mg/dL)
  if (typeof bloodGlucoseMgDl === 'number' && bloodGlucoseMgDl < 70) {
    if (!isConsciousAbleToSwallow) {
      return {
        verdict: 'EMERGENCY_1122',
        title_en: 'Go to Hospital / Call 1122 Immediately (Severe Low Sugar)',
        title_ur: 'فوری ایمرجنسی ہسپتال جائیں یا 1122 پر کال کریں (شدید کم شوگر)',
        explanation_en:
          'Blood sugar is below 70 mg/dL and the person is drowsy, unconscious, seizing, or unable to swallow safely.',
        explanation_ur:
          'شوگر 70 سے کم ہے اور مریض بے ہوش، غنودگی یا نگلنے سے قاصر ہے۔',
        actionSteps_en: [
          'Call 1122 / 115 immediately and place the patient in the side recovery position.',
          'DO NOT force juice, sugar water, or honey into an unconscious or drowsy person’s mouth (choking hazard).',
        ],
        actionSteps_ur: [
          'فوری 1122 یا 115 پر کال کریں اور مریض کو کروٹ کے بل لٹا دیں۔',
          'بے ہوش یا نیم بے ہوش مریض کے منہ میں ہرگز پانی یا میٹھی چیز زبردستی نہ ڈالیں۔',
        ],
        disclaimer_en: 'Tibb emergency guidance does not replace emergency paramedics.',
        disclaimer_ur: 'یہ ہنگامی حفاظتی رہنمائی ہے، ایمرجنسی ڈاکٹر کا متبادل نہیں۔',
      };
    }

    return {
      verdict: 'RECHECK_AND_CLINIC',
      title_en: 'Stay Calm & Follow 15-15 Rule Now (Recheck in 15 Minutes)',
      title_ur: 'گھر پر فوری 15-15 اصول پر عمل کریں اور 15 منٹ بعد دوبارہ شوگر چیک کریں',
      explanation_en:
        'Blood sugar is below 70 mg/dL while the person is alert and able to swallow safely.',
      explanation_ur: 'شوگر 70 سے کم ہے لیکن مریض ہوش میں ہے اور نگل سکتا ہے۔',
      actionSteps_en: [
        'Take 15g fast-acting sugar immediately (3 teaspoons sugar in water OR half a glass of juice / glucose).',
        'Wait 15 minutes calmly, then recheck blood sugar with the glucometer.',
        'If still < 70 mg/dL or symptoms worsen, repeat 15g and contact a doctor/clinic promptly.',
      ],
      actionSteps_ur: [
        'فوراً 15 گرام تیز میٹھا دیں (پانی میں 3 چمچ چینی یا آدھا گلاس جوس)۔',
        '15 منٹ آرام سے انتظار کریں اور گلوکومیٹر سے شوگر دوبارہ چیک کریں۔',
        'اگر پھر بھی 70 سے کم رہے یا طبیعت بگڑے تو فوری کلینک یا ہسپتال جائیں۔',
      ],
      disclaimer_en: 'Informational supportive guidance only — consult your doctor about recurring low sugar.',
      disclaimer_ur: 'یہ صرف معلوماتی رہنمائی ہے؛ بار بار شوگر کم ہونے پر ڈاکٹر سے رجوع کریں۔',
    };
  }

  // 2. Hypertensive Crisis BP (>= 180/120)
  if ((typeof bpSystolic === 'number' && bpSystolic >= 180) || (typeof bpDiastolic === 'number' && bpDiastolic >= 120)) {
    if (hasOrganWarningSigns) {
      return {
        verdict: 'EMERGENCY_1122',
        title_en: 'Immediate Hospital / Emergency 1122 — Do Not Wait at Home',
        title_ur: 'فوری ایمرجنسی ہسپتال / 1122 — گھر پر انتظار نہ کریں',
        explanation_en:
          'Blood pressure is >= 180/120 mmHg with warning symptoms (chest pain, shortness of breath, back pain, numbness/weakness, vision or speech changes, or severe headache/confusion).',
        explanation_ur:
          'بلڈ پریشر 180/120 یا اس سے زائد ہے اور ساتھ خطرے کی علامات موجود ہیں۔ گھریلو ٹوٹکوں پر بھروسہ نہ کریں۔',
        actionSteps_en: [
          'Call Rescue 1122 / Edhi 115 or transfer to the nearest 24/7 emergency hospital immediately.',
          'Sit calmly supported upright; do not rely on home remedies or unprescribed extra doses.',
        ],
        actionSteps_ur: [
          'فوری 1122 پر کال کریں یا قریبی 24 گھنٹے کھلے ایمرجنسی ہسپتال لے جائیں۔',
          'مریض کو آرام سے سہارا دے کر بٹھائیں؛ گھریلو علاج یا خود سے اضافی گولی پر انحصار نہ کریں۔',
        ],
        disclaimer_en: 'Immediate physician evaluation is essential for hypertensive emergency.',
        disclaimer_ur: 'ایسی حالت میں فوری ڈاکٹر کا معائنہ لازمی ہے۔',
      };
    }

    return {
      verdict: 'RECHECK_AND_CLINIC',
      title_en: 'Sit Calmly & Recheck in 5–10 Minutes; Prompt Doctor Review',
      title_ur: 'آرام سے بیٹھ کر 5 سے 10 منٹ بعد دوبارہ چیک کریں اور ڈاکٹر سے رابطہ کریں',
      explanation_en:
        'Blood pressure is >= 180/120 mmHg without emergency organ symptoms right now. Verify carefully after quiet rest.',
      explanation_ur:
        'بلڈ پریشر 180/120 سے زیادہ ہے مگر ابھی سینے کا درد یا فالج جیسی علامت نہیں ہے۔ پُرسکون ہو کر دوبارہ چیک کریں۔',
      actionSteps_en: [
        'Sit quietly for 5 minutes (use the Cyclic Sighing breathing pacer if anxious) with cuff at heart level and recheck.',
        'If still >= 180/120 mmHg, go promptly to a clinic/hospital today even without pain.',
        'If chest pain, vision blur, numbness, or shortness of breath appears, call 1122 immediately.',
      ],
      actionSteps_ur: [
        '5 منٹ پُرسکون بیٹھیں (گھبراہٹ ہو تو سانس کی مشق کریں) اور دوبارہ بی پی چیک کریں۔',
        'اگر دوبارہ بھی 180/120 یا زیادہ ہو تو آج ہی فوراً ڈاکٹر یا ہسپتال جائیں۔',
        'اگر سینے میں درد، کمزوری یا سانس کی تکلیف ہو تو فوراً 1122 پر کال کریں۔',
      ],
      disclaimer_en: 'Do not self-medicate extra blood pressure pills without physician direction.',
      disclaimer_ur: 'ڈاکٹر کے مشورے کے بغیر خود سے اضافی دوا نہ کھائیں۔',
    };
  }

  // 3. Low Blood Pressure (< 90/60)
  if ((typeof bpSystolic === 'number' && bpSystolic < 90) || (typeof bpDiastolic === 'number' && bpDiastolic < 60)) {
    if (hasShockSigns) {
      return {
        verdict: 'EMERGENCY_1122',
        title_en: 'Immediate Emergency Care (Low BP with Shock Signs)',
        title_ur: 'فوری ایمرجنسی ہسپتال جائیں (کم بلڈ پریشر اور شدید کمزوری)',
        explanation_en:
          'Blood pressure is below 90/60 mmHg accompanied by shock warning signs (confusion, cold/clammy or pale skin, rapid shallow breathing, weak rapid pulse, or fainting).',
        explanation_ur:
          'بلڈ پریشر 90/60 سے کم ہے اور ساتھ بے ہوشی، ٹھنڈا پسینہ یا تیز سانس کی علامات ہیں۔',
        actionSteps_en: [
          'Call 1122 / 115 immediately and lay the person flat with legs gently elevated (if no injury/breathing distress).',
          'Keep warm and monitor consciousness until medical help arrives.',
        ],
        actionSteps_ur: [
          'فوری 1122 پر کال کریں اور مریض کو سیدھا لٹا کر ٹانگیں ہلکی اونچی رکھیں۔',
          'جسم کو مناسب گرم رکھیں اور ہوش پر نظر رکھیں۔',
        ],
        disclaimer_en: 'Emergency signs require urgent hospital stabilization.',
        disclaimer_ur: 'خطرناک علامات میں فوری ہسپتال جانا ضروری ہے۔',
      };
    }

    return {
      verdict: 'STAY_HOME',
      title_en: 'Rest & Hydrate Safely at Home; Seek Clinic if Dizziness Persists',
      title_ur: 'گھر پر آرام اور پانی لیں؛ چکر برقرار رہیں تو ڈاکٹر کو دکھائیں',
      explanation_en:
        'Blood pressure is < 90/60 mmHg without severe shock signs. Mild dizziness can often settle with safe posture and fluids.',
      explanation_ur:
        'بلڈ پریشر 90/60 سے کم ہے مگر خطرناک علامات نہیں ہیں۔ احتیاطی اقدامات اور پانی سے بہتری آ سکتی ہے۔',
      actionSteps_en: [
        'Drink water or ORS gradually; sit or lie down and stand up slowly in stages.',
        'Tense leg and thigh muscles gently before standing to support circulation.',
        'Check with your doctor before adding extra dietary salt (especially if heart/kidney history exists).',
      ],
      actionSteps_ur: [
        'آہستہ آہستہ صاف پانی یا او آر ایس پئیں اور بیٹھنے یا اٹھنے میں جلدی نہ کریں۔',
        'کھڑے ہونے سے پہلے ٹانگوں اور رانوں کے پٹھوں کو ہلکا سا دبائیں۔',
        'خوراک میں اضافی نمک بڑھانے سے پہلے اپنے ڈاکٹر سے مشورہ ضرور کریں۔',
      ],
      disclaimer_en: 'Informational supportive guidance only — seek urgent care if fainting or chest pain occurs.',
      disclaimer_ur: 'صرف معلوماتی رہنمائی؛ بے ہوشی یا سینے کے درد میں فوری ہسپتال جائیں۔',
    };
  }

  return {
    verdict: 'STAY_HOME',
    title_en: 'Safe to Stay Home & Monitor Calmly',
    title_ur: 'گھر پر پُرسکون نگرانی محفوظ ہے',
    explanation_en: 'Your entered vitals do not cross emergency hospital thresholds.',
    explanation_ur: 'درج کی گئی ریڈنگز میں کوئی فوری ایمرجنسی خطرہ ظاہر نہیں ہوا۔',
    actionSteps_en: [
      'Maintain clean hydration, calm rest, and log follow-up readings in this person’s profile.',
      'Seek clinic review if new symptoms, high fever > 48h, or discomfort develops.',
    ],
    actionSteps_ur: [
      'صاف پانی پیتے رہیں، آرام کریں اور اس فرد کے ریکارڈ میں اگلی ریڈنگ محفوظ کریں۔',
      'نئی علامات یا 48 گھنٹے سے زائد بخار پر کلینک سے معائنہ کروائیں۔',
    ],
    disclaimer_en: 'Supportive triage guidance only — not a clinical diagnosis.',
    disclaimer_ur: 'یہ صرف معلوماتی طبی رہنمائی ہے، باقاعدہ تشخیص نہیں۔',
  };
}

export function evaluateRedFlags(input: EpisodeInput): {
  redFlags: RedFlagReason[];
  fastBreathingThreshold: number;
  isFastBreathing: boolean;
  primaryEmergencyCategory: EmergencyCategory;
} {
  const redFlags: RedFlagReason[] = [];
  const { patient, vitals, answers, hydrationStatus } = input;
  const isPediatric = patient.ageMonths <= 60;
  const threshold = getFastBreathingThreshold(patient.ageMonths);
  const isFastBreathing =
    typeof vitals.respiratoryRate === 'number' && vitals.respiratoryRate >= threshold;

  let primaryEmergencyCategory: EmergencyCategory =
    input.emergencyOverrideCategory ?? (isPediatric ? 'PEDIATRIC_DANGER' : 'BREATHING_DISTRESS');

  if (answers.crushingChestPain) {
    primaryEmergencyCategory = 'CHEST_PAIN';
    redFlags.push({
      code: 'ETAT_CHEST_PAIN',
      label_en: 'Crushing chest pain, tightness, or jaw/arm radiation',
      label_ur: 'سینے میں شدید دباؤ یا جکڑن والا درد',
      source: 'WHO_ETAT',
    });
  }
  if (answers.strokeFastSigns) {
    primaryEmergencyCategory = 'STROKE_FAST';
    redFlags.push({
      code: 'ETAT_STROKE_FAST',
      label_en: 'Sudden face droop, unilateral weakness, or slurred speech',
      label_ur: 'چہرے کا ٹیڑھا ہونا، ایک طرف کی کمزوری یا زبان لڑکھڑانا',
      source: 'WHO_ETAT',
    });
  }
  if (answers.uncontrolledBleeding) {
    primaryEmergencyCategory = 'UNCONTROLLED_BLEEDING';
    redFlags.push({
      code: 'ETAT_BLEEDING',
      label_en: 'Uncontrolled active bleeding',
      label_ur: 'شدید اور نہ رکنے والا خون بہنا',
      source: 'WHO_ETAT',
    });
  }
  if (answers.convulsions) {
    primaryEmergencyCategory = 'SEIZURE_CONVULSIONS';
    redFlags.push({
      code: 'IMCI_CONVULSIONS',
      label_en: 'Convulsions or fits during this illness',
      label_ur: 'دورے یا جھٹکے پڑنا',
      source: 'WHO_IMCI',
    });
  }
  if (answers.lethargicOrUnconscious) {
    primaryEmergencyCategory = isPediatric ? 'PEDIATRIC_DANGER' : 'UNCONSCIOUS_FAINTING';
    redFlags.push({
      code: 'IMCI_LETHARGIC',
      label_en: 'Lethargic, unusually difficult to wake, or unconscious',
      label_ur: 'شدید غنودگی، نیم بے ہوشی یا ہوش میں نہ آنا',
      source: 'WHO_IMCI',
    });
  }
  if (answers.chestIndrawingOrStridor || answers.severeShortnessOfBreath || isFastBreathing) {
    primaryEmergencyCategory = 'BREATHING_DISTRESS';
  }
  if (answers.chestIndrawingOrStridor) {
    redFlags.push({
      code: 'IMCI_CHEST_INDRAWING',
      label_en: 'Chest indrawing or stridor while calm',
      label_ur: 'سانس لیتے وقت پسلیوں کا اندر دھنسنا یا سیٹی کی آواز',
      source: 'WHO_IMCI',
    });
  }
  if (answers.severeShortnessOfBreath) {
    redFlags.push({
      code: 'ETAT_SEVERE_DYSPNEA',
      label_en: 'Severe difficulty breathing at rest or unable to speak full sentences',
      label_ur: 'آرام کی حالت میں بھی سانس پھولنا یا بات نہ کر سکنا',
      source: 'WHO_ETAT',
    });
  }
  if (isFastBreathing) {
    redFlags.push({
      code: isPediatric ? 'IMCI_FAST_BREATHING' : 'ETAT_TACHYPNEA',
      label_en: `Fast breathing (${vitals.respiratoryRate} breaths/min; threshold >= ${threshold})`,
      label_ur: `تیز سانس چلنا (${vitals.respiratoryRate} فی منٹ)`,
      source: 'VITALS',
    });
  }
  if (answers.unableToDrink || hydrationStatus === 'UNABLE_TO_DRINK') {
    if (!redFlags.length) primaryEmergencyCategory = 'PEDIATRIC_DANGER';
    redFlags.push({
      code: 'IMCI_UNABLE_DRINK',
      label_en: 'Unable to drink or breastfeed',
      label_ur: 'پانی یا ماں کا دودھ پینے سے قاصر',
      source: 'WHO_IMCI',
    });
  }
  if (answers.vomitsEverything) {
    if (!redFlags.length) primaryEmergencyCategory = 'PEDIATRIC_DANGER';
    redFlags.push({
      code: 'IMCI_VOMITS_ALL',
      label_en: 'Vomits everything ingested',
      label_ur: 'ہر کھائی پی گئی چیز کی قے آنا',
      source: 'WHO_IMCI',
    });
  }
  if (answers.stiffNeckOrPetechialRash) {
    redFlags.push({
      code: 'ETAT_MENINGISM_RASH',
      label_en: 'Fever with stiff neck or non-blanching petechial rash',
      label_ur: 'بخار کے ساتھ گردن میں اکڑاؤ یا جسم پر سرخ دھبے',
      source: 'WHO_ETAT',
    });
  }
  if (patient.isPregnantOrLactating && answers.pregnancyDangerSigns) {
    primaryEmergencyCategory = 'MATERNAL_EMERGENCY';
    redFlags.push({
      code: 'MATERNAL_DANGER',
      label_en: 'Pregnancy/postpartum danger signs (severe headache, vision changes, bleeding)',
      label_ur: 'حمل یا زچگی کے دوران خطرے کی علامات (شدید سر درد، دھندلا پن یا خون آنا)',
      source: 'MATERNAL',
    });
  }

  if (typeof vitals.bpSystolic === 'number' && (vitals.bpSystolic >= 180 || vitals.bpSystolic < 80)) {
    redFlags.push({
      code: 'VITALS_CRITICAL_BP',
      label_en: `Critical blood pressure reading (${vitals.bpSystolic}/${vitals.bpDiastolic ?? '--'} mmHg)`,
      label_ur: `بلڈ پریشر کی خطرناک سطح (${vitals.bpSystolic})`,
      source: 'VITALS',
    });
  }
  if (typeof vitals.bloodGlucoseMgDl === 'number' && (vitals.bloodGlucoseMgDl < 54 || vitals.bloodGlucoseMgDl >= 400)) {
    redFlags.push({
      code: 'VITALS_CRITICAL_GLUCOSE',
      label_en: `Critical blood glucose reading (${vitals.bloodGlucoseMgDl} mg/dL)`,
      label_ur: `شوگر کی خطرناک سطح (${vitals.bloodGlucoseMgDl} mg/dL)`,
      source: 'VITALS',
    });
  }

  if (input.emergencyOverrideCategory && redFlags.length === 0) {
    redFlags.push({
      code: `DIRECT_${input.emergencyOverrideCategory}`,
      label_en: getEmergencyFirstAid(input.emergencyOverrideCategory).title_en,
      label_ur: getEmergencyFirstAid(input.emergencyOverrideCategory).title_ur,
      source: 'WHO_ETAT',
    });
  }

  return { redFlags, fastBreathingThreshold: threshold, isFastBreathing, primaryEmergencyCategory };
}

export function retrieveClinicalGroundTruth(input: EpisodeInput): {
  homeCare: HomeCareProtocol;
  diseaseRef: DiseaseReferenceCard;
  symptomCategory: string;
} {
  const homeCareList = whoHomeCare as HomeCareProtocol[];
  const refList = diseaseReference as DiseaseReferenceCard[];

  let homeCareId = 'mild_fever';
  let refId = 'fever_dengue_typhoid';
  let symptomCategory = 'FEVER';

  switch (input.answers.primaryComplaint) {
    case 'COUGH_COLD':
      homeCareId = 'mild_cough_cold';
      refId = 'respiratory_imci';
      symptomCategory = 'RESPIRATORY';
      break;
    case 'DIARRHEA':
      homeCareId = 'mild_diarrhea_ors';
      refId = 'diarrhea_dehydration';
      symptomCategory = 'GI_HYDRATION';
      break;
    case 'MINOR_WOUND':
      homeCareId = 'minor_abrasion';
      refId = 'wound_burn_first_aid';
      symptomCategory = 'FIRST_AID';
      break;
    case 'MINOR_BURN':
      homeCareId = 'minor_burn_first_aid';
      refId = 'wound_burn_first_aid';
      symptomCategory = 'FIRST_AID';
      break;
    case 'HEAT_EXHAUSTION':
      homeCareId = 'heat_exhaustion_first_aid';
      refId = 'wound_burn_first_aid';
      symptomCategory = 'HEAT';
      break;
    case 'CHRONIC_FLARE':
      homeCareId = 'mild_fever';
      refId = 'fever_dengue_typhoid';
      symptomCategory = 'CHRONIC';
      break;
    default:
      homeCareId = 'mild_fever';
      refId = 'fever_dengue_typhoid';
      symptomCategory = 'FEVER';
  }

  const homeCare = homeCareList.find((h) => h.id === homeCareId) ?? homeCareList[0];
  const diseaseRef = refList.find((r) => r.id === refId) ?? refList[0];

  const ageSafeHomeCare: HomeCareProtocol =
    input.patient.ageMonths < 12
      ? {
          ...homeCare,
          steps_en: homeCare.steps_en.filter((s) => !s.toLowerCase().includes('honey')),
          steps_ur: homeCare.steps_ur.filter((s) => !s.includes('شہد')),
          steps_roman: homeCare.steps_roman.filter((s) => !s.toLowerCase().includes('shehad')),
        }
      : homeCare;

  return { homeCare: ageSafeHomeCare, diseaseRef, symptomCategory };
}

export interface FacilityAreaAnchor {
  id: string;
  label: string;
  district: string;
  tehsil: string;
  lat: number;
  lng: number;
}

export function getAvailableDistricts(): string[] {
  const seen = new Set<string>();
  for (const fac of facilitiesData as FacilityRecord[]) {
    seen.add(fac.district);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function getFacilityAreaAnchors(): FacilityAreaAnchor[] {
  const seen = new Set<string>();
  const anchors: FacilityAreaAnchor[] = [];
  for (const fac of facilitiesData as FacilityRecord[]) {
    const key = `${fac.district}:${fac.tehsil}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anchors.push({
      id: fac.id,
      label: `${fac.tehsil}, ${fac.district}`,
      district: fac.district,
      tehsil: fac.tehsil,
      lat: fac.lat,
      lng: fac.lng,
    });
  }
  return anchors.sort((a, b) => a.district.localeCompare(b.district) || a.tehsil.localeCompare(b.tehsil));
}

/**
 * Explicitly requires userCoords OR districtFilter before returning facility addresses/distances.
 * Never silently guesses user location. Supports exact district, tehsil match, or custom city query fallback.
 */
export function sortFacilities(
  tier: TriageTier,
  isPediatric: boolean,
  userCoords?: { lat: number; lng: number },
  districtFilter?: string
): { facilities: FacilityRecord[]; locationRequired: boolean } {
  const cleanQuery = districtFilter?.trim().toLowerCase() ?? '';
  if (!userCoords && !cleanQuery) {
    return { facilities: [], locationRequired: true };
  }

  const all = facilitiesData as FacilityRecord[];
  const exactDistrict = cleanQuery
    ? all.filter((f) => f.district.toLowerCase() === cleanQuery)
    : [];
  const partialMatch =
    cleanQuery && exactDistrict.length === 0
      ? all.filter(
          (f) =>
            f.district.toLowerCase().includes(cleanQuery) ||
            f.tehsil.toLowerCase().includes(cleanQuery) ||
            f.name_en.toLowerCase().includes(cleanQuery)
        )
      : [];

  const pool =
    exactDistrict.length > 0
      ? exactDistrict
      : partialMatch.length > 0
        ? partialMatch
        : all;

  const mapped = pool.map((f) => ({
    ...f,
    distanceKm: userCoords ? haversineKm(userCoords.lat, userCoords.lng, f.lat, f.lng) : undefined,
  }));

  const sorted = mapped
    .sort((a, b) => {
      if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') {
        if (tier === 'RED' && Math.abs(a.distanceKm - b.distanceKm) < 2.5) {
          const aUrgent = (a.emergency24x7 ? 0 : 10) + (isPediatric && a.pediatricEmergency ? -3 : 0);
          const bUrgent = (b.emergency24x7 ? 0 : 10) + (isPediatric && b.pediatricEmergency ? -3 : 0);
          if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        }
        return a.distanceKm - b.distanceKm;
      }
      if (tier === 'RED') {
        const aUrgent = (a.emergency24x7 ? 0 : 100) + (isPediatric && a.pediatricEmergency ? -20 : 0) + (a.tier === 'TERTIARY' ? -10 : 0);
        const bUrgent = (b.emergency24x7 ? 0 : 100) + (isPediatric && b.pediatricEmergency ? -20 : 0) + (b.tier === 'TERTIARY' ? -10 : 0);
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      }
      return a.name_en.localeCompare(b.name_en);
    })
    .slice(0, 6);

  return { facilities: sorted, locationRequired: false };
}

export function evaluateCareEpisode(input: EpisodeInput): TriageEvaluationResult {
  const { redFlags, fastBreathingThreshold, isFastBreathing, primaryEmergencyCategory } =
    evaluateRedFlags(input);
  const { homeCare, diseaseRef, symptomCategory } = retrieveClinicalGroundTruth(input);
  const isPediatric = input.patient.ageMonths <= 60;

  let tier: TriageTier = 'GREEN';
  const amberReasons: string[] = [];

  if (redFlags.length > 0) {
    tier = 'RED';
  } else {
    if (input.durationHours > 48) {
      amberReasons.push('Symptoms have persisted beyond 48 hours and need clinician review.');
    }
    if (input.temperatureBand === 'HIGH_FEVER') {
      amberReasons.push('High fever requires physical examination to rule out bacterial or vector-borne infection.');
    }
    if (input.hydrationStatus === 'REDUCED_FLUIDS' || input.answers.moderateDehydration) {
      amberReasons.push('Reduced oral intake or signs of moderate dehydration.');
    }
    if (input.answers.bloodInStoolOrVomit) {
      amberReasons.push('Blood in stool or vomit requires same-day clinic assessment.');
    }
    if (input.answers.burnOrDeepWound) {
      amberReasons.push('Deep wound or significant burn needs sterile clinic dressing and tetanus review.');
    }
    if (input.answers.persistentCoughOver14Days) {
      amberReasons.push('Cough lasting over 14 days requires TB/respiratory screening at a BHU/THQ.');
    }
    if (input.patient.ageMonths < 2 && input.temperatureBand !== 'NORMAL') {
      amberReasons.push('Any fever in an infant under 2 months requires urgent physician assessment.');
    }
    if (input.patient.chronicConditions.length > 0 && input.answers.primaryComplaint === 'CHRONIC_FLARE') {
      amberReasons.push('Chronic illness flare-up requires clinician adjustment—do not alter prescriptions at home.');
    }

    if (amberReasons.length > 0) {
      tier = 'AMBER';
    }
  }

  const { facilities: recommendedFacilities, locationRequired } = sortFacilities(
    tier,
    isPediatric,
    input.userCoords,
    input.district
  );
  const topFacility = recommendedFacilities[0];
  const emergencyFirstAid = tier === 'RED' ? getEmergencyFirstAid(primaryEmergencyCategory) : null;
  const primaryFlag =
    redFlags[0]?.code ??
    (amberReasons.length > 0 ? `AMBER_${symptomCategory}` : `GREEN_${homeCare.id.toUpperCase()}`);

  const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return {
    tier,
    redFlags,
    amberReasons,
    fastBreathingThreshold,
    isFastBreathing,
    matchedHomeCare: tier === 'RED' ? null : homeCare,
    emergencyFirstAid,
    matchedDiseaseRef: diseaseRef,
    recommendedFacilities,
    locationRequired,
    referralSlip: {
      referralToken: `TIBB-${tier}-${randomHex}`,
      ageBracket: getAgeBracket(input.patient.ageMonths),
      tier,
      primaryFlag,
      facilityId: topFacility?.id ?? 'LOCATION_PENDING',
      createdAtIso: new Date().toISOString(),
    },
    symptomCategory,
  };
}

export function verifyAgainstClinicalGroundTruth(
  rawText: string,
  context: {
    ageMonths: number;
    homeCare: HomeCareProtocol | null;
    diseaseRef: DiseaseReferenceCard;
    triageTier: TriageTier;
  }
): GroundingAuditResult {
  const sanitizedText = sanitizePlainText(rawText);
  const lower = sanitizedText.toLowerCase();
  const violations: string[] = [];
  let amrBlocked = false;

  if (!sanitizedText || sanitizedText.length < 12) {
    violations.push('EMPTY_OR_SHORT_OUTPUT');
  }

  if (context.triageTier === 'RED') {
    violations.push('RED_TIER_LLM_SUPPRESSED');
  }

  const allBlockedTerms = [
    ...drapBlocklist.antibiotics_generic,
    ...drapBlocklist.pakistan_brand_names,
    ...drapBlocklist.restricted_rx_classes,
  ];
  for (const term of allBlockedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (wordRegex.test(lower)) {
      violations.push(`DRAP_RX_BLOCKED:${term}`);
      amrBlocked = true;
      break;
    }
  }

  for (const phrase of drapBlocklist.diagnostic_phrases) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push(`DIAGNOSTIC_OR_DOSAGE_CLAIM:${phrase}`);
      break;
    }
  }

  if (/\b\d+\s*(mg|ml|mcg|iu|tablets?|capsules?|drops?)\b/i.test(lower)) {
    violations.push('UNGROUNDED_MEDICATION_DOSAGE');
    amrBlocked = true;
  }

  if (context.ageMonths < 12 && /\b(honey|shehad|شہد)\b/i.test(lower)) {
    violations.push('INFANT_HONEY_CONTRAINDICATION');
  }

  const allowedNumbers = new Set<string>([
    ...(context.homeCare?.allowedNumericClaims ?? []),
    ...(context.diseaseRef.allowedNumericClaims ?? []),
    '1122',
    '115',
    '1020',
    '1166',
  ]);
  const extractedNumbers = sanitizedText.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  for (const num of extractedNumbers) {
    if (!allowedNumbers.has(num)) {
      violations.push(`UNGROUNDED_NUMBER:${num}`);
      break;
    }
  }

  return {
    passed: violations.length === 0,
    sanitizedText: violations.length === 0 ? sanitizedText : '',
    violations,
    amrBlocked,
  };
}
