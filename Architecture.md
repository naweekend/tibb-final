# Architecture Specification — Tibb (طب)

## 1. High-Level Topology
- **Client SPA & PWA:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + `vite-plugin-pwa` (Workbox asset precaching for offline reliability).
- **Code Splitting:** Heavy views (`PersonChatWorkspace`, `LabReportScanner`, `VitalsEstimator`, `TriageWizard`, `AndroidKitView`, `BhuQueuePanel`) are loaded via `React.lazy` + `Suspense` wrapped in `<ScreenSkeleton />` and `<AppErrorBoundary />`.
- **Express Gateway (`server.ts`):** Serves Vite middleware in development and `dist/` static assets in production on port `3000`, providing validated `/api/*` endpoints with server-side `GEMINI_API_KEY`.

## 2. Client Encrypted Data Model (`src/db/encryptedVault.ts`)
- **Database Engine:** IndexedDB via `Dexie` (`tibb_vault_v2`).
- **Tables:**
  1. `accounts`: `{ accountId, displayName, role ('GHARANA' | 'BHU'), pinProtected, saltBase64, verifierHashBase64, createdAtIso }`
  2. `records`: `{ id, accountId, kind, ivBase64, ciphertextBase64, updatedAtIso }`
- **Record Kinds (`kind`):** `PROFILE`, `THREAD`, `REPORT`, `EPISODE`, `LAB`, `ALARM`, `WELLNESS` — each AES-GCM-256 encrypted client-side before touching IndexedDB.
- **Backup & Erasure:** Passphrase-protected PBKDF2 + AES-GCM encrypted `.tibb-backup` JSON export/restore and 1-click `wipeAccountData(accountId)` deletion.

## 3. Clinical Safety & Offline Engines
- **`src/engine/triageEngine.ts`:** Deterministic WHO IMCI / ETAT rule evaluation, instant RED-flag keyword/audio classification, Haversine distance facility ranking (requires explicit saved place or GPS permission), and DRAP Rx blocklist (`verifyAgainstClinicalGroundTruth`).
- **`src/utils/healthMath.ts`:** Rounding-free canonical metric/imperial conversions (`kgToLbs`, `lbsToKg`, `cmToFtIn`, `ftInToCm`), midnight-safe sleep math (`computeSleepDurationHours`, `sanitizeSleepHours`), bandpass-filtered pedometer cadence detector (`processMotionSample`), optical PPG SQI rejection (`analyzePpgSamples`), and lab biomarker regex extraction (`extractBiomarkers`).

## 4. Server Security & API Contracts (`server.ts`)
- **Security Headers:** `Content-Security-Policy` (self-hosted scripts/fonts, `connect-src 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)`, `Strict-Transport-Security` (production), `x-powered-by` disabled.
- **Input Validation & PII Protection:** Strict `zod` schemas on every `POST` body, `6mb` JSON body limit, and `containsPii()` scrubber rejecting CNICs, `+92`/`03xx` phone numbers, and emails before AI processing.
- **Abuse & Spend Protection:** Per-IP sliding-window per-minute `rateLimit` PLUS a per-IP daily AI request cap (`dailyAiQuota`) across `/api/agent/*`, `/api/explain`, and `/api/wellness/plan`.
- **Telemetry Privacy:** `/api/telemetry` accepts anonymized non-PII district cohorts only when the user explicitly opts in (`tibb_telemetry_consent === 'granted'`, default OFF).
