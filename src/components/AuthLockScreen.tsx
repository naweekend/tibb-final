import React, { useEffect, useState } from 'react';
import { Lock, Plus, ShieldCheck, UserCheck } from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import {
  AccountRecord,
  UnlockedVaultSession,
  createAccount,
  tibbDb,
  unlockAccount,
} from '../db/encryptedVault';
import { TibbGlobe } from './TibbGlobe';

interface AuthLockScreenProps {
  locale: AppLocale;
  onChangeLocale: (locale: AppLocale) => void;
  onUnlocked: (session: UnlockedVaultSession) => void;
  onOpenLegalModal?: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({
  locale,
  onChangeLocale,
  onUnlocked,
  onOpenLegalModal,
}) => {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [mode, setMode] = useState<'UNLOCK' | 'CREATE'>('CREATE');
  const [selectedId, setSelectedId] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'GHARANA' | 'BHU'>('GHARANA');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  useEffect(() => {
    let mounted = true;
    tibbDb.accounts.toArray().then((list) => {
      if (!mounted) return;
      setAccounts(list);
      if (list.length > 0) {
        setSelectedId(list[0].accountId);
        setMode('UNLOCK');
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'CREATE') {
        const session = await createAccount({
          displayName: displayName || (role === 'BHU' ? 'BHU Duty Station' : 'My Gharana Vault'),
          role,
          pin,
        });
        onUnlocked(session);
      } else {
        const session = await unlockAccount(selectedId, pin);
        onUnlocked(session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className="min-h-screen bg-transparent text-[var(--ink)] flex flex-col justify-between p-4 sm:p-8"
    >
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">tibb</span>
          <span className="font-urdu urdu-safe text-xl text-[var(--accent)]" dir="rtl">
            طب
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">
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
              onClick={() => onChangeLocale(code)}
              className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium transition-colors ${
                locale === code ? 'azure-pill-active' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="w-full max-w-6xl mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center sm:items-start lg:items-start xl:items-center gap-6">
            <div className="shrink-0">
              <TibbGlobe size="lg" activePulse />
            </div>
            <div>
              <h1
                className={`font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.12] ${
                  isUrdu ? 'font-urdu text-3xl sm:text-4xl leading-[1.7]' : ''
                }`}
              >
                {s.appName}
              </h1>
              <p
                className={`mt-3 text-lg sm:text-xl text-[var(--ink)] leading-snug ${
                  isUrdu ? 'font-urdu text-xl leading-[1.9]' : ''
                }`}
              >
                {s.authHeadline}
              </p>
              <p
                className={`mt-3 text-sm leading-relaxed text-[var(--muted)] max-w-md ${
                  isUrdu ? 'font-urdu text-base leading-[1.9]' : ''
                }`}
              >
                {s.authSubline}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-5 space-y-2.5 text-xs sm:text-sm text-[var(--muted)]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
              <span className={isUrdu ? 'font-urdu text-sm leading-[1.8]' : ''}>{s.authFeature1}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 mt-0.5 text-[var(--accent)] shrink-0" strokeWidth={1.75} />
              <span className={isUrdu ? 'font-urdu text-sm leading-[1.8]' : ''}>{s.authFeature2}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 glass-panel rounded-[28px] p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <h2 className={`font-display text-xl font-medium ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
              {mode === 'UNLOCK' ? s.unlockVaultTitle : s.createVaultTitle}
            </h2>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setPin('');
                  setMode(mode === 'UNLOCK' ? 'CREATE' : 'UNLOCK');
                }}
                className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline whitespace-nowrap shrink-0"
              >
                {mode === 'UNLOCK' ? (
                  <>
                    <Plus className="h-3.5 w-3.5" /> {s.newAccountBtn}
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3.5 w-3.5" /> {s.existingAccountsBtn} ({accounts.length})
                  </>
                )}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === 'UNLOCK' ? (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                  {s.selectAccountLabel}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {accounts.map((acc) => (
                    <button
                      key={acc.accountId}
                      type="button"
                      onClick={() => setSelectedId(acc.accountId)}
                      className={`min-h-[48px] flex items-center justify-between rounded-2xl border px-4 py-2.5 transition-colors ${
                        selectedId === acc.accountId
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] hover:bg-[var(--surface-muted)]/50'
                      }`}
                    >
                      <span className="text-sm font-medium">{acc.displayName}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {acc.role === 'BHU' ? s.bhuMode : s.gharanaMode}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                    {s.workspaceRoleLabel}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--surface-muted)]">
                    <button
                      type="button"
                      onClick={() => setRole('GHARANA')}
                      className={`min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                        role === 'GHARANA' ? 'azure-pill-active' : 'text-[var(--muted)]'
                      }`}
                    >
                      {s.gharanaMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('BHU')}
                      className={`min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                        role === 'BHU' ? 'azure-pill-active' : 'text-[var(--muted)]'
                      }`}
                    >
                      {s.bhuMode}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="vault-name" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                    {s.accountNameLabel}
                  </label>
                  <input
                    id="vault-name"
                    type="text"
                    required
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={role === 'BHU' ? s.accountNamePlaceholderBhu : s.accountNamePlaceholderGharana}
                    className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="vault-pin" className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                {mode === 'CREATE' ? s.pinLabelCreate : s.pinLabelUnlock}
              </label>
              <input
                id="vault-pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                required
                minLength={4}
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder={s.pinPlaceholder}
                className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3.5 py-2 font-mono-tabular text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/35 bg-red-500/12 px-3.5 py-2.5 text-xs text-[#B91C1C] dark:text-[#FCA5A5]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[50px] rounded-full azure-pill-active disabled:opacity-60 text-sm font-semibold tactile-press"
            >
              {busy ? s.derivingKey : mode === 'CREATE' ? s.createBtn : s.unlockBtn}
            </button>
          </form>
        </div>
      </div>

      <footer className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] tracking-widest uppercase text-[var(--muted)]">
        <span>WHO IMCI · ETAT · DRAP GUARDED</span>
        <div className="flex items-center gap-4">
          {onOpenLegalModal && (
            <button type="button" onClick={onOpenLegalModal} className="underline hover:text-[var(--ink)] uppercase">
              {isUrdu ? 'رازداری اور شرائط' : 'Privacy & Terms'}
            </button>
          )}
          <span>{s.careMadeSimple}</span>
        </div>
      </footer>
    </div>
  );
};
