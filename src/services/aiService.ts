import { AppLocale } from '../data/trilingual';
import {
  EmergencyCategory,
  EmergencyFirstAidProtocol,
  HomeCareProtocol,
  TriageTier,
  detectEmergencyFromText,
  getEmergencyFirstAid,
  sanitizePlainText,
} from '../engine/triageEngine';
import whoHomeCare from '../data/who_home_care.json';
import type { ExtendedPatientProfile, StayHomeGuidance } from '../types/clinical';

export interface MultimodalChatRequest {
  person: ExtendedPatientProfile;
  message: string;
  locale: AppLocale;
  history: Array<{ role: 'user' | 'agent'; text: string }>;
  images?: Array<{ mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string }>;
  latestVitalsSummary?: string;
}

export interface MultimodalChatResponse {
  status: 'EMERGENCY_RED' | 'NEEDS_CLARIFICATION' | 'COMPLETE';
  triageTier: TriageTier;
  reply_en: string;
  reply_ur: string;
  reply_roman?: string;
  emergencyCategory?: EmergencyCategory | null;
  firstAid?: EmergencyFirstAidProtocol | null;
  stayHomeGuidance?: StayHomeGuidance | null;
  matchedHomeCare?: HomeCareProtocol | null;
  suggestCalmPacer: boolean;
  suggestFarHospitalMode: boolean;
  quickReplies: Array<{ label_en: string; label_ur: string }>;
  engineUsed: string;
  amrBlocked: boolean;
}

const ANXIETY_REGEX = /(anxious|panic|scared|stressed|overwhelmed|ghabrahat|dar|pareshaan|گھبراہٹ|پریشان|خوف)/i;
const FAR_HOSPITAL_REGEX = /(far away|no transport|delayed|hours away|ambulance late|hospital far|door hai|ہسپتال دور)/i;

/**
 * Clean offline-first multimodal chat service.
 * 1. Always runs <1ms local WHO Red-Flag detection first.
 * 2. Calls /api/agent/chat (Gemini 4 Hydrogen multimodal) when online.
 * 3. Falls back seamlessly to local deterministic guidance if offline or unavailable.
 */
