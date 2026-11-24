import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import {
  UnlockedVaultSession,
  exportEncryptedBackup,
  restoreEncryptedBackup,
  wipeAccountData,
} from '../db/encryptedVault';
import { SequentialMemorySnapshot, getMemorySnapshot } from '../engine/localAiBridge';

interface AndroidKitViewProps {
  locale: AppLocale;
  session: UnlockedVaultSession;
  onWipedAccount: () => void;
}

export const AndroidKitView: React.FC<AndroidKitViewProps> = ({
  locale,
  session,
  onWipedAccount,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [phase, setPhase] = useState<SequentialMemorySnapshot['phase']>('IDLE');
  const [passphrase, setPassphrase] = useState('');
  const [restoreJson, setRestoreJson] = useState('');
  const [backupNotice, setBackupNotice] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const mem = getMemorySnapshot(phase);

  const handleExportBackup = async () => {
    setBackupNotice('');
    try {
      const payload = await exportEncryptedBackup(session, passphrase);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tibb-backup-${session.accountId}.tibb-backup`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupNotice(isUrdu ? 'انکرپٹڈ بیک اپ ڈاؤن لوڈ ہو گیا۔' : 'Encrypted backup downloaded.');
    } catch (err) {
      setBackupNotice(err instanceof Error ? err.message : 'Backup failed.');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBackupNotice('Backup file exceeds 5 MB limit.');
      return;
    }
    const text = await file.text();
    setRestoreJson(text);
  };

  const handleRestoreSubmit = async () => {
    setBackupNotice('');
    try {
      const count = await restoreEncryptedBackup(session, restoreJson, passphrase);
      setBackupNotice(`Restored ${count} encrypted items into ${session.displayName}. Reloading...`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setBackupNotice(err instanceof Error ? err.message : 'Restore failed.');
    }
  };

  const handleWipeAccount = async () => {
    await wipeAccountData(session.accountId);
    onWipedAccount();
  };

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6">
      <div>
        <h1 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
          {s.kitTitle}
        </h1>
        <p className={`text-xs text-[#525E5A] dark:text-slate-400 mt-1 ${isUrdu ? 'font-urdu text-sm leading-[1.8]' : ''}`}>
          {s.kitSubtitle}
        </p>
      </div>

      {/* Transparent AI Engine Status Card */}
      <div className="glass-panel rounded-3xl border border-[var(--accent)]/25 p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Cpu className="h-4 w-4 text-[var(--accent)]" />
          <span>
            {isUrdu
              ? 'موجودہ اے آئی انجن: جیمنائی (آن لائن براؤزر) + مقامی Qwen 3.5 0.8B (اینڈرائیڈ APK کے لیے تیار)'
              : 'Active Engine Architecture: Gemini Cloud Default (Browser) + Qwen 3.5 0.8B / Whisper Native Bridge (Android APK)'}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          {isUrdu
            ? 'براؤزر ورژن میں آپ کی صوتی اور تحریری علامات سرور پر محفوظ Gemini API Key سے چلتی ہیں، جبکہ آف لائن اینڈرائیڈ APK بنانے پر نیچے دی گئی کمانڈز سے Qwen3.5-0.8B-Q4_K_M.gguf اور ggml-tiny-q5_1.bin ڈاؤن لوڈ ہو کر فون کے اندر چلتے ہیں۔'
            : 'In this live browser preview, voice transcription (gemini-3.5-transcribe), step-by-step triage (gemini-4-hydrogen), and Urdu speech (gemini-3.8-flash-lite-tts) run via the server-side GEMINI_API_KEY. When compiling the offline Android APK, Capacitor invokes llama.cpp (Qwen 3.5 0.8B) and whisper.cpp sequentially under 1 GB RAM.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium">{s.kitMemoryTitle}</h2>
            <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)]">
              {mem.totalEstimatedRssMb} MB / {mem.budgetCeilingMb} MB
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[var(--surface-muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${Math.min(100, (mem.totalEstimatedRssMb / mem.budgetCeilingMb) * 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['IDLE', '1. Core Only (~128 MB)'],
                ['WHISPER_ACTIVE', '2. Whisper Tiny (~393 MB)'],
                ['OCR_ACTIVE', '3. Lab OCR (~196 MB)'],
                ['QWEN_ACTIVE', '4. Qwen 3.5 0.8B (~908 MB)'],
              ] as const
            ).map(([p, label]) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-medium text-left ${
                  phase === p
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-[var(--border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-[var(--surface-muted)] p-4 text-xs space-y-1.5 text-[var(--muted)]">
            <div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              <span>Strict Non-Concurrent Swap Enforced</span>
            </div>
            <p>
              Whisper unloads native C++ memory completely before Qwen3.5-0.8B-Q4_K_M.gguf (mmap=true, n_ctx=1024) loads—keeping peak RSS at ~908 MB (&lt; 1 GB).
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg font-medium">{s.kitBackupTitle}</h2>
          </div>

          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={isUrdu ? 'بیک اپ پاس ورڈ (کم از کم 6 حروف)' : 'Backup passphrase (min 6 chars)'}
            className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-transparent px-3.5 text-sm"
          />

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="min-h-[44px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> {s.kitExportBtn}
            </button>

            <label className="min-h-[44px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> {s.kitLoadBtn}
              <input type="file" accept=".tibb-backup,.json" onChange={handleRestoreFile} className="hidden" />
            </label>

            {restoreJson && (
              <button
                type="button"
                onClick={handleRestoreSubmit}
                className="min-h-[44px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {s.kitRestoreBtn}
              </button>
            )}
          </div>

          {backupNotice && <p className="text-xs text-[var(--accent)]">{backupNotice}</p>}

          <div className="pt-4 border-t border-black/8 dark:border-slate-800 space-y-2">
            {!confirmWipe ? (
              <button
                type="button"
                onClick={() => setConfirmWipe(true)}
                className="min-h-[42px] px-4 rounded-full border border-red-600/40 text-red-700 dark:text-red-400 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> {s.kitWipeBtn}
              </button>
            ) : (
              <div className="rounded-xl border border-red-600/30 bg-red-50 dark:bg-red-950/40 p-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-red-800 dark:text-red-200 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Irreversible deletion.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="min-h-[36px] px-3 rounded-lg border border-black/15 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleWipeAccount}
                    className="min-h-[36px] px-3 rounded-lg bg-[#DC2626] text-white text-xs font-medium"
                  >
                    Confirm Wipe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h2 className="font-display text-lg font-medium">{s.kitCommandsTitle}</h2>
        <pre dir="ltr" className="rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-4 font-mono-tabular text-xs overflow-x-auto leading-relaxed">
{`# 1. Download Offline Quantized Models for Android (run on your workstation or via ModelDownloadManager.kt)
mkdir -p android/app/src/main/assets/models
curl -L -o android/app/src/main/assets/models/ggml-tiny-q5_1.bin \\
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin
curl -L -o android/app/src/main/assets/models/Qwen3.5-0.8B-Q4_K_M.gguf \\
  https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf

# 2. Run local dev preview (uses GEMINI_API_KEY on server.ts)
npm run dev

# 3. Verify tests & < 1 GB RAM sequential benchmark
npm test
npm run benchmark

# 4. Compile Offline Android APK via Capacitor 6
npm run build && npx cap sync android && cd android && ./gradlew assembleRelease`}
        </pre>
      </div>
    </div>
  );
};
