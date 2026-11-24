import React, { useState } from 'react';
import { Check, Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import type { AppLocale } from '../data/trilingual';

interface LegalComplianceModalProps {
  isOpen: boolean;
  locale: AppLocale;
  telemetryConsent: boolean;
  onChangeTelemetryConsent: (granted: boolean) => void;
  onWipeLocalData?: () => Promise<void> | void;
  onClose: () => void;
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({
  isOpen,
  locale,
  telemetryConsent,
  onChangeTelemetryConsent,
  onWipeLocalData,
  onClose,
}) => {
  const isUrdu = locale === 'ur';
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isUrdu ? 'رازداری اور قانونی ضوابط' : 'Privacy, Terms & Data Control'}
      className="fixed inset-0 z-50 bg-[#0F1F1C]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        dir={isUrdu ? 'rtl' : 'ltr'}
        className="w-full max-w-2xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] p-6 sm:p-8 shadow-2xl space-y-6 my-auto"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`font-display text-xl font-semibold ${isUrdu ? 'font-urdu urdu-safe' : ''}`}>
                {isUrdu ? 'رازداری، شرائط اور ڈیٹا کنٹرول' : 'Privacy Policy, Terms & Local Data Control'}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isUrdu ? 'مقامی انکرپشن اور صفر اشتہاری ٹریکنگ' : 'Local-first AES-256 storage · Zero ad trackers'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal dialog"
            className="min-h-[44px] min-w-[44px] rounded-full border border-[var(--border)] flex items-center justify-center tactile-press"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-[var(--muted)]">
          <section className="rounded-2xl bg-[var(--surface-muted)] p-4 space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--accent)]" />
              {isUrdu ? '1. مقامی تحفظ اور برقرار رکھنے کی مدت' : '1. Privacy & Data Retention'}
            </h3>
            <p className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
              {isUrdu
                ? 'آپ کے خاندان کی تمام صحت کی تفصیلات، وزن، لیب رپورٹس اور چیٹس صرف آپ کے ڈیوائس کے IndexedDB میں AES-GCM-256 سے مقفل رہتی ہیں۔ ہم کسی کلاؤڈ سرور پر ذاتی میڈیکل پروفائل محفوظ نہیں کرتے۔'
                : 'All family health profiles, weights, lab OCR scans, and chat notes stay encrypted locally inside this browser IndexedDB using AES-GCM-256. No personal medical records are uploaded to cloud databases. Data remains until you delete or wipe it below.'}
            </p>
          </section>

          <section className="rounded-2xl bg-[var(--surface-muted)] p-4 space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              {isUrdu ? '2. طبی انتباہ اور استعمال کی شرائط' : '2. Clinical Terms of Use'}
            </h3>
            <p className={isUrdu ? 'font-urdu urdu-safe text-sm' : ''}>
              {isUrdu
                ? 'طب (Tibb) ڈبلیو ایچ او کے رہنما اصولوں پر مبنی ابتدائی مدد فراہم کرتا ہے، یہ مستند ڈاکٹر کے معائنے کا متبادل نہیں۔ کسی بھی خطرناک علامت پر فوری 1122 پر کال کریں۔ کم عمر افراد (<18 سال) کا ریکارڈ سرپرست کی اجازت سے درج کیا جائے۔'
                : 'Tibb provides WHO-aligned supportive guidance and first-aid checklists and does not replace licensed physicians or diagnose conditions. For any urgent danger sign, contact Rescue 1122 or visit a hospital. Profiles for minors (<18 years) require parent/guardian consent.'}
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  {isUrdu ? '3. گمنام عوامی صحت شماریات (اختیاری)' : '3. Anonymous Public Health Telemetry (Opt-In)'}
                </h3>
                <p className="mt-1">
                  {isUrdu
                    ? 'کوکیز یا اشتہاری ٹریکرز استعمال نہیں ہوتے۔ صرف آپ کی اجازت سے گمنام ضلع سطح کے اعدادوشمار (بغیر نام یا فون) بھیجے جا سکتے ہیں۔'
                    : 'Zero third-party cookies or ad scripts run in Tibb. Only if you opt in below, anonymized non-PII district triage counts (k-anonymized >= 10) may sync when online.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={telemetryConsent}
                onClick={() => onChangeTelemetryConsent(!telemetryConsent)}
                className={`min-h-[40px] px-4 rounded-full text-xs font-semibold shrink-0 tactile-press inline-flex items-center gap-1.5 ${
                  telemetryConsent
                    ? 'azure-pill-active'
                    : 'border border-[var(--border)] text-[var(--ink)]'
                }`}
              >
                {telemetryConsent && <Check className="h-3.5 w-3.5" />}
                {telemetryConsent ? (isUrdu ? 'فعال' : 'Accepted') : isUrdu ? 'بند' : 'Off (Default)'}
              </button>
            </div>
          </section>

          {onWipeLocalData && (
            <section className="rounded-2xl border border-red-600/30 p-4 space-y-2.5">
              <h3 className="text-sm font-semibold text-[#DC2626]">
                {isUrdu ? '4. تمام مقامی ڈیٹا حذف کریں' : '4. Delete All Local Vault Data'}
              </h3>
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="min-h-[44px] px-4 rounded-full border border-red-600/40 text-[#DC2626] text-xs font-semibold inline-flex items-center gap-1.5 tactile-press"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isUrdu ? 'تمام پروفائلز اور ریکارڈ مٹائیں' : 'Delete All Profiles & Encrypted Data'}
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[#DC2626] font-medium">
                    {isUrdu ? 'یہ عمل واپس نہیں ہو سکے گا۔' : 'This permanently erases all local encrypted records.'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      className="min-h-[38px] px-3.5 rounded-full border border-[var(--border)] text-xs font-medium"
                    >
                      {isUrdu ? 'منسوخ' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onWipeLocalData();
                        setConfirmWipe(false);
                        onClose();
                      }}
                      className="min-h-[38px] px-4 rounded-full bg-[#DC2626] text-white text-xs font-semibold"
                    >
                      {isUrdu ? 'تصدیق اور حذف' : 'Confirm Erase'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
