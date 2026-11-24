import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertOctagon,
  CheckCircle2,
  MapPin,
  Navigation,
  PhoneCall,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { AppLocale, I18N, URDU_AUDIO_SCRIPTS } from '../data/trilingual';
import { playClinicalChime, speakOfflineGuidance } from '../engine/audioFeedback';
import {
  GroundedExplanationResponse,
  generateVerifiedClinicalExplanation,
} from '../engine/localAiBridge';
import {
  EpisodeInput,
  FacilityRecord,
  TriageEvaluationResult,
  getAvailableDistricts,
  sortFacilities,
} from '../engine/triageEngine';
import type { FrequentPlace } from '../types/clinical';
import { StabilizationTimers } from './StabilizationTimers';

interface TriageResultViewProps {
  input: EpisodeInput;
  result: TriageEvaluationResult;
  locale: AppLocale;
  frequentPlaces?: FrequentPlace[];
  onStartNewCheckup: () => void;
  onRecordAmrBlock?: () => void;
}

const EMERGENCY_LINES = [
  { label: 'Rescue 1122', tel: '1122' },
  { label: 'Edhi 115', tel: '115' },
  { label: 'Chhipa 1020', tel: '1020' },
  { label: 'Sehat 1166', tel: '1166' },
];

const DISTRICTS = getAvailableDistricts();

