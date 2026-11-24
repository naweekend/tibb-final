import React, { Component, ErrorInfo, ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  BellRing,
  Camera,
  Check,
  Cpu,
  Dumbbell,
  FileImage,
  Home,
  Lock,
  Moon,
  PhoneCall,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Sun,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AuthLockScreen } from './components/AuthLockScreen';
import { HomeHubDashboard } from './components/HomeHubDashboard';
import { LandingPage } from './components/LandingPage';
import { LegalComplianceModal } from './components/LegalComplianceModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PersonOnboardingModal } from './components/PersonOnboardingModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DashboardSkeleton, ScreenSkeleton } from './components/SkeletonLoaders';
import { TriageResultView } from './components/TriageResultView';
import { buildPersonalizedPlanOffline, computeBmiAssessment } from './data/remediesAndPlans';
import { AppLocale, I18N } from './data/trilingual';
import {
  StoredEpisode,
  StoredLabRecord,
  StoredMedicineAlarm,
  UnlockedVaultSession,
  encryptPayloadForSession,
  ensureQuickLocalSession,
  listDecryptedForSession,
  queueAnonymousTelemetry,
  tibbDb,
} from './db/encryptedVault';
import { playClinicalChime } from './engine/audioFeedback';
import {
  EpisodeInput,
  EpisodeVitals,
  PatientProfile,
  TriageEvaluationResult,
  evaluateCareEpisode,
  getAgeBracket,
} from './engine/triageEngine';
import {
  ChatThread,
  DailyWellnessLog,
  ExtendedPatientProfile,
  SavedPersonReport,
  WellnessGoal,
  normalizePersonProfile,
} from './types/clinical';
import { formatTime12h, getLocalDateKey } from './utils/healthMath';

const AndroidKitView = lazy(() => import('./components/AndroidKitView').then((m) => ({ default: m.AndroidKitView })));
const BhuQueuePanel = lazy(() => import('./components/BhuQueuePanel').then((m) => ({ default: m.BhuQueuePanel })));
const LabReportScanner = lazy(() =>
  import('./components/LabReportScanner').then((m) => ({ default: m.LabReportScanner }))
);
const MedicineAlarms = lazy(() => import('./components/MedicineAlarms').then((m) => ({ default: m.MedicineAlarms })));
const PersonChatWorkspace = lazy(() =>
  import('./components/PersonChatWorkspace').then((m) => ({ default: m.PersonChatWorkspace }))
);
const PersonRecordsVault = lazy(() =>
  import('./components/PersonRecordsVault').then((m) => ({ default: m.PersonRecordsVault }))
);
const TriageWizard = lazy(() => import('./components/TriageWizard').then((m) => ({ default: m.TriageWizard })));
const VitalsEstimator = lazy(() => import('./components/VitalsEstimator').then((m) => ({ default: m.VitalsEstimator })));
const WellnessCoachView = lazy(() =>
  import('./components/WellnessCoachView').then((m) => ({ default: m.WellnessCoachView }))
);

