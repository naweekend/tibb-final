import React, { useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  Camera,
  Clock,
  ImagePlus,
  Mic,
  PhoneCall,
  Plus,
  Send,
  ShieldCheck,
  Square,
  UserCheck,
  Volume2,
  Wind,
} from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { speakOfflineGuidance } from '../engine/audioFeedback';
import { transcribeWithSequentialWhisper } from '../engine/localAiBridge';
import { sendMultimodalClinicalChat } from '../services/aiService';
import type {
  ChatMessage,
  ChatThread,
  ExtendedPatientProfile,
  SavedPersonReport,
  SavedReportKind,
} from '../types/clinical';
import { stripExifAndCompressImage } from '../utils/imageSanitizer';
import { CameraMultimodalModal } from './CameraMultimodalModal';
import { CyclicSighingPacer } from './CyclicSighingPacer';
import { StabilizationTimers } from './StabilizationTimers';
import { TibbGlobe } from './TibbGlobe';

interface PersonChatWorkspaceProps {
  locale: AppLocale;
  activePerson: ExtendedPatientProfile;
  allPeople: ExtendedPatientProfile[];
  threads: ChatThread[];
  latestVitalsSummary?: string;
  onSaveThread: (thread: ChatThread) => Promise<void>;
  onSaveReport: (report: SavedPersonReport) => Promise<void>;
  onSwitchPerson: (personId: string) => void;
  onOpenGuidedForm: () => void;
  onDetectedQrToken?: (token: string) => void;
}

const RELATIONSHIP_KEYWORDS: Record<string, string[]> = {
  Mother: ['mother', 'mom', 'ammi', 'ami', 'mama', 'والدہ', 'امی'],
  Father: ['father', 'dad', 'abbu', 'abu', 'baba', 'walid', 'والد', 'ابو'],
  Child: ['child', 'baby', 'son', 'daughter', 'bacha', 'bachi', 'بچہ', 'بچی', 'بیٹا', 'بیٹی'],
  Spouse: ['wife', 'husband', 'spouse', 'begum', 'shohar', 'بیوی', 'شوہر'],
};

