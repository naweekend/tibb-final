import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  Activity,
  Bell,
  CalendarClock,
  Check,
  Dumbbell,
  FileDown,
  FileText,
  Pill,
  Plus,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { AppLocale, I18N, URDU_AUDIO_SCRIPTS } from '../data/trilingual';
import {
  ReminderKind,
  StoredEpisode,
  StoredLabRecord,
  StoredMedicineAlarm,
} from '../db/encryptedVault';
import { playClinicalChime, speakOfflineGuidance } from '../engine/audioFeedback';
import { PatientProfile } from '../engine/triageEngine';
import { formatTime12h, getLocalDateKey, parse24hTo12h, to24hTime } from '../utils/healthMath';

interface MedicineAlarmsProps {
  locale: AppLocale;
  accountLabel: string;
  profiles: PatientProfile[];
  alarms: StoredMedicineAlarm[];
  episodes: StoredEpisode[];
  labs: StoredLabRecord[];
  onSaveAlarm: (alarm: StoredMedicineAlarm) => Promise<void>;
  onOpenLabUpload?: () => void;
}

const REMINDER_TYPES: Array<{
  kind: ReminderKind;
  label_en: string;
  label_ur: string;
  placeholder_en: string;
  placeholder_ur: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    kind: 'MEDICINE',
    label_en: 'Medicine',
    label_ur: 'دوا',
    placeholder_en: 'e.g. Prescribed BP Tablet (Morning)',
    placeholder_ur: 'مثلاً صبح کی بلڈ پریشر کی گولی',
    icon: Pill,
  },
  {
    kind: 'EXERCISE',
    label_en: 'Exercise',
    label_ur: 'ورزش',
    placeholder_en: 'e.g. 25-min Evening Brisk Walk or Stretch',
    placeholder_ur: 'مثلاً شام 25 منٹ تیز واک یا ورزش',
    icon: Dumbbell,
  },
  {
    kind: 'VITALS',
    label_en: 'Vitals Check',
    label_ur: 'بی پی / شوگر چیک',
    placeholder_en: 'e.g. Check Fasting Sugar & BP',
    placeholder_ur: 'مثلاً نہار منہ شوگر اور بی پی چیک',
    icon: Activity,
  },
  {
    kind: 'REPORT_FOLLOWUP',
    label_en: 'Report Update',
    label_ur: 'رپورٹ اپڈیٹ',
    placeholder_en: 'e.g. Upload CBC / HbA1c lab report results',
    placeholder_ur: 'مثلاً سی بی سی یا شوگر ٹیسٹ رپورٹ اپلوڈ کریں',
    icon: FileText,
  },
  {
    kind: 'DOCTOR_CHECKUP',
    label_en: 'Doctor Follow-Up',
    label_ur: 'ڈاکٹر فالو اپ',
    placeholder_en: 'e.g. Cardiology OPD review with Dr. Tariq',
    placeholder_ur: 'مثلاً ڈاکٹر کے پاس فالو اپ معائنہ',
    icon: Stethoscope,
  },
];

