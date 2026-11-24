# Tibb (طب) — Local-First Android AI Healthcare App & Production Blueprint

Tibb is a downloadable, 100% offline-capable Android application (built with Capacitor 6, Kotlin/JNI native bridges, and React/TypeScript) designed to run on budget 2 GB–4 GB RAM Pakistani smartphones within a strict `< 1 GB` runtime memory ceiling. It pairs a deterministic WHO clinical and first-aid core with on-device **Qwen 3.5 0.8B** and **Whisper** sequential inference, a two-pass anti-hallucination ground-truth verifier, and full production security, privacy, testing, and recovery safeguards.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Full Local Android APK First + Live Interactive Harness**: This build produces the complete **Capacitor 6 Native Android Studio project** (including Kotlin/JNI bridges for local `llama.cpp` Qwen 3.5 0.8B and `whisper.cpp`, Android manifest/WebView hardening, and Gradle APK build scripts) alongside a full interactive preview in this workspace so you can verify every user flow immediately, copy-paste every module into VS Code / Android Studio, compile the signed `.apk`, and run automated unit, E2E, and memory benchmarks.

- **Revision 1 — Full Local Android Runtime (< 1 GB RAM Ceiling)**: All core triage, first-aid, vitals, OCR, medicine alarms, hospital routing, and encrypted storage run **100% locally inside the Android APK** with zero internet required. An in-app **Local Model Manager** downloads `Qwen3.5-0.8B-Q4_K_M.gguf` (~520 MB) and `whisper-tiny-q5_1.bin` (~32–75 MB) onto app-private Android storage with SHA-256 checksum verification, executing them **sequentially (never concurrently)** so peak RAM remains `<= 920 MB`.
- **Revision 2 — Zero-Hallucination Two-Pass Ground-Truth Verification**: Qwen 3.5 0.8B never generates ungrounded medical advice from memory. Every AI response is constrained to retrieved records from our verified offline clinical knowledge base (WHO IMCI/ETAT rules, first-aid protocols, disease reference cards, and WHO home care) and then **double-checked by a deterministic cross-verifier** against the DRAP antibiotic blocklist, age contraindications, and numeric consistency rules before rendering.
- **Revision 3 — Anti-Vibecoded / Zero-AI-Cliché Design**: All emojis, glowing 3D blobs, purple/indigo gradients, glassmorphic cards, pulsing status dots, Bento-grid monotony, and pseudo-technical labels are eliminated in favor of calm clinical editorial typography, crisp `1.5px` stroke SVG iconography, and intentional asymmetry.
- **Revision 4 — Full Production Checklist Compliance**: Enforces cryptographic multi-account isolation (two separate accounts cannot decrypt or view each other's records), strict server/client input & upload validation, parameterized queries, private-by-default storage, encrypted backup & restore, PII-free error/audit logging, rate limiting, accessibility, and automated unit + E2E + load/benchmark suites.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an offline Android medical triage, first-aid, vitals, lab OCR, medicine alarm, and encrypted family health vault application for Pakistan. A household caregiver (**Gharana Mode**) or rural health worker (**BHU / LHW Queue Mode**) runs structured symptom checks, measures breathing/pulse via a 60-second tap-timer or camera PPG, scans printed lab reports via local OCR, receives verified Red/Amber/Green triage guidance with offline first-aid and hospital routing, and optionally uses on-device Whisper + Qwen 3.5 0.8B for trilingual (English / Urdu Nastaliq / Roman Urdu) explanations.
- **Target Audience & Context**: Budget 2 GB–4 GB RAM Android phones in urban and rural Pakistan operating with intermittent or zero connectivity, requiring immediate emergency escalation (`1122`, `115`, `1020`, `1166`) and strict protection against antibiotic self-medication.
- **Key Value**: Sub-15 ms deterministic Red-Flag safety response, zero hallucinated drug dosages or diagnoses, `< 1 GB` memory footprint on low-end Android devices, and verifiable production security.

---

## 2. User Experience & Visual Design

### Anti-Vibecoding & Anti-AI UI Discipline (Strictly Enforced)

To ensure Tibb feels like an authentic, human-designed medical tool rather than a generic AI prototype:
1. **Zero Emojis Anywhere**: Every mood, symptom, warning, and action icon uses a unified geometric `1.5px` stroke SVG system (`lucide-react` plus custom front/back anatomical SVG body maps).
2. **No Purple/Magenta Blobs or Glassmorphism**: Remove the floating pink/purple translucent sphere from the reference mockup and prohibit `backdrop-blur` fog over ambient blobs. Depth comes strictly from archival paper tone contrast and crisp `1px` hairline dividers.
3. **Human Editorial Typography (No Inter / Geist / Roboto)**: Pair `Fraunces` (warm editorial serif for the `Tibb` brand mark and clinical question headings) with `DM Sans` for crisp, legible body controls, `Noto Nastaliq Urdu` (`dir="rtl"`, `leading-[2.1]`) for Urdu script, and `IBM Plex Mono` (`tabular-nums`) solely for timers, lab counts, BPM readouts, and referral codes.
4. **No Bento-Box Clones or Fake Telemetry**: Break uniform grid monotony using focused one-question-at-a-time vertical pacing on mobile and asymmetric two-column clinical workspaces on wider screens. Zero pulsing green dots, zero pill-badge sandwiches, zero `border-l-4` callouts, and zero fake status tickers.

### Key User Flows

1. **Account Creation, PIN Login & Multi-User Isolation**: Users create or select a local account (`Gharana` household or `BHU Operator`), set a 4–6 digit PIN (or register with optional synced operator credentials), and unlock an isolated cryptographic vault. Wrong PINs trigger exponential backoff lockout; switching accounts completely isolates records.
2. **One-Question-at-a-Time Clinical Intake & Body Map**: Captures mandatory patient context (age in months/years, sex, pregnancy/lactation, chronic conditions, allergies), lets the user tap an interactive front/back SVG body region, and steps through clear single-question cards (`Yes` / `No` / `Unsure`) with offline Urdu audio prompts and optional Whisper voice dictation.
3. **60s Tap-Timer & Camera PPG Vitals**:
   - **Tap-Timer**: Large ergonomic circular tap surface computing real-time BPM and breaths/min against WHO age-adjusted fast-breathing cutoffs.
   - **Camera PPG**: Uses rear camera + torch green-channel luminance sampling over 20 seconds (`0.7–3.5 Hz` bandpass filter + Signal Quality Index gate), displaying a clear medical disclaimer and rejecting noisy reads rather than guessing.
4. **Red-Flag Override vs. Grounded First-Aid & Home Care**:
   - **RED**: High-contrast crimson emergency screen that locks out home remedies and LLM chat, plays an urgent alert tone, provides 1-tap dial buttons (`1122`, `115`, `1020`, `1166`), sorts the 25 pre-bundled Pakistani hospitals/BHUs, and generates an offline scannable QR Referral Slip.
   - **AMBER / GREEN**: Displays verified WHO supportive home-care and first-aid protocols (enforcing age guardrails like blocking honey under 12 months), explicit escalation triggers, and—when local Qwen 3.5 0.8B is enabled—a double-checked trilingual explanation citing the exact verified protocol ID.
5. **Offline Lab OCR, Medicine Alarms, Backup & Data Deletion**:
   - **Lab Scanner**: Validates uploaded image MIME type and size (`<= 10 MB`), runs local OCR to extract Hemoglobin, WBC, Platelets, and Fasting Glucose with manual confirmation fields.
   - **Alarms & Weekly PDF**: Schedules exact Capacitor local notifications with Urdu voice alerts, logs adherence, and exports a client-side Weekly Health Digest PDF.
   - **Recovery & Privacy**: Exports/imports AES-GCM encrypted `.tibb-backup` files and provides an irreversible one-tap account & data wipe across storage, caches, and backups.

### Visual Identity & Theme Tokens

- **Light Mode (Daylight Clinical Default)**: `--background: #FAF7F2` (60% warm paper canvas), `--surface: #FFFFFF` & `--surface-muted: #F3EDE3` (30% structure with `1px solid rgba(24, 32, 30, 0.1)` borders), `--foreground: #18201E`, `--primary: #0F766E` (10% medical teal CTA accent), `--amber: #B45309`, `--danger: #DC2626` (reserved strictly for Red-Flag emergency states).
- **Dark Mode (Night Shift / Stage Toggle)**: `@custom-variant dark` with `--background: #0B0F17`, `--surface: #121822`, `--foreground: #F1F5F9`, `--primary: #14B8A6`, full light/dark surface-text contrast pairing, `44x44px` minimum touch targets, `<= 15%` combined sticky chrome height on mobile, and visible keyboard focus rings across every interactive element.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Sequential Native Model Swapping (`whisper.cpp` -> Unload -> `Qwen3.5-0.8B`)**
  - *Chosen Approach*: Keep the deterministic WHO clinical & first-aid engine permanently resident (`< 5 MB` RAM). Load `whisper.cpp` (`tiny` Q5_1, ~260 MB RAM) strictly during voice capture, immediately free its native C++ context after transcription, and only then load `Qwen3.5-0.8B-Q4_K_M.gguf` (`n_ctx=1024`, `mmap=true`, ~780 MB peak RAM) for explanation generation—automatically unloading Qwen on `<= 3 GB` RAM phones when idle.
  - *Why*: Guarantees total Android app RSS stays under `~920 MB` (`< 1 GB` target) instead of triggering the Android Low Memory Killer on 2 GB–4 GB devices.
  - *Alternatives Considered*: Keeping Whisper, Qwen, and a tiny VLM resident simultaneously (`> 2.2 GB` RAM), which crashes budget phones.

- **Decision 2 — Two-Pass Grounded Verification Against Stored Clinical & First-Aid Data**
  - *Chosen Approach*: Before Qwen 3.5 0.8B runs, retrieve the exact matching protocol from the bundled offline datasets (WHO IMCI/ETAT, WHO Home Care, First Aid Protocols, Disease Reference Cards). Force Qwen to rephrase/translate *only* those retrieved facts. Immediately pass Qwen's output through a synchronous TypeScript **Second-Pass Clinical Cross-Verifier** (`verifyAgainstClinicalGroundTruth`) that checks for (a) 180+ DRAP antibiotics & Pakistani brand names, (b) ungrounded numbers/dosages not present in the source protocol, (c) banned diagnostic claims, and (d) age/pregnancy contraindications. Any violation discards the LLM text and renders the deterministic verified protocol card.
  - *Why*: Eliminates medical hallucinations in a 0.8B parameter model while preserving empathetic Urdu/English communication.

- **Decision 3 — Multi-Account Cryptographic Isolation & Production Security Architecture**
  - *Chosen Approach*: Each user/operator account owns an independent PBKDF2-HMAC-SHA256 (`600,000` iterations, unique per-account salt) + AES-GCM-256 vault partition (`accountId` bound into AAD authenticated additional data) with session auto-lock expiry, rate-limited unlock attempts, and zero secrets stored on disk or in the APK. For any optional backend sync/gateway endpoints, enforce Zod input validation, parameterized SQLite/D1 queries, strict CORS allowlists, security headers, HTTP-only session cookies/CSRF tokens where applicable, sliding-window rate limits, and PII-free audit logs.
  - *Why*: Ensures two different accounts on the same device or backend cannot access each other's medical records even at the storage layer.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System & Anti-Hallucination Pipeline Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│           ANDROID APK (Capacitor 6 + Hardened WebView) & PREVIEW            │
│  [Multi-Account PIN Vault] · [Gharana / BHU Mode] · [EN / اردو / Roman]      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               ▼
┌──────────────────────────────────────────┐     ┌─────────────────────────────┐
│  PASS 1: DETERMINISTIC CLINICAL CORE     │     │  NATIVE SEQUENTIAL AI BUS   │
│  (Always Offline · <15ms · <5MB RAM)     │     │  (Android Kotlin / JNI)     │
│                                          │     │                             │
│  1. WHO IMCI & ETAT Red-Flag Breaker     │     │  Step A: Load whisper.cpp   │
│  2. Verified Knowledge Base Retrieval:   │────▶│    Transcribe -> Free RAM   │
│     • WHO Home-Care & First-Aid Data     │     │  Step B: Load Qwen3.5-0.8B  │
│     • Disease Reference & Contraind.     │     │    (Q4_K_M, mmap, ctx=1024) │
│     • 25 PK Hospitals + QR Referral Gen  │     │    Grounded Rephrase Only   │
└──────────────────────┬───────────────────┘     └──────────────┬──────────────┘
                       │                                        │
                       └──────────────────┬─────────────────────┘
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  PASS 2: DETERMINISTIC CROSS-VERIFIER & HALLUCINATION GUARD                  │
│  • DRAP 180+ Antibiotic & Rx Blocker   • Numeric & Dosage Consistency Check  │
│  • Age/Pregnancy Contraindication Gate • DOMPurify + Unicode BiDi Stripper   │
│  [ On ANY mismatch -> Discard LLM text -> Render 100% Verified WHO Card ]    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  CRYPTOGRAPHICALLY ISOLATED STORAGE & RECOVERY                               │
│  • Per-Account Salted AES-GCM-256 Vaults (IndexedDB / Android Keystore)      │
│  • Encrypted .tibb-backup Export/Restore + 1-Tap Irreversible Data Wipe      │
│  • Zero-PII De-Identified Telemetry Outbox (Parameterized Prepared Queries)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **AccountRecord (Salted Auth Metadata)**: `accountId`, `displayName`, `role` (`GHARANA` | `BHU_LHW`), `salt`, `verifierHash`, `failedAttempts`, `lockedUntil`, `sessionTimeoutMinutes`.
- **PatientProfile (Account-Encrypted AES-GCM)**: `id`, `accountId`, `name`, `ageMonths`, `sex`, `isPregnantOrLactating`, `chronicConditions[]`, `allergies[]`.
- **CareEpisode (Account-Encrypted AES-GCM)**: `id`, `accountId`, `patientId`, `createdAt`, `bodyRegion`, `durationHours`, `temperatureBand`, `hydrationStatus`, `answers`, `vitals`, `triageTier` (`GREEN` | `AMBER` | `RED`), `matchedProtocolIds[]`, `redFlagsTriggered[]`, `referralToken`, `verifiedExplanation`, `groundingAuditPassed`.
- **LabScanRecord & MedicineAlarm (Account-Encrypted AES-GCM)**: Validated biomarker extractions (`hemoglobin`, `wbc`, `platelets`, `fastingGlucose`) and local scheduled alarm definitions with adherence logs.
- **ClinicalGroundTruth Store (Read-Only Bundled JSON)**: Verified records for `who_imci_rules`, `who_home_care`, `first_aid_protocols`, `disease_reference_cards`, `drap_blocklist`, and `facilities_pk`.
- **AuditLog & TelemetryOutbox (Zero-PII)**: Records security events (failed unlocks, backup exports, AMR blocks, triage counts) without passwords, PINs, tokens, or patient names.

### Interactive Component & State Mapping

- **Auth & Account Switcher**: Handles multi-account registration, PIN login with brute-force lockout, auto-lock session timer, and cross-account isolation verification.
- **Triage & First-Aid Flow**: Guides intake -> SVG Body Map -> Single-Question Cards -> Tap-Timer / Camera PPG -> Two-Pass Grounded Evaluation -> Emergency Crimson Override or Supportive Care & Offline QR Referral Slip.
- **Utilities (OCR, Alarms, Weekly PDF, Backup/Wipe)**: Enforces strict image MIME/size validation prior to local OCR, schedules exact alarms, builds client-side PDFs via `pdf-lib`, and performs encrypted backup export/restore + complete data erasure.
- **Copy-Paste Android Kit, Tests & Ops Console**: Provides an organized in-app & documentation guide mapping every file path for VS Code / Android Studio, native Kotlin/JNI bridge sources for `Qwen3.5-0.8B` & `whisper.cpp`, local model SHA-256 download manager, runnable Vitest unit/integration/security tests, E2E checklist, memory/latency benchmarks (`< 1 GB` RSS verification), and deployment/incident/rollback runbooks.

### Android Memory Budget (< 1 GB Runtime Ceiling)

| Execution Phase | Resident Modules in Memory | Target Android RSS | Lifecycle Transition |
| :--- | :--- | :--- | :--- |
| Idle / Triage Core | WebView + Deterministic WHO/First-Aid Engine + Encrypted DB | `110–140 MB` | Always resident |
| Voice Dictation | Core + `whisper.cpp` (`tiny` Q5_1, 4 threads) | `360–410 MB` | Unload Whisper context before LLM |
| Lab OCR Scan | Core + Tesseract WASM / Android ML Kit Text | `160–220 MB` | Terminate OCR worker on extract |
| Grounded Explanation | Core + `Qwen3.5-0.8B-Q4_K_M` (`mmap=true`, `n_ctx=1024`) | `760–920 MB` | Unload after reply on `<= 3 GB` RAM phones |

### Production Readiness, Testing & Operations Plan

- **Security & Privacy Controls**: Zero hardcoded secrets (`.env.example` placeholders only); Android Manifest/WebView hardened (`debuggable=false`, `allowBackup=false`, `usesCleartextTraffic=false`, `allowFileAccess=false`); Zod schema validation on all inputs/uploads; parameterized SQLite/D1 statements; XSS/BiDi sanitization; rate limiting and strict CORS/security headers on optional gateway endpoints.
- **Automated Verification & Benchmarks**:
  - **Unit & Security Suite (Vitest)**: Deterministic WHO IMCI/ETAT rules, Red-Flag interrupts, DRAP blocklist & Two-Pass Hallucination Verifier, PBKDF2/AES-GCM round-trip, cross-account decryption isolation (Account A vs. Account B), input/upload rejection, backup/restore integrity, and retry idempotency.
  - **E2E & Stress Tests**: Core journeys (signup/login, invalid PIN lockout, offline triage, Red-Flag QR generation, lab OCR validation, backup/restore, wipe) plus concurrent request/queue stress simulation and memory/latency benchmark script validating `< 1 GB` model budget.
- **Operations & Documentation**: Full architecture & API contract docs, CI build/lint/test/audit workflow, step-by-step Android APK build & verification commands, health checks, rollback procedure, and incident response guide.