export const PersonChatWorkspace: React.FC<PersonChatWorkspaceProps> = ({
  locale,
  activePerson,
  allPeople,
  threads,
  latestVitalsSummary,
  onSaveThread,
  onSaveReport,
  onSwitchPerson,
  onOpenGuidedForm,
  onDetectedQrToken,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const personThreads = useMemo(
    () =>
      threads
        .filter((t) => t.personId === activePerson.id)
        .sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso)),
    [threads, activePerson.id]
  );

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const activeThread = useMemo(() => {
    if (selectedThreadId) {
      const found = personThreads.find((t) => t.id === selectedThreadId);
      if (found) return found;
    }
    return personThreads[0] ?? null;
  }, [personThreads, selectedThreadId]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showCalmDrawer, setShowCalmDrawer] = useState(false);
  const [showFarHospitalDrawer, setShowFarHospitalDrawer] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [reportKindForUpload, setReportKindForUpload] = useState<SavedReportKind>('REPORT_PHOTO');
  const [dismissedSwitchFor, setDismissedSwitchFor] = useState<string>('');

  // Cross-person mention detector so records never get mixed
  const suggestedSwitchPerson = useMemo(() => {
    const text = draft.trim().toLowerCase();
    if (text.length < 3 || allPeople.length < 2) return null;
    for (const candidate of allPeople) {
      if (candidate.id === activePerson.id) continue;
      if (candidate.name.length >= 2 && text.includes(candidate.name.toLowerCase())) {
        return candidate;
      }
      const relKeys = RELATIONSHIP_KEYWORDS[candidate.relationship] ?? [];
      if (relKeys.some((kw) => text.includes(kw))) {
        return candidate;
      }
    }
    return null;
  }, [draft, allPeople, activePerson.id]);

  const startNewThread = async () => {
    const now = new Date().toISOString();
    const newThread: ChatThread = {
      id: `thr_${crypto.randomUUID().slice(0, 10)}`,
      personId: activePerson.id,
      title: isUrdu ? `${activePerson.name} — نیا معائنہ` : `${activePerson.name} — New Episode`,
      createdAtIso: now,
      updatedAtIso: now,
      latestTier: 'GREEN',
      messages: [],
    };
    await onSaveThread(newThread);
    setSelectedThreadId(newThread.id);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    if (!files.length) return;
    const cleanedUrls: string[] = [];
    for (const f of files) {
      try {
        const res = await stripExifAndCompressImage(f, 960, 0.82);
        cleanedUrls.push(res.dataUrl);
        await onSaveReport({
          id: `rep_${crypto.randomUUID().slice(0, 10)}`,
          personId: activePerson.id,
          kind: reportKindForUpload,
          title:
            reportKindForUpload === 'MEAL_PHOTO'
              ? 'Meal / Food Photo'
              : reportKindForUpload === 'PRESCRIPTION'
                ? 'Prescription Photo'
                : 'Medical Report / Scan',
          notes: `Attached cleanly (EXIF stripped) for ${activePerson.name}`,
          imageDataUrl: res.dataUrl,
          createdAtIso: new Date().toISOString(),
        });
      } catch {
        // Ignore unreadable image
      }
    }
    if (cleanedUrls.length > 0) {
      setPendingImages((prev) => [...prev, ...cleanedUrls].slice(0, 3));
    }
    e.target.value = '';
  };

  const handleVoiceMic = async () => {
    setRecordingVoice(true);
    try {
      const res = await transcribeWithSequentialWhisper(isUrdu ? 'ur' : 'en');
      if (res.transcript) {
        setDraft((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
      }
    } catch {
      // ignore
    } finally {
      setRecordingVoice(false);
    }
  };

  const dispatchMessage = async (
    textInput: string,
    framesUrls: string[] = pendingImages,
    mediaKind: 'IMAGE' | 'CAMERA_FRAME' | 'VIDEO_BURST' = 'IMAGE',
    targetPerson: ExtendedPatientProfile = activePerson
  ) => {
    const cleanText = textInput.trim() || (framesUrls.length ? 'Please review these visual frames/photos.' : '');
    if (!cleanText && framesUrls.length === 0) return;

    setSending(true);
    const now = new Date().toISOString();

    let threadToUpdate: ChatThread =
      targetPerson.id === activePerson.id && activeThread
        ? activeThread
        : {
            id: `thr_${crypto.randomUUID().slice(0, 10)}`,
            personId: targetPerson.id,
            title: cleanText.slice(0, 42) || `${targetPerson.name} Checkup`,
            createdAtIso: now,
            updatedAtIso: now,
            latestTier: 'GREEN',
            messages: [],
          };

    const userMessage: ChatMessage = {
      id: `msg_${crypto.randomUUID().slice(0, 10)}`,
      threadId: threadToUpdate.id,
      personId: targetPerson.id,
      role: 'user',
      text: cleanText,
      timestampIso: now,
      mediaDataUrl: framesUrls[0],
      mediaKind: framesUrls.length ? mediaKind : undefined,
    };

    const updatedWithUser: ChatThread = {
      ...threadToUpdate,
      title: threadToUpdate.messages.length === 0 ? cleanText.slice(0, 46) : threadToUpdate.title,
      updatedAtIso: now,
      messages: [...threadToUpdate.messages, userMessage],
    };

    await onSaveThread(updatedWithUser);
    if (targetPerson.id === activePerson.id) {
      setSelectedThreadId(updatedWithUser.id);
    }
    setDraft('');
    setPendingImages([]);

    // Convert data URLs to base64 payload for Gemini multimodal inspection
    const imagePayloads = framesUrls
      .map((url) => {
        const match = url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
        if (!match) return null;
        return {
          mimeType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp',
          base64: match[2],
        };
      })
      .filter((x): x is { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string } => Boolean(x));

    const response = await sendMultimodalClinicalChat({
      person: targetPerson,
      message: cleanText,
      locale,
      history: updatedWithUser.messages.slice(-8).map((m) => ({
        role: m.role === 'user' ? 'user' : 'agent',
        text: m.text,
      })),
      images: imagePayloads,
      latestVitalsSummary,
    });

    if (response.suggestCalmPacer) setShowCalmDrawer(true);
    if (response.suggestFarHospitalMode || response.triageTier === 'RED') setShowFarHospitalDrawer(true);

    const agentMsg: ChatMessage = {
      id: `msg_${crypto.randomUUID().slice(0, 10)}`,
      threadId: updatedWithUser.id,
      personId: targetPerson.id,
      role: 'agent',
      text: response.reply_en,
      text_ur: response.reply_ur,
      timestampIso: new Date().toISOString(),
      triageTier: response.triageTier,
      emergencyCategory: response.emergencyCategory,
      firstAid: response.firstAid,
      stayHomeGuidance: response.stayHomeGuidance,
      matchedHomeCare: response.matchedHomeCare,
      suggestCalmPacer: response.suggestCalmPacer,
      suggestFarHospitalMode: response.suggestFarHospitalMode,
      quickReplies: response.quickReplies,
      engineUsed: response.engineUsed,
      amrBlocked: response.amrBlocked,
    };

    const finalizedThread: ChatThread = {
      ...updatedWithUser,
      updatedAtIso: new Date().toISOString(),
      latestTier: response.triageTier,
      messages: [...updatedWithUser.messages, agentMsg],
    };

    await onSaveThread(finalizedThread);
    setSending(false);
  };

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Person Chat Thread Header */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-semibold text-sm shrink-0 border border-[var(--accent)]/25">
            {activePerson.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-medium">{activePerson.name}</h2>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                {activePerson.relationship} ·{' '}
                {activePerson.ageMonths < 24
                  ? `${activePerson.ageMonths}m`
                  : `${Math.round(activePerson.ageMonths / 12)}y`}
              </span>
              {activePerson.bloodGroup !== 'Unknown' && (
                <span className="text-[11px] font-mono-tabular px-2.5 py-0.5 rounded-full border border-[var(--accent)]/30 text-[var(--accent)]">
                  {activePerson.bloodGroup}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              {isUrdu
                ? 'اس فرد کی تمام چیٹ اور رپورٹس صرف اسی پروفائل میں علیحدہ محفوظ ہیں'
                : 'Isolated personal chat & report history — zero cross-member mixing'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCalmDrawer((v) => !v)}
            className={`min-h-[40px] px-4 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              showCalmDrawer
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50'
            }`}
          >
            <Wind className="h-3.5 w-3.5 text-[var(--accent)]" /> {isUrdu ? 'پُرسکون سانس' : 'Calm Pacer'}
          </button>

          <button
            type="button"
            onClick={() => setShowFarHospitalDrawer((v) => !v)}
            className={`min-h-[40px] px-4 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              showFarHospitalDrawer
                ? 'border-[#DC2626] bg-red-50 dark:bg-red-950/30 text-[#DC2626]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-[#DC2626]" /> {isUrdu ? 'ہسپتال دور ہے' : 'Hospital Far'}
          </button>

          <button
            type="button"
            onClick={startNewThread}
            className="min-h-[40px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> {s.newChatBtn}
          </button>
        </div>
      </div>

      {/* Thread Selector Strip (only threads for activePerson) */}
      {personThreads.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {personThreads.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => setSelectedThreadId(th.id)}
              className={`min-h-[36px] px-4 rounded-full text-xs whitespace-nowrap border transition-colors ${
                activeThread?.id === th.id
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--ink)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
              }`}
            >
              {th.title}
            </button>
          ))}
        </div>
      )}

      {/* Optional Inline Cyclic Sighing Breathing Drawer */}
      {showCalmDrawer && <CyclicSighingPacer locale={locale} compact />}

      {/* Optional Hospital Is Far Stabilization Drawer */}
      {showFarHospitalDrawer && <StabilizationTimers locale={locale} />}

      {/* Main Chat Feed */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
        <div className="p-5 sm:p-7 space-y-5 min-h-[360px] max-h-[640px] overflow-y-auto">
          {!activeThread || activeThread.messages.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
              <TibbGlobe size="sm" />
              <div className="space-y-2.5">
                <h3 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu urdu-safe text-3xl' : ''}`}>
                  {isUrdu ? `${activePerson.name} — آج طبیعت کیسی ہے؟` : `How is ${activePerson.name} feeling today?`}
                </h3>
                <p className={`text-xs text-[var(--muted)] leading-relaxed ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                  {isUrdu
                    ? 'آپ علامات لکھ یا بول سکتے ہیں، کیمرہ/ویڈیو سے زخم یا رپورٹ دکھا سکتے ہیں، یا تفصیلی فارم کھول سکتے ہیں۔'
                    : 'Describe symptoms by text or voice, open Live Camera/Video to show a rash or lab slip, or switch to the Guided Form.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {[
                  { en: 'High fever & chills', ur: 'تیز بخار اور سردی لگ رہی ہے' },
                  { en: 'Feeling anxious & racing heart', ur: 'گھبراہٹ اور دل کی دھڑکن تیز ہے' },
                  { en: 'High BP reading — should I go to hospital?', ur: 'بلڈ پریشر زیادہ ہے، گھر رہیں یا ہسپتال جائیں؟' },
                  { en: 'Show lab report / meal via camera', ur: 'لیب رپورٹ یا کھانا کیمرہ سے دکھائیں' },
                ].map((chip) => (
                  <button
                    key={chip.en}
                    type="button"
                    onClick={() => {
                      if (chip.en.includes('camera')) {
                        setCameraOpen(true);
                      } else {
                        dispatchMessage(isUrdu ? chip.ur : chip.en);
                      }
                    }}
                    className="min-h-[40px] px-4 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-xs font-medium hover:border-[var(--accent)] transition-colors"
                  >
                    {isUrdu ? chip.ur : chip.en}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onOpenGuidedForm}
                  className="min-h-[40px] px-4 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/8"
                >
                  {s.structuredCheckupBtn}
                </button>
              </div>
            </div>
          ) : (
            activeThread.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 space-y-3 ${
                    msg.role === 'user'
                      ? 'azure-pill-active'
                      : msg.triageTier === 'RED'
                        ? 'border-2 border-[#DC2626] bg-red-50/80 dark:bg-red-950/35 text-[var(--ink)]'
                        : 'border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)]'
                  }`}
                >
                  {msg.mediaDataUrl && (
                    <img
                      src={msg.mediaDataUrl}
                      alt="Attached visual frame"
                      className="max-h-52 rounded-xl border border-[var(--border)] object-cover"
                    />
                  )}

                  <p className={`text-sm leading-relaxed ${isUrdu && msg.text_ur ? 'font-urdu urdu-safe text-base' : ''}`}>
                    {isUrdu && msg.text_ur ? msg.text_ur : msg.text}
                  </p>

                  {!isUrdu && msg.text_ur && msg.role === 'agent' && (
                    <p className="font-urdu urdu-safe text-sm text-[var(--muted)] border-t border-[var(--border)] pt-2.5" dir="rtl" lang="ur">
                      {msg.text_ur}
                    </p>
                  )}

                  {/* Inline Stay Home vs Go to Hospital Decision Card */}
                  {msg.stayHomeGuidance && (
                    <div
                      className={`rounded-xl p-3.5 border space-y-1.5 ${
                        msg.stayHomeGuidance.verdict === 'EMERGENCY_1122'
                          ? 'border-[#DC2626]/40 bg-[var(--surface)]'
                          : msg.stayHomeGuidance.verdict === 'RECHECK_AND_CLINIC'
                            ? 'border-amber-600/35 bg-amber-50/70 dark:bg-amber-950/30'
                            : 'border-[var(--accent)]/30 bg-[var(--surface)]'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        {isUrdu ? msg.stayHomeGuidance.title_ur : msg.stayHomeGuidance.title_en}
                      </div>
                      <ul className="space-y-1 text-xs">
                        {(isUrdu ? msg.stayHomeGuidance.actionSteps_ur : msg.stayHomeGuidance.actionSteps_en).map((st) => (
                          <li key={st} className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                            • {st}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-[var(--muted)] italic">
                        {isUrdu ? msg.stayHomeGuidance.disclaimer_ur : msg.stayHomeGuidance.disclaimer_en}
                      </p>
                    </div>
                  )}

                  {/* Inline RED Emergency First Aid & Rescue 1122 */}
                  {msg.triageTier === 'RED' && msg.firstAid && (
                    <div className="rounded-xl bg-[var(--surface)] border border-[#DC2626]/30 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#DC2626]">
                        <AlertOctagon className="h-4 w-4 shrink-0" />
                        <span>{isUrdu ? msg.firstAid.title_ur : msg.firstAid.title_en}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['1122', '115', '1020'].map((tel) => (
                          <a
                            key={tel}
                            href={`tel:${tel}`}
                            className="min-h-[36px] px-3.5 rounded-full bg-[#DC2626] text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <PhoneCall className="h-3.5 w-3.5" /> {tel}
                          </a>
                        ))}
                      </div>
                      <ol className="text-xs space-y-1 list-decimal list-inside">
                        {(isUrdu ? msg.firstAid.do_now_ur : msg.firstAid.do_now_en).map((st) => (
                          <li key={st} className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
                            {st}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Audio Replay & Quick Follow-ups */}
                  {msg.role === 'agent' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>{msg.engineUsed ?? 'WHO Safety Core'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          speakOfflineGuidance(
                            msg.text_ur || msg.text,
                            msg.text_ur ? 'ur-PK' : 'en-US'
                          )
                        }
                        className="min-h-[32px] px-3 rounded-full border border-[var(--border)] text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <Volume2 className="h-3 w-3 text-[var(--accent)]" /> {s.urduAudio}
                      </button>
                    </div>
                  )}

                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr.label_en}
                          type="button"
                          onClick={() => dispatchMessage(isUrdu ? qr.label_ur : qr.label_en)}
                          className="min-h-[36px] px-3.5 rounded-full border border-[var(--accent)]/40 bg-[var(--surface)] text-xs font-medium hover:bg-[var(--accent-soft)]"
                        >
                          {isUrdu ? qr.label_ur : qr.label_en}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="text-xs text-[var(--muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span>{s.agentThinking}</span>
            </div>
          )}
        </div>

        {/* Cross-Person Guard Banner */}
        {suggestedSwitchPerson && dismissedSwitchFor !== suggestedSwitchPerson.id && (
          <div className="mx-4 mb-3 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)]  p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[var(--accent)] shrink-0" />
              <span>
                {isUrdu
                  ? `آپ اس وقت ${activePerson.name} کی چیٹ میں ہیں۔ کیا یہ پیغام ${suggestedSwitchPerson.name} (${suggestedSwitchPerson.relationship}) کے ریکارڈ میں محفوظ کریں؟`
                  : `You mentioned ${suggestedSwitchPerson.name} (${suggestedSwitchPerson.relationship}) while inside ${activePerson.name}'s chat. Switch & save to their profile?`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const txt = draft;
                  const imgs = pendingImages;
                  onSwitchPerson(suggestedSwitchPerson.id);
                  await dispatchMessage(txt, imgs, 'IMAGE', suggestedSwitchPerson);
                }}
                className="min-h-[36px] px-3.5 rounded-full azure-pill-active text-xs font-semibold"
              >
                {isUrdu ? `${suggestedSwitchPerson.name} پر منتقل کریں` : `Switch & Send to ${suggestedSwitchPerson.name}`}
              </button>
              <button
                type="button"
                onClick={() => setDismissedSwitchFor(suggestedSwitchPerson.id)}
                className="min-h-[36px] px-3 rounded-full border border-[var(--border)] text-xs"
              >
                {isUrdu ? 'یہیں رہیں' : 'Keep Here'}
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5 space-y-3">
          {pendingImages.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {pendingImages.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={src} alt="Attached EXIF-stripped photo" className="h-16 w-20 object-cover rounded-xl border border-[var(--border)]" />
                  <button
                    type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#142621] text-white text-[10px]"
                    aria-label="Remove attached photo"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="min-h-[40px] px-4 rounded-full border border-[var(--accent)]/40 bg-[var(--surface)] text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[var(--accent)]/8"
              >
                <Camera className="h-3.5 w-3.5 text-[var(--accent)]" /> {s.liveCameraBtn}
              </button>

              <select
                aria-label="Report upload type"
                value={reportKindForUpload}
                onChange={(e) => setReportKindForUpload(e.target.value as SavedReportKind)}
                className="min-h-[40px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs"
              >
                <option value="REPORT_PHOTO">{isUrdu ? 'لیب رپورٹ' : 'Lab / Report'}</option>
                <option value="PRESCRIPTION">{isUrdu ? 'نسخہ تصویر' : 'Prescription'}</option>
                <option value="MEAL_PHOTO">{isUrdu ? 'کھانے کی تصویر' : 'Meal Photo'}</option>
              </select>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-4 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-medium inline-flex items-center gap-1.5"
              >
                <ImagePlus className="h-3.5 w-3.5 text-[var(--accent)]" /> {s.uploadReportBtn}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatchMessage(draft, pendingImages, 'IMAGE');
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              maxLength={600}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isUrdu
                  ? `${activePerson.name} کی علامات، سوال یا ہنگامی کیفیت لکھیں...`
                  : `Ask about ${activePerson.name}'s symptoms, reports, BP, or emergency...`
              }
              className="flex-1 min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoiceMic}
                className="min-h-[46px] px-4 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-medium inline-flex items-center gap-1.5"
              >
                {recordingVoice ? <Square className="h-3.5 w-3.5 text-[#DC2626]" /> : <Mic className="h-3.5 w-3.5 text-[var(--accent)]" />}
                {recordingVoice ? s.recordingStop : s.voiceInput}
              </button>

              <button
                type="submit"
                disabled={sending || (!draft.trim() && pendingImages.length === 0)}
                className="min-h-[46px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> {s.agentSendBtn}
              </button>
            </div>
          </form>
        </div>
      </div>

      <CameraMultimodalModal
        isOpen={cameraOpen}
        locale={locale}
        personName={activePerson.name}
        onClose={() => setCameraOpen(false)}
        onDetectedQrToken={onDetectedQrToken}
        onSubmitFrames={async ({ question, framesDataUrls, mediaKind }) => {
          await onSaveReport({
            id: `rep_${crypto.randomUUID().slice(0, 10)}`,
            personId: activePerson.id,
            kind: 'REPORT_PHOTO',
            title: mediaKind === 'VIDEO_BURST' ? 'Camera 3-Frame Burst' : 'Camera Snapshot',
            notes: question,
            imageDataUrl: framesDataUrls[0],
            createdAtIso: new Date().toISOString(),
          });
          await dispatchMessage(question, framesDataUrls, mediaKind);
        }}
      />
    </div>
  );
};
