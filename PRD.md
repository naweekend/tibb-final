# Product Requirements Document (PRD) — Tibb (طب)

## 1. Target Users & Context
1. **Pakistani Households (Gharana / Family Mode):** Parents, adults, and caregivers managing daily health, BMI-tailored Desi diet & workout routines, sleep, hydration, medicine/checkup alarms, lab reports, and sudden family medical emergencies across English, Urdu (Nastaliq RTL), and Roman Urdu.
2. **Frontline Clinics & Lady Health Workers (BHU / LHW Mode):** Dispensary and rural Basic Health Unit staff managing walk-in patient triage, offline QR referral verification, and zero-internet emergency hospital routing.

## 2. Core Problem
Households and rural clinics in Pakistan lack a calm, trilingual, offline-capable health companion that combines:
- Doctor-grade initial intake (BMI, medical history, allergies, saved everyday locations) without forcing complex multi-screen friction during an emergency.
- Deterministic WHO IMCI/ETAT emergency first aid and nearest 24/7 hospital lookup even when mobile internet drops.
- Everyday preventive wellness (filtered motion steps, hydration, sleep calculation, Desi diet & workouts, lab PDF/image OCR, medicine/doctor alarms) kept encrypted locally per person.

## 3. Main User Flow
1. **Landing & Onboarding:** User opens Tibb -> views calm botanical showcase & privacy promise -> enters encrypted local workspace or unlocks PIN vault -> completes 4-step Doctor Intake (Identity & Guardian Consent if <18, Metric/Imperial Height & Weight + BMI Plan, Medical History & Labs, Saved Places for Offline Emergency Hospitals).
2. **Home Hub ("Daily Insights"):** Immediately surfaces greeting + notification bell, `Progress Score %`, segmented switcher (`Reminders` / `Recommended`), featured guided checkup/breathing session card, and a clean 2x2 Bento Grid (`Smooth Breath / Steps`, `Progress Goals` + `Open Goals`, `Your Check-In` doctor prompt, and `Daily Wellness` Heart / Sugar / Sleep summary).
3. **Clinical Triage & Live Multimodal Chat:** One-question-at-a-time AI triage or instant 1122 SOS / deterministic RED-flag first aid, plus live camera/photo inspection for wounds, meals, or lab slips.
4. **Records, Labs & Alarms:** Per-person encrypted vault with local PDF/image OCR lab parsing, medicine/exercise/follow-up alarms, and printable summaries.

## 4. Core v1 Features (In Scope)
1. **Per-Person Encrypted Offline Vault:** AES-GCM-256 client-side encryption via Web Crypto API + IndexedDB (`Dexie`) with explicit PIN lock, encrypted export/restore, and 1-click irreversible wipe.
2. **WHO IMCI / ETAT Deterministic Triage & DRAP Safety Core:** Instant RED-flag emergency first aid (`1122`, `115`, `1020`), explicit saved-place/GPS nearest hospital routing, and strict DRAP antibiotic/prescription blocklist on all AI outputs.
3. **Botanical Daily Insights Hub & Wellness Coach:** Seamless Metric (`kg`/`cm`) & Imperial (`lbs`/`ft·in`) units, filtered accelerometer step counter, hydration tracker, validated bedtime/wake sleep calculator, South Asian BMI assessment, swappable Pakistani meal plans, and 12 offline home remedies.
4. **Local Lab OCR + Smart Alarms:** Offline `pdfjs-dist` + `tesseract.js` digital/scanned PDF and photo biomarker extraction plus 12-hour AM/PM medicine, vitals, workout, and doctor checkup alarms.

## 5. Explicitly Out of v1 Scope
- Commercial subscriptions, payment processing (Stripe/IAP), or marketing email newsletters.
- Automated antibiotic/steroid prescribing, dosing, or definitive medical diagnosis.
- Cloud-hosted personal medical profiles or cross-device third-party patient tracking.
- Wearable BLE hardware sync beyond standard browser `DeviceMotionEvent` and camera optical pulse estimation.

## 6. Success Metrics
- Deterministic triage evaluation latency < 1 ms; clinical grounding audit < 1 ms.
- Android sequential AI memory budget < 1024 MB RSS.
- 100% pass rate on unit & safety regression tests (`vitest`), zero TypeScript errors (`tsc --noEmit`), and zero external CDN font requests.

## 7. Explicit Assumptions
- Primary preview AI reasoning uses server-side `GEMINI_API_KEY` inside `server.ts` (`/api/agent/*`, `/api/explain`, `/api/wellness/plan`), while offline deterministic WHO IMCI/ETAT rules operate with zero network dependency.
- Anonymous district cohort telemetry is **opt-in only** (default OFF) and strips all PII before queueing.
- This product provides supportive primary-care guidance and emergency first-aid checklists, not a substitute for licensed physicians.
