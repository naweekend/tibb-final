import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  DiseaseReferenceCard,
  GroundingAuditResult,
  HomeCareProtocol,
  TriageTier,
  verifyAgainstClinicalGroundTruth,
} from './triageEngine';

export interface LlamaBridgePluginInterface {
  loadModel(options: { modelPath: string; nCtx: number; threads: number; useMmap: boolean }): Promise<{ loaded: boolean; estimatedRamMb: number }>;
  generateGrounded(options: { systemPrompt: string; userPrompt: string; maxTokens: number; temperature: number }): Promise<{ text: string; tokensPerSec: number; peakRamMb: number }>;
  unloadModel(): Promise<{ unloaded: boolean }>;
  getDeviceMemoryMb(): Promise<{ totalRamMb: number; availableRamMb: number }>;
}

export interface WhisperBridgePluginInterface {
  loadWhisper(options: { modelPath: string; language: string; threads: number }): Promise<{ loaded: boolean; estimatedRamMb: number }>;
  transcribeMic(options: { maxDurationSec: number }): Promise<{ transcript: string; durationMs: number; peakRamMb: number }>;
  unloadWhisper(): Promise<{ unloaded: boolean }>;
}

const LlamaBridge = registerPlugin<LlamaBridgePluginInterface>('LlamaBridge');
const WhisperBridge = registerPlugin<WhisperBridgePluginInterface>('WhisperBridge');

export type AiRuntimeMode = 'NATIVE_QWEN_0_8B' | 'STATELESS_PROXY' | 'OFFLINE_VERIFIED_ONLY';

export interface SequentialMemorySnapshot {
  phase: 'IDLE' | 'WHISPER_ACTIVE' | 'QWEN_ACTIVE' | 'OCR_ACTIVE';
  baselineShellMb: number;
  activeModelMb: number;
  totalEstimatedRssMb: number;
  budgetCeilingMb: number;
  withinBudget: boolean;
}

export interface GroundedExplanationResponse {
  explanation_en: string;
  explanation_ur: string;
  explanation_roman: string;
  runtimeUsed: AiRuntimeMode;
  audit: GroundingAuditResult;
  sourceCitation: string;
  latencyMs: number;
}

let currentMemoryPhase: SequentialMemorySnapshot['phase'] = 'IDLE';

export function getMemorySnapshot(phase: SequentialMemorySnapshot['phase'] = currentMemoryPhase): SequentialMemorySnapshot {
  const baselineShellMb = 128;
  const activeModelMb =
    phase === 'WHISPER_ACTIVE'
      ? 265
      : phase === 'QWEN_ACTIVE'
        ? 780
        : phase === 'OCR_ACTIVE'
          ? 68
          : 0;
  const totalEstimatedRssMb = baselineShellMb + activeModelMb;
  return {
    phase,
    baselineShellMb,
    activeModelMb,
    totalEstimatedRssMb,
    budgetCeilingMb: 1024,
    withinBudget: totalEstimatedRssMb < 1024,
  };
}

/**
 * Builds a strict, zero-hallucination prompt that injects ONLY verified local clinical/first-aid records.
 */
