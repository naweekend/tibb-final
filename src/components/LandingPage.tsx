import React from 'react';
import { ArrowRight, Bell, Check, Droplets, Footprints, Heart, Leaf, Lock, Moon, Play, ShieldCheck, Sun } from 'lucide-react';
import { AppLocale } from '../data/trilingual';

interface LandingPageProps {
  locale: AppLocale;
  onChangeLocale: (locale: AppLocale) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  hasProfiles: boolean;
  onBeginRegistration: () => void;
  onEnterWorkspace: () => void;
  onOpenPinVault: () => void;
  onOpenLegalModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  locale,
  onChangeLocale,
  darkMode,
  onToggleDarkMode,
  hasProfiles,
  onBeginRegistration,
  onEnterWorkspace,
  onOpenPinVault,
  onOpenLegalModal,
}) => {
  const isUrdu = locale === 'ur';

  const copy = {
    en: {
      nav1: 'Features',
      nav2: 'Offline Care',
      nav3: 'Privacy',
      ctaTop: hasProfiles ? 'Open Hub' : 'Begin Intake',
      headline: 'Calm health clarity for every Pakistani home.',
      subline: 'Track steps, desi meals, daily check-ins, medicine alarms, and offline 1122 hospitals in one compact view.',
      primaryCta: hasProfiles ? 'Open Your Health Hub' : 'Start Doctor Intake',
      secondaryCta: hasProfiles ? 'Add Family Member' : 'Unlock PIN Vault',
      trustLine: 'AES-256 Encrypted · WHO IMCI First Aid · 25+ Offline Hospitals',
      pillars: [
        { n: '01', title: 'Doctor-Grade Intake', desc: 'BMI guidance, lab notes, and saved emergency places.' },
        { n: '02', title: 'Offline 1122 Routing', desc: 'Nearest public hospitals and BHUs without internet.' },
        { n: '03', title: 'Daily Plans & Alarms', desc: 'Auto steps, water check, sleep tracking, and alerts.' },
      ],
      privacyBtn: 'Privacy & Terms',
      footerTag: 'OFFLINE FIRST · FAMILY & BHU',
    },
    ur: {
      nav1: 'خصوصیات',
      nav2: 'آف لائن مدد',
      nav3: 'رازداری',
      ctaTop: hasProfiles ? 'ہب کھولیں' : 'تعارف شروع',
      headline: 'ہر پاکستانی گھر کے لیے پُرسکون اور مستند صحت۔',
      subline: 'قدم، دیسی غذا، روزانہ چیک اِن، دوا کے الارم اور بغیر انٹرنیٹ 1122 ہسپتال ایک ہی جگہ۔',
      primaryCta: hasProfiles ? 'اپنا ہیلتھ ہب کھولیں' : 'طبی تعارف شروع کریں',
      secondaryCta: hasProfiles ? 'نیا فرد شامل کریں' : 'پِن والٹ کھولیں',
      trustLine: 'AES-256 محفوظ والٹ · WHO IMCI امداد · 25+ آف لائن ہسپتال',
      pillars: [
        { n: '01', title: 'مکمل طبی تعارف', desc: 'وزن، BMI مشورہ، لیب رپورٹس اور قریبی مقامات۔' },
        { n: '02', title: 'آف لائن 1122 ہسپتال', desc: 'بغیر انٹرنیٹ قریبی ہسپتال اور بی ایچ یو کی رہنمائی۔' },
        { n: '03', title: 'غذا، ورزش اور الارم', desc: 'خودکار قدم، پانی، نیند اور دوا کے بروقت الارم۔' },
      ],
      privacyBtn: 'رازداری اور شرائط',
      footerTag: 'آف لائن فرسٹ · خاندان اور بی ایچ یو',
    },
    roman: {
      nav1: 'Features',
      nav2: 'Offline Care',
      nav3: 'Privacy',
      ctaTop: hasProfiles ? 'Open Hub' : 'Begin Intake',
      headline: 'Har Pakistani ghar ke liye sukoon aur sehat.',
      subline: 'Qadam, desi ghaza, rozana check-in, dawa ke alarms aur baghair internet 1122 haspatal ek jagah.',
      primaryCta: hasProfiles ? 'Apna Health Hub Kholein' : 'Doctor Intake Shuru Karein',
      secondaryCta: hasProfiles ? 'Naya Fard Shamil Karein' : 'PIN Vault Kholein',
      trustLine: 'AES-256 Encrypted · WHO IMCI First Aid · 25+ Offline Hospitals',
      pillars: [
        { n: '01', title: 'Doctor-Grade Intake', desc: 'BMI mashwara, lab notes aur mehfooz maqamat.' },
        { n: '02', title: 'Offline 1122 Routing', desc: 'Baghair internet qareebi sarkari haspatal aur BHUs.' },
        { n: '03', title: 'Daily Plans & Alarms', desc: 'Auto qadam, paani, neend aur waqt par dawa alerts.' },
      ],
      privacyBtn: 'Privacy & Terms',
      footerTag: 'OFFLINE FIRST · GHARANA & BHU',
    },
  }[locale];

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className="min-h-screen bg-transparent text-[var(--ink)] relative overflow-x-hidden transition-colors duration-300"
    >
      {/* Strict 3-Zone Single-Row Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/75 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between gap-6">
          <a href="#top" className="flex items-baseline gap-2 whitespace-nowrap shrink-0">
            <span className="font-display text-2xl font-semibold tracking-tight">tibb</span>
            <span className="font-urdu urdu-safe text-base text-[var(--accent)]" dir="rtl" lang="ur">
              طب
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[var(--muted)]">
            <a href="#pillars" className="hover:text-[var(--ink)] transition-colors whitespace-nowrap shrink-0">
              {copy.nav1}
            </a>
            <a href="#preview" className="hover:text-[var(--ink)] transition-colors whitespace-nowrap shrink-0">
              {copy.nav2}
            </a>
            <button
              type="button"
              onClick={onOpenLegalModal}
              className="hover:text-[var(--ink)] transition-colors whitespace-nowrap shrink-0"
            >
              {copy.nav3}
            </button>
          </nav>

          <button
            type="button"
            onClick={hasProfiles ? onEnterWorkspace : onBeginRegistration}
            className="min-h-[38px] px-4 rounded-full azure-pill-active text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tactile-press"
          >
            {copy.ctaTop} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main id="top" className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-10 relative z-10">
        {/* Single-Focus Split Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/80">
                {(
                  [
                    ['en', 'English'],
                    ['ur', 'اُردو'],
                    ['roman', 'Roman Urdu'],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLocale(code)}
                    className={`min-h-[32px] px-3 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      locale === code ? 'azure-pill-active font-semibold' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label="Toggle botanical theme"
                className="min-h-[36px] min-w-[36px] rounded-full border border-[var(--border)] bg-[var(--surface)]/80 inline-flex items-center justify-center tactile-press"
              >
                {darkMode ? <Sun className="h-4 w-4 text-[var(--accent)]" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>

            <h1
              className={`font-display font-semibold tracking-tight text-balance leading-[1.06] ${
                isUrdu ? 'font-urdu text-4xl sm:text-5xl leading-[1.75]' : 'text-[clamp(2.25rem,4.2vw,3.5rem)]'
              }`}
            >
              {copy.headline}
            </h1>

            <p
              className={`text-sm sm:text-base text-[var(--muted)] leading-relaxed max-w-lg ${
                isUrdu ? 'font-urdu text-base leading-[2.0]' : ''
              }`}
            >
              {copy.subline}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={hasProfiles ? onEnterWorkspace : onBeginRegistration}
                className="min-h-[48px] px-7 rounded-full azure-pill-active text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap tactile-press"
              >
                {copy.primaryCta} <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={hasProfiles ? onBeginRegistration : onOpenPinVault}
                className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
              >
                <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
                {copy.secondaryCta}
              </button>
            </div>

            <p className="text-[11px] font-mono-tabular text-[var(--muted)] flex items-center gap-2 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
              <span>{copy.trustLine}</span>
            </p>
          </div>

          {/* Live Botanical Product Preview Card (Direct Match to Reference Mockup) */}
          <div id="preview" className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-[390px] rounded-[30px] espresso-card p-4 sm:p-5 space-y-3 shadow-2xl">
              {/* Preview Top Greeting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-[#95CEA4]/20 border border-[#E5EEE0]/20 flex items-center justify-center text-xs font-semibold text-[#95CEA4]">
                    SR
                  </span>
                  <div className="leading-tight">
                    <div className="text-[10px] text-[#B6C9BE]">Welcome Back</div>
                    <div className="text-xs font-semibold text-[#F3F1E8]">Sara</div>
                  </div>
                </div>
                <span className="w-9 h-9 rounded-full bg-[#24463B] border border-[#E5EEE0]/18 flex items-center justify-center text-[#F3F1E8]">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Preview Daily Insights + 89% */}
              <div className="flex items-end justify-between">
                <div className="font-display text-2xl leading-[1.05] text-[#F3F1E8]">
                  Daily
                  <br />
                  Insights
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#B6C9BE]">Progress Score</div>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#95CEA4]/20 text-[#95CEA4] flex items-center justify-center">
                      <Leaf className="h-3 w-3" />
                    </span>
                    <span className="font-metric text-3xl text-[#F3F1E8]">89%</span>
                  </div>
                </div>
              </div>

              {/* Preview Segmented Tabs */}
              <div className="grid grid-cols-2 gap-1 rounded-full border border-[#E5EEE0]/18 bg-[#24463B]/70 p-1 text-[11px]">
                <span className="h-8 rounded-full bg-[#F1EFE4] text-[#112520] font-semibold inline-flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" /> Reminders
                </span>
                <span className="h-8 rounded-full text-[#B6C9BE] inline-flex items-center justify-center">
                  Recommended
                </span>
              </div>

              {/* Preview Mist Card */}
              <div className="featured-mist-card rounded-[18px] p-3 flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#F3F1E8] truncate">Morning Hydration &amp; Walk</div>
                  <div className="text-[10px] text-[#E3ECE3]/80 truncate">2 min · Checkup &amp; Desi diet</div>
                </div>
                <span className="w-8 h-8 rounded-full border border-[#E5EEE0]/28 bg-[#1B3930]/55 flex items-center justify-center text-[#F3F1E8] shrink-0">
                  <Play className="h-3 w-3 ml-0.5" />
                </span>
              </div>

              {/* Preview Compact 2x2 Bento */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="glass-panel rounded-[20px] p-3 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span>Daily Steps</span>
                    <Footprints className="h-3 w-3 text-[#95CEA4]" />
                  </div>
                  <div className="flex justify-center py-0.5">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="32" r="25" fill="none" stroke="rgba(229,238,224,0.16)" strokeWidth="5" />
                        <circle
                          cx="32"
                          cy="32"
                          r="25"
                          fill="none"
                          stroke="#A9D6B6"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={157}
                          strokeDashoffset={41}
                        />
                      </svg>
                      <span className="font-metric text-sm text-[#F3F1E8]">74%</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-center text-[#B6C9BE]">Auto Sensor</div>
                </div>

                <div className="glass-panel rounded-[20px] p-3 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span>Progress</span>
                    <Leaf className="h-3 w-3 text-[#95CEA4]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-metric text-2xl text-[#F3F1E8]">
                      5<span className="text-sm text-[#B6C9BE]">/14</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#24463B] overflow-hidden">
                      <div className="h-full w-2/5 rounded-full bg-[#95CEA4]" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={hasProfiles ? onEnterWorkspace : onBeginRegistration}
                    className="h-7 rounded-full bg-[#F1EFE4] text-[#112520] text-[10px] font-semibold"
                  >
                    Open Goals
                  </button>
                </div>

                <div className="thought-glow-card rounded-[20px] p-3 flex flex-col justify-between min-h-[112px]">
                  <span className="text-[11px] font-medium">Your Check-In</span>
                  <span className="text-[10px] text-[#F5F3EA]/85">7h sleep · Steady energy</span>
                </div>

                <div className="glass-panel rounded-[20px] p-3 flex flex-col justify-between min-h-[112px]">
                  <span className="text-[11px] font-medium">Daily Wellness</span>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <div>
                      <Heart className="h-3 w-3 mx-auto text-[#95CEA4]" />
                      <div className="text-[9px] text-[#B6C9BE] mt-0.5">Heart</div>
                      <div className="font-metric text-[11px]">68</div>
                    </div>
                    <div>
                      <Droplets className="h-3 w-3 mx-auto text-[#95CEA4]" />
                      <div className="text-[9px] text-[#B6C9BE] mt-0.5">Sugar</div>
                      <div className="font-metric text-[11px]">98</div>
                    </div>
                    <div>
                      <Moon className="h-3 w-3 mx-auto text-[#95CEA4]" />
                      <div className="text-[9px] text-[#B6C9BE] mt-0.5">Sleep</div>
                      <div className="font-metric text-[11px]">7h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compact 3-Column Scannable Strip (No Boring Prose Walls) */}
        <section id="pillars" className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-[var(--border)] pt-7">
          {copy.pillars.map((item) => (
            <div key={item.n} className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tabular text-xs font-semibold text-[var(--accent)]">{item.n}.</span>
                <h2 className={`font-display text-base font-semibold ${isUrdu ? 'font-urdu text-lg' : ''}`}>
                  {item.title}
                </h2>
              </div>
              <p className={`text-xs text-[var(--muted)] leading-relaxed ${isUrdu ? 'font-urdu text-sm' : ''}`}>
                {item.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-6 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.12em] uppercase text-[var(--muted)] relative z-10">
        <span>TIBB · طب</span>
        <div className="flex items-center gap-5">
          <button type="button" onClick={onOpenLegalModal} className="underline hover:text-[var(--ink)]">
            {copy.privacyBtn}
          </button>
          <span>{copy.footerTag}</span>
        </div>
      </footer>
    </div>
  );
};
