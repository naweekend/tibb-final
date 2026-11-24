import React, { useState } from 'react';
import { CheckCircle2, QrCode, Users } from 'lucide-react';
import { AppLocale, I18N } from '../data/trilingual';
import { StoredEpisode } from '../db/encryptedVault';
import { TriageTier } from '../engine/triageEngine';

interface BhuQueuePanelProps {
  locale: AppLocale;
  episodes: StoredEpisode[];
  onVerifyReferral: (episodeId: string) => Promise<void>;
}

export const BhuQueuePanel: React.FC<BhuQueuePanelProps> = ({
  locale,
  episodes,
  onVerifyReferral,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [filter, setFilter] = useState<'ALL' | TriageTier>('ALL');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState('');

  const filtered = episodes.filter((e) => (filter === 'ALL' ? true : e.triageTier === filter));

  const handleVerifySlip = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = scanInput.trim();
    const matched = episodes.find(
      (ep) => ep.referralToken === token || token.includes(ep.referralToken)
    );
    if (!matched) {
      setScanResult(isUrdu ? 'مقامی ریکارڈ میں یہ ٹوکن نہیں ملا۔' : 'No matching referral token found in local log.');
      return;
    }
    await onVerifyReferral(matched.id);
    setScanResult(`${matched.referralToken} verified.`);
    setScanInput('');
  };

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`font-display text-2xl font-medium ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
            {s.queueTitle}
          </h1>
          <p className={`text-xs text-[#525E5A] dark:text-slate-400 mt-0.5 ${isUrdu ? 'font-urdu text-sm' : ''}`}>
            {s.queueSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-muted)]">
          {(['ALL', 'RED', 'AMBER', 'GREEN'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setFilter(tier)}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-medium ${
                filter === tier
                  ? 'azure-pill-active shadow-xs'
                  : 'text-[var(--muted)]'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg font-medium">
              {s.queueEpisodesTitle} ({filtered.length})
            </h2>
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">{s.queueEmptyText}</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((ep) => (
                <div key={ep.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{ep.patientName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`text-xs font-semibold ${
                          ep.triageTier === 'RED'
                            ? 'text-[#DC2626]'
                            : ep.triageTier === 'AMBER'
                              ? 'text-[#B45309]'
                              : 'text-[var(--accent)]'
                        }`}
                      >
                        {ep.triageTier}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5 font-mono-tabular">
                      {ep.symptomCategory} · {ep.referralToken} · {ep.facilityName}
                    </div>
                  </div>
                  {ep.referralCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                      <CheckCircle2 className="h-4 w-4" /> Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onVerifyReferral(ep.id)}
                      className="min-h-[38px] px-3.5 rounded-full border border-[var(--border)] text-xs font-medium"
                    >
                      {s.queueVerifyBtn}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[var(--accent)]" />
            <h2 className="font-display text-lg font-medium">{s.queueVerifyTitle}</h2>
          </div>
          <form onSubmit={handleVerifySlip} className="space-y-3">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="TIBB-RED-..."
              className="w-full min-h-[44px] rounded-xl border border-[var(--border)] bg-transparent px-3 font-mono-tabular text-xs"
            />
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-full azure-pill-active text-xs font-semibold"
            >
              {s.queueVerifyBtn}
            </button>
          </form>
          {scanResult && <p className="text-xs text-[var(--accent)]">{scanResult}</p>}
        </div>
      </div>
    </div>
  );
};