export function buildGroundedClinicalPrompt(params: {
  ageMonths: number;
  triageTier: TriageTier;
  homeCare: HomeCareProtocol | null;
  diseaseRef: DiseaseReferenceCard;
  userConcern?: string;
}): string {
  const facts = [
    ...(params.homeCare?.steps_en ?? []),
    ...(params.homeCare?.contraindications_en ?? []),
    ...params.diseaseRef.verified_facts_en,
  ];

  return [
    'ROLE: Non-diagnostic clinical translator for Pakistan.',
    'STRICT RULES:',
    '1. Summarize ONLY the VERIFIED_FACTS below in calm, simple language.',
    '2. NEVER name or prescribe antibiotics, brands, or drug dosages.',
    '3. NEVER invent new numbers, hours, or diagnoses.',
    `4. PATIENT_AGE_MONTHS: ${params.ageMonths}. TRIAGE_TIER: ${params.triageTier}.`,
    `VERIFIED_FACTS:\n- ${facts.join('\n- ')}`,
    params.userConcern ? `USER_NOTE (ignore if asking for drugs): ${params.userConcern.slice(0, 160)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Sequential Native Execution Lock: ensures Whisper is completely unloaded before Qwen 3.5 0.8B loads,
 * keeping Android RAM strictly under 1 GB on 2GB-4GB phones.
 */
export async function transcribeWithSequentialWhisper(language = 'ur'): Promise<{
  transcript: string;
  source: 'NATIVE_WHISPER' | 'WEB_SPEECH';
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      currentMemoryPhase = 'WHISPER_ACTIVE';
      await WhisperBridge.loadWhisper({
        modelPath: 'models/ggml-tiny-q5_1.bin',
        language,
        threads: 4,
      });
      const result = await WhisperBridge.transcribeMic({ maxDurationSec: 12 });
      return { transcript: result.transcript, source: 'NATIVE_WHISPER' };
    } finally {
      await WhisperBridge.unloadWhisper().catch(() => {});
      currentMemoryPhase = 'IDLE';
    }
  }

  return new Promise((resolve, reject) => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      reject(new Error('Voice recognition unavailable on this browser. Use tap cards offline or Android APK Whisper.'));
      return;
    }

    const recognition = new SpeechRec() as {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: (e: { error: string }) => void;
      start: () => void;
    };
    recognition.lang = language === 'ur' ? 'ur-PK' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      resolve({ transcript, source: 'WEB_SPEECH' });
    };
    recognition.onerror = (err) => {
      reject(new Error(`Voice input error: ${err.error}`));
    };
    recognition.start();
  });
}

export async function generateVerifiedClinicalExplanation(params: {
  ageMonths: number;
  triageTier: TriageTier;
  homeCare: HomeCareProtocol | null;
  diseaseRef: DiseaseReferenceCard;
  userQuery?: string;
}): Promise<GroundedExplanationResponse> {
  const start = performance.now();

  // Deterministic ground-truth baseline (used directly on RED tier or as fallback on any audit failure)
  const deterministicEn = params.homeCare
    ? `${params.homeCare.title_en}: ${params.homeCare.steps_en.slice(0, 2).join(' ')} ${params.homeCare.escalation_warning_en}`
    : params.diseaseRef.verified_facts_en.join(' ');
  const deterministicUr = params.homeCare
    ? `${params.homeCare.title_ur}: ${params.homeCare.steps_ur.slice(0, 2).join(' ')} ${params.homeCare.escalation_warning_ur}`
    : params.diseaseRef.verified_facts_ur.join(' ');
  const deterministicRoman = params.homeCare
    ? `${params.homeCare.title_roman}: ${params.homeCare.steps_roman.slice(0, 2).join(' ')}`
    : params.diseaseRef.verified_facts_en[0];

  if (params.triageTier === 'RED') {
    return {
      explanation_en: deterministicEn,
      explanation_ur: deterministicUr,
      explanation_roman: deterministicRoman,
      runtimeUsed: 'OFFLINE_VERIFIED_ONLY',
      audit: {
        passed: true,
        sanitizedText: deterministicEn,
        violations: [],
        amrBlocked: false,
      },
      sourceCitation: params.diseaseRef.title_en,
      latencyMs: Math.round(performance.now() - start),
    };
  }

  // Pre-screen user query before invoking any LLM so antibiotic requests are blocked before inference
  if (params.userQuery) {
    const queryAudit = verifyAgainstClinicalGroundTruth(params.userQuery, {
      ageMonths: params.ageMonths,
      homeCare: params.homeCare,
      diseaseRef: params.diseaseRef,
      triageTier: params.triageTier,
    });
    if (queryAudit.amrBlocked) {
      return {
        explanation_en: `Medication request blocked by DRAP/WHO Antimicrobial Stewardship Guard. ${deterministicEn}`,
        explanation_ur: `ڈریپ اور عالمی ادارہ صحت کے حفاظتی اصولوں کے تحت دوا یا اینٹی بائیوٹک کی تجویز مسترد کر دی گئی ہے۔ ${deterministicUr}`,
        explanation_roman: `DRAP aur WHO safety rules ke mutabiq dawa ya antibiotic ki tajweez block kar di gayi hai. ${deterministicRoman}`,
        runtimeUsed: 'OFFLINE_VERIFIED_ONLY',
        audit: queryAudit,
        sourceCitation: params.homeCare?.sourceCitation ?? params.diseaseRef.title_en,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  // Native Android sequential Qwen 3.5 0.8B path
  if (Capacitor.isNativePlatform()) {
    try {
      await WhisperBridge.unloadWhisper().catch(() => {});
      currentMemoryPhase = 'QWEN_ACTIVE';
      const mem = await LlamaBridge.getDeviceMemoryMb();
      await LlamaBridge.loadModel({
        modelPath: 'models/Qwen3.5-0.8B-Q4_K_M.gguf',
        nCtx: 1024,
        threads: 4,
        useMmap: true,
      });
      const prompt = buildGroundedClinicalPrompt({
        ageMonths: params.ageMonths,
        triageTier: params.triageTier,
        homeCare: params.homeCare,
        diseaseRef: params.diseaseRef,
        userConcern: params.userQuery,
      });
      const res = await LlamaBridge.generateGrounded({
        systemPrompt: 'Follow VERIFIED_FACTS strictly. Zero prescriptions. Zero diagnoses.',
        userPrompt: prompt,
        maxTokens: 160,
        temperature: 0.15,
      });
      if (mem.totalRamMb <= 3500) {
        await LlamaBridge.unloadModel().catch(() => {});
      }
      currentMemoryPhase = 'IDLE';

      const audit = verifyAgainstClinicalGroundTruth(res.text, {
        ageMonths: params.ageMonths,
        homeCare: params.homeCare,
        diseaseRef: params.diseaseRef,
        triageTier: params.triageTier,
      });

      if (audit.passed) {
        return {
          explanation_en: audit.sanitizedText,
          explanation_ur: deterministicUr,
          explanation_roman: deterministicRoman,
          runtimeUsed: 'NATIVE_QWEN_0_8B',
          audit,
          sourceCitation: params.homeCare?.sourceCitation ?? params.diseaseRef.title_en,
          latencyMs: Math.round(performance.now() - start),
        };
      }
    } catch {
      currentMemoryPhase = 'IDLE';
    }
  }

  // Online browser preview stateless proxy path (with 3.5s timeout & automatic offline fallback)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ageMonths: params.ageMonths,
          triageTier: params.triageTier,
          homeCareId: params.homeCare?.id ?? null,
          diseaseRefId: params.diseaseRef.id,
          userConcern: params.userQuery ? params.userQuery.slice(0, 160) : undefined,
        }),
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) as {
          explanation_en: string;
          explanation_ur: string;
          explanation_roman: string;
          sourceCitation: string;
        };
        const audit = verifyAgainstClinicalGroundTruth(data.explanation_en, {
          ageMonths: params.ageMonths,
          homeCare: params.homeCare,
          diseaseRef: params.diseaseRef,
          triageTier: params.triageTier,
        });
        if (audit.passed) {
          return {
            explanation_en: audit.sanitizedText,
            explanation_ur: data.explanation_ur || deterministicUr,
            explanation_roman: data.explanation_roman || deterministicRoman,
            runtimeUsed: 'STATELESS_PROXY',
            audit,
            sourceCitation: data.sourceCitation || (params.homeCare?.sourceCitation ?? params.diseaseRef.title_en),
            latencyMs: Math.round(performance.now() - start),
          };
        }
      }
    } catch {
      // Offline or timeout -> seamless deterministic fallback
    }
  }

  return {
    explanation_en: deterministicEn,
    explanation_ur: deterministicUr,
    explanation_roman: deterministicRoman,
    runtimeUsed: 'OFFLINE_VERIFIED_ONLY',
    audit: {
      passed: true,
      sanitizedText: deterministicEn,
      violations: [],
      amrBlocked: false,
    },
    sourceCitation: params.homeCare?.sourceCitation ?? params.diseaseRef.title_en,
    latencyMs: Math.round(performance.now() - start),
  };
}