export async function sendMultimodalClinicalChat(
  req: MultimodalChatRequest
): Promise<MultimodalChatResponse> {
  const cleanMsg = sanitizePlainText(req.message);
  const emergencyHit = detectEmergencyFromText(cleanMsg);
  const suggestCalmPacer = ANXIETY_REGEX.test(cleanMsg);
  const suggestFarHospitalMode = FAR_HOSPITAL_REGEX.test(cleanMsg);

  if (emergencyHit.isEmergency && emergencyHit.category) {
    const firstAid = getEmergencyFirstAid(emergencyHit.category);
    return {
      status: 'EMERGENCY_RED',
      triageTier: 'RED',
      reply_en: `${emergencyHit.reason_en}. Call 1122 / 115 immediately and follow the stabilization first-aid steps below.`,
      reply_ur: `${emergencyHit.reason_ur}۔ فوری 1122 پر کال کریں اور نیچے دیے گئے ابتدائی طبی امداد کے مراحل پر عمل کریں۔`,
      emergencyCategory: emergencyHit.category,
      firstAid,
      stayHomeGuidance: {
        verdict: 'EMERGENCY_1122',
        title_en: 'Immediate Emergency Hospital Transfer Required',
        title_ur: 'فوری ایمرجنسی ہسپتال منتقل کرنا ضروری ہے',
        explanation_en: 'Danger signs detected. Do not wait at home.',
        explanation_ur: 'خطرے کی علامات موجود ہیں۔ گھر پر انتظار نہ کریں۔',
        actionSteps_en: firstAid.do_now_en,
        actionSteps_ur: firstAid.do_now_ur,
        disclaimer_en: 'Tibb emergency guidance supports immediate stabilization while calling emergency services.',
        disclaimer_ur: 'طبی امداد آنے تک فوری تحفظ کے لیے رہنمائی۔',
      },
      suggestCalmPacer: false,
      suggestFarHospitalMode: true,
      quickReplies: [],
      engineUsed: 'DETERMINISTIC_WHO_RED_FLAG',
      amrBlocked: false,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 14000);
      const resp = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: cleanMsg,
          locale: req.locale,
          personContext: {
            relationship: req.person.relationship,
            ageMonths: req.person.ageMonths,
            sex: req.person.sex,
            bloodGroup: req.person.bloodGroup,
            isPregnantOrLactating: req.person.isPregnantOrLactating,
            chronicConditions: req.person.chronicConditions,
            allergies: req.person.allergies,
            dailyMedicinesNote: req.person.dailyMedicinesNote,
            latestVitalsSummary: req.latestVitalsSummary,
          },
          history: req.history.slice(-10),
          images: (req.images ?? []).slice(0, 3),
        }),
      });
      clearTimeout(timer);

      if (resp.ok) {
        const data = (await resp.json()) as MultimodalChatResponse;
        return {
          ...data,
          suggestCalmPacer: Boolean(data.suggestCalmPacer || suggestCalmPacer),
          suggestFarHospitalMode: Boolean(data.suggestFarHospitalMode || suggestFarHospitalMode),
        };
      }
    } catch {
      // Seamless offline fallback below
    }
  }

  // Deterministic Offline Fallback
  const defaultCare = (whoHomeCare as HomeCareProtocol[])[0];
  if (suggestCalmPacer) {
    return {
      status: 'NEEDS_CLARIFICATION',
      triageTier: 'GREEN',
      reply_en:
        'You are safe to pause right here. Take a slow double-inhale and long exhale with the Cyclic Sighing pacer below, then tell me what physical symptoms you notice.',
      reply_ur:
        'آپ پُرسکون رہیں۔ نیچے دیے گئے سانس لینے کے نظام کے ساتھ دو بار سانس اندر کھینچ کر آہستہ باہر نکالیں، پھر بتائیں کہ جسم میں کیا تکلیف محسوس ہو رہی ہے۔',
      suggestCalmPacer: true,
      suggestFarHospitalMode,
      quickReplies: [
        { label_en: 'Open Breathing Pacer', label_ur: 'سانس کی مشق شروع کریں' },
        { label_en: 'No danger signs, just stressed', label_ur: 'کوئی خطرہ نہیں، صرف ذہنی دباؤ ہے' },
        { label_en: 'Chest pain or dizzy', label_ur: 'سینے میں درد یا چکر آ رہے ہیں' },
      ],
      engineUsed: 'OFFLINE_WHO_CALM_CORE',
      amrBlocked: false,
    };
  }

  return {
    status: 'COMPLETE',
    triageTier: 'GREEN',
    reply_en: req.images?.length
      ? 'Photo saved locally to this person’s vault. While offline, please enter printed lab values in Lab OCR or tell me any symptoms (fever, pain, breathing).'
      : `Offline WHO Guidance for ${req.person.name}: ${defaultCare.steps_en.slice(0, 2).join(' ')} ${defaultCare.escalation_warning_en}`,
    reply_ur: req.images?.length
      ? 'تصویر اس فرد کے محفوظ ریکارڈ میں شامل کر دی گئی ہے۔ آف لائن حالت میں لیب نمبرز خود درج کریں یا علامات لکھیں۔'
      : `${req.person.name} کے لیے آف لائن رہنمائی: ${defaultCare.steps_ur.slice(0, 2).join(' ')} ${defaultCare.escalation_warning_ur}`,
    matchedHomeCare: defaultCare,
    stayHomeGuidance: {
      verdict: 'STAY_HOME',
      title_en: 'Monitor Calmly at Home (Seek Clinic if Worsening)',
      title_ur: 'گھر پر پُرسکون نگرانی کریں (تکلیف بڑھنے پر کلینک جائیں)',
      explanation_en: 'No emergency danger signs detected offline. Keep hydrated and monitor temperature/vitals.',
      explanation_ur: 'فی الحال کوئی فوری خطرناک علامت نہیں ملی۔ پانی پیتے رہیں اور علامات پر نظر رکھیں۔',
      actionSteps_en: defaultCare.steps_en,
      actionSteps_ur: defaultCare.steps_ur,
      disclaimer_en: 'Informational supportive triage only — not a medical diagnosis.',
      disclaimer_ur: 'یہ صرف معلوماتی طبی رہنمائی ہے، باقاعدہ تشخیص کا متبادل نہیں۔',
    },
    suggestCalmPacer,
    suggestFarHospitalMode,
    quickReplies: [
      { label_en: 'High fever > 48 hrs', label_ur: '48 گھنٹے سے زیادہ بخار' },
      { label_en: 'Trouble breathing', label_ur: 'سانس لینے میں دشواری' },
    ],
    engineUsed: 'OFFLINE_WHO_CORE',
    amrBlocked: false,
  };
}
