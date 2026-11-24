# Engineering & Quality Guardrails — Tibb (طب)

## 1. UX Laws & Layout Contracts
- **Strict 3-Zone Top Bar (`<= 64px`):** Brand left, up to 5 single-line nav links center (`whitespace-nowrap`), primary `1122 SOS` CTA + Menu trigger right.
- **Fitts's & Hick's Law:** Every interactive target >= `44px` on touch devices. Every section exposes ONE unmistakable primary CTA; secondary options are quiet outline buttons.
- **Zeigarnik & Peak-End Rules:** Multi-step Doctor Intake tracks completion (`Profile X% complete — Step Y of 4`). Saving daily check-ins, completing triage, or logging alarms shows clear confirmation feedback.
- **Visual Hierarchy (Mockup-Aligned):** Keep the Home Hub uncluttered — Greeting & Bell -> `Daily Insights` + `Progress Score %` -> `[Reminders | Recommended]` switcher -> Featured Session card -> 2x2 Bento Grid (`Smooth Breath / Steps`, `Progress Goals` + `Open Goals`, `Your Check-In`, `Daily Wellness`), with expandable trackers below.

## 2. Anti-Vibecoded Rules
- Zero radial ambient blur orbs (`LuminousOrbsBackdrop` removed).
- Zero glass-on-glass nested blur stacking or purple-blue gradients.
- Zero external Google Fonts `<link>` tags — use self-hosted `@fontsource/outfit` + `@fontsource/ibm-plex-mono`.
- Zero emojis in UI prose, headings, or telemetry labels; zero decorative pulsing dots on static labels.
- Zero buzzwords (`Unlock`, `Elevate`, `Supercharge`, `Seamless`, `Cutting-edge`, `Revolutionary`, `It is not X, it is Y`) and avoid unnecessary em-dash (`—`) punctuation.
- Show Skeleton loaders during async boot/suspense and tactile `active:scale-[0.97]` micro-interactions with optimistic state updates + rollback on storage failure.

## 3. Security, Privacy & Legal Safeguards
- Never expose `GEMINI_API_KEY` or server secrets to `src/` or `VITE_*` variables.
- Keep `containsPii()`, Zod body validation, DRAP Rx blocklist, rate limiting, daily IP quota, and CSP headers active in `server.ts`.
- Provide accessible **Legal & Privacy Compliance** disclosures (Privacy Policy, Terms, Data Retention, Zero-Tracker Analytics disclosure, and 1-Click Local Data Wipe).
- Require explicit **Parent/Guardian Consent** checkbox when registering a minor (`< 18 years`) in `PersonOnboardingModal.tsx`.
- Gate anonymous `/api/telemetry` reporting behind explicit user opt-in consent (default OFF).
- Keep `.env` git-ignored and verify zero hardcoded credentials before shipping.
