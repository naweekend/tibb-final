import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Camera,
  Cpu,
  Flame,
  Globe,
  HeartPulse,
  Leaf,
  Lock,
  Mic,
  Play,
  Plus,
  Send,
  ShieldAlert,
  Square,
  Thermometer,
  Volume2,
  Wind,
} from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { speakOfflineGuidance } from '../engine/audioFeedback';
import { transcribeWithSequentialWhisper } from '../engine/localAiBridge';
import {
  BodyRegion,
  EmergencyCategory,
  EpisodeInput,
  EpisodeVitals,
  HydrationStatus,
  PatientProfile,
  TemperatureBand,
  TriageAnswers,
  TriageEvaluationResult,
  TriageTier,
  detectEmergencyFromText,
  evaluateCareEpisode,
} from '../engine/triageEngine';
import { useOnlineStatus } from './OfflineIndicator';
import { TibbGlobe } from './TibbGlobe';
import { VitalsEstimator } from './VitalsEstimator';

interface TriageWizardProps {
  accountId: string;
  workspace: 'GHARANA' | 'BHU';
  locale: AppLocale;
  profiles: PatientProfile[];
  onSaveProfile: (profile: PatientProfile) => Promise<void>;
  onCompleteEpisode: (input: EpisodeInput, result: TriageEvaluationResult) => Promise<void>;
  onTriggerSos: () => void;
  onOpenCameraChat?: () => void;
  onOpenRemedies?: () => void;
}

interface AgentTurn {
  role: 'user' | 'agent';
  text: string;
  text_ur?: string;
}

interface AgentQuestionState {
  summary_en: string;
  summary_ur: string;
  nextQuestion_en: string;
  nextQuestion_ur: string;
  quickReplies: Array<{ label_en: string; label_ur: string }>;
  engineUsed: string;
}

interface QuestionStep {
  key: keyof TriageAnswers;
  title_en: string;
  title_ur: string;
  title_roman: string;
  bodyRegions: BodyRegion[];
  maternalOnly?: boolean;
}

const QUESTION_BANK: QuestionStep[] = [
  {
    key: 'unableToDrink',
    title_en: 'Is the patient completely unable to drink or breastfeed?',
    title_ur: 'کیا مریض پانی یا ماں کا دودھ پینے سے بالکل قاصر ہے؟',
    title_roman: 'Kya mareez pani ya maa ka doodh bilkul nahi pee raha?',
    bodyRegions: ['HEAD_NECK', 'CHEST', 'ABDOMEN', 'SKIN_LIMBS', 'GENERAL_FEVER'],
  },
  {
    key: 'vomitsEverything',
    title_en: 'Does the patient vomit everything they swallow?',
    title_ur: 'کیا مریض جو کچھ کھاتا یا پیتا ہے فوراً قے کر دیتا ہے؟',
    title_roman: 'Kya mareez har khayi peeyi cheez ki ulti kar deta hai?',
    bodyRegions: ['ABDOMEN', 'GENERAL_FEVER', 'HEAD_NECK'],
  },
  {
    key: 'convulsions',
    title_en: 'Has the patient had convulsions or fits during this illness?',
    title_ur: 'کیا اس بیماری کے دوران مریض کو جھٹکے یا دورے پڑے ہیں؟',
    title_roman: 'Kya is bimari mein mareez ko jhatkay ya dauray paray hain?',
    bodyRegions: ['HEAD_NECK', 'GENERAL_FEVER'],
  },
  {
    key: 'lethargicOrUnconscious',
    title_en: 'Is the patient unusually drowsy, difficult to wake, or unconscious?',
    title_ur: 'کیا مریض غیر معمولی طور پر سست، غنودگی میں یا بے ہوش ہے؟',
    title_roman: 'Kya mareez behosh ya buhat zyada sust hai aur jaag nahi raha?',
    bodyRegions: ['HEAD_NECK', 'CHEST', 'ABDOMEN', 'SKIN_LIMBS', 'GENERAL_FEVER'],
  },
  {
    key: 'chestIndrawingOrStridor',
    title_en: 'Is the lower chest wall pulling inward when breathing, or is there noisy stridor?',
    title_ur: 'کیا سانس لیتے وقت پسلی اندر دھنس رہی ہے یا گلے سے سیٹی جیسی آواز آتی ہے؟',
    title_roman: 'Kya saans letay waqt pasli andar dhans rahi hai ya seeti ki awaaz hai?',
    bodyRegions: ['CHEST', 'GENERAL_FEVER'],
  },
  {
    key: 'crushingChestPain',
    title_en: 'Is there crushing chest pain, pressure, or pain spreading to arm or jaw?',
    title_ur: 'کیا سینے میں شدید دباؤ والا درد ہے جو بازو یا جبڑے تک پھیل رہا ہو؟',
    title_roman: 'Kya seenay mein shadeed dabao ya dard hai jo baazu ya jabray tak jaye?',
    bodyRegions: ['CHEST'],
  },
  {
    key: 'strokeFastSigns',
    title_en: 'Is there sudden facial droop, weakness on one side, or slurred speech?',
    title_ur: 'کیا چہرہ ایک طرف لٹک گیا ہے، بازو کمزور ہے یا زبان لڑکھڑا رہی ہے؟',
    title_roman: 'Kya chehra ek taraf jhuk gaya hai ya ek taraf kamzori aur bolnay mein masla hai?',
    bodyRegions: ['HEAD_NECK'],
  },
  {
    key: 'severeShortnessOfBreath',
    title_en: 'Is breathing severely laboured even while resting?',
    title_ur: 'کیا آرام کی حالت میں بھی سانس لینا انتہائی دشوار ہو رہا ہے؟',
    title_roman: 'Kya aaram ke waqt bhi saans lena buhat mushkil ho raha hai?',
    bodyRegions: ['CHEST'],
  },
  {
    key: 'uncontrolledBleeding',
    title_en: 'Is there active bleeding that will not stop with firm pressure?',
    title_ur: 'کیا جسم کے کسی حصے سے شدید خون بہہ رہا ہے جو دباؤ سے نہیں رک رہا؟',
    title_roman: 'Kya kahin se tez khoon beh raha hai jo dabao se nahi ruk raha?',
    bodyRegions: ['SKIN_LIMBS', 'ABDOMEN', 'HEAD_NECK'],
  },
  {
    key: 'stiffNeckOrPetechialRash',
    title_en: 'Is there a stiff neck or tiny purple/red spots that do not fade when pressed?',
    title_ur: 'کیا بخار کے ساتھ گردن اکڑی ہوئی ہے یا جلد پر نہ مٹنے والے سرخ/جامنی دھبے ہیں؟',
    title_roman: 'Kya gardan mein akrao hai ya jild par na mitnay walay surkh dhabbay hain?',
    bodyRegions: ['HEAD_NECK', 'SKIN_LIMBS', 'GENERAL_FEVER'],
  },
  {
    key: 'pregnancyDangerSigns',
    title_en: 'During pregnancy or postpartum: severe headache, blurred vision, or vaginal bleeding?',
    title_ur: 'حمل یا زچگی میں: شدید سر درد، نظر کی دھندلاہٹ یا خون بہنا؟',
    title_roman: 'Hamal mein: shadeed sar dard, nazar dhundli hona ya khoon aana?',
    bodyRegions: ['ABDOMEN', 'HEAD_NECK', 'GENERAL_FEVER'],
    maternalOnly: true,
  },
  {
    key: 'moderateDehydration',
    title_en: 'Are eyes sunken, mouth very dry, or urine absent for over 6 hours?',
    title_ur: 'کیا آنکھیں اندر دھنسی ہوئی ہیں، منہ خشک ہے یا 6 گھنٹے سے پیشاب نہیں آیا؟',
    title_roman: 'Kya aankhein dhansi hui hain ya 6 ghantay se peshab nahi aaya?',
    bodyRegions: ['ABDOMEN', 'GENERAL_FEVER'],
  },
  {
    key: 'bloodInStoolOrVomit',
    title_en: 'Have you noticed blood in stool or vomit?',
    title_ur: 'کیا پاخانے یا قے میں خون آیا ہے؟',
    title_roman: 'Kya pakhane ya ulti mein khoon aaya hai?',
    bodyRegions: ['ABDOMEN'],
  },
  {
    key: 'burnOrDeepWound',
    title_en: 'Is this a deep wound, animal bite, or burn larger than the patient palm?',
    title_ur: 'کیا یہ گہرا زخم، جانور کا کاٹا یا ہتھیلی سے بڑا جلا ہوا حصہ ہے؟',
    title_roman: 'Kya yeh gehra zakham, janwar ka kaata ya hatheli se bara jala hua hissa hai?',
    bodyRegions: ['SKIN_LIMBS'],
  },
  {
    key: 'persistentCoughOver14Days',
    title_en: 'Has cough persisted for more than 14 days?',
    title_ur: 'کیا کھانسی 14 دن سے زیادہ عرصے سے جاری ہے؟',
    title_roman: 'Kya khansi 14 din se zyada arsay se jari hai?',
    bodyRegions: ['CHEST'],
  },
];

