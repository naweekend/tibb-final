import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import diseaseReference from './src/data/disease_reference.json';
import emergencyFirstAidList from './src/data/emergency_first_aid.json';
import whoHomeCare from './src/data/who_home_care.json';
import {
  DiseaseReferenceCard,
  EmergencyCategory,
  HomeCareProtocol,
  detectEmergencyFromText,
  getEmergencyFirstAid,
  sanitizePlainText,
  verifyAgainstClinicalGroundTruth,
} from './src/engine/triageEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Sliding-window rate limiter per IP
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (hits.length >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }
    hits.push(now);
    rateBuckets.set(ip, hits);
    next();
  };
}

const dailyAiBuckets = new Map<string, { dateKey: string; count: number }>();
function dailyAiCap(maxPerDay: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'local';
    const dateKey = new Date().toISOString().slice(0, 10);
    const entry = dailyAiBuckets.get(ip);
    const count = entry && entry.dateKey === dateKey ? entry.count : 0;
    if (count >= maxPerDay) {
      res.status(429).json({ error: 'Daily AI usage limit reached for this device. Offline mode remains active.' });
      return;
    }
    dailyAiBuckets.set(ip, { dateKey, count: count + 1 });
    next();
  };
}

const ExplainRequestSchema = z.object({
  ageMonths: z.number().int().min(0).max(1440),
  triageTier: z.enum(['GREEN', 'AMBER', 'RED']),
  homeCareId: z.string().max(64).nullable(),
  diseaseRefId: z.string().max(64),
  userConcern: z.string().max(240).optional(),
});

const AgentTriageSchema = z.object({
  message: z.string().trim().min(1).max(600),
  ageMonths: z.number().int().min(0).max(1440).default(300),
  sex: z.enum(['M', 'F', 'O']).default('O'),
  locale: z.enum(['en', 'ur', 'roman']).default('en'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'agent']),
        text: z.string().max(400),
      })
    )
    .max(10)
    .default([]),
});

const TranscribeSchema = z.object({
  audioBase64: z.string().min(16).max(6_000_000),
  mimeType: z.enum(['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg']).default('audio/webm'),
});

const TtsSchema = z.object({
  text: z.string().trim().min(1).max(450),
  lang: z.enum(['ur-PK', 'en-US']).default('ur-PK'),
});

const TelemetryEventSchema = z.object({
  eventId: z.string().uuid(),
  cohortHash: z.string().min(6).max(64),
  districtCode: z.string().min(2).max(24),
  mode: z.enum(['GHARANA', 'BHU']),
  ageBracket: z.string().min(2).max(16),
  triageTier: z.enum(['GREEN', 'AMBER', 'RED']),
  symptomCategory: z.string().min(2).max(32),
  amrBlockTriggered: z.boolean(),
  referralGenerated: z.boolean(),
  referralCompleted: z.boolean().default(false),
  timestampHour: z.string().max(32),
});

const CNIC_REGEX = /\b\d{5}-\d{7}-\d\b/;
const PK_PHONE_REGEX = /(?:^|[\s(])(?:\+92|0)3\d{2}[- ]?\d{7}\b/;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export function containsPii(text?: string): boolean {
  if (!text) return false;
  return CNIC_REGEX.test(text) || PK_PHONE_REGEX.test(text) || EMAIL_REGEX.test(text);
}

const telemetryStore = new Map<string, z.infer<typeof TelemetryEventSchema>>();

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '6mb' }));

  const allowedOrigin = process.env.APP_URL || '';
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' data: blob:; object-src 'none'; frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com"
    );
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    const origin = req.headers.origin;
    if (
      origin &&
      (origin === allowedOrigin || origin.startsWith('http://localhost:') || origin.startsWith('https://localhost'))
    ) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).end();
      return;
    }
    next();
  });

const MultimodalChatSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  locale: z.enum(['en', 'ur', 'roman']).default('en'),
  personContext: z.object({
    relationship: z.string().max(32).default('Self'),
    ageMonths: z.number().int().min(0).max(1440).default(300),
    sex: z.enum(['M', 'F', 'O']).default('O'),
    bloodGroup: z.string().max(12).default('Unknown'),
    isPregnantOrLactating: z.boolean().default(false),
    chronicConditions: z.array(z.string().max(48)).max(10).default([]),
    allergies: z.array(z.string().max(48)).max(10).default([]),
    dailyMedicinesNote: z.string().max(240).default(''),
    latestVitalsSummary: z.string().max(240).optional(),
  }),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'agent']),
        text: z.string().max(600),
      })
    )
    .max(12)
    .default([]),
  images: z
    .array(
      z.object({
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        base64: z.string().min(16).max(3_500_000),
      })
    )
    .max(3)
    .default([]),
});

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(getGeminiClient());
    res.json({
      status: 'ok',
      service: 'tibb-clinical-gateway',
      geminiConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Live Multimodal Clinical Discussion & Camera/Video/Report Analysis via Gemini 4 Hydrogen.
   */
  app.post('/api/agent/chat', rateLimit(35, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = MultimodalChatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid multimodal chat payload.' });
      return;
    }

    const { message, personContext, history, images } = parsed.data;
    if (containsPii(message)) {
      res.status(400).json({ error: 'Please remove CNIC numbers, phone numbers, or emails.' });
      return;
    }

    const fastCheck = detectEmergencyFromText(message);
    if (fastCheck.isEmergency && fastCheck.category) {
      const firstAid = getEmergencyFirstAid(fastCheck.category);
      res.json({
        status: 'EMERGENCY_RED',
        triageTier: 'RED',
        reply_en: `${fastCheck.reason_en}. Call 1122 / 115 immediately and follow the stabilization steps below.`,
        reply_ur: `${fastCheck.reason_ur}۔ فوری 1122 پر کال کریں اور نیچے دی گئی ابتدائی طبی امداد پر عمل کریں۔`,
        emergencyCategory: fastCheck.category,
        firstAid,
        stayHomeGuidance: {
          verdict: 'EMERGENCY_1122',
          title_en: 'Immediate Emergency Hospital Transfer Required',
          title_ur: 'فوری ایمرجنسی ہسپتال جانا ضروری ہے',
          explanation_en: 'Danger sign detected immediately.',
          explanation_ur: 'فوری خطرناک علامت کی نشاندہی ہوئی ہے۔',
          actionSteps_en: firstAid.do_now_en,
          actionSteps_ur: firstAid.do_now_ur,
          disclaimer_en: 'Supportive emergency first aid while calling rescue services.',
          disclaimer_ur: 'طبی امداد پہنچنے تک فوری حفاظتی رہنمائی۔',
        },
        suggestCalmPacer: false,
        suggestFarHospitalMode: true,
        quickReplies: [],
        engineUsed: 'DETERMINISTIC_WHO_RED_FLAG',
        amrBlocked: false,
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured on server.' });
      return;
    }

    try {
      const validHomeCareIds = (whoHomeCare as HomeCareProtocol[]).map((h) => h.id).join(', ');
      const validEmergencyIds = (emergencyFirstAidList as Array<{ id: string }>).map((e) => e.id).join(', ');
      const contextText = [
        `PERSON PROFILE (anonymized, no PII): relationship=${personContext.relationship}, ageMonths=${personContext.ageMonths}, sex=${personContext.sex}, bloodGroup=${personContext.bloodGroup}, pregnant=${personContext.isPregnantOrLactating}`,
        personContext.chronicConditions.length ? `chronicConditions=${personContext.chronicConditions.join(',')}` : '',
        personContext.allergies.length ? `allergies=${personContext.allergies.join(',')}` : '',
        personContext.dailyMedicinesNote ? `userRecordedDailyRegimen=${sanitizePlainText(personContext.dailyMedicinesNote)}` : '',
        personContext.latestVitalsSummary ? `latestVitals=${sanitizePlainText(personContext.latestVitalsSummary)}` : '',
        history.length ? `recentChat:\n${history.map((h) => `${h.role}: ${sanitizePlainText(h.text)}`).join('\n')}` : '',
        `CURRENT MESSAGE: ${sanitizePlainText(message)}`,
        images.length ? `ATTACHED VISUAL MEDIA: ${images.length} camera frame(s) or report image(s). Inspect them carefully.` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        ...images.map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        })),
        { text: contextText },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction: [
            'You are Tibb (طب), a warm, calm, conversational primary-care & visual triage assistant for Pakistani households.',
            'Inspect any attached camera frame, wound/skin photo, meal photo, or printed lab/prescription image carefully and discuss what you observe clearly.',
            'NEVER prescribe, recommend, or dose ANY antibiotic, steroid, or prescription medicine. Include a non-diagnostic reminder.',
            'If the user expresses anxiety/panic without physical danger signs, set suggestCalmPacer=true and speak reassuringly.',
            'If hospital transport is far/delayed or critical trauma/burn/seizure/cardiac issue appears, set suggestFarHospitalMode=true.',
            'Always answer "Stay Home vs Go to Hospital" clearly via stayHomeGuidance.',
            `Choose emergencyCategory from [${validEmergencyIds}] ONLY if triageTier=RED; choose homeCareId from [${validHomeCareIds}] for mild non-emergency cases.`,
            'Provide natural, empathetic bilingual replies (reply_en and reply_ur) plus 2–3 helpful follow-up quickReplies.',
          ].join(' '),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['EMERGENCY_RED', 'NEEDS_CLARIFICATION', 'COMPLETE'] },
              triageTier: { type: Type.STRING, enum: ['RED', 'AMBER', 'GREEN'] },
              reply_en: { type: Type.STRING },
              reply_ur: { type: Type.STRING },
              reply_roman: { type: Type.STRING },
              emergencyCategory: { type: Type.STRING, nullable: true },
              homeCareId: { type: Type.STRING, nullable: true },
              suggestCalmPacer: { type: Type.BOOLEAN },
              suggestFarHospitalMode: { type: Type.BOOLEAN },
              stayHomeGuidance: {
                type: Type.OBJECT,
                properties: {
                  verdict: { type: Type.STRING, enum: ['STAY_HOME', 'RECHECK_AND_CLINIC', 'EMERGENCY_1122'] },
                  title_en: { type: Type.STRING },
                  title_ur: { type: Type.STRING },
                  explanation_en: { type: Type.STRING },
                  explanation_ur: { type: Type.STRING },
                  actionSteps_en: { type: Type.ARRAY, items: { type: Type.STRING } },
                  actionSteps_ur: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['verdict', 'title_en', 'title_ur', 'explanation_en', 'explanation_ur', 'actionSteps_en', 'actionSteps_ur'],
              },
              quickReplies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label_en: { type: Type.STRING },
                    label_ur: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['status', 'triageTier', 'reply_en', 'reply_ur', 'suggestCalmPacer', 'suggestFarHospitalMode', 'stayHomeGuidance', 'quickReplies'],
          },
        },
      });

      const out = JSON.parse((response.text ?? '{}').trim()) as {
        status: 'EMERGENCY_RED' | 'NEEDS_CLARIFICATION' | 'COMPLETE';
        triageTier: 'RED' | 'AMBER' | 'GREEN';
        reply_en: string;
        reply_ur: string;
        reply_roman?: string;
        emergencyCategory?: string | null;
        homeCareId?: string | null;
        suggestCalmPacer: boolean;
        suggestFarHospitalMode: boolean;
        stayHomeGuidance: {
          verdict: 'STAY_HOME' | 'RECHECK_AND_CLINIC' | 'EMERGENCY_1122';
          title_en: string;
          title_ur: string;
          explanation_en: string;
          explanation_ur: string;
          actionSteps_en: string[];
          actionSteps_ur: string[];
        };
        quickReplies: Array<{ label_en: string; label_ur: string }>;
      };

      const homeCare =
        (whoHomeCare as HomeCareProtocol[]).find((h) => h.id === out.homeCareId) ?? null;
      const ref = (diseaseReference as DiseaseReferenceCard[])[0];

      const rxCheck = verifyAgainstClinicalGroundTruth(sanitizePlainText(out.reply_en), {
        ageMonths: personContext.ageMonths,
        homeCare: homeCare ?? (whoHomeCare as HomeCareProtocol[])[0],
        diseaseRef: ref,
        triageTier: out.triageTier,
      });

      const isRed = out.status === 'EMERGENCY_RED' || out.triageTier === 'RED';
      const validCats = new Set((emergencyFirstAidList as Array<{ id: string }>).map((e) => e.id));
      const emCat = (validCats.has(out.emergencyCategory || '')
        ? out.emergencyCategory
        : 'BREATHING_DISTRESS') as EmergencyCategory;

      res.json({
        status: isRed ? 'EMERGENCY_RED' : out.status,
        triageTier: isRed ? 'RED' : out.triageTier,
        reply_en: rxCheck.amrBlocked
          ? 'Tibb cannot prescribe or name antibiotics or prescription medications. Please focus on symptoms and share them with a licensed doctor.'
          : sanitizePlainText(out.reply_en),
        reply_ur: rxCheck.amrBlocked
          ? 'طب اینٹی بائیوٹکس یا ڈاکٹر کے نسخے والی ادویات تجویز نہیں کرتا۔ براہِ کرم اپنی علامات ڈاکٹر کو دکھائیں۔'
          : sanitizePlainText(out.reply_ur),
        reply_roman: out.reply_roman ? sanitizePlainText(out.reply_roman) : undefined,
        emergencyCategory: isRed ? emCat : null,
        firstAid: isRed ? getEmergencyFirstAid(emCat) : null,
        matchedHomeCare: !isRed ? homeCare : null,
        stayHomeGuidance: {
          ...out.stayHomeGuidance,
          disclaimer_en: 'Supportive guidance only — not a medical diagnosis.',
          disclaimer_ur: 'یہ صرف معلوماتی رہنمائی ہے، باقاعدہ طبی تشخیص کا متبادل نہیں۔',
        },
        suggestCalmPacer: Boolean(out.suggestCalmPacer),
        suggestFarHospitalMode: Boolean(out.suggestFarHospitalMode || isRed),
        quickReplies: (out.quickReplies ?? []).slice(0, 3),
        engineUsed: 'GEMINI_4_HYDROGEN_MULTIMODAL',
        amrBlocked: rxCheck.amrBlocked,
      });
    } catch (err) {
      res.status(502).json({
        error: isProduction
          ? 'Clinical assistant temporarily unavailable.'
          : err instanceof Error
            ? err.message
            : 'Multimodal clinical chat failed.',
      });
    }
  });

  /**
   * Conversational Step-by-Step AI Clinical Triage Agent (Gemini 4 Hydrogen + Grounded WHO/DRAP Guard).
   * Supports immediate direct emergency detection from text/voice without long forms.
   */
  app.post('/api/agent/triage', rateLimit(35, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = AgentTriageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid triage message payload.' });
      return;
    }

    const { message, ageMonths, sex, history } = parsed.data;
    if (containsPii(message)) {
      res.status(400).json({ error: 'Remove CNIC numbers, phone numbers, or emails before sending.' });
      return;
    }

    // Check deterministic Red-Flag text guard first (< 1ms)
    const fastCheck = detectEmergencyFromText(message);
    if (fastCheck.isEmergency && fastCheck.category) {
      const firstAid = getEmergencyFirstAid(fastCheck.category);
      res.json({
        status: 'EMERGENCY_RED',
        triageTier: 'RED',
        emergencyCategory: fastCheck.category,
        firstAid,
        summary_en: `${fastCheck.reason_en}. Call 1122 immediately and follow the first-aid steps below right now.`,
        summary_ur: `${fastCheck.reason_ur}۔ فوری 1122 پر کال کریں اور نیچے دی گئی ابتدائی طبی امداد پر فوراً عمل کریں۔`,
        nextQuestion_en: null,
        nextQuestion_ur: null,
        quickReplies: [],
        homeCareId: null,
        engineUsed: 'DETERMINISTIC_WHO_RED_FLAG',
        amrBlocked: false,
      });
      return;
    }

    // Check DRAP antibiotic request upfront
    const amrPreCheck = verifyAgainstClinicalGroundTruth(message, {
      ageMonths,
      homeCare: (whoHomeCare as HomeCareProtocol[])[0],
      diseaseRef: (diseaseReference as DiseaseReferenceCard[])[0],
      triageTier: 'GREEN',
    });
    if (amrPreCheck.amrBlocked) {
      res.json({
        status: 'NEEDS_CLARIFICATION',
        triageTier: 'AMBER',
        emergencyCategory: null,
        firstAid: null,
        summary_en:
          'Tibb cannot recommend or dose antibiotics, steroids, or prescription drugs. Please tell me your main symptoms so I can check safe WHO care or clinic urgency.',
        summary_ur:
          'طب اینٹی بائیوٹکس یا ڈاکٹر کے نسخے والی ادویات تجویز نہیں کرتا۔ براہِ کرم اپنی اصل علامات بتائیں تاکہ محفوظ رہنمائی دی جا سکے۔',
        nextQuestion_en: 'How long have the symptoms lasted, and is there any high fever or breathing trouble?',
        nextQuestion_ur: 'یہ علامات کتنے گھنٹوں یا دنوں سے ہیں، اور کیا تیز بخار یا سانس کی تکلیف ہے؟',
        quickReplies: [
          { label_en: 'Less than 24 hours', label_ur: '24 گھنٹے سے کم' },
          { label_en: 'More than 2 days', label_ur: '2 دن سے زیادہ' },
          { label_en: 'Breathing feels fast', label_ur: 'سانس تیز چل رہی ہے' },
        ],
        homeCareId: 'mild_fever',
        engineUsed: 'DRAP_AMR_GUARD',
        amrBlocked: true,
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server secrets. Offline deterministic checkup remains active.',
      });
      return;
    }

    try {
      const validHomeCareIds = (whoHomeCare as HomeCareProtocol[]).map((h) => h.id).join(', ');
      const validEmergencyIds = (emergencyFirstAidList as Array<{ id: string }>).map((e) => e.id).join(', ');

      const conversationTranscript = history
        .map((h) => `${h.role === 'user' ? 'Patient' : 'Tibb'}: ${sanitizePlainText(h.text)}`)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${conversationTranscript ? `Prior conversation:\n${conversationTranscript}\n` : ''}Current message: ${sanitizePlainText(message)}\nPatient ageMonths=${ageMonths}, sex=${sex}`,
        config: {
          systemInstruction: [
            'You are Tibb, a calm, safety-first Pakistani clinical triage assistant.',
            'NEVER prescribe, name, or dose ANY medicine, antibiotic, syrup, or brand (no Panadol, Augmentin, Amoxicillin, Brufen, etc.).',
            'NEVER give a definitive disease diagnosis ("you have typhoid/dengue"). Use triage framing only.',
            'Keep answers concise and grounded strictly in WHO primary care & first aid.',
            `If ANY life-threatening emergency is described, set status="EMERGENCY_RED", triageTier="RED", and choose emergencyCategory from [${validEmergencyIds}].`,
            `If enough context exists for safe non-emergency home care or clinic visit, set status="COMPLETE", triageTier="GREEN" or "AMBER", and choose homeCareId from [${validHomeCareIds}].`,
            'If 1 critical clarifying detail is needed (e.g. duration, fluid intake, infant age, breathing), set status="NEEDS_CLARIFICATION" and ask ONE clear question in both English and Urdu with 2–3 short quickReplies.',
          ].join(' '),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ['EMERGENCY_RED', 'NEEDS_CLARIFICATION', 'COMPLETE'] },
              triageTier: { type: Type.STRING, enum: ['RED', 'AMBER', 'GREEN'] },
              emergencyCategory: { type: Type.STRING, nullable: true },
              homeCareId: { type: Type.STRING, nullable: true },
              summary_en: { type: Type.STRING },
              summary_ur: { type: Type.STRING },
              nextQuestion_en: { type: Type.STRING, nullable: true },
              nextQuestion_ur: { type: Type.STRING, nullable: true },
              quickReplies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label_en: { type: Type.STRING },
                    label_ur: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['status', 'triageTier', 'summary_en', 'summary_ur', 'quickReplies'],
          },
        },
      });

      const parsedJson = JSON.parse((response.text ?? '{}').trim()) as {
        status: 'EMERGENCY_RED' | 'NEEDS_CLARIFICATION' | 'COMPLETE';
        triageTier: 'RED' | 'AMBER' | 'GREEN';
        emergencyCategory?: string | null;
        homeCareId?: string | null;
        summary_en: string;
        summary_ur: string;
        nextQuestion_en?: string | null;
        nextQuestion_ur?: string | null;
        quickReplies?: Array<{ label_en: string; label_ur: string }>;
      };

      // Cross-verify Gemini text against DRAP Rx blocklist & infant contraindications
      const homeCare =
        (whoHomeCare as HomeCareProtocol[]).find((h) => h.id === parsedJson.homeCareId) ??
        (whoHomeCare as HomeCareProtocol[])[0];
      const ref = (diseaseReference as DiseaseReferenceCard[])[0];

      const safeSummaryEn = sanitizePlainText(parsedJson.summary_en || '');
      const safeSummaryUr = sanitizePlainText(parsedJson.summary_ur || '');

      if (parsedJson.status === 'EMERGENCY_RED' || parsedJson.triageTier === 'RED') {
        const validCats = new Set((emergencyFirstAidList as Array<{ id: string }>).map((e) => e.id));
        const cat = (validCats.has(parsedJson.emergencyCategory || '')
          ? parsedJson.emergencyCategory
          : 'BREATHING_DISTRESS') as EmergencyCategory;
        res.json({
          status: 'EMERGENCY_RED',
          triageTier: 'RED',
          emergencyCategory: cat,
          firstAid: getEmergencyFirstAid(cat),
          summary_en: safeSummaryEn,
          summary_ur: safeSummaryUr,
          nextQuestion_en: null,
          nextQuestion_ur: null,
          quickReplies: [],
          homeCareId: null,
          engineUsed: 'GEMINI_4_HYDROGEN',
          amrBlocked: false,
        });
        return;
      }

      // Check DRAP safety filter on Gemini output
      const rxCheck = verifyAgainstClinicalGroundTruth(safeSummaryEn, {
        ageMonths,
        homeCare,
        diseaseRef: ref,
        triageTier: parsedJson.triageTier,
      });

      const finalSummaryEn = rxCheck.amrBlocked
        ? `${homeCare.title_en}: ${homeCare.steps_en[0]} ${homeCare.escalation_warning_en}`
        : safeSummaryEn;
      const finalSummaryUr = rxCheck.amrBlocked
        ? `${homeCare.title_ur}: ${homeCare.steps_ur[0]} ${homeCare.escalation_warning_ur}`
        : safeSummaryUr;

      res.json({
        status: parsedJson.status,
        triageTier: parsedJson.triageTier,
        emergencyCategory: null,
        firstAid: null,
        summary_en: finalSummaryEn,
        summary_ur: finalSummaryUr,
        nextQuestion_en: parsedJson.nextQuestion_en ? sanitizePlainText(parsedJson.nextQuestion_en) : null,
        nextQuestion_ur: parsedJson.nextQuestion_ur ? sanitizePlainText(parsedJson.nextQuestion_ur) : null,
        quickReplies: (parsedJson.quickReplies ?? []).slice(0, 4),
        homeCareId: homeCare.id,
        matchedHomeCare: parsedJson.status === 'COMPLETE' ? homeCare : null,
        engineUsed: 'GEMINI_4_HYDROGEN',
        amrBlocked: rxCheck.amrBlocked,
      });
    } catch (err) {
      const msg = isProduction
        ? 'Clinical triage assistant temporarily unavailable.'
        : err instanceof Error
          ? err.message
          : 'Gemini agent call failed.';
      res.status(502).json({ error: msg });
    }
  });

  /**
   * Voice Transcription via Gemini 3.5 Transcribe (Urdu / English / Roman Urdu).
   */
  app.post('/api/agent/transcribe', rateLimit(20, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = TranscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid audio payload.' });
      return;
    }
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured for cloud audio transcription.' });
      return;
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: parsed.data.mimeType,
                data: parsed.data.audioBase64,
              },
            },
            {
              text: 'Transcribe the spoken medical symptoms accurately in the spoken language (Urdu script or English). Output only the transcription text.',
            },
          ],
        },
      });
      const transcript = sanitizePlainText(response.text ?? '');
      res.json({ transcript, engineUsed: 'GEMINI_3_5_TRANSCRIBE' });
    } catch (err) {
      res.status(502).json({
        error: isProduction
          ? 'Audio transcription temporarily unavailable.'
          : err instanceof Error
            ? err.message
            : 'Audio transcription failed.',
      });
    }
  });

  /**
   * Natural Urdu / English Speech Output via Gemini 3.8 Flash Lite TTS.
   */
  app.post('/api/agent/tts', rateLimit(25, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = TtsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid TTS payload.' });
      return;
    }
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured for TTS.' });
      return;
    }
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: parsed.data.text,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        res.status(502).json({ error: 'No audio returned by TTS model.' });
        return;
      }
      res.json({ audioBase64, mimeType: 'audio/wav' });
    } catch (err) {
      res.status(502).json({
        error: isProduction
          ? 'Text-to-speech synthesis temporarily unavailable.'
          : err instanceof Error
            ? err.message
            : 'TTS synthesis failed.',
      });
    }
  });

  app.post('/api/explain', rateLimit(30, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = ExplainRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid clinical explanation payload.' });
      return;
    }

    const { ageMonths, triageTier, homeCareId, diseaseRefId, userConcern } = parsed.data;
    if (containsPii(userConcern)) {
      res.status(400).json({ error: 'Personal identifiers (CNIC or phone numbers) are not permitted.' });
      return;
    }

    const homeCare = (whoHomeCare as HomeCareProtocol[]).find((h) => h.id === homeCareId) ?? null;
    const diseaseRef =
      (diseaseReference as DiseaseReferenceCard[]).find((d) => d.id === diseaseRefId) ??
      (diseaseReference as DiseaseReferenceCard[])[0];

    if (triageTier === 'RED') {
      res.json({
        explanation_en: diseaseRef.verified_facts_en.join(' '),
        explanation_ur: diseaseRef.verified_facts_ur.join(' '),
        explanation_roman: 'Khatray ki alamat zahir hui hai. Fori haspatal jayein ya 1122 par call karein.',
        sourceCitation: diseaseRef.title_en,
        safety_verified: true,
      });
      return;
    }

    const safeEn = homeCare
      ? `${homeCare.title_en}: ${homeCare.steps_en.slice(0, 2).join(' ')} ${homeCare.escalation_warning_en}`
      : diseaseRef.verified_facts_en.join(' ');
    const safeUr = homeCare
      ? `${homeCare.title_ur}: ${homeCare.steps_ur.slice(0, 2).join(' ')} ${homeCare.escalation_warning_ur}`
      : diseaseRef.verified_facts_ur.join(' ');
    const safeRoman = homeCare
      ? `${homeCare.title_roman}: ${homeCare.steps_roman.slice(0, 2).join(' ')}`
      : diseaseRef.verified_facts_en[0];

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Verified clinical facts:\n${safeEn}${userConcern ? `\nUser follow-up question: ${sanitizePlainText(userConcern)}` : ''}`,
          config: {
            systemInstruction:
              'Rephrase ONLY the verified clinical facts clearly and empathetically in 2-3 short sentences. NEVER mention antibiotics, brands, dosages, or new numbers.',
          },
        });
        const candidate = response.text ?? '';
        const audit = verifyAgainstClinicalGroundTruth(candidate, {
          ageMonths,
          homeCare,
          diseaseRef,
          triageTier,
        });
        if (audit.passed) {
          res.json({
            explanation_en: audit.sanitizedText,
            explanation_ur: safeUr,
            explanation_roman: safeRoman,
            sourceCitation: homeCare?.sourceCitation ?? diseaseRef.title_en,
            safety_verified: true,
          });
          return;
        }
      } catch {
        // Fallback to verified deterministic ground-truth summary below
      }
    }

    res.json({
      explanation_en: safeEn,
      explanation_ur: safeUr,
      explanation_roman: safeRoman,
      sourceCitation: homeCare?.sourceCitation ?? diseaseRef.title_en,
      safety_verified: true,
    });
  });

  app.post('/api/telemetry', rateLimit(60, 60_000), (req, res) => {
    const parsed = TelemetryEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid telemetry schema.' });
      return;
    }
    if (!telemetryStore.has(parsed.data.eventId)) {
      telemetryStore.set(parsed.data.eventId, parsed.data);
    }
    res.status(202).json({ accepted: true, eventId: parsed.data.eventId });
  });

  app.get('/api/telemetry/summary', (_req, res) => {
    const byDistrict = new Map<string, { total: number; red: number; amrBlocks: number }>();
    for (const evt of telemetryStore.values()) {
      const curr = byDistrict.get(evt.districtCode) ?? { total: 0, red: 0, amrBlocks: 0 };
      curr.total += 1;
      if (evt.triageTier === 'RED') curr.red += 1;
      if (evt.amrBlockTriggered) curr.amrBlocks += 1;
      byDistrict.set(evt.districtCode, curr);
    }
    const cohorts = Array.from(byDistrict.entries())
      .filter(([, counts]) => counts.total >= 10)
      .map(([districtCode, counts]) => ({ districtCode, ...counts }));

    res.json({
      totalEvents: telemetryStore.size,
      kAnonymityThreshold: 10,
      cohorts,
    });
  });

  const WellnessPlanSchema = z.object({
    goal: z.enum([
      'BALANCED',
      'WEIGHT_LOSS',
      'MUSCLE_GAIN',
      'DIABETES_CONTROL',
      'BP_FRIENDLY',
      'ENERGY_STRENGTH',
      'SENIOR_MOBILITY',
    ]),
    ageMonths: z.number().int().min(12).max(1440).default(360),
    sex: z.enum(['M', 'F', 'O']).default('O'),
    heightCm: z.number().min(40).max(240).optional(),
    weightKg: z.number().min(5).max(250).optional(),
    chronicConditions: z.array(z.string().max(48)).max(10).default([]),
    allergies: z.array(z.string().max(48)).max(10).default([]),
  });

  app.post('/api/wellness/plan', rateLimit(25, 60_000), dailyAiCap(180), async (req, res) => {
    const parsed = WellnessPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid wellness plan parameters.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY not configured on server.' });
      return;
    }

    const { goal, ageMonths, sex, heightCm, weightKg, chronicConditions, allergies } = parsed.data;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          `Goal: ${goal}`,
          `AgeMonths: ${ageMonths}, Sex: ${sex}`,
          heightCm ? `HeightCm: ${heightCm}` : '',
          weightKg ? `WeightKg: ${weightKg}` : '',
          chronicConditions.length ? `ChronicConditions: ${chronicConditions.join(', ')}` : 'ChronicConditions: None',
          allergies.length ? `Allergies (STRICTLY AVOID): ${allergies.join(', ')}` : 'Allergies: None',
        ]
          .filter(Boolean)
          .join('\n'),
        config: {
          systemInstruction:
            'You are Tibb Wellness Coach for Pakistani households. Create a safe, culturally realistic Desi Pakistani 1-day meal guide (whole-wheat roti, daal, sabzi, grilled protein, lassi/dahi, oats) and safe age-appropriate home workout plan tailored to the profile. NEVER prescribe drugs, supplements, or steroids. Respect all chronic conditions (low sodium for BP, low GI complex carbs for diabetes) and allergies.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dailyWaterGoalMl: { type: Type.INTEGER },
              dailyStepsGoal: { type: Type.INTEGER },
              dietMeals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slot: { type: Type.STRING, enum: ['Breakfast', 'Mid-Day Snack', 'Lunch', 'Dinner'] },
                    title_en: { type: Type.STRING },
                    title_ur: { type: Type.STRING },
                    portions_en: { type: Type.STRING },
                    portions_ur: { type: Type.STRING },
                    caloriesApprox: { type: Type.INTEGER },
                  },
                  required: ['slot', 'title_en', 'title_ur', 'portions_en', 'portions_ur', 'caloriesApprox'],
                },
              },
              workoutRoutine: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name_en: { type: Type.STRING },
                    name_ur: { type: Type.STRING },
                    durationOrReps: { type: Type.STRING },
                    intensity: { type: Type.STRING, enum: ['Gentle', 'Moderate', 'Brisk'] },
                    tip_en: { type: Type.STRING },
                  },
                  required: ['name_en', 'name_ur', 'durationOrReps', 'intensity', 'tip_en'],
                },
              },
              avoidNotes_en: { type: Type.ARRAY, items: { type: Type.STRING } },
              avoidNotes_ur: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['dailyWaterGoalMl', 'dailyStepsGoal', 'dietMeals', 'workoutRoutine', 'avoidNotes_en', 'avoidNotes_ur'],
          },
        },
      });

      const raw = JSON.parse(response.text || '{}');
      res.json({
        ...raw,
        goal,
        engineUsed: 'GEMINI_4_HYDROGEN_WELLNESS',
      });
    } catch {
      res.status(502).json({ error: 'Unable to generate online wellness plan right now.' });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts missing.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tibb clinical server listening on http://localhost:${PORT}`);
  });
}

if (process.env.VITEST !== 'true') {
  startServer();
}