export const TriageResultView: React.FC<TriageResultViewProps> = ({
  input,
  result,
  locale,
  frequentPlaces = [],
  onStartNewCheckup,
  onRecordAmrBlock,
}) => {
  const s = I18N[locale];
  const isUrdu = locale === 'ur';

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [aiResponse, setAiResponse] = useState<GroundedExplanationResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');

  // Explicit User Location or Saved Frequent Place State (never assumed silently)
  const [facilities, setFacilities] = useState<FacilityRecord[]>(result.recommendedFacilities);
  const [locationRequired, setLocationRequired] = useState<boolean>(result.locationRequired);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(input.district ?? '');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (result.locationRequired && frequentPlaces.length > 0) {
      const firstPlace = frequentPlaces[0];
      const coords =
        typeof firstPlace.lat === 'number' && typeof firstPlace.lng === 'number'
          ? { lat: firstPlace.lat, lng: firstPlace.lng }
          : undefined;
      const sorted = sortFacilities(result.tier, input.patient.ageMonths <= 60, coords, firstPlace.district);
      setFacilities(sorted.facilities);
      setLocationRequired(sorted.locationRequired);
      setSelectedDistrict(firstPlace.district);
      setSelectedPlaceId(firstPlace.id);
    } else {
      setFacilities(result.recommendedFacilities);
      setLocationRequired(result.locationRequired);
    }
  }, [result, frequentPlaces, input.patient.ageMonths]);

  useEffect(() => {
    if (result.tier === 'RED') {
      playClinicalChime('emergency');
      speakOfflineGuidance(URDU_AUDIO_SCRIPTS.emergencyRedirect, 'ur-PK');
    }

    const payload = JSON.stringify(result.referralSlip);
    QRCode.toDataURL(payload, { margin: 1, width: 168 }).then(setQrDataUrl).catch(() => {});

    if (result.tier !== 'RED') {
      setAiLoading(true);
      generateVerifiedClinicalExplanation({
        ageMonths: input.patient.ageMonths,
        triageTier: result.tier,
        homeCare: result.matchedHomeCare,
        diseaseRef: result.matchedDiseaseRef,
      })
        .then((res) => setAiResponse(res))
        .finally(() => setAiLoading(false));
    }
  }, [input, result]);

  const handleSelectSavedPlace = (place: FrequentPlace) => {
    setLocationError('');
    setSelectedPlaceId(place.id);
    setSelectedDistrict(place.district);
    const coords =
      typeof place.lat === 'number' && typeof place.lng === 'number'
        ? { lat: place.lat, lng: place.lng }
        : undefined;
    const sorted = sortFacilities(result.tier, input.patient.ageMonths <= 60, coords, place.district);
    setFacilities(sorted.facilities);
    setLocationRequired(sorted.locationRequired);
  };

  const handleRequestGps = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError(
        isUrdu ? 'اس براؤزر میں GPS دستیاب نہیں۔ اپنا شہر منتخب کریں۔' : 'GPS unavailable here. Select your saved place or district below.'
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const sorted = sortFacilities(
          result.tier,
          input.patient.ageMonths <= 60,
          coords,
          selectedDistrict || undefined
        );
        setSelectedPlaceId('');
        setFacilities(sorted.facilities);
        setLocationRequired(false);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError(
          isUrdu
            ? 'لوکیشن کی اجازت نہیں ملی۔ محفوظ مقام یا ضلع منتخب کریں۔'
            : 'Location permission declined. Use your saved places or choose district below.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDistrictChange = (district: string) => {
    setSelectedPlaceId('');
    setSelectedDistrict(district);
    setLocationError('');
    if (!district) {
      setFacilities([]);
      setLocationRequired(true);
      return;
    }
    const sorted = sortFacilities(result.tier, input.patient.ageMonths <= 60, undefined, district);
    setFacilities(sorted.facilities);
    setLocationRequired(false);
  };

  const handleTestFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;
    setAiLoading(true);
    const res = await generateVerifiedClinicalExplanation({
      ageMonths: input.patient.ageMonths,
      triageTier: result.tier,
      homeCare: result.matchedHomeCare,
      diseaseRef: result.matchedDiseaseRef,
      userQuery: followUpQuery,
    });
    setAiResponse(res);
    if (res.audit.amrBlocked) {
      onRecordAmrBlock?.();
    }
    setAiLoading(false);
  };

  const firstAid = result.emergencyFirstAid;

  return (
    <div dir={isUrdu ? 'rtl' : 'ltr'} className="space-y-8">
      {/* Tier Banner */}
      {result.tier === 'RED' ? (
        <div className="rounded-3xl bg-[#DC2626] text-white p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <AlertOctagon className="h-8 w-8 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-xs font-semibold tracking-wider uppercase opacity-90">
                  {s.redBannerLabel}
                </p>
                <h1 className={`font-display text-2xl sm:text-3xl font-medium mt-1 ${isUrdu ? 'font-urdu leading-[1.7]' : ''}`}>
                  {s.redHeadline}
                </h1>
                <p className={`text-sm opacity-90 mt-1.5 ${isUrdu ? 'font-urdu text-base leading-[1.9]' : ''}`}>
                  {s.redSubline}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => speakOfflineGuidance(URDU_AUDIO_SCRIPTS.emergencyRedirect, 'ur-PK')}
              className="min-h-[44px] px-4 rounded-full bg-white/15 hover:bg-white/25 text-xs font-medium inline-flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4" /> {s.urduAudio}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EMERGENCY_LINES.map((line) => (
              <a
                key={line.tel}
                href={`tel:${line.tel}`}
                className="min-h-[48px] rounded-xl bg-white text-[#DC2626] font-semibold text-xs px-3 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
              >
                <PhoneCall className="h-4 w-4" /> {line.label}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-3xl border p-6 sm:p-8 ${
            result.tier === 'AMBER'
              ? 'border-amber-600/30 bg-amber-50 dark:bg-amber-950/35 text-[var(--ink)]'
              : 'glass-panel'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className={`h-7 w-7 shrink-0 mt-0.5 ${
                  result.tier === 'AMBER' ? 'text-[#B45309] dark:text-amber-400' : 'text-[var(--accent)]'
                }`}
              />
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)]">
                  {result.tier === 'AMBER' ? s.amberBannerLabel : s.greenBannerLabel}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-medium mt-1">
                  {isUrdu
                    ? result.matchedHomeCare?.title_ur ?? result.matchedDiseaseRef.title_ur
                    : result.matchedHomeCare?.title_en ?? result.matchedDiseaseRef.title_en}
                </h1>
                {!isUrdu && result.matchedHomeCare && (
                  <p className="font-urdu urdu-safe text-lg text-[var(--accent)] mt-1" dir="rtl">
                    {result.matchedHomeCare.title_ur}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                speakOfflineGuidance(
                  result.matchedHomeCare?.escalation_warning_ur ?? URDU_AUDIO_SCRIPTS.greenHomeCare,
                  'ur-PK'
                )
              }
              className="min-h-[42px] px-4 rounded-full border border-[var(--border)] text-xs font-medium inline-flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4 text-[var(--accent)]" /> {s.urduAudio}
            </button>
          </div>

          {result.amberReasons.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-700/25 bg-[var(--surface)] p-4 space-y-1.5">
              {result.amberReasons.map((reason) => (
                <p key={reason} className="text-sm">
                  • {reason}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* IMMEDIATE EMERGENCY FIRST-AID CARD */}
          {result.tier === 'RED' && firstAid && (
            <div className="rounded-3xl border-2 border-[#DC2626]/30 bg-[var(--surface)] p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className={`font-display text-xl font-medium text-[#DC2626] ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
                    {s.firstAidDoNowTitle}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {isUrdu ? firstAid.title_ur : firstAid.title_en} · {firstAid.sourceCitation}
                  </p>
                </div>
              </div>

              <ol className="space-y-3">
                {firstAid.do_now_en.map((step, i) => (
                  <li key={step} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <p className={`text-sm font-medium leading-relaxed ${isUrdu ? 'font-urdu text-base leading-[1.9]' : ''}`}>
                      <span className="font-mono-tabular font-bold text-[#DC2626] mr-2">{i + 1}.</span>
                      {isUrdu ? firstAid.do_now_ur[i] : step}
                    </p>
                    {!isUrdu && firstAid.do_now_ur[i] && (
                      <p className="font-urdu urdu-safe text-sm text-[var(--muted)] mt-1" dir="rtl">
                        {firstAid.do_now_ur[i]}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="rounded-2xl border border-red-600/25 bg-red-50/70 dark:bg-red-950/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0" /> {s.firstAidDoNotTitle}
                </p>
                {(isUrdu ? firstAid.do_not_ur : firstAid.do_not_en).map((item) => (
                  <p key={item} className={`text-xs text-red-900 dark:text-red-200 ${isUrdu ? 'font-urdu text-sm leading-[1.8]' : ''}`}>
                    • {item}
                  </p>
                ))}
              </div>

              {result.redFlags.length > 0 && (
                <div className="rounded-2xl bg-[var(--surface-muted)] p-4 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    {s.firstAidTriggersTitle}
                  </p>
                  {result.redFlags.map((flag) => (
                    <p key={flag.code} className="text-xs">
                      • {isUrdu ? flag.label_ur : flag.label_en}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.tier === 'RED' && (
            <StabilizationTimers
              locale={locale}
              defaultFocus={
                result.emergencyFirstAid?.id === 'SEIZURE_CONVULSIONS'
                  ? 'SEIZURE'
                  : result.emergencyFirstAid?.id === 'UNCONTROLLED_BLEEDING'
                    ? 'BLEEDING'
                    : result.emergencyFirstAid?.id === 'CHEST_PAIN'
                      ? 'HEART_CHILD'
                      : 'BURN'
              }
            />
          )}

          {result.tier !== 'RED' && result.matchedHomeCare && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
              <div>
                <h2 className={`font-display text-xl font-medium ${isUrdu ? 'font-urdu text-2xl' : ''}`}>
                  {s.homeCareStepsTitle}
                </h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {result.matchedHomeCare.sourceCitation}
                </p>
              </div>

              <ol className="space-y-3">
                {result.matchedHomeCare.steps_en.map((step, i) => (
                  <li key={step} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <p className={`text-sm leading-relaxed ${isUrdu ? 'font-urdu text-base leading-[1.9]' : ''}`}>
                      <span className="font-mono-tabular font-semibold mr-2">{i + 1}.</span>
                      {isUrdu
                        ? result.matchedHomeCare?.steps_ur[i] ?? step
                        : locale === 'roman'
                          ? result.matchedHomeCare?.steps_roman[i] ?? step
                          : step}
                    </p>
                    {!isUrdu && result.matchedHomeCare?.steps_ur[i] && (
                      <p className="font-urdu urdu-safe text-sm text-[var(--muted)] mt-1" dir="rtl">
                        {result.matchedHomeCare.steps_ur[i]}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="rounded-2xl border border-red-600/20 bg-red-50/60 dark:bg-red-950/30 p-4 space-y-1.5">
                {(isUrdu
                  ? result.matchedHomeCare.contraindications_ur
                  : result.matchedHomeCare.contraindications_en
                ).map((c) => (
                  <p key={c} className={`text-xs text-red-900 dark:text-red-200 ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                    • {c}
                  </p>
                ))}
                <p className={`text-xs font-medium text-[var(--ink)] pt-1 ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                  {isUrdu
                    ? result.matchedHomeCare.escalation_warning_ur
                    : result.matchedHomeCare.escalation_warning_en}
                </p>
              </div>
            </div>
          )}

          {result.tier !== 'RED' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="font-display text-lg font-medium">{s.verifiedExplanationTitle}</h2>
                </div>
                {aiResponse && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {aiResponse.audit.passed ? s.groundTruthVerified : s.amrGuardTriggered}
                  </span>
                )}
              </div>

              {aiLoading ? (
                <p className="text-sm text-[var(--muted)]">{s.agentThinking}</p>
              ) : aiResponse ? (
                <div className="space-y-3 text-sm leading-relaxed">
                  <p className={isUrdu ? 'font-urdu text-base leading-[1.9]' : ''}>
                    {isUrdu
                      ? aiResponse.explanation_ur
                      : locale === 'roman'
                        ? aiResponse.explanation_roman
                        : aiResponse.explanation_en}
                  </p>
                  {!isUrdu && (
                    <p className="font-urdu urdu-safe text-base text-[var(--muted)]" dir="rtl">
                      {aiResponse.explanation_ur}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)] pt-1">
                    <span>{aiResponse.runtimeUsed}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{aiResponse.latencyMs} ms</span>
                    <span aria-hidden="true">·</span>
                    <span>{aiResponse.sourceCitation}</span>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleTestFollowUp} className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  maxLength={160}
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder={s.followUpPlaceholder}
                  className="flex-1 min-h-[44px] rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-full azure-pill-active text-xs font-semibold whitespace-nowrap"
                >
                  {s.followUpSubmitBtn}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: QR Slip + Saved Frequent Places & Explicit GPS Hospitals */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <h2 className="font-display text-lg font-medium">{s.qrSlipTitle}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{s.qrSlipSubline}</p>

            <div className="mt-4 flex items-center gap-4">
              <div className="w-36 h-36 rounded-xl border border-[var(--border)] bg-white p-2 flex items-center justify-center shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Offline Referral QR Code" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-[var(--muted)]">QR...</span>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-mono-tabular font-semibold text-sm">{result.referralSlip.referralToken}</div>
                <div>
                  Tier: <strong>{result.referralSlip.tier}</strong>
                </div>
                <div>
                  Age: <span className="font-mono-tabular">{result.referralSlip.ageBracket}</span>
                </div>
                <div>
                  Flag: <span className="font-mono-tabular">{result.referralSlip.primaryFlag}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Places + GPS + District Selector Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-medium">{s.nearestFacilitiesTitle}</h2>

            {frequentPlaces.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {isUrdu ? 'محفوظ مقامات سے قریبی ہسپتال (آف لائن)' : 'Offline Lookup from Your Saved Places'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {frequentPlaces.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => handleSelectSavedPlace(pl)}
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium border transition-colors ${
                        selectedPlaceId === pl.id
                          ? 'azure-pill-active border-transparent'
                          : 'border-[var(--border)] bg-[var(--surface-muted)]'
                      }`}
                    >
                      {pl.label} · {pl.district}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-[var(--surface-muted)] p-4 space-y-3 border border-[var(--border)]">
              {locationRequired && (
                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">{s.locationRequiredTitle}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">{s.locationRequiredBody}</p>
                </div>
              )}

              <button
                type="button"
                disabled={locating}
                onClick={handleRequestGps}
                className="w-full min-h-[44px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <Navigation className="h-3.5 w-3.5" /> {locating ? s.locatingGps : s.useGpsBtn}
              </button>

              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-[var(--muted)]">
                  {s.orChooseArea}
                </label>
                <select
                  value={DISTRICTS.includes(selectedDistrict) ? selectedDistrict : ''}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"
                >
                  <option value="">{s.allDistrictsOption}</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  placeholder={isUrdu ? 'یا اپنا شہر / تحصیل ٹائپ کریں...' : 'Or type any city / tehsil / hospital area...'}
                  className="w-full min-h-[38px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"
                />
              </div>

              {locationError && <p className="text-[11px] text-amber-800 dark:text-amber-300">{locationError}</p>}
            </div>

            {!locationRequired && facilities.length > 0 && (
              <div className="space-y-3 pt-1">
                {facilities.slice(0, 4).map((fac) => (
                  <div
                    key={fac.id}
                    className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{isUrdu ? fac.name_ur : fac.name_en}</div>
                      {!isUrdu && (
                        <div className="font-urdu urdu-safe text-xs text-[var(--muted)]" dir="rtl">
                          {fac.name_ur}
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {fac.tehsil}, {fac.district}
                        </span>
                        {typeof fac.distanceKm === 'number' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">{fac.distanceKm} km</span>
                          </>
                        )}
                      </div>
                    </div>
                    <a
                      href={`tel:${fac.phone}`}
                      className="min-h-[38px] px-3.5 rounded-full azure-pill-active text-xs font-medium inline-flex items-center gap-1 shrink-0"
                    >
                      <PhoneCall className="h-3 w-3" /> {s.callBtn}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 no-print">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 min-h-[48px] rounded-full azure-pill-active text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" /> {s.printSummaryBtn}
            </button>
            <button
              type="button"
              onClick={onStartNewCheckup}
              className="flex-1 min-h-[48px] rounded-full border border-[var(--border)] text-sm font-medium inline-flex items-center justify-center gap-2 hover:border-[var(--accent)]"
            >
              <RotateCcw className="h-4 w-4" /> {s.startNewCheckupBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