const DEFAULT_ANSWERS: TriageAnswers = {
  unableToDrink: false,
  vomitsEverything: false,
  convulsions: false,
  lethargicOrUnconscious: false,
  chestIndrawingOrStridor: false,
  crushingChestPain: false,
  strokeFastSigns: false,
  severeShortnessOfBreath: false,
  uncontrolledBleeding: false,
  stiffNeckOrPetechialRash: false,
  pregnancyDangerSigns: false,
  moderateDehydration: false,
  bloodInStoolOrVomit: false,
  burnOrDeepWound: false,
  heatExhaustionSigns: false,
  persistentCoughOver14Days: false,
  primaryComplaint: 'FEVER',
};

function mapHomeCareToComplaint(homeCareId?: string | null): TriageAnswers['primaryComplaint'] {
  switch (homeCareId) {
    case 'mild_cough_cold':
      return 'COUGH_COLD';
    case 'mild_diarrhea_ors':
      return 'DIARRHEA';
    case 'minor_abrasion':
      return 'MINOR_WOUND';
    case 'minor_burn_first_aid':
      return 'MINOR_BURN';
    case 'heat_exhaustion_first_aid':
      return 'HEAT_EXHAUSTION';
    default:
      return 'FEVER';
  }
}

export const TriageWizard: React.FC<TriageWizardProps> = ({
  accountId,
  workspace,
  locale,
  profiles,
  onSaveProfile,
  onCompleteEpisode,
  onTriggerSos,
  onOpenCameraChat,
  onOpenRemedies,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';
  const isOnline = useOnlineStatus();

  const [mode, setMode] = useState<'AGENT' | 'FORM'>('AGENT');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id ?? '');
  useEffect(() => {
    if (profiles[0]?.id) setSelectedProfileId(profiles[0].id);
  }, [profiles[0]?.id]);

  // Live AI Agent state
  const [agentText, setAgentText] = useState('');
  const [agentHistory, setAgentHistory] = useState<AgentTurn[]>([]);
  const [agentQuestion, setAgentQuestion] = useState<AgentQuestionState | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Structured Form state
  const [stage, setStage] = useState<'INTAKE' | 'BODY_MAP' | 'QUESTIONS' | 'VITALS'>('INTAKE');
  const [creatingProfile, setCreatingProfile] = useState(profiles.length === 0);
  const [newName, setNewName] = useState('');
  const [ageUnit, setAgeUnit] = useState<'YEARS' | 'MONTHS'>('YEARS');
  const [ageValue, setAgeValue] = useState('28');
  const [newSex, setNewSex] = useState<'M' | 'F' | 'O'>('F');
  const [isPregnant, setIsPregnant] = useState(false);
  const [chronicList, setChronicList] = useState<string[]>([]);

  const [durationHours, setDurationHours] = useState(18);
  const [temperatureBand, setTemperatureBand] = useState<TemperatureBand>('MILD_FEVER');
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>('NORMAL');
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>('GENERAL_FEVER');
  const [primaryComplaint, setPrimaryComplaint] = useState<TriageAnswers['primaryComplaint']>('FEVER');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<TriageAnswers>(DEFAULT_ANSWERS);
  const [vitals, setVitals] = useState<EpisodeVitals>({ measurementMethod: 'NONE' });
  const [voiceStatus, setVoiceStatus] = useState('');

  const fallbackProfile: PatientProfile = profiles.find((p) => p.id === selectedProfileId) ??
    profiles[0] ?? {
      id: `pat_quick_${accountId.slice(0, 6)}`,
      accountId,
      name: workspace === 'BHU' ? 'Walk-In Patient' : 'Self / Family',
      ageMonths: 336,
      sex: 'O',
      isPregnantOrLactating: false,
      chronicConditions: [],
      allergies: [],
      workspace,
    };

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0];

  const finishEmergencyImmediately = async (category: EmergencyCategory, complaintText: string) => {
    const emergencyAnswers: TriageAnswers = {
      ...DEFAULT_ANSWERS,
      crushingChestPain: category === 'CHEST_PAIN',
      strokeFastSigns: category === 'STROKE_FAST',
      severeShortnessOfBreath: category === 'BREATHING_DISTRESS',
      convulsions: category === 'SEIZURE_CONVULSIONS',
      uncontrolledBleeding: category === 'UNCONTROLLED_BLEEDING',
      lethargicOrUnconscious: category === 'UNCONSCIOUS_FAINTING',
      pregnancyDangerSigns: category === 'MATERNAL_EMERGENCY',
      burnOrDeepWound: category === 'SEVERE_BURN',
    };
    const input: EpisodeInput = {
      patient: fallbackProfile,
      bodyRegion: category === 'CHEST_PAIN' || category === 'BREATHING_DISTRESS' ? 'CHEST' : 'GENERAL_FEVER',
      durationHours: 1,
      temperatureBand: 'NORMAL',
      hydrationStatus: 'NORMAL',
      vitals,
      answers: emergencyAnswers,
      emergencyOverrideCategory: category,
    };
    const result = evaluateCareEpisode(input);
    // Keep complaint snippet non-PII if needed only in memory
    void complaintText;
    await onCompleteEpisode(input, result);
  };

  const submitAgentMessage = async (msgText: string) => {
    const clean = msgText.trim();
    if (!clean) return;
    setAgentError('');
    setAgentBusy(true);

    // 1. Instant <1 ms local WHO emergency check so life-threatening emergencies bypass all queues
    const localEmergency = detectEmergencyFromText(clean);
    if (localEmergency.isEmergency && localEmergency.category) {
      await finishEmergencyImmediately(localEmergency.category, clean);
      setAgentBusy(false);
      return;
    }

    const updatedHistory: AgentTurn[] = [...agentHistory, { role: 'user', text: clean }];
    setAgentHistory(updatedHistory);
    setAgentText('');

    // 2. If offline, smoothly guide the user into the local WHO deterministic checkup
    if (!navigator.onLine) {
      setAgentBusy(false);
      setAgentQuestion({
        summary_en:
          'You are currently offline. Live Gemini agent needs internet, or you can complete the local WHO checkup in 30 seconds.',
        summary_ur:
          'اس وقت انٹرنیٹ دستیاب نہیں ہے۔ آف لائن ڈبلیو ایچ او حفاظتی نظام سے فوری معائنہ کریں۔',
        nextQuestion_en: 'Is the patient having high fever, trouble breathing, or unable to drink?',
        nextQuestion_ur: 'کیا مریض کو تیز بخار ہے، سانس لینے میں دشواری ہے یا پانی پینے سے قاصر ہے؟',
        quickReplies: [
          { label_en: 'Open Guided Body Map', label_ur: 'جسمانی نقشہ کھولیں' },
          { label_en: 'Yes, breathing or fever danger', label_ur: 'جی ہاں، خطرناک علامت ہے' },
        ],
        engineUsed: 'OFFLINE_WHO_CORE',
      });
      return;
    }

    try {
      const resp = await fetch('/api/agent/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          ageMonths: fallbackProfile.ageMonths,
          sex: fallbackProfile.sex,
          locale,
          history: updatedHistory.slice(-8).map((h) => ({ role: h.role, text: h.text })),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Agent could not process the message.');
      }

      if (data.status === 'EMERGENCY_RED' || data.triageTier === 'RED') {
        const cat = (data.emergencyCategory || 'BREATHING_DISTRESS') as EmergencyCategory;
        await finishEmergencyImmediately(cat, clean);
        return;
      }

      if (data.status === 'COMPLETE') {
        const complaint = mapHomeCareToComplaint(data.homeCareId);
        const input: EpisodeInput = {
          patient: fallbackProfile,
          bodyRegion: complaint === 'COUGH_COLD' ? 'CHEST' : complaint === 'DIARRHEA' ? 'ABDOMEN' : 'GENERAL_FEVER',
          durationHours: (data.triageTier as TriageTier) === 'AMBER' ? 72 : 12,
          temperatureBand: (data.triageTier as TriageTier) === 'AMBER' ? 'HIGH_FEVER' : 'MILD_FEVER',
          hydrationStatus: 'NORMAL',
          vitals,
          answers: { ...DEFAULT_ANSWERS, primaryComplaint: complaint },
        };
        const evalResult = evaluateCareEpisode(input);
        await onCompleteEpisode(input, evalResult);
        return;
      }

      setAgentHistory((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `${data.summary_en} ${data.nextQuestion_en || ''}`.trim(),
          text_ur: `${data.summary_ur} ${data.nextQuestion_ur || ''}`.trim(),
        },
      ]);
      setAgentQuestion({
        summary_en: data.summary_en,
        summary_ur: data.summary_ur,
        nextQuestion_en: data.nextQuestion_en || 'Could you tell me how long this has lasted?',
        nextQuestion_ur: data.nextQuestion_ur || 'یہ تکلیف کب سے ہے؟',
        quickReplies:
          Array.isArray(data.quickReplies) && data.quickReplies.length > 0
            ? data.quickReplies
            : [
                { label_en: 'Yes', label_ur: 'جی ہاں' },
                { label_en: 'No', label_ur: 'نہیں' },
              ],
        engineUsed: data.engineUsed || 'GEMINI_4_HYDROGEN',
      });
    } catch (err) {
      setAgentError(
        err instanceof Error
          ? `${err.message} You can use the Guided Body Map offline anytime.`
          : 'Live agent unavailable. Switch to Guided Body Map below.'
      );
    } finally {
      setAgentBusy(false);
    }
  };

  const toggleVoiceRecording = async () => {
    setAgentError('');
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    // Try high-accuracy Gemini 3.5 Transcribe via MediaRecorder when online
    if (navigator.onLine && typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setIsTranscribing(true);
          try {
            const base64 = await blobToBase64(blob);
            const resp = await fetch('/api/agent/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, mimeType }),
            });
            const json = await resp.json();
            if (resp.ok && json.transcript) {
              setAgentText(json.transcript);
              await submitAgentMessage(json.transcript);
            } else {
              throw new Error(json.error || 'Transcription unavailable.');
            }
          } catch (err) {
            setAgentError(err instanceof Error ? err.message : 'Could not transcribe audio.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        return;
      } catch {
        // Fall through to native Whisper / Web Speech fallback
      }
    }

    try {
      const res = await transcribeWithSequentialWhisper(isUrdu ? 'ur' : 'en');
      if (res.transcript) {
        setAgentText(res.transcript);
        await submitAgentMessage(res.transcript);
      }
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : 'Voice input unavailable.');
    }
  };

  // Form helpers
  const filteredQuestions = QUESTION_BANK.filter((q) => {
    if (q.maternalOnly && !(activeProfile?.sex === 'F' && activeProfile?.isPregnantOrLactating)) {
      return false;
    }
    return q.bodyRegions.includes(bodyRegion);
  });
  const currentQuestion = filteredQuestions[qIndex] ?? filteredQuestions[0];

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAge = Math.max(0, Number(ageValue) || 0);
    const ageMonths = ageUnit === 'YEARS' ? Math.min(1440, numericAge * 12) : Math.min(1440, numericAge);
    const created: PatientProfile = {
      id: `pat_${crypto.randomUUID().slice(0, 10)}`,
      accountId,
      name: newName.trim() || (workspace === 'BHU' ? 'Walk-In Patient' : 'Family Member'),
      ageMonths,
      sex: newSex,
      isPregnantOrLactating: newSex === 'F' && isPregnant,
      chronicConditions: chronicList,
      allergies: [],
      workspace,
    };
    await onSaveProfile(created);
    setSelectedProfileId(created.id);
    setCreatingProfile(false);
    setNewName('');
  };

  const toggleChronic = (cond: string) => {
    setChronicList((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleAnswer = async (val: boolean) => {
    const nextAnswers: TriageAnswers = {
      ...answers,
      primaryComplaint,
      [currentQuestion.key]: val,
    };
    setAnswers(nextAnswers);

    if (activeProfile && val) {
      const probe = evaluateCareEpisode({
        patient: activeProfile,
        bodyRegion,
        durationHours,
        temperatureBand,
        hydrationStatus,
        vitals,
        answers: nextAnswers,
      });
      if (probe.tier === 'RED') {
        await onCompleteEpisode(
          {
            patient: activeProfile,
            bodyRegion,
            durationHours,
            temperatureBand,
            hydrationStatus,
            vitals,
            answers: nextAnswers,
          },
          probe
        );
        return;
      }
    }

    if (qIndex + 1 < filteredQuestions.length) {
      setQIndex((prev) => prev + 1);
    } else {
      setStage('VITALS');
    }
  };

  const handleFinalize = async () => {
    if (!activeProfile) return;
    const input: EpisodeInput = {
      patient: activeProfile,
      bodyRegion,
      durationHours,
      temperatureBand,
      hydrationStatus,
      vitals,
      answers: { ...answers, primaryComplaint },
    };
    const result = evaluateCareEpisode(input);
    await onCompleteEpisode(input, result);
  };

  const handleVoiceSymptom = async () => {
    setVoiceStatus('Listening...');
    try {
      const res = await transcribeWithSequentialWhisper(isUrdu ? 'ur' : 'en');
      const lower = res.transcript.toLowerCase();
      if (lower.includes('yes') || lower.includes('haan') || lower.includes('جی')) {
        setVoiceStatus(`Heard "${res.transcript}" -> Yes`);
        await handleAnswer(true);
      } else if (lower.includes('no') || lower.includes('nahi') || lower.includes('نہیں')) {
        setVoiceStatus(`Heard "${res.transcript}" -> No`);
        await handleAnswer(false);
      } else {
        setVoiceStatus(`Heard (${res.source}): "${res.transcript}"`);
      }
    } catch (err) {
      setVoiceStatus(err instanceof Error ? err.message : 'Voice capture unavailable.');
    }
  };

  const quickCheckinTiles = [
    {
      id: 'CHEST',
      label_en: 'Chest / Breath',
      label_ur: 'سینہ / سانس',
      prompt: 'Chest pain or trouble breathing right now',
      bg: 'bg-[var(--surface)] border-[#DC2626]/25',
      icon: HeartPulse,
    },
    {
      id: 'FEVER',
      label_en: 'High Fever',
      label_ur: 'تیز بخار',
      prompt: 'Fever and body aches since yesterday',
      bg: 'bg-[var(--surface)] border-[var(--border)]',
      icon: Thermometer,
    },
    {
      id: 'ASTHMA',
      label_en: 'Cough / Wheeze',
      label_ur: 'کھانسی / دمہ',
      prompt: 'Cough and wheezing',
      bg: 'bg-[var(--surface)] border-[var(--border)]',
      icon: Wind,
    },
    {
      id: 'STOMACH',
      label_en: 'Diarrhea / Vomit',
      label_ur: 'دست / قے',
      prompt: 'Loose motions and vomiting, worried about dehydration',
      bg: 'bg-[var(--surface)] border-[var(--border)]',
      icon: Activity,
    },
    {
      id: 'BURN',
      label_en: 'Burn / Bleeding',
      label_ur: 'جلنا / خون بہنا',
      prompt: 'Burn or bleeding cut injury',
      bg: 'bg-[var(--surface)] border-[#DC2626]/25',
      icon: Flame,
    },
    {
      id: 'CHECK',
      label_en: 'Step-by-Step',
      label_ur: 'مرحلہ وار معائنہ',
      prompt: '__FORM__',
      bg: 'bg-[var(--accent-soft)] border-[var(--accent)]/30',
      icon: ShieldAlert,
    },
  ];

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6 relative z-10">
      {/* Mode Switcher & Quick Shortcuts Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full glass-panel">
          <button
            type="button"
            onClick={() => setMode('AGENT')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-medium transition-all ${
              mode === 'AGENT'
                ? 'azure-pill-active'
                : 'text-[#55606E] dark:text-slate-300'
            }`}
          >
            {s.agentModeBtn}
          </button>
          <button
            type="button"
            onClick={() => setMode('FORM')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-medium transition-all ${
              mode === 'FORM'
                ? 'azure-pill-active'
                : 'text-[#55606E] dark:text-slate-300'
            }`}
          >
            {s.structuredCheckupBtn}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCameraChat && (
            <button
              type="button"
              onClick={onOpenCameraChat}
              className="min-h-[40px] px-3.5 rounded-full glass-panel text-xs font-medium inline-flex items-center gap-1.5 hover:border-[var(--accent)]"
            >
              <Camera className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{isUrdu ? 'کیمرہ / AI چیٹ' : 'Live Camera & AI Chat'}</span>
            </button>
          )}
          {onOpenRemedies && (
            <button
              type="button"
              onClick={onOpenRemedies}
              className="min-h-[40px] px-3.5 rounded-full glass-panel text-xs font-medium inline-flex items-center gap-1.5 hover:border-[var(--accent)]"
            >
              <Leaf className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{isUrdu ? 'گھریلو علاج' : 'Home Remedies'}</span>
            </button>
          )}
          <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] text-[#55606E] dark:text-slate-400 px-2">
            <Cpu className="h-3.5 w-3.5 text-[var(--accent)]" />
            {isOnline ? s.activeEngineCloud : s.activeEngineOffline}
          </span>
          <button
            type="button"
            onClick={onTriggerSos}
            className="min-h-[40px] px-4 rounded-full bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0"
          >
            {s.sosEmergency} · 1122
          </button>
        </div>
      </div>

      {/* MODE 1: LIVE CONVERSATIONAL AI AGENT + SCREENSHOT 1 & 2 INSPIRED HERO */}
      {mode === 'AGENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Editorial Left + Sculptural Tibb Globe */}
          <div className="lg:col-span-6 glass-panel rounded-[32px] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <TibbGlobe size="lg" activePulse={agentBusy || isRecording} />
              </div>
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--accent)]">
                  {s.oneQuestionLabel}
                </p>
                <h1
                  className={`font-display text-3xl sm:text-4xl font-medium tracking-tight leading-[1.12] ${
                    isUrdu ? 'font-urdu urdu-safe text-3xl' : ''
                  }`}
                >
                  {s.heroHeadline}
                </h1>
                <p
                  className={`text-sm text-[#55606E] dark:text-slate-300 leading-relaxed ${
                    isUrdu ? 'font-urdu urdu-safe text-base' : ''
                  }`}
                >
                  {s.heroSubline}
                </p>
              </div>
            </div>

            {/* Direct Emergency & Symptom Voice/Text Input */}
            <div className="space-y-3 border-t border-black/8 dark:border-white/10 pt-5">
              <label
                htmlFor="tibb-agent-input"
                className={`block text-xs font-semibold ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}
              >
                {s.agentPromptTitle}
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="tibb-agent-input"
                  type="text"
                  maxLength={500}
                  value={agentText}
                  onChange={(e) => setAgentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && agentText.trim()) {
                      e.preventDefault();
                      submitAgentMessage(agentText);
                    }
                  }}
                  placeholder={s.agentPromptPlaceholder}
                  className="flex-1 min-h-[48px] rounded-2xl border border-black/15 dark:border-white/20 bg-white/70 dark:bg-black/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    disabled={isTranscribing}
                    className={`min-h-[48px] px-4 rounded-2xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      isRecording
                        ? 'border-[#DC2626] bg-red-50 text-[#DC2626]'
                        : 'border-black/15 dark:border-white/20 bg-white/50 dark:bg-white/5 hover:border-[var(--accent)]'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current" /> {s.recordingStop}
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 text-[var(--accent)]" />{' '}
                        {isTranscribing ? s.transcribingAudio : s.voiceInput}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={agentBusy || !agentText.trim()}
                    onClick={() => submitAgentMessage(agentText)}
                    className="min-h-[48px] px-5 rounded-full azure-pill-active disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> {s.agentSendBtn}
                  </button>
                </div>
              </div>

              {agentError && (
                <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">
                  {agentError}
                </p>
              )}
            </div>
          </div>

          {/* Right Frosted Interactive Card — Screenshot 1 & 2 Style */}
          <div className="lg:col-span-6 glass-panel rounded-[32px] p-6 sm:p-8 flex flex-col justify-between space-y-5">
            {agentQuestion ? (
              <div className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-3">
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-[var(--accent)]">
                      {s.oneQuestionLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAgentQuestion(null);
                        setAgentHistory([]);
                      }}
                      className="text-xs font-medium text-[#55606E] dark:text-slate-300 hover:underline"
                    >
                      {s.resetConversationBtn}
                    </button>
                  </div>

                  <h2
                    className={`font-display text-2xl sm:text-3xl font-medium leading-tight text-center ${
                      isUrdu ? 'font-urdu urdu-safe text-2xl' : ''
                    }`}
                  >
                    {isUrdu ? agentQuestion.nextQuestion_ur : agentQuestion.nextQuestion_en}
                  </h2>

                  {!isUrdu && (
                    <p
                      className="font-urdu urdu-safe text-base text-center text-[var(--accent)]"
                      dir="rtl"
                      lang="ur"
                    >
                      {agentQuestion.nextQuestion_ur}
                    </p>
                  )}

                  <p className={`text-xs text-center text-[#55606E] dark:text-slate-300 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                    {isUrdu ? agentQuestion.summary_ur : agentQuestion.summary_en}
                  </p>

                  {/* Glowing Frosted Urdu Audio Waveform Player (Screenshot 2) */}
                  <div className="rounded-2xl border border-[var(--accent)]/30 bg-white/55 dark:bg-black/40 p-3.5 shadow-[0_0_24px_rgba(123,184,141,0.14)] space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#55606E] dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Globe className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {s.urduAudio}
                      </span>
                      <span className="font-mono-tabular text-[11px]">00:07</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center justify-between gap-[3px] h-8 px-1" aria-hidden="true">
                        {[28, 45, 32, 68, 92, 54, 78, 95, 62, 85, 42, 74, 88, 52, 66, 40, 82, 58, 36, 62, 48, 30].map(
                          (h, idx) => (
                            <span
                              key={idx}
                              className="w-[3px] rounded-full bg-[var(--accent)] opacity-85"
                              style={{ height: `${h}%` }}
                            />
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="Play Urdu Audio"
                        onClick={() => speakOfflineGuidance(agentQuestion.nextQuestion_ur, 'ur-PK')}
                        className="w-10 h-10 rounded-full azure-pill-active flex items-center justify-center shrink-0"
                      >
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Reply Action Chips */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {agentQuestion.quickReplies.map((qr, idx) => (
                      <button
                        key={qr.label_en}
                        type="button"
                        disabled={agentBusy}
                        onClick={() => {
                          if (qr.label_en.toLowerCase().includes('body map')) {
                            setMode('FORM');
                            return;
                          }
                          submitAgentMessage(isUrdu ? qr.label_ur : qr.label_en);
                        }}
                        className={`min-h-[48px] px-4 rounded-full text-sm font-medium transition-all text-center ${
                          idx === 0
                            ? 'azure-pill-active'
                            : 'border border-black/15 dark:border-white/20 bg-white/50 dark:bg-white/5 hover:border-[var(--accent)]'
                        }`}
                      >
                        {isUrdu ? qr.label_ur : qr.label_en}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#55606E] dark:text-slate-400">
                    <Lock className="h-3 w-3" />
                    <span>{isUrdu ? 'آپ کے تمام جوابات فون پر خفیہ رہتے ہیں' : 'Your answers stay private on your device'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className={`font-display text-xl font-medium ${isUrdu ? 'font-urdu urdu-safe text-2xl' : ''}`}>
                    {s.agentQuickChipsLabel}
                  </h2>
                  <button
                    type="button"
                    onClick={() => speakOfflineGuidance(s.heroSubline, isUrdu ? 'ur-PK' : 'en-US')}
                    className="min-h-[38px] px-3.5 rounded-full border border-black/15 dark:border-white/20 text-xs font-medium inline-flex items-center gap-1.5"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-[var(--accent)]" /> {s.urduAudio}
                  </button>
                </div>

                {/* 6 Clean Geometric Symptom Cards (Zero Emojis) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {quickCheckinTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        disabled={agentBusy}
                        onClick={() => {
                          if (tile.prompt === '__FORM__') {
                            setMode('FORM');
                          } else {
                            submitAgentMessage(tile.prompt);
                          }
                        }}
                        className="min-h-[92px] rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 text-center border border-black/10 dark:border-white/15 bg-white/60 dark:bg-white/[0.04] hover:border-[var(--accent)] hover:scale-[1.01] transition-all"
                      >
                        <Icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
                        <span className={`text-xs font-medium leading-tight ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                          {isUrdu ? tile.label_ur : tile.label_en}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={agentBusy}
                  onClick={() => {
                    if (agentText.trim()) {
                      submitAgentMessage(agentText);
                    } else {
                      setMode('FORM');
                    }
                  }}
                  className="w-full min-h-[52px] rounded-full azure-pill-active text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-all"
                >
                  <span>{agentBusy ? s.agentThinking : s.helpMeNow}</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#55606E] dark:text-slate-400">
                  <Lock className="h-3 w-3" />
                  <span>{isUrdu ? 'آپ کے تمام جوابات فون پر خفیہ رہتے ہیں' : 'Your answers are private'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: GUIDED BODY MAP & STRUCTURED OFFLINE WHO FORM */}
      {mode === 'FORM' && (
        <div className="space-y-6">
          {stage === 'INTAKE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 glass-panel rounded-[30px] p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-medium">
                    {isUrdu ? '1. مریض کا پروفائل' : '1. Patient Profile'}
                  </h2>
                  {profiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCreatingProfile((v) => !v)}
                      className="min-h-[36px] inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
                    >
                      <Plus className="h-3.5 w-3.5" />{' '}
                      {creatingProfile ? (isUrdu ? 'محفوظ پروفائل' : 'Select Saved') : isUrdu ? 'نیا مریض' : 'Add Patient'}
                    </button>
                  )}
                </div>

                {creatingProfile ? (
                  <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                        {isUrdu ? 'نام یا شناخت' : 'Name / Identifier'}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={workspace === 'BHU' ? 'Patient token' : 'e.g. Ammi, Zain'}
                        className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-black/30 px-3.5 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                          {isUrdu ? 'عمر' : 'Age'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={120}
                          required
                          value={ageValue}
                          onChange={(e) => setAgeValue(e.target.value)}
                          className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-black/30 px-3 font-mono-tabular text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                          {isUrdu ? 'اکائی' : 'Unit'}
                        </label>
                        <select
                          value={ageUnit}
                          onChange={(e) => setAgeUnit(e.target.value as 'YEARS' | 'MONTHS')}
                          className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-black/40 px-3 text-sm"
                        >
                          <option value="YEARS">{isUrdu ? 'سال' : 'Years'}</option>
                          <option value="MONTHS">{isUrdu ? 'ماہ (بچے)' : 'Months (Infants < 2y)'}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                        {isUrdu ? 'جنس' : 'Biological Sex'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['F', 'M', 'O'] as const).map((sexOpt) => (
                          <button
                            key={sexOpt}
                            type="button"
                            onClick={() => setNewSex(sexOpt)}
                            className={`min-h-[42px] rounded-xl border text-xs font-medium ${
                              newSex === sexOpt
                                ? 'azure-pill-active border-transparent'
                                : 'border-black/10 dark:border-white/15'
                            }`}
                          >
                            {sexOpt === 'F' ? (isUrdu ? 'خاتون' : 'Female') : sexOpt === 'M' ? (isUrdu ? 'مرد' : 'Male') : 'Other'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {newSex === 'F' && (
                      <label className="flex items-center gap-2.5 text-xs min-h-[36px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPregnant}
                          onChange={(e) => setIsPregnant(e.target.checked)}
                          className="h-4 w-4 accent-[#2E7D5B]"
                        />
                        <span>{isUrdu ? 'حاملہ یا زچگی کے بعد' : 'Pregnant or recently postpartum'}</span>
                      </label>
                    )}
                    <div>
                      <span className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1.5">
                        {isUrdu ? 'پہلے سے موجود بیماریاں' : 'Known Chronic Conditions'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {['Diabetes', 'Hypertension', 'Asthma', 'Heart Disease'].map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => toggleChronic(cond)}
                            className={`min-h-[38px] px-3 rounded-full border text-xs ${
                              chronicList.includes(cond)
                                ? 'azure-pill-active border-transparent'
                                : 'border-black/15 dark:border-white/20'
                            }`}
                          >
                            {cond}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="w-full min-h-[46px] rounded-full azure-pill-active text-sm font-semibold">
                      {isUrdu ? 'محفوظ پروفائل بنائیں' : 'Save Profile to Encrypted Vault'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2.5">
                    {profiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProfileId(p.id)}
                        className={`w-full min-h-[54px] flex items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition-colors ${
                          (activeProfile?.id ?? '') === p.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-black/10 dark:border-white/15'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-[#55606E] dark:text-slate-400">
                            {p.ageMonths < 24 ? `${p.ageMonths}m` : `${Math.floor(p.ageMonths / 12)}y`} · {p.sex}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 glass-panel rounded-[30px] p-5 sm:p-6 space-y-5">
                <h2 className="font-display text-lg font-medium">
                  {isUrdu ? '2. تکلیف کی تفصیل' : '2. Episode Context'}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['FEVER', isUrdu ? 'بخار / جسم درد' : 'Fever / Body Ache'],
                      ['COUGH_COLD', isUrdu ? 'کھانسی / سانس' : 'Cough / Breathing'],
                      ['DIARRHEA', isUrdu ? 'دست / قے' : 'Diarrhea / Vomiting'],
                      ['MINOR_WOUND', isUrdu ? 'زخم / کٹ' : 'Cut / Wound'],
                      ['MINOR_BURN', isUrdu ? 'جلنا' : 'Thermal Burn'],
                      ['HEAT_EXHAUSTION', isUrdu ? 'گرمی / کمزوری' : 'Heat / Weakness'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPrimaryComplaint(key)}
                      className={`min-h-[44px] rounded-2xl border px-3 text-xs font-medium text-left ${
                        primaryComplaint === key
                          ? 'azure-pill-active border-transparent'
                          : 'border-black/10 dark:border-white/15'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-[#55606E] dark:text-slate-400 mb-2">
                    {isUrdu ? 'یہ تکلیف کتنے وقت سے ہے؟' : 'How long have you felt this?'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: isUrdu ? 'چند گھنٹے' : 'A few hours', hrs: 12 },
                      { label: isUrdu ? '1 تا 2 دن' : '1–2 days', hrs: 36 },
                      { label: isUrdu ? '2 دن سے زیادہ' : 'A few days', hrs: 72 },
                    ].map((d) => (
                      <button
                        key={d.hrs}
                        type="button"
                        onClick={() => setDurationHours(d.hrs)}
                        className={`min-h-[42px] rounded-full border text-xs font-medium ${
                          durationHours === d.hrs
                            ? 'azure-pill-active border-transparent'
                            : 'border-black/10 dark:border-white/15'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['NORMAL', 'MILD_FEVER', 'HIGH_FEVER'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTemperatureBand(t)}
                        className={`min-h-[42px] rounded-xl border text-[11px] font-medium px-1.5 ${
                          temperatureBand === t
                            ? 'azure-pill-active border-transparent'
                            : 'border-black/10 dark:border-white/15'
                        }`}
                      >
                        {t === 'NORMAL'
                          ? isUrdu
                            ? 'نارمل'
                            : 'Normal'
                          : t === 'MILD_FEVER'
                            ? isUrdu
                              ? 'ہلکا بخار'
                              : 'Mild'
                            : isUrdu
                              ? 'تیز بخار'
                              : 'High >=102°F'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['NORMAL', 'REDUCED_FLUIDS', 'UNABLE_TO_DRINK'] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHydrationStatus(h)}
                        className={`min-h-[42px] rounded-xl border text-[11px] font-medium px-1.5 ${
                          hydrationStatus === h
                            ? 'azure-pill-active border-transparent'
                            : 'border-black/10 dark:border-white/15'
                        }`}
                      >
                        {h === 'NORMAL'
                          ? isUrdu
                            ? 'پانی نارمل'
                            : 'Normal'
                          : h === 'REDUCED_FLUIDS'
                            ? isUrdu
                              ? 'کم پینا'
                              : 'Reduced'
                            : isUrdu
                              ? 'نہیں پی سکتا'
                              : 'Cannot Drink'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!activeProfile}
                  onClick={() => {
                    setQIndex(0);
                    setStage('BODY_MAP');
                  }}
                  className="w-full min-h-[48px] rounded-full azure-pill-active disabled:opacity-40 text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  {isUrdu ? 'جسمانی نقشے پر جائیں' : 'Continue to Body Map'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {stage === 'BODY_MAP' && (
            <div className="glass-panel rounded-[32px] p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setStage('INTAKE')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[#55606E] dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" /> {isUrdu ? 'واپس' : 'Back'}
                </button>
                <span className="text-xs text-[#55606E] dark:text-slate-400">2 / 4</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-5 flex justify-center">
                  <svg viewBox="0 0 220 380" className="w-48 h-72" aria-label="Anatomical body selector">
                    <g onClick={() => setBodyRegion('HEAD_NECK')} className="cursor-pointer">
                      <circle cx="110" cy="48" r="30" fill={bodyRegion === 'HEAD_NECK' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'HEAD_NECK' ? '#7BB88D' : 'currentColor'} strokeWidth="2" />
                    </g>
                    <g onClick={() => setBodyRegion('CHEST')} className="cursor-pointer">
                      <rect x="68" y="100" width="84" height="72" rx="14" fill={bodyRegion === 'CHEST' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'CHEST' ? '#7BB88D' : 'currentColor'} strokeWidth="2" />
                    </g>
                    <g onClick={() => setBodyRegion('ABDOMEN')} className="cursor-pointer">
                      <rect x="72" y="176" width="76" height="74" rx="12" fill={bodyRegion === 'ABDOMEN' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'ABDOMEN' ? '#7BB88D' : 'currentColor'} strokeWidth="2" />
                    </g>
                    <g onClick={() => setBodyRegion('SKIN_LIMBS')} className="cursor-pointer">
                      <rect x="34" y="104" width="24" height="120" rx="12" fill={bodyRegion === 'SKIN_LIMBS' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'SKIN_LIMBS' ? '#7BB88D' : 'currentColor'} strokeWidth="1.75" />
                      <rect x="162" y="104" width="24" height="120" rx="12" fill={bodyRegion === 'SKIN_LIMBS' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'SKIN_LIMBS' ? '#7BB88D' : 'currentColor'} strokeWidth="1.75" />
                      <rect x="74" y="256" width="28" height="108" rx="12" fill={bodyRegion === 'SKIN_LIMBS' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'SKIN_LIMBS' ? '#7BB88D' : 'currentColor'} strokeWidth="1.75" />
                      <rect x="118" y="256" width="28" height="108" rx="12" fill={bodyRegion === 'SKIN_LIMBS' ? 'rgba(123,184,141,0.24)' : 'transparent'} stroke={bodyRegion === 'SKIN_LIMBS' ? '#7BB88D' : 'currentColor'} strokeWidth="1.75" />
                    </g>
                  </svg>
                </div>
                <div className="md:col-span-7 space-y-4">
                  <h2 className="font-display text-2xl font-medium">
                    {isUrdu ? 'تکلیف جسم کے کس حصے میں ہے؟' : 'Where is the main symptom?'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        ['HEAD_NECK', 'Head & Neck', 'سر اور گردن'],
                        ['CHEST', 'Chest & Breathing', 'سینہ اور سانس'],
                        ['ABDOMEN', 'Stomach', 'پیٹ'],
                        ['SKIN_LIMBS', 'Skin & Limbs', 'جلد اور ہاتھ پاؤں'],
                        ['GENERAL_FEVER', 'Whole Body / Fever', 'پورا جسم / بخار'],
                      ] as const
                    ).map(([region, en, ur]) => (
                      <button
                        key={region}
                        type="button"
                        onClick={() => setBodyRegion(region)}
                        className={`min-h-[52px] rounded-2xl border px-4 py-2 text-left ${
                          bodyRegion === region
                            ? 'azure-pill-active border-transparent'
                            : 'border-black/10 dark:border-white/15'
                        }`}
                      >
                        <div className="text-sm font-medium">{isUrdu ? ur : en}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQIndex(0);
                      setStage('QUESTIONS');
                    }}
                    className="w-full min-h-[48px] rounded-full azure-pill-active text-sm font-semibold inline-flex items-center justify-center gap-2"
                  >
                    {isUrdu ? 'سوالات شروع کریں' : 'Begin Screening Questions'} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 'QUESTIONS' && currentQuestion && (
            <div className="glass-panel rounded-[32px] p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => (qIndex > 0 ? setQIndex((i) => i - 1) : setStage('BODY_MAP'))}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[#55606E] dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" /> {isUrdu ? 'پچھلا سوال' : 'Previous'}
                </button>
                <span className="font-mono-tabular text-xs text-[#55606E] dark:text-slate-400">
                  {qIndex + 1} / {Math.max(1, filteredQuestions.length)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-200"
                  style={{ width: `${Math.min(100, ((qIndex + 1) / Math.max(1, filteredQuestions.length)) * 100)}%` }}
                />
              </div>
              <div className="space-y-3 text-center pt-2">
                <h2 className={`font-display text-2xl sm:text-3xl font-medium ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                  {isUrdu ? currentQuestion.title_ur : currentQuestion.title_en}
                </h2>
                {!isUrdu && (
                  <p className="font-urdu urdu-safe text-lg text-[var(--accent)]" dir="rtl">
                    {currentQuestion.title_ur}
                  </p>
                )}
              </div>

              {/* Frosted Glowing Urdu Audio Bar */}
              <div className="rounded-2xl border border-[var(--accent)]/30 bg-white/55 dark:bg-black/40 p-3.5 shadow-[0_0_24px_rgba(123,184,141,0.14)] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#55606E] dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {s.urduAudio}
                  </span>
                  <button
                    type="button"
                    onClick={handleVoiceSymptom}
                    className="inline-flex items-center gap-1 text-[var(--accent)] font-medium hover:underline"
                  >
                    <Mic className="h-3.5 w-3.5" /> {s.voiceInput}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between gap-[3px] h-7 px-1" aria-hidden="true">
                    {[25, 45, 70, 50, 88, 60, 95, 72, 48, 84, 65, 90, 55, 75, 42, 68, 52, 80, 46, 60].map((h, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-[var(--accent)] opacity-85"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Play Urdu Audio"
                    onClick={() => speakOfflineGuidance(currentQuestion.title_ur, 'ur-PK')}
                    className="w-10 h-10 rounded-full azure-pill-active flex items-center justify-center shrink-0"
                  >
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>

              {voiceStatus && <p className="text-xs text-center text-[#55606E] dark:text-slate-300">{voiceStatus}</p>}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleAnswer(false)}
                  className="min-h-[54px] rounded-full border border-black/15 dark:border-white/20 bg-white/50 dark:bg-white/5 text-sm font-medium hover:border-[var(--accent)]"
                >
                  {s.no}
                </button>
                <button
                  type="button"
                  onClick={() => handleAnswer(true)}
                  className="min-h-[54px] rounded-full azure-pill-active text-sm font-semibold"
                >
                  {s.yes}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#55606E] dark:text-slate-400">
                <Lock className="h-3 w-3" />
                <span>{isUrdu ? 'آپ کے جوابات محفوظ ہیں' : 'Your answers are private'}</span>
              </div>
            </div>
          )}

          {stage === 'VITALS' && activeProfile && (
            <div className="space-y-5">
              <VitalsEstimator
                ageMonths={activeProfile.ageMonths}
                locale={locale}
                initialVitals={vitals}
                onApplyVitals={(v) => setVitals(v)}
              />
              <div className="glass-panel rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[#55606E] dark:text-slate-300">
                  {isUrdu ? `${activeProfile.name} کا مکمل نتیجہ دیکھیں` : `Ready to evaluate ${activeProfile.name}`}
                </span>
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-full azure-pill-active text-sm font-semibold"
                >
                  {isUrdu ? 'نتیجہ دیکھیں' : 'View Verified Result'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
