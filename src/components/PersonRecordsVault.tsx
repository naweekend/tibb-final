import React, { useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Edit3,
  FileImage,
  Plus,
  Printer,
  Utensils,
} from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import type { StoredEpisode, StoredLabRecord, StoredMedicineAlarm } from '../db/encryptedVault';
import type { ExtendedPatientProfile, SavedPersonReport, SavedReportKind } from '../types/clinical';
import { formatHeightDisplay, formatTime12h, formatWeightDisplay } from '../utils/healthMath';

interface PersonRecordsVaultProps {
  locale: AppLocale;
  person: ExtendedPatientProfile;
  reports: SavedPersonReport[];
  episodes: StoredEpisode[];
  labs: StoredLabRecord[];
  alarms: StoredMedicineAlarm[];
  onEditPerson: () => void;
  onSaveReport: (report: SavedPersonReport) => Promise<void>;
}

export const PersonRecordsVault: React.FC<PersonRecordsVaultProps> = ({
  locale,
  person,
  reports,
  episodes,
  labs,
  alarms,
  onEditPerson,
  onSaveReport,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';
  const unit = person.preferredUnitSystem ?? 'METRIC';

  const personReports = useMemo(
    () => reports.filter((r) => r.personId === person.id).sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso)),
    [reports, person.id]
  );
  const personEpisodes = useMemo(
    () => episodes.filter((e) => e.patientId === person.id).sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso)),
    [episodes, person.id]
  );
  const personLabs = useMemo(
    () => labs.filter((l) => l.patientId === person.id).sort((a, b) => b.scannedAtIso.localeCompare(a.scannedAtIso)),
    [labs, person.id]
  );
  const personAlarms = useMemo(() => alarms.filter((a) => a.patientId === person.id), [alarms, person.id]);

  const [logKind, setLogKind] = useState<SavedReportKind>('MEAL_PHOTO');
  const [logTitle, setLogTitle] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const handleAddQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() && !logNotes.trim()) return;
    await onSaveReport({
      id: `rep_${crypto.randomUUID().slice(0, 10)}`,
      personId: person.id,
      kind: logKind,
      title: logTitle.trim() || (logKind === 'EXERCISE_LOG' ? 'Activity / Walk' : 'Meal / Diet Note'),
      notes: logNotes.trim(),
      createdAtIso: new Date().toISOString(),
    });
    setLogTitle('');
    setLogNotes('');
  };

  const handleDownloadTextSummary = () => {
    const lines = [
      `TIBB (طب) — PATIENT HEALTH SUMMARY`,
      `Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      `Name: ${person.name} (${person.relationship})`,
      `Age: ${person.ageMonths < 24 ? `${person.ageMonths} months` : `${Math.round(person.ageMonths / 12)} years`} | Height: ${formatHeightDisplay(person.heightCm, unit)} | Weight: ${formatWeightDisplay(person.weightKg, unit)} | Sex: ${person.sex} | Blood Group: ${person.bloodGroup}`,
      `Chronic Conditions: ${person.chronicConditions.join(', ') || 'None recorded'}`,
      `Allergies: ${person.allergies.join(', ') || 'None recorded'}`,
      `Recorded Daily Regimen: ${person.dailyMedicinesNote || 'None recorded'}`,
      `Emergency Contact (ICE): ${person.emergencyContact || 'None recorded'}`,
      ``,
      `RECENT TRIAGE EPISODES (${personEpisodes.length}):`,
      ...personEpisodes.slice(0, 10).map(
        (ep) => `- ${ep.createdAtIso.slice(0, 10)} | ${ep.triageTier} | ${ep.symptomCategory} | Token: ${ep.referralToken}`
      ),
      ``,
      `SAVED LABS (${personLabs.length}):`,
      ...personLabs.slice(0, 10).map(
        (lab) =>
          `- ${lab.scannedAtIso.slice(0, 10)} | Hb: ${lab.hemoglobin ?? '--'} | WBC: ${lab.wbc ?? '--'} | PLT: ${lab.platelets ?? '--'} | Sugar: ${lab.fastingGlucose ?? '--'} | HbA1c: ${lab.hba1c ?? '--'} | Creat: ${lab.creatinine ?? '--'}`
      ),
      ``,
      `ACTIVE ALARMS (${personAlarms.length}):`,
      ...personAlarms.slice(0, 10).map(
        (alm) =>
          `- ${alm.medicineLabel} at ${formatTime12h(alm.time24h)}${alm.frequency === 'TWICE_DAILY' && alm.secondTime24h ? ` & ${formatTime12h(alm.secondTime24h)}` : ''} (${alm.frequency})`
      ),
      ``,
      `SAVED REPORTS & LOGS (${personReports.length}):`,
      ...personReports.slice(0, 12).map((rep) => `- ${rep.createdAtIso.slice(0, 10)} | [${rep.kind}] ${rep.title}: ${rep.notes}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tibb-summary-${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Person Medical Profile Card */}
      <section className="glass-panel rounded-3xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              {person.relationship} · {person.bloodGroup}
            </span>
            <h2 className={`font-display text-2xl font-medium mt-0.5 ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
              {person.name} — {s.recordsTitle}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{s.recordsSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={onEditPerson}
              className="min-h-[40px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" /> {s.editProfileBtn}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[40px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> {s.printSummaryBtn}
            </button>
            <button
              type="button"
              onClick={handleDownloadTextSummary}
              className="min-h-[40px] px-4 rounded-full border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> .TXT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-[var(--surface-muted)] p-3.5">
            <div className="text-[var(--muted)]">{isUrdu ? 'عمر / قد / وزن' : 'Age / Height / Weight'}</div>
            <div className="font-semibold mt-1 font-mono-tabular">
              {person.ageMonths < 24 ? `${person.ageMonths} mo` : `${Math.round(person.ageMonths / 12)} yrs`}
              {person.heightCm ? ` · ${formatHeightDisplay(person.heightCm, unit)}` : ''}
              {person.weightKg ? ` · ${formatWeightDisplay(person.weightKg, unit)}` : ''}
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--surface-muted)] p-3.5">
            <div className="text-[var(--muted)]">{isUrdu ? 'دائمی بیماریاں' : 'Chronic Conditions'}</div>
            <div className="font-semibold mt-1">{person.chronicConditions.join(', ') || 'None'}</div>
          </div>
          <div className="rounded-2xl bg-[var(--surface-muted)] p-3.5">
            <div className="text-[var(--muted)]">{isUrdu ? 'سابقہ لیب و دوائیں' : 'History & Medicines'}</div>
            <div className="font-semibold mt-1">{person.priorLabNotes || person.dailyMedicinesNote || 'None recorded'}</div>
          </div>
          <div className="rounded-2xl bg-[var(--surface-muted)] p-3.5">
            <div className="text-[var(--muted)]">{isUrdu ? 'محفوظ مقامات و رابطہ' : 'Saved Places / ICE'}</div>
            <div className="font-semibold mt-1">
              {person.frequentPlaces?.length
                ? person.frequentPlaces.map((p) => `${p.label} (${p.district})`).join(', ')
                : person.emergencyContact || 'None recorded'}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Meal / Exercise / Vitals Log Composer */}
      <form
        onSubmit={handleAddQuickLog}
        className="glass-panel rounded-3xl p-5 space-y-3 no-print"
      >
        <h3 className="font-display text-base font-medium flex items-center gap-2">
          <Utensils className="h-4 w-4 text-[var(--accent)]" />
          {isUrdu ? 'خوراک، ورزش یا صحت کا نوٹ شامل کریں' : 'Log Meal, Exercise or Follow-up Note'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <select
            value={logKind}
            onChange={(e) => setLogKind(e.target.value as SavedReportKind)}
            className="sm:col-span-3 min-h-[42px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
          >
            <option value="MEAL_PHOTO">{isUrdu ? 'خوراک / غذا' : 'Meal / Diet'}</option>
            <option value="EXERCISE_LOG">{isUrdu ? 'ورزش / چہل قدمی' : 'Exercise / Walk'}</option>
            <option value="VITALS_LOG">{isUrdu ? 'بلڈ پریشر / شوگر نوٹ' : 'Vitals Note'}</option>
          </select>
          <input
            type="text"
            maxLength={80}
            value={logTitle}
            onChange={(e) => setLogTitle(e.target.value)}
            placeholder={isUrdu ? 'عنوان (مثلاً صبح کی واک / ناشتہ)' : 'Title (e.g. 20m Walk, Low-salt lunch)'}
            className="sm:col-span-4 min-h-[42px] rounded-xl border border-[var(--border)] bg-transparent px-3 text-xs"
          />
          <input
            type="text"
            maxLength={180}
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder={isUrdu ? 'تفصیل لکھیں...' : 'Notes or glucose/BP context...'}
            className="sm:col-span-3 min-h-[42px] rounded-xl border border-[var(--border)] bg-transparent px-3 text-xs"
          />
          <button
            type="submit"
            className="sm:col-span-2 min-h-[42px] rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> {isUrdu ? 'محفوظ' : 'Save'}
          </button>
        </div>
      </form>

      {/* Saved Reports & Visual Snapshots Gallery */}
      <section className="glass-panel rounded-3xl p-6 space-y-4">
        <h3 className="font-display text-lg font-medium flex items-center gap-2">
          <FileImage className="h-4 w-4 text-[var(--accent)]" />
          {isUrdu ? `محفوظ رپورٹس اور تصاویر (${personReports.length})` : `Saved Reports, Photos & Logs (${personReports.length})`}
        </h3>

        {personReports.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            {isUrdu
              ? 'ابھی کوئی رپورٹ یا تصویر محفوظ نہیں۔ اے آئی چیٹ سے تصویر بھیجیں یا اوپر نوٹ درج کریں۔'
              : 'No saved reports or photos yet for this person. Upload or snap via AI Chat or add a daily log above.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personReports.map((rep) => (
              <div
                key={rep.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-2"
              >
                {rep.imageDataUrl && (
                  <img
                    src={rep.imageDataUrl}
                    alt={rep.title}
                    className="w-full h-36 object-cover rounded-xl border border-black/10"
                  />
                )}
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-[var(--muted)]">
                  <span>{rep.kind}</span>
                  <span>{rep.createdAtIso.slice(0, 10)}</span>
                </div>
                <div className="text-sm font-semibold">{rep.title}</div>
                {rep.notes && <p className="text-xs text-[var(--muted)]">{rep.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scoped Episodes, Labs & Alarms Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-panel rounded-3xl p-5 space-y-3">
          <h3 className="font-display text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent)]" />
            {isUrdu ? `پچھلے معائنے (${personEpisodes.length})` : `Triage History (${personEpisodes.length})`}
          </h3>
          {personEpisodes.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No episodes logged for this person yet.</p>
          ) : (
            <div className="space-y-2">
              {personEpisodes.slice(0, 8).map((ep) => (
                <div key={ep.id} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold">{ep.triageTier}</span> · {ep.symptomCategory}
                  </div>
                  <span className="font-mono-tabular text-[11px] text-[var(--muted)]">
                    {ep.createdAtIso.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel rounded-3xl p-5 space-y-3">
          <h3 className="font-display text-base font-medium">
            {isUrdu ? `محفوظ لیب اور دوائیں (${personLabs.length} / ${personAlarms.length})` : `Lab Scans (${personLabs.length}) & Alarms (${personAlarms.length})`}
          </h3>
          {personLabs.slice(0, 4).map((l) => (
            <div key={l.id} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs font-mono-tabular">
              {l.scannedAtIso.slice(0, 10)} — Hb: {l.hemoglobin ?? '--'} | WBC: {l.wbc ?? '--'} | Sugar: {l.fastingGlucose ?? '--'}
              {l.hba1c ? ` | HbA1c: ${l.hba1c}%` : ''}
              {l.creatinine ? ` | Creat: ${l.creatinine}` : ''}
            </div>
          ))}
          {personAlarms.slice(0, 4).map((a) => (
            <div key={a.id} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs flex justify-between gap-2">
              <span className="font-medium">{a.medicineLabel}</span>
              <span className="font-mono-tabular shrink-0">
                {formatTime12h(a.time24h)}
                {a.frequency === 'TWICE_DAILY' && a.secondTime24h ? ` & ${formatTime12h(a.secondTime24h)}` : ''}
              </span>
            </div>
          ))}
          {personLabs.length === 0 && personAlarms.length === 0 && (
            <p className="text-xs text-[var(--muted)]">No labs or alarms linked to this person yet.</p>
          )}
        </section>
      </div>
    </div>
  );
};
