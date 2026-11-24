import type {
  EmergencyCategory,
  EmergencyFirstAidProtocol,
  EpisodeVitals,
  HomeCareProtocol,
  PatientProfile,
  TriageTier,
} from '../engine/triageEngine';

export type RelationshipType = 'Self' | 'Mother' | 'Father' | 'Child' | 'Spouse' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export interface FrequentPlace {
  id: string;
  label: string; // e.g., "Home", "Office", "University"
  district: string;
  areaOrLandmark: string;
  lat?: number;
  lng?: number;
}

export interface ExtendedPatientProfile extends PatientProfile {
  relationship: RelationshipType;
  bloodGroup: BloodGroup;
  heightCm?: number;
  weightKg?: number;
  baselineWeightKg?: number;
  preferredUnitSystem?: 'METRIC' | 'IMPERIAL';
  preferredGoal?: WellnessGoal;
  dietaryPreferences?: string[];
  priorLabNotes?: string;
  frequentPlaces?: FrequentPlace[];
  onboardingCompleted?: boolean;
  dailyMedicinesNote: string;
  emergencyContact: string;
  createdAtIso: string;
}

export function normalizePersonProfile(
  raw: PatientProfile & Partial<ExtendedPatientProfile>,
  fallbackAccountId = 'acc_local_family_default'
): ExtendedPatientProfile {
  return {
    id: raw.id,
    accountId: raw.accountId || fallbackAccountId,
    name: raw.name || 'Family Member',
    ageMonths: typeof raw.ageMonths === 'number' ? raw.ageMonths : 300,
    sex: raw.sex ?? 'O',
    isPregnantOrLactating: Boolean(raw.isPregnantOrLactating),
    chronicConditions: Array.isArray(raw.chronicConditions) ? raw.chronicConditions : [],
    allergies: Array.isArray(raw.allergies) ? raw.allergies : [],
    workspace: raw.workspace ?? 'GHARANA',
    relationship: raw.relationship ?? 'Self',
    bloodGroup: raw.bloodGroup ?? 'Unknown',
    heightCm: typeof raw.heightCm === 'number' ? raw.heightCm : undefined,
    weightKg: typeof raw.weightKg === 'number' ? raw.weightKg : undefined,
    baselineWeightKg:
      typeof raw.baselineWeightKg === 'number'
        ? raw.baselineWeightKg
        : typeof raw.weightKg === 'number'
          ? raw.weightKg
          : undefined,
    preferredUnitSystem: raw.preferredUnitSystem === 'IMPERIAL' ? 'IMPERIAL' : 'METRIC',
    preferredGoal: raw.preferredGoal ?? 'BALANCED',
    dietaryPreferences: Array.isArray(raw.dietaryPreferences) ? raw.dietaryPreferences : [],
    priorLabNotes: raw.priorLabNotes ?? '',
    frequentPlaces: Array.isArray(raw.frequentPlaces) ? raw.frequentPlaces : [],
    onboardingCompleted: Boolean(raw.onboardingCompleted ?? true),
    dailyMedicinesNote: raw.dailyMedicinesNote ?? '',
    emergencyContact: raw.emergencyContact ?? '',
    createdAtIso: raw.createdAtIso ?? new Date().toISOString(),
  };
}

export type StayHomeVerdict = 'STAY_HOME' | 'RECHECK_AND_CLINIC' | 'EMERGENCY_1122';

export interface StayHomeGuidance {
  verdict: StayHomeVerdict;
  title_en: string;
  title_ur: string;
  explanation_en: string;
  explanation_ur: string;
  actionSteps_en: string[];
  actionSteps_ur: string[];
  disclaimer_en: string;
  disclaimer_ur: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  personId: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  text_ur?: string;
  timestampIso: string;
  mediaDataUrl?: string;
  mediaKind?: 'IMAGE' | 'CAMERA_FRAME' | 'VIDEO_BURST' | 'VOICE';
  triageTier?: TriageTier;
  emergencyCategory?: EmergencyCategory | null;
  firstAid?: EmergencyFirstAidProtocol | null;
  stayHomeGuidance?: StayHomeGuidance | null;
  matchedHomeCare?: HomeCareProtocol | null;
  suggestCalmPacer?: boolean;
  suggestFarHospitalMode?: boolean;
  quickReplies?: Array<{ label_en: string; label_ur: string }>;
  engineUsed?: string;
  amrBlocked?: boolean;
}