export const MedicineAlarms: React.FC<MedicineAlarmsProps> = ({
  locale,
  accountLabel,
  profiles,
  alarms,
  episodes,
  labs,
  onSaveAlarm,
  onOpenLabUpload,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [patientId, setPatientId] = useState(profiles[0]?.id ?? '');
  useEffect(() => {
    if (profiles[0]?.id) setPatientId(profiles[0].id);
  }, [profiles[0]?.id]);
  const [kind, setKind] = useState<ReminderKind>('MEDICINE');
  const [medicineLabel, setMedicineLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [time24h, setTime24h] = useState('20:00');
  const [secondTime24h, setSecondTime24h] = useState('08:00');
  const [frequency, setFrequency] = useState<'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'ONE_TIME'>('DAILY');
  const [statusMsg, setStatusMsg] = useState('');

  const todayKey = getLocalDateKey();
  const activeTypeMeta = REMINDER_TYPES.find((r) => r.kind === kind) ?? REMINDER_TYPES[0];
  const parsedPrimary = parse24hTo12h(time24h);
  const parsedSecond = parse24hTo12h(secondTime24h);

  const handleAddAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineLabel.trim()) return;
    const patient = profiles.find((p) => p.id === patientId) ?? profiles[0];
    const alarm: StoredMedicineAlarm = {
      id: `alm_${crypto.randomUUID().slice(0, 10)}`,
      patientId: patient?.id ?? 'default',
      patientName: patient?.name ?? 'Family Member',
      kind,
      medicineLabel: medicineLabel.trim(),
      notes: notes.trim() || undefined,
      time24h,
      secondTime24h: frequency === 'TWICE_DAILY' ? secondTime24h : undefined,
      frequency,
      enabled: true,
      adherenceDates: [],
    };
    await onSaveAlarm(alarm);

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.requestPermissions();
        const [hourStr, minStr] = time24h.split(':');
        const titlePrefix =
          kind === 'EXERCISE'
            ? 'Tibb Exercise Alarm'
            : kind === 'REPORT_FOLLOWUP'
              ? 'Tibb Report Update Reminder'
              : kind === 'DOCTOR_CHECKUP'
                ? 'Tibb Doctor Checkup'
                : kind === 'VITALS'
                  ? 'Tibb Vitals Check'
                  : 'Tibb Medicine Reminder';
        const notifs: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [
          {
            id: Math.floor(Math.random() * 100000),
            title: `${titlePrefix} — ${alarm.patientName}`,
            body: alarm.medicineLabel,
            schedule: {
              on: { hour: Number(hourStr), minute: Number(minStr) },
              allowWhileIdle: true,
              repeats: frequency !== 'ONE_TIME',
            },
          },
        ];
        if (frequency === 'TWICE_DAILY' && alarm.secondTime24h) {
          const [h2, m2] = alarm.secondTime24h.split(':');
          notifs.push({
            id: Math.floor(Math.random() * 100000),
            title: `${titlePrefix} (2nd Dose) — ${alarm.patientName}`,
            body: alarm.medicineLabel,
            schedule: {
              on: { hour: Number(h2), minute: Number(m2) },
              allowWhileIdle: true,
              repeats: true,
            },
          });
        }
        await LocalNotifications.schedule({ notifications: notifs });
      } catch {
        // Optional permission
      }
    }

    setMedicineLabel('');
    setNotes('');
    setStatusMsg(isUrdu ? 'الارم محفوظ ہو گیا۔' : 'Reminder saved locally in encrypted vault.');
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const handleMarkTaken = async (alarm: StoredMedicineAlarm) => {
    if (alarm.adherenceDates.includes(todayKey)) return;
    await onSaveAlarm({
      ...alarm,
      adherenceDates: [...alarm.adherenceDates, todayKey],
    });
  };

  const handleTestVoiceAlarm = () => {
    playClinicalChime('alarm');
    speakOfflineGuidance(URDU_AUDIO_SCRIPTS.medicineReminder, 'ur-PK');
  };

  const handleExportWeeklyPdf = async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    let y = 790;
    page.drawText('Tibb — Weekly Family Health Digest (Local Vault Export)', {
      x: 48,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0.15, 0.39, 0.92),
    });
    y -= 24;
    page.drawText(`Account: ${accountLabel} | Generated: ${todayKey}`, {
      x: 48,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.32, 0.37, 0.35),
    });

    y -= 32;
    page.drawText('1. Medicines, Vitals & Follow-Up Schedule', { x: 48, y, size: 12, font: fontBold });
    y -= 18;
    if (alarms.length === 0) {
      page.drawText('No reminders configured.', { x: 56, y, size: 10, font: fontRegular });
      y -= 16;
    } else {
      for (const alm of alarms.slice(0, 10)) {
        const timeStr =
          alm.frequency === 'TWICE_DAILY' && alm.secondTime24h
            ? `${formatTime12h(alm.time24h)} & ${formatTime12h(alm.secondTime24h)}`
            : formatTime12h(alm.time24h);
        page.drawText(
          `- [${alm.kind ?? 'MEDICINE'}] ${alm.patientName}: ${alm.medicineLabel} at ${timeStr} (${alm.adherenceDates.length} logged)`,
          { x: 56, y, size: 10, font: fontRegular }
        );
        y -= 16;
      }
    }

    y -= 18;
    page.drawText('2. Recent Care Episodes', { x: 48, y, size: 12, font: fontBold });
    y -= 18;
    if (episodes.length === 0) {
      page.drawText('No triage episodes recorded yet.', { x: 56, y, size: 10, font: fontRegular });
      y -= 16;
    } else {
      for (const ep of episodes.slice(0, 10)) {
        page.drawText(
          `- ${ep.createdAtIso.slice(0, 10)} | ${ep.patientName} | ${ep.triageTier} (${ep.symptomCategory}) | Ref: ${ep.referralToken}`,
          { x: 56, y, size: 10, font: fontRegular }
        );
        y -= 16;
      }
    }

    y -= 18;
    page.drawText('3. Lab Biomarker Records', { x: 48, y, size: 12, font: fontBold });
    y -= 18;
    if (labs.length === 0) {
      page.drawText('No lab scans stored.', { x: 56, y, size: 10, font: fontRegular });
    } else {
      for (const lb of labs.slice(0, 6)) {
        page.drawText(
          `- ${lb.scannedAtIso.slice(0, 10)} | Hb: ${lb.hemoglobin ?? '--'} | WBC: ${lb.wbc ?? '--'} | PLT: ${lb.platelets ?? '--'} | FBS: ${lb.fastingGlucose ?? '--'}`,
          { x: 56, y, size: 10, font: fontRegular }
        );
        y -= 16;
      }
    }

    const bytes = await doc.save();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tibb-weekly-digest-${todayKey}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingFollowUps = alarms.filter(
    (a) =>
      (a.kind === 'REPORT_FOLLOWUP' || a.kind === 'DOCTOR_CHECKUP') &&
      !a.adherenceDates.includes(todayKey)
  );

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6 relative z-10">
      {/* Proactive Report & Doctor Follow-Up Prompt */}
      {pendingFollowUps.length > 0 && (
        <section className="glass-panel rounded-3xl p-5 border border-[var(--accent)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {isUrdu ? 'رپورٹ اور ڈاکٹر چیک اپ فالو اپ' : 'Follow-Up Check-In'}
            </div>
            <p className={`text-sm font-medium ${isUrdu ? 'font-urdu urdu-safe text-base' : ''}`}>
              {isUrdu
                ? `${pendingFollowUps[0].patientName}: "${pendingFollowUps[0].medicineLabel}" کی رپورٹ یا ڈاکٹر معائنے کا اپڈیٹ تیار ہے؟`
                : `Update ready for ${pendingFollowUps[0].patientName}: "${pendingFollowUps[0].medicineLabel}"?`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenLabUpload && (
              <button
                type="button"
                onClick={onOpenLabUpload}
                className="min-h-[40px] px-4 rounded-full azure-pill-active text-xs font-semibold"
              >
                {isUrdu ? 'رپورٹ اسکین / شامل کریں' : 'Upload Lab Update'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleMarkTaken(pendingFollowUps[0])}
              className="min-h-[40px] px-4 rounded-full border border-black/15 dark:border-white/20 text-xs font-medium"
            >
              {isUrdu ? 'مکمل نشان لگائیں' : 'Mark Reviewed'}
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Creation Card */}
        <div className="lg:col-span-6 glass-panel rounded-[30px] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu urdu-safe text-2xl' : ''}`}>
                {s.alarmsTitle}
              </h1>
              <p className={`text-xs text-[#55606E] dark:text-slate-400 mt-0.5 ${isUrdu ? 'font-urdu urdu-safe text-sm' : ''}`}>
                {s.alarmsSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestVoiceAlarm}
              className="min-h-[40px] px-3.5 rounded-full border border-black/15 dark:border-white/20 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Volume2 className="h-3.5 w-3.5 text-[var(--accent)]" /> {s.alarmsTestVoiceBtn}
            </button>
          </div>

          <form onSubmit={handleAddAlarm} className="space-y-4">
            {/* Reminder Type Selector */}
            <div>
              <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1.5">
                {isUrdu ? 'یاددہانی کی قسم' : 'Reminder Type'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {REMINDER_TYPES.map((rt) => {
                  const Icon = rt.icon;
                  const active = kind === rt.kind;
                  return (
                    <button
                      key={rt.kind}
                      type="button"
                      onClick={() => setKind(rt.kind)}
                      className={`min-h-[42px] px-2.5 rounded-2xl text-xs font-medium inline-flex items-center justify-center gap-1.5 border transition-all ${
                        active
                          ? 'azure-pill-active border-transparent'
                          : 'border-[var(--border)] text-[var(--muted)]'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{isUrdu ? rt.label_ur : rt.label_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {profiles.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                  {isUrdu ? 'خاندان کا فرد' : 'Family Member'}
                </label>
                <select
                  value={patientId || profiles[0]?.id}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-3 text-sm"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="text-[#161A20]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                {isUrdu ? 'عنوان / دوا یا چیک اپ کی تفصیل' : 'Reminder Label'}
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={medicineLabel}
                onChange={(e) => setMedicineLabel(e.target.value)}
                placeholder={isUrdu ? activeTypeMeta.placeholder_ur : activeTypeMeta.placeholder_en}
                className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-white/5 px-3.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                {isUrdu ? 'اضافی نوٹ (اختیاری)' : 'Doctor / Dosage Notes (Optional)'}
              </label>
              <input
                type="text"
                maxLength={120}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isUrdu ? 'مثلاً ناشتے کے بعد یا پرانی رپورٹ ساتھ لائیں' : 'e.g. Take after breakfast / Bring old CBC report'}
                className="w-full min-h-[42px] rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-white/5 px-3.5 text-xs"
              />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-medium text-[#55606E] dark:text-slate-400">
                    {frequency === 'TWICE_DAILY'
                      ? isUrdu
                        ? 'پہلی خوراک / وقت (AM / PM)'
                        : '1st Alarm Time (AM / PM)'
                      : isUrdu
                        ? 'وقت منتخب کریں (AM / PM)'
                        : 'Alarm Time (AM / PM)'}
                  </label>
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)]">
                    {formatTime12h(time24h)}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <select
                    aria-label="Alarm Hour"
                    value={parsedPrimary.hour12}
                    onChange={(e) =>
                      setTime24h(to24hTime(Number(e.target.value), parsedPrimary.minute, parsedPrimary.period))
                    }
                    className="col-span-4 min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-2.5 font-mono-tabular text-sm"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h} className="text-[#161A20]">
                        {String(h).padStart(2, '0')} hr
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Alarm Minute"
                    value={parsedPrimary.minute}
                    onChange={(e) =>
                      setTime24h(to24hTime(parsedPrimary.hour12, Number(e.target.value), parsedPrimary.period))
                    }
                    className="col-span-4 min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-2.5 font-mono-tabular text-sm"
                  >
                    {Array.from({ length: 60 }, (_, m) => m).map((m) => (
                      <option key={m} value={m} className="text-[#161A20]">
                        :{String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <div className="col-span-4 grid grid-cols-2 gap-1 p-1 rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-white/5">
                    {(['AM', 'PM'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() =>
                          setTime24h(to24hTime(parsedPrimary.hour12, parsedPrimary.minute, period))
                        }
                        className={`min-h-[34px] rounded-lg text-xs font-semibold transition-all ${
                          parsedPrimary.period === period
                            ? 'azure-pill-active'
                            : 'text-[#55606E] dark:text-slate-300'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {frequency === 'TWICE_DAILY' && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-[#55606E] dark:text-slate-400">
                      {isUrdu ? 'دوسری خوراک / وقت (AM / PM)' : '2nd Daily Dose Time (AM / PM)'}
                    </label>
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)]">
                      {formatTime12h(secondTime24h)}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <select
                      aria-label="Second Alarm Hour"
                      value={parsedSecond.hour12}
                      onChange={(e) =>
                        setSecondTime24h(
                          to24hTime(Number(e.target.value), parsedSecond.minute, parsedSecond.period)
                        )
                      }
                      className="col-span-4 min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-2.5 font-mono-tabular text-sm"
                    >
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                        <option key={h} value={h} className="text-[#161A20]">
                          {String(h).padStart(2, '0')} hr
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Second Alarm Minute"
                      value={parsedSecond.minute}
                      onChange={(e) =>
                        setSecondTime24h(
                          to24hTime(parsedSecond.hour12, Number(e.target.value), parsedSecond.period)
                        )
                      }
                      className="col-span-4 min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-2.5 font-mono-tabular text-sm"
                    >
                      {Array.from({ length: 60 }, (_, m) => m).map((m) => (
                        <option key={m} value={m} className="text-[#161A20]">
                          :{String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <div className="col-span-4 grid grid-cols-2 gap-1 p-1 rounded-xl border border-black/15 dark:border-white/20 bg-white/60 dark:bg-white/5">
                      {(['AM', 'PM'] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() =>
                            setSecondTime24h(to24hTime(parsedSecond.hour12, parsedSecond.minute, period))
                          }
                          className={`min-h-[34px] rounded-lg text-xs font-semibold transition-all ${
                            parsedSecond.period === period
                              ? 'azure-pill-active'
                              : 'text-[#55606E] dark:text-slate-300'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#55606E] dark:text-slate-400 mb-1">
                  {isUrdu ? 'تعداد / شیڈول' : 'Schedule'}
                </label>
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'ONE_TIME')
                  }
                  className="w-full min-h-[44px] rounded-xl border border-black/15 dark:border-white/20 bg-white/75 dark:bg-white/5 px-3 text-sm"
                >
                  <option value="DAILY" className="text-[#161A20]">{isUrdu ? 'روزانہ ایک بار' : 'Once Daily'}</option>
                  <option value="TWICE_DAILY" className="text-[#161A20]">{isUrdu ? 'دن میں دو بار' : 'Twice Daily (2 Times)'}</option>
                  <option value="WEEKLY" className="text-[#161A20]">{isUrdu ? 'ہفتہ وار' : 'Weekly'}</option>
                  <option value="ONE_TIME" className="text-[#161A20]">{isUrdu ? 'ایک بار (فالو اپ)' : 'One-Time Follow-Up'}</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-full azure-pill-active text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> {s.alarmsAddBtn}
            </button>

            {statusMsg && <p className="text-xs font-medium text-[var(--accent)]">{statusMsg}</p>}
          </form>
        </div>

        {/* Right Scheduled List & PDF Export */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel rounded-[30px] p-6 space-y-4">
            <h2 className="font-display text-lg font-medium">{s.alarmsScheduledTitle}</h2>
            {alarms.length === 0 ? (
              <p className="text-xs text-[#55606E] dark:text-slate-400">{s.alarmsEmptyText}</p>
            ) : (
              <div className="space-y-3">
                {alarms.map((alm) => {
                  const takenToday = alm.adherenceDates.includes(todayKey);
                  const rKind = alm.kind ?? 'MEDICINE';
                  const typeMeta = REMINDER_TYPES.find((r) => r.kind === rKind) ?? REMINDER_TYPES[0];
                  const KindIcon = typeMeta.icon;
                  const formattedTimes =
                    alm.frequency === 'TWICE_DAILY' && alm.secondTime24h
                      ? `${formatTime12h(alm.time24h)} & ${formatTime12h(alm.secondTime24h)}`
                      : formatTime12h(alm.time24h);
                  return (
                    <div
                      key={alm.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/8 dark:border-white/10 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <KindIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <span>{alm.medicineLabel}</span>
                        </div>
                        <div className="text-xs text-[#55606E] dark:text-slate-400 font-mono-tabular">
                          {isUrdu ? typeMeta.label_ur : typeMeta.label_en} · {alm.patientName} · {formattedTimes} · {alm.frequency} · {alm.adherenceDates.length} logged
                        </div>
                        {alm.notes && (
                          <p className="text-[11px] text-[#55606E] dark:text-slate-300">{alm.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rKind === 'REPORT_FOLLOWUP' && onOpenLabUpload && !takenToday && (
                          <button
                            type="button"
                            onClick={onOpenLabUpload}
                            className="min-h-[38px] px-3 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] text-[11px] font-medium"
                          >
                            {isUrdu ? 'رپورٹ لگائیں' : 'Upload Report'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={takenToday}
                          onClick={() => handleMarkTaken(alm)}
                          className={`min-h-[38px] px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                            takenToday
                              ? 'azure-pill-active'
                              : 'border border-black/15 dark:border-white/20 hover:border-[var(--accent)]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />{' '}
                          {takenToday
                            ? rKind === 'MEDICINE'
                              ? s.alarmsTakenToday
                              : isUrdu
                                ? 'مکمل'
                                : 'Done Today'
                            : rKind === 'MEDICINE'
                              ? s.alarmsMarkTaken
                              : isUrdu
                                ? 'مکمل کریں'
                                : 'Mark Done'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[30px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--accent)]" />
                {s.weeklyDigestTitle}
              </h2>
              <p className="text-xs text-[#55606E] dark:text-slate-400 mt-0.5">{s.weeklyDigestSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleExportWeeklyPdf}
              className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <FileDown className="h-4 w-4" /> {s.exportPdfBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