type ActiveTab = 'HOME' | 'CHECKUP' | 'COACH' | 'VITALS' | 'ALARMS' | 'RECORDS' | 'BHU' | 'KIT';

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Captured locally without exposing PII
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-6">
          <div className="max-w-md glass-panel rounded-3xl p-8 space-y-4">
            <h1 className="font-display text-xl font-semibold">Recoverable Interface Error</h1>
            <p className="text-sm text-[var(--muted)]">
              Your encrypted vault remains safe. Reload to resume cleanly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold"
            >
              Reload Tibb
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState<UnlockedVaultSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [enteredWorkspace, setEnteredWorkspace] = useState(false);

  const [darkMode, setDarkMode] = useState(true);
  const [locale, setLocale] = useState<AppLocale>('en');
  const [workspace, setWorkspace] = useState<'GHARANA' | 'BHU'>('GHARANA');
  const [activeTab, setActiveTab] = useState<ActiveTab>('HOME');
  const [checkupSubMode, setCheckupSubMode] = useState<'TRIAGE' | 'CAMERA_CHAT'>('TRIAGE');
  const [alarmsSubMode, setAlarmsSubMode] = useState<'REMINDERS' | 'LABS'>('REMINDERS');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tibb_telemetry_consent') === 'granted';
    } catch {
      return false;
    }
  });
  const [vaultErrorNotice, setVaultErrorNotice] = useState('');

  const [profiles, setProfiles] = useState<ExtendedPatientProfile[]>([]);
  const [activePersonId, setActivePersonId] = useState<string>('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ExtendedPatientProfile | null>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [reports, setReports] = useState<SavedPersonReport[]>([]);
  const [episodes, setEpisodes] = useState<StoredEpisode[]>([]);
  const [labs, setLabs] = useState<StoredLabRecord[]>([]);
  const [alarms, setAlarms] = useState<StoredMedicineAlarm[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);

  const [completedTriage, setCompletedTriage] = useState<{
    input: EpisodeInput;
    result: TriageEvaluationResult;
    episodeId: string;
  } | null>(null);
  const [activeReminderAlert, setActiveReminderAlert] = useState<{
    alarm: StoredMedicineAlarm;
    matchedTime24h: string;
  } | null>(null);
  const firedReminderKeysRef = useRef<Set<string>>(new Set());

  const todayKey = getLocalDateKey();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleToggleTelemetryConsent = (granted: boolean) => {
    setTelemetryConsent(granted);
    try {
      localStorage.setItem('tibb_telemetry_consent', granted ? 'granted' : 'denied');
    } catch {
      // ignore storage errors
    }
  };

  const handleWipeAllVaultData = async () => {
    await tibbDb.transaction(
      'rw',
      tibbDb.accounts,
      tibbDb.vaultItems,
      tibbDb.telemetryOutbox,
      tibbDb.auditLogs,
      async () => {
        await tibbDb.vaultItems.clear();
        await tibbDb.auditLogs.clear();
        await tibbDb.telemetryOutbox.clear();
        await tibbDb.accounts.clear();
      }
    );
    setSession(null);
    setProfiles([]);
    setThreads([]);
    setReports([]);
    setEpisodes([]);
    setLabs([]);
    setAlarms([]);
    setWellnessLogs([]);
    setCompletedTriage(null);
    setShowAuthScreen(true);
    setEnteredWorkspace(false);
  };

  // Foreground alarm scheduler
  useEffect(() => {
    if (!session || alarms.length === 0) return;
    const checkDueAlarms = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const localDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      for (const alm of alarms) {
        if (!alm.enabled) continue;
        const times = [alm.time24h];
        if (alm.frequency === 'TWICE_DAILY' && alm.secondTime24h) times.push(alm.secondTime24h);
        if (!times.includes(hhmm)) continue;

        const fireKey = `${localDateKey}_${alm.id}_${hhmm}`;
        if (firedReminderKeysRef.current.has(fireKey)) continue;
        firedReminderKeysRef.current.add(fireKey);

        playClinicalChime('alarm');
        setActiveReminderAlert({ alarm: alm, matchedTime24h: hhmm });
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`Tibb Reminder · ${alm.patientName}`, {
              body: `${alm.medicineLabel} (${formatTime12h(hhmm)})`,
            });
          } catch {
            // ignore notification errors inside restricted iframes
          }
        }
        break;
      }
    };
    checkDueAlarms();
    const timer = window.setInterval(checkDueAlarms, 20000);
    return () => window.clearInterval(timer);
  }, [session, alarms]);

  // Immediate non-blocking local launch
  useEffect(() => {
    let mounted = true;
    ensureQuickLocalSession('GHARANA')
      .then((res) => {
        if (!mounted) return;
        if (res.requiresPinUnlock || !res.session) {
          setShowAuthScreen(true);
        } else {
          setSession(res.session);
          setShowAuthScreen(false);
        }
      })
      .catch(() => {
        if (mounted) setShowAuthScreen(true);
      })
      .finally(() => {
        if (mounted) setBooting(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load decrypted encrypted vault items when session activates
  useEffect(() => {
    if (!session) return;
    setWorkspace(session.role);
    Promise.all([
      listDecryptedForSession<PatientProfile>(session, 'PROFILE'),
      listDecryptedForSession<ChatThread>(session, 'THREAD'),
      listDecryptedForSession<SavedPersonReport>(session, 'REPORT'),
      listDecryptedForSession<StoredEpisode>(session, 'EPISODE'),
      listDecryptedForSession<StoredLabRecord>(session, 'LAB'),
      listDecryptedForSession<StoredMedicineAlarm>(session, 'ALARM'),
      listDecryptedForSession<DailyWellnessLog>(session, 'WELLNESS'),
    ]).then(([p, th, rp, e, l, a, wl]) => {
      const normalized = p.map((item) => normalizePersonProfile(item, session.accountId));
      setProfiles(normalized);
      if (normalized.length > 0) {
        setActivePersonId((curr) => (normalized.some((n) => n.id === curr) ? curr : normalized[0].id));
        setOnboardingOpen(false);
      }
      setThreads(th.sort((x, y) => y.updatedAtIso.localeCompare(x.updatedAtIso)));
      setReports(rp.sort((x, y) => y.createdAtIso.localeCompare(x.createdAtIso)));
      setEpisodes(e.sort((x, y) => y.createdAtIso.localeCompare(x.createdAtIso)));
      setLabs(l.sort((x, y) => y.scannedAtIso.localeCompare(x.scannedAtIso)));
      setAlarms(a);
      setWellnessLogs(wl);
    });
  }, [session]);

  const activePerson = useMemo<ExtendedPatientProfile | null>(() => {
    if (!profiles.length) return null;
    return profiles.find((p) => p.id === activePersonId) ?? profiles[0];
  }, [profiles, activePersonId]);

  const activeWellness = useMemo<DailyWellnessLog>(() => {
    const pid = activePerson?.id ?? 'default';
    const existing = wellnessLogs.find((w) => w.personId === pid && w.dateKey === todayKey);
    if (existing) return existing;
    const latestWithPlan = wellnessLogs
      .filter((w) => w.personId === pid && w.plan)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
    const bmiTargets = activePerson
      ? computeBmiAssessment(activePerson.weightKg, activePerson.heightCm, activePerson.ageMonths)
      : null;
    return {
      id: `well_${pid}_${todayKey}`,
      personId: pid,
      dateKey: todayKey,
      steps: 0,
      stepGoal: latestWithPlan?.stepGoal ?? bmiTargets?.recommendedSteps ?? 6500,
      waterMl: 0,
      waterGoalMl: latestWithPlan?.waterGoalMl ?? bmiTargets?.recommendedWaterMl ?? 2400,
      sleepHours: 7,
      mealsChecked: [],
      workoutDone: false,
      plan: latestWithPlan?.plan,
      updatedAtIso: new Date().toISOString(),
    };
  }, [wellnessLogs, activePerson, todayKey]);

  const handleUpdateWellness = async (next: DailyWellnessLog) => {
    if (!session) return;
    const prevSnapshot = wellnessLogs;
    setWellnessLogs((prev) => [next, ...prev.filter((w) => w.id !== next.id)]);
    try {
      await encryptPayloadForSession(session, next.id, 'WELLNESS', next);
      setVaultErrorNotice('');
    } catch {
      setWellnessLogs(prevSnapshot);
      setVaultErrorNotice('Unable to save wellness entry to encrypted vault.');
    }
  };

  const syncVitalsToWellness = async (vitals: EpisodeVitals) => {
    if (!activePerson) return;
    await handleUpdateWellness({
      ...activeWellness,
      restingHr: vitals.heartRate ?? activeWellness.restingHr,
      lastBpSystolic: vitals.bpSystolic ?? activeWellness.lastBpSystolic,
      lastBpDiastolic: vitals.bpDiastolic ?? activeWellness.lastBpDiastolic,
      lastSugarMgDl: vitals.bloodGlucoseMgDl ?? activeWellness.lastSugarMgDl,
      updatedAtIso: new Date().toISOString(),
    });
  };

  const scopedEpisodes = useMemo(
    () => (activePerson ? episodes.filter((e) => e.patientId === activePerson.id) : episodes),
    [episodes, activePerson]
  );
  const scopedLabs = useMemo(
    () => (activePerson ? labs.filter((l) => l.patientId === activePerson.id) : labs),
    [labs, activePerson]
  );
  const scopedAlarms = useMemo(
    () => (activePerson ? alarms.filter((a) => a.patientId === activePerson.id) : alarms),
    [alarms, activePerson]
  );

  const handleSaveProfile = async (profile: PatientProfile | ExtendedPatientProfile) => {
    if (!session) return;
    const normalized = normalizePersonProfile(profile, session.accountId);
    await encryptPayloadForSession(session, normalized.id, 'PROFILE', normalized);
    setProfiles((prev) => [...prev.filter((p) => p.id !== normalized.id), normalized]);
    setActivePersonId(normalized.id);
    setEditingPerson(null);

    const goal = normalized.preferredGoal ?? 'BALANCED';
    const initialPlan = buildPersonalizedPlanOffline(normalized, goal);
    const existingLog = wellnessLogs.find((w) => w.personId === normalized.id && w.dateKey === todayKey);
    const nextLog: DailyWellnessLog = existingLog
      ? {
          ...existingLog,
          waterGoalMl: initialPlan.dailyWaterGoalMl,
          stepGoal: initialPlan.dailyStepsGoal,
          plan: initialPlan,
          updatedAtIso: new Date().toISOString(),
        }
      : {
          id: `well_${normalized.id}_${todayKey}`,
          personId: normalized.id,
          dateKey: todayKey,
          steps: 0,
          stepGoal: initialPlan.dailyStepsGoal,
          waterMl: 0,
          waterGoalMl: initialPlan.dailyWaterGoalMl,
          sleepHours: 7,
          mealsChecked: [],
          workoutDone: false,
          plan: initialPlan,
          updatedAtIso: new Date().toISOString(),
        };
    await encryptPayloadForSession(session, nextLog.id, 'WELLNESS', nextLog);
    setWellnessLogs((prev) => [nextLog, ...prev.filter((w) => w.id !== nextLog.id)]);
  };

  const handleUpdatePersonWeight = async (weightKg: number) => {
    if (!session || !activePerson) return;
    const updated: ExtendedPatientProfile = {
      ...activePerson,
      weightKg,
      baselineWeightKg: activePerson.baselineWeightKg ?? activePerson.weightKg ?? weightKg,
    };
    await encryptPayloadForSession(session, updated.id, 'PROFILE', updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleUpdatePersonGoal = async (goal: WellnessGoal) => {
    if (!session || !activePerson) return;
    const updated: ExtendedPatientProfile = {
      ...activePerson,
      preferredGoal: goal,
    };
    await encryptPayloadForSession(session, updated.id, 'PROFILE', updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleSaveThread = async (thread: ChatThread) => {
    if (!session) return;
    await encryptPayloadForSession(session, thread.id, 'THREAD', thread);
    setThreads((prev) => {
      const rest = prev.filter((t) => t.id !== thread.id);
      return [thread, ...rest].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
    });
  };

  const handleSaveReport = async (report: SavedPersonReport) => {
    if (!session) return;
    await encryptPayloadForSession(session, report.id, 'REPORT', report);
    setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
  };

  const handleCompleteEpisode = async (input: EpisodeInput, result: TriageEvaluationResult) => {
    if (!session) return;
    const episodeId = `ep_${crypto.randomUUID().slice(0, 10)}`;
    const stored: StoredEpisode = {
      id: episodeId,
      patientId: input.patient.id,
      patientName: input.patient.name,
      ageMonths: input.patient.ageMonths,
      createdAtIso: new Date().toISOString(),
      triageTier: result.tier,
      redFlagCodes: result.redFlags.map((r) => r.code),
      symptomCategory: result.symptomCategory,
      respiratoryRate: input.vitals.respiratoryRate,
      heartRate: input.vitals.heartRate,
      referralToken: result.referralSlip.referralToken,
      facilityName: result.recommendedFacilities[0]?.name_en ?? 'Pending Location',
      referralCompleted: false,
    };
    await encryptPayloadForSession(session, episodeId, 'EPISODE', stored);
    setEpisodes((prev) => [stored, ...prev]);

    if (telemetryConsent) {
      const telemetry = await queueAnonymousTelemetry({
        districtCode: input.district ?? 'UNSPECIFIED',
        mode: workspace,
        ageBracket: getAgeBracket(input.patient.ageMonths),
        triageTier: result.tier,
        symptomCategory: result.symptomCategory,
        amrBlockTriggered: false,
        referralGenerated: result.tier !== 'GREEN',
        referralToken: result.referralSlip.referralToken,
      });

      if (navigator.onLine) {
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telemetry),
        }).catch(() => {});
      }
    }

    setCompletedTriage({ input, result, episodeId });
    setCheckupSubMode('TRIAGE');
    setActiveTab('CHECKUP');
  };

  const handleAnalyzeVitalsStandalone = async (vitals: EpisodeVitals) => {
    if (!session) return;
    await syncVitalsToWellness(vitals);
    const patient: ExtendedPatientProfile =
      activePerson ??
      normalizePersonProfile(
        {
          id: 'vitals_self',
          accountId: session.accountId,
          name: session.displayName,
          ageMonths: 360,
          sex: 'O',
          isPregnantOrLactating: false,
          chronicConditions: [],
          allergies: [],
          workspace,
        },
        session.accountId
      );

    await handleSaveReport({
      id: `rep_${crypto.randomUUID().slice(0, 10)}`,
      personId: patient.id,
      kind: 'VITALS_LOG',
      title: `Vitals Check (${vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic ?? '--'} mmHg` : 'Readings'})`,
      notes: [
        vitals.bloodGlucoseMgDl ? `Sugar: ${vitals.bloodGlucoseMgDl} mg/dL (${vitals.sugarMode ?? 'RANDOM'})` : '',
        vitals.respiratoryRate ? `Breathing: ${vitals.respiratoryRate}/min` : '',
        vitals.heartRate ? `Pulse: ${vitals.heartRate} bpm` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      vitalsSnapshot: vitals,
      createdAtIso: new Date().toISOString(),
    });

    const savedPlace = patient.frequentPlaces?.[0];
    const input: EpisodeInput = {
      patient,
      bodyRegion: 'CHEST',
      durationHours: 6,
      temperatureBand: 'NORMAL',
      hydrationStatus: 'NORMAL',
      vitals,
      district: savedPlace?.district,
      userCoords:
        savedPlace && typeof savedPlace.lat === 'number' && typeof savedPlace.lng === 'number'
          ? { lat: savedPlace.lat, lng: savedPlace.lng }
          : undefined,
      answers: {
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
        primaryComplaint: 'CHRONIC_FLARE',
      },
    };
    const res = evaluateCareEpisode(input);
    await handleCompleteEpisode(input, res);
  };

  const handleTriggerSos = async (placeIndex = 0) => {
    if (!session) return;
    const savedPlace = activePerson?.frequentPlaces?.[placeIndex] ?? activePerson?.frequentPlaces?.[0];
    const fallbackPatient: PatientProfile = activePerson ?? {
      id: 'sos_temp',
      accountId: session.accountId,
      name: 'SOS Emergency Patient',
      ageMonths: 360,
      sex: 'O',
      isPregnantOrLactating: false,
      chronicConditions: [],
      allergies: [],
      workspace,
    };
    const sosInput: EpisodeInput = {
      patient: fallbackPatient,
      bodyRegion: 'CHEST',
      durationHours: 1,
      temperatureBand: 'NORMAL',
      hydrationStatus: 'NORMAL',
      vitals: { measurementMethod: 'NONE' },
      district: savedPlace?.district,
      userCoords:
        savedPlace && typeof savedPlace.lat === 'number' && typeof savedPlace.lng === 'number'
          ? { lat: savedPlace.lat, lng: savedPlace.lng }
          : undefined,
      answers: {
        unableToDrink: false,
        vomitsEverything: false,
        convulsions: false,
        lethargicOrUnconscious: false,
        chestIndrawingOrStridor: false,
        crushingChestPain: false,
        strokeFastSigns: false,
        severeShortnessOfBreath: true,
        uncontrolledBleeding: false,
        stiffNeckOrPetechialRash: false,
        pregnancyDangerSigns: false,
        moderateDehydration: false,
        bloodInStoolOrVomit: false,
        burnOrDeepWound: false,
        heatExhaustionSigns: false,
        persistentCoughOver14Days: false,
        primaryComplaint: 'COUGH_COLD',
      },
      emergencyOverrideCategory: 'BREATHING_DISTRESS',
    };
    const res = evaluateCareEpisode(sosInput);
    await handleCompleteEpisode(sosInput, res);
  };

  const handleSaveLab = async (record: StoredLabRecord) => {
    if (!session) return;
    await encryptPayloadForSession(session, record.id, 'LAB', record);
    setLabs((prev) => [record, ...prev]);
  };

  const handleSaveAlarm = async (alarm: StoredMedicineAlarm) => {
    if (!session) return;
    await encryptPayloadForSession(session, alarm.id, 'ALARM', alarm);
    setAlarms((prev) => {
      const exists = prev.some((a) => a.id === alarm.id);
      return exists ? prev.map((a) => (a.id === alarm.id ? alarm : a)) : [alarm, ...prev];
    });
  };

  const handleMarkReminderDone = async (alarm: StoredMedicineAlarm) => {
    if (alarm.adherenceDates.includes(todayKey)) return;
    await handleSaveAlarm({
      ...alarm,
      adherenceDates: [...alarm.adherenceDates, todayKey],
    });
  };

  const handleVerifyReferral = async (episodeId: string) => {
    if (!session) return;
    const target = episodes.find((e) => e.id === episodeId);
    if (!target) return;
    const updated: StoredEpisode = { ...target, referralCompleted: true };
    await encryptPayloadForSession(session, episodeId, 'EPISODE', updated);
    setEpisodes((prev) => prev.map((e) => (e.id === episodeId ? updated : e)));
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] pt-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (showAuthScreen || !session) {
    return (
      <AppErrorBoundary>
        <AuthLockScreen
          locale={locale}
          onChangeLocale={setLocale}
          onUnlocked={(unlocked) => {
            setSession(unlocked);
            setShowAuthScreen(false);
            setEnteredWorkspace(true);
          }}
          onOpenLegalModal={() => setLegalOpen(true)}
        />
        <LegalComplianceModal
          isOpen={legalOpen}
          locale={locale}
          telemetryConsent={telemetryConsent}
          onChangeTelemetryConsent={handleToggleTelemetryConsent}
          onWipeLocalData={handleWipeAllVaultData}
          onClose={() => setLegalOpen(false)}
        />
      </AppErrorBoundary>
    );
  }

  if (!enteredWorkspace) {
    return (
      <AppErrorBoundary>
        <LandingPage
          locale={locale}
          onChangeLocale={setLocale}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          hasProfiles={profiles.length > 0}
          onBeginRegistration={() => {
            setEditingPerson(null);
            setOnboardingOpen(true);
            setEnteredWorkspace(true);
          }}
          onEnterWorkspace={() => setEnteredWorkspace(true)}
          onOpenPinVault={() => setShowAuthScreen(true)}
          onOpenLegalModal={() => setLegalOpen(true)}
        />
        <LegalComplianceModal
          isOpen={legalOpen}
          locale={locale}
          telemetryConsent={telemetryConsent}
          onChangeTelemetryConsent={handleToggleTelemetryConsent}
          onWipeLocalData={handleWipeAllVaultData}
          onClose={() => setLegalOpen(false)}
        />
      </AppErrorBoundary>
    );
  }

  if (profiles.length === 0) {
    return (
      <AppErrorBoundary>
        <PersonOnboardingModal
          key="first_intake"
          isOpen={true}
          canClose={false}
          fullPage={true}
          accountId={session.accountId}
          workspace={workspace}
          locale={locale}
          initialProfile={null}
          onSave={handleSaveProfile}
          onClose={() => setOnboardingOpen(false)}
        />
      </AppErrorBoundary>
    );
  }

  const strings = I18N[locale];
  const isUrdu = locale === 'ur';

  const topNavItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'HOME', label: strings.navHome, icon: Home },
    { id: 'CHECKUP', label: strings.navCheckup, icon: Stethoscope },
    { id: 'COACH', label: strings.navCoach, icon: Dumbbell },
    { id: 'VITALS', label: strings.navVitals, icon: Activity },
    { id: 'ALARMS', label: strings.navAlarmsReports, icon: Bell },
    ...(workspace === 'BHU' ? [{ id: 'BHU' as const, label: strings.navQueue, icon: Users }] : []),
  ];

  const latestReportWithVitals = reports.find((r) => r.personId === activePerson?.id && r.vitalsSnapshot);
  const latestVitalsSummary = latestReportWithVitals?.notes;

  return (
    <AppErrorBoundary>
      <div
        dir={isUrdu ? 'rtl' : 'ltr'}
        className="min-h-screen bg-transparent text-[var(--ink)] pb-20 lg:pb-8 relative overflow-x-hidden transition-colors duration-300"
      >
        <OfflineIndicator isUrdu={isUrdu} />

        {/* Clean Strict 3-Zone Top Bar */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/75 backdrop-blur-md no-print">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
            {/* Zone 1: Brand */}
            <button
              type="button"
              onClick={() => {
                setCompletedTriage(null);
                setActiveTab('HOME');
              }}
              className="flex items-baseline gap-2 whitespace-nowrap shrink-0 text-left"
            >
              <span className="font-display text-2xl font-semibold tracking-tight">tibb</span>
              <span className="font-urdu urdu-safe text-base text-[var(--accent)]" dir="rtl" lang="ur">
                طب
              </span>
            </button>

            {/* Zone 2: Primary Nav Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-[var(--muted)]">
              {topNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    activeTab === item.id
                      ? 'border-[var(--accent)] text-[var(--ink)] font-semibold'
                      : 'border-transparent hover:text-[var(--ink)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Zone 3: 1122 SOS + Controls Drawer Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleTriggerSos(0)}
                className="min-h-[36px] px-3.5 rounded-full bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tactile-press"
              >
                <PhoneCall className="h-3.5 w-3.5" /> 1122 SOS
              </button>

              <button
                type="button"
                aria-label="Open settings and preferences"
                onClick={() => setControlsOpen((o) => !o)}
                className="min-h-[36px] px-3 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tactile-press"
              >
                {controlsOpen ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isUrdu ? 'ترتیبات' : 'Menu'}</span>
              </button>
            </div>
          </div>

          {controlsOpen && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)]">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                {/* Language & Theme */}
                <div className="space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-[11px] text-[var(--muted)]">
                    {isUrdu ? 'زبان اور تھیم' : 'Language & Theme'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--surface-muted)]">
                      {(
                        [
                          ['en', 'EN'],
                          ['ur', 'اردو'],
                          ['roman', 'Roman'],
                        ] as const
                      ).map(([code, label]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setLocale(code)}
                          className={`min-h-[32px] px-3 rounded-full text-xs font-medium ${
                            locale === code ? 'azure-pill-active' : 'text-[var(--muted)]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDarkMode((d) => !d)}
                      className="min-h-[36px] px-3.5 rounded-full border border-[var(--border)] inline-flex items-center gap-1.5"
                    >
                      {darkMode ? <Sun className="h-3.5 w-3.5 text-[var(--accent)]" /> : <Moon className="h-3.5 w-3.5" />}
                      {darkMode ? 'Light Cream' : 'Forest Dark'}
                    </button>
                  </div>
                </div>

                {/* Mode & Privacy */}
                <div className="space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-[11px] text-[var(--muted)]">
                    {isUrdu ? 'موڈ اور والٹ تحفظ' : 'Clinical Mode & Vault'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--surface-muted)]">
                      <button
                        type="button"
                        onClick={() => setWorkspace('GHARANA')}
                        className={`min-h-[32px] px-3 rounded-full text-xs font-medium ${
                          workspace === 'GHARANA' ? 'azure-pill-active' : 'text-[var(--muted)]'
                        }`}
                      >
                        {strings.gharanaMode}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWorkspace('BHU');
                          setActiveTab('BHU');
                          setControlsOpen(false);
                        }}
                        className={`min-h-[32px] px-3 rounded-full text-xs font-medium ${
                          workspace === 'BHU' ? 'azure-pill-active' : 'text-[var(--muted)]'
                        }`}
                      >
                        {strings.bhuMode}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setControlsOpen(false);
                        setShowAuthScreen(true);
                        setCompletedTriage(null);
                      }}
                      className="min-h-[36px] px-3.5 rounded-full border border-[var(--border)] inline-flex items-center gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5" /> {strings.setPinBtn}
                    </button>
                  </div>
                </div>

                {/* Android Kit, Overview, Legal & Install */}
                <div className="space-y-2">
                  <div className="font-semibold uppercase tracking-wider text-[11px] text-[var(--muted)]">
                    {isUrdu ? 'مقامی ایپ اور رازداری' : 'Offline App & Privacy'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('KIT');
                        setControlsOpen(false);
                      }}
                      className="min-h-[36px] px-3.5 rounded-full border border-[var(--border)] inline-flex items-center gap-1.5"
                    >
                      <Cpu className="h-3.5 w-3.5 text-[var(--accent)]" /> {strings.navKit}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setControlsOpen(false);
                        setLegalOpen(true);
                      }}
                      className="min-h-[36px] px-3.5 rounded-full border border-[var(--border)] inline-flex items-center gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" /> {isUrdu ? 'رازداری' : 'Privacy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setControlsOpen(false);
                        setEnteredWorkspace(false);
                      }}
                      className="min-h-[36px] px-3.5 rounded-full border border-[var(--border)]"
                    >
                      {isUrdu ? 'تعارفی صفحہ' : 'Overview'}
                    </button>
                    <PWAInstallButton />
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Quiet Single-Line Active Member Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 relative z-10 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3.5 py-1">
              <span className="text-[11px] font-medium text-[var(--muted)]">{strings.activePersonLabel}:</span>
              <select
                aria-label={strings.activePersonLabel}
                value={activePerson?.id ?? ''}
                onChange={(e) => {
                  setActivePersonId(e.target.value);
                  setCompletedTriage(null);
                }}
                className="bg-transparent text-xs font-semibold text-[var(--ink)] focus:outline-none min-h-[24px]"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="text-[#142621] bg-white">
                    {p.name} ({p.relationship})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingPerson(null);
                setOnboardingOpen(true);
              }}
              className="min-h-[34px] px-3.5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5 tactile-press"
            >
              <UserPlus className="h-3.5 w-3.5" /> {strings.addPersonBtn}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('RECORDS')}
            className={`min-h-[34px] px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border ${
              activeTab === 'RECORDS'
                ? 'azure-pill-active border-transparent'
                : 'border-[var(--border)] bg-[var(--surface)]/80 hover:border-[var(--accent)]'
            }`}
          >
            <FileImage className="h-3.5 w-3.5" /> {strings.navRecords}
          </button>
        </div>

        {/* Main Centered Workspace Stage */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 relative z-10 space-y-4">
          {vaultErrorNotice && (
            <div
              role="alert"
              className="rounded-2xl border border-red-500/35 bg-red-500/12 px-4 py-3 flex items-center justify-between text-xs text-[#B91C1C] dark:text-[#FCA5A5]"
            >
              <span>{vaultErrorNotice}</span>
              <button type="button" onClick={() => setVaultErrorNotice('')} className="underline">
                Dismiss
              </button>
            </div>
          )}

          {activeReminderAlert && (
            <div
              role="alert"
              className="rounded-3xl border border-[var(--accent)] bg-[var(--surface)] p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print"
            >
              <div className="flex items-start gap-3">
                <BellRing className="h-5 w-5 text-[var(--accent)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {isUrdu ? 'الارم کا وقت ہو گیا' : 'Scheduled Reminder Due'} ·{' '}
                    {formatTime12h(activeReminderAlert.matchedTime24h)}
                  </div>
                  <div className="text-sm font-semibold">
                    {activeReminderAlert.alarm.patientName}: {activeReminderAlert.alarm.medicineLabel}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void handleMarkReminderDone(activeReminderAlert.alarm);
                    setActiveReminderAlert(null);
                  }}
                  className="min-h-[40px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> {isUrdu ? 'مکمل نشان لگائیں' : 'Mark Done'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReminderAlert(null)}
                  className="min-h-[40px] px-3.5 rounded-full border border-[var(--border)] text-xs font-medium"
                >
                  {isUrdu ? 'بند کریں' : 'Dismiss'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'HOME' && activePerson && (
            <HomeHubDashboard
              locale={locale}
              activePerson={activePerson}
              allPeople={profiles}
              wellness={activeWellness}
              alarms={alarms}
              episodes={episodes}
              labs={labs}
              reports={reports}
              onUpdateWellness={handleUpdateWellness}
              onUpdatePersonWeight={handleUpdatePersonWeight}
              onEditActivePerson={() => {
                setEditingPerson(activePerson);
                setOnboardingOpen(true);
              }}
              onMarkReminderDone={handleMarkReminderDone}
              onSwitchPerson={(pid) => setActivePersonId(pid)}
              onNavigate={(tab) => {
                if (tab === 'BHU') setWorkspace('BHU');
                setActiveTab(tab);
              }}
              onTriggerSos={handleTriggerSos}
            />
          )}

          <Suspense fallback={<ScreenSkeleton />}>
            {activeTab === 'CHECKUP' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCheckupSubMode('TRIAGE')}
                    className={`min-h-[44px] px-5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border ${
                      checkupSubMode === 'TRIAGE'
                        ? 'azure-pill-active border-transparent'
                        : 'glass-panel text-[var(--muted)]'
                    }`}
                  >
                    <Stethoscope className="h-3.5 w-3.5" />
                    {isUrdu ? 'فوری طبی معائنہ و ابتدائی امداد' : 'Guided Triage & Emergency First Aid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedTriage(null);
                      setCheckupSubMode('CAMERA_CHAT');
                    }}
                    className={`min-h-[44px] px-5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border ${
                      checkupSubMode === 'CAMERA_CHAT'
                        ? 'azure-pill-active border-transparent'
                        : 'glass-panel text-[var(--muted)]'
                    }`}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {isUrdu ? 'لائیو کیمرہ اور اے آئی چیٹ' : 'Live Camera & Multimodal Chat'}
                  </button>
                </div>

                {checkupSubMode === 'CAMERA_CHAT' && activePerson ? (
                  <PersonChatWorkspace
                    locale={locale}
                    activePerson={activePerson}
                    allPeople={profiles}
                    threads={threads}
                    latestVitalsSummary={latestVitalsSummary}
                    onSaveThread={handleSaveThread}
                    onSaveReport={handleSaveReport}
                    onSwitchPerson={(pid) => setActivePersonId(pid)}
                    onOpenGuidedForm={() => setCheckupSubMode('TRIAGE')}
                  />
                ) : completedTriage ? (
                  <TriageResultView
                    input={completedTriage.input}
                    result={completedTriage.result}
                    locale={locale}
                    frequentPlaces={activePerson?.frequentPlaces}
                    onStartNewCheckup={() => setCompletedTriage(null)}
                  />
                ) : (
                  <TriageWizard
                    accountId={session.accountId}
                    workspace={workspace}
                    locale={locale}
                    profiles={activePerson ? [activePerson, ...profiles.filter((p) => p.id !== activePerson.id)] : profiles}
                    onSaveProfile={handleSaveProfile}
                    onCompleteEpisode={handleCompleteEpisode}
                    onTriggerSos={() => handleTriggerSos(0)}
                    onOpenCameraChat={() => setCheckupSubMode('CAMERA_CHAT')}
                    onOpenRemedies={() => setActiveTab('COACH')}
                  />
                )}
              </div>
            )}

            {activeTab === 'COACH' && activePerson && (
              <WellnessCoachView
                locale={locale}
                person={activePerson}
                wellness={activeWellness}
                onUpdateWellness={handleUpdateWellness}
                onUpdatePersonGoal={handleUpdatePersonGoal}
              />
            )}

            {activeTab === 'VITALS' && (
              <VitalsEstimator
                ageMonths={activePerson?.ageMonths ?? 360}
                locale={locale}
                onVitalsLogged={syncVitalsToWellness}
                onAnalyzeStandalone={handleAnalyzeVitalsStandalone}
              />
            )}

            {activeTab === 'ALARMS' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAlarmsSubMode('REMINDERS')}
                    className={`min-h-[44px] px-5 rounded-full text-xs font-medium border ${
                      alarmsSubMode === 'REMINDERS'
                        ? 'azure-pill-active border-transparent'
                        : 'glass-panel text-[var(--muted)]'
                    }`}
                  >
                    {strings.navAlarms} &amp; {isUrdu ? 'ورزش / فالو اپ' : 'Exercise & Follow-Ups'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlarmsSubMode('LABS')}
                    className={`min-h-[44px] px-5 rounded-full text-xs font-medium border ${
                      alarmsSubMode === 'LABS'
                        ? 'azure-pill-active border-transparent'
                        : 'glass-panel text-[var(--muted)]'
                    }`}
                  >
                    {strings.navLabs}
                  </button>
                </div>

                {alarmsSubMode === 'REMINDERS' ? (
                  <MedicineAlarms
                    locale={locale}
                    accountLabel={activePerson ? `${session.displayName} (${activePerson.name})` : session.displayName}
                    profiles={activePerson ? [activePerson, ...profiles.filter((p) => p.id !== activePerson.id)] : profiles}
                    alarms={scopedAlarms}
                    episodes={scopedEpisodes}
                    labs={scopedLabs}
                    onSaveAlarm={handleSaveAlarm}
                    onOpenLabUpload={() => setAlarmsSubMode('LABS')}
                  />
                ) : (
                  <LabReportScanner
                    locale={locale}
                    profiles={activePerson ? [activePerson, ...profiles.filter((p) => p.id !== activePerson.id)] : profiles}
                    savedLabs={scopedLabs}
                    onSaveLab={handleSaveLab}
                  />
                )}
              </div>
            )}

            {activeTab === 'RECORDS' && activePerson && (
              <PersonRecordsVault
                locale={locale}
                person={activePerson}
                reports={reports}
                episodes={episodes}
                labs={labs}
                alarms={alarms}
                onEditPerson={() => {
                  setEditingPerson(activePerson);
                  setOnboardingOpen(true);
                }}
                onSaveReport={handleSaveReport}
              />
            )}

            {activeTab === 'BHU' && (
              <BhuQueuePanel locale={locale} episodes={episodes} onVerifyReferral={handleVerifyReferral} />
            )}

            {activeTab === 'KIT' && (
              <AndroidKitView
                locale={locale}
                session={session}
                onWipedAccount={() => {
                  setSession(null);
                  setShowAuthScreen(true);
                  setEnteredWorkspace(false);
                  setProfiles([]);
                  setThreads([]);
                  setReports([]);
                  setEpisodes([]);
                  setLabs([]);
                  setAlarms([]);
                  setWellnessLogs([]);
                }}
              />
            )}
          </Suspense>
        </main>

        {/* Mobile Bottom Thumb Navigation */}
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md grid grid-cols-5 items-center px-1 no-print"
        >
          {topNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  active ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <PersonOnboardingModal
          key={editingPerson?.id ?? (onboardingOpen ? 'new' : 'closed')}
          isOpen={onboardingOpen}
          canClose={profiles.length > 0}
          accountId={session.accountId}
          workspace={workspace}
          locale={locale}
          initialProfile={editingPerson}
          onSave={handleSaveProfile}
          onClose={() => {
            setOnboardingOpen(false);
            setEditingPerson(null);
          }}
        />

        <LegalComplianceModal
          isOpen={legalOpen}
          locale={locale}
          telemetryConsent={telemetryConsent}
          onChangeTelemetryConsent={handleToggleTelemetryConsent}
          onWipeLocalData={handleWipeAllVaultData}
          onClose={() => setLegalOpen(false)}
        />
      </div>
    </AppErrorBoundary>
  );
}