export interface ChatThread {
  id: string;
  personId: string;
  title: string;
  createdAtIso: string;
  updatedAtIso: string;
  latestTier: TriageTier;
  messages: ChatMessage[];
}

export type SavedReportKind =
  | 'REPORT_PHOTO'
  | 'PRESCRIPTION'
  | 'MEAL_PHOTO'
  | 'VITALS_LOG'
  | 'EXERCISE_LOG'
  | 'REFERRAL_SLIP';

export interface SavedPersonReport {
  id: string;
  personId: string;
  kind: SavedReportKind;
  title: string;
  notes: string;
  imageDataUrl?: string;
  vitalsSnapshot?: EpisodeVitals & { temperatureF?: number };
  referralToken?: string;
  triageTier?: TriageTier;
  createdAtIso: string;
}

export type WellnessGoal =
  | 'BALANCED'
  | 'WEIGHT_LOSS'
  | 'MUSCLE_GAIN'
  | 'DIABETES_CONTROL'
  | 'BP_FRIENDLY'
  | 'ENERGY_STRENGTH'
  | 'SENIOR_MOBILITY';

export interface MealOptionItem {
  title_en: string;
  title_ur: string;
  portions_en: string;
  portions_ur: string;
  caloriesApprox: number;
}

export interface DietMealSlot {
  slot: 'Breakfast' | 'Mid-Day Snack' | 'Lunch' | 'Dinner';
  title_en: string;
  title_ur: string;
  portions_en: string;
  portions_ur: string;
  caloriesApprox: number;
  selectedOptionIndex?: number;
  alternatives?: MealOptionItem[];
}

export interface WorkoutExerciseSlot {
  name_en: string;
  name_ur: string;
  durationOrReps: string;
  intensity: 'Gentle' | 'Moderate' | 'Brisk';
  tip_en: string;
}

export interface PersonalizedWellnessPlan {
  id: string;
  personId: string;
  goal: WellnessGoal;
  generatedAtIso: string;
  dailyWaterGoalMl: number;
  dailyStepsGoal: number;
  dietMeals: DietMealSlot[];
  workoutRoutine: WorkoutExerciseSlot[];
  avoidNotes_en: string[];
  avoidNotes_ur: string[];
  engineUsed: string;
}

export interface DailyDoctorCheckIn {
  answeredDateKey: string;
  currentWeightKg?: number;
  weightFeeling?: 'LOSING' | 'SAME' | 'GAINING';
  weightDeltaKg?: number;
  sleepHours?: number;
  bedTime24?: string;
  wakeTime24?: string;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  energyLevel?: 'LOW' | 'STEADY' | 'STRONG';
  symptomsNote?: string;
  answeredAtIso: string;
}

export interface DailyWellnessLog {
  id: string; // format: well_<personId>_<YYYY-MM-DD>
  personId: string;
  dateKey: string;
  steps: number;
  stepGoal: number;
  waterMl: number;
  waterGoalMl: number;
  sleepHours: number;
  restingHr?: number;
  hrvMs?: number;
  lastSugarMgDl?: number;
  lastBpSystolic?: number;
  lastBpDiastolic?: number;
  mealsChecked: string[];
  workoutDone: boolean;
  dailyCheckIn?: DailyDoctorCheckIn;
  plan?: PersonalizedWellnessPlan;
  updatedAtIso: string;
}

export interface HomeRemedyItem {
  id: string;
  category: 'FEVER_THROAT' | 'STOMACH_HYDRATION' | 'STRESS_SLEEP' | 'HEAT_SKIN' | 'PAIN_RECOVERY';
  title_en: string;
  title_ur: string;
  ingredients_en: string;
  ingredients_ur: string;
  steps_en: string[];
  steps_ur: string[];
  caution_en: string;
  caution_ur: string;
}

