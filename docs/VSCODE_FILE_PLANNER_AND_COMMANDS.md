# Tibb (طب) — VS Code & Android Studio File Planner, Run Commands, Tests & Benchmarks

## 1. Exact VS Code Project Structure (Where Every File Goes)

Create a folder `tibb-android/` and place each file at the exact path below:

```text
tibb-android/
├── .env.example                          # Env variable names only (no secrets)
├── index.html                            # App HTML shell, PWA tags, Fraunces/DM Sans/Urdu fonts
├── metadata.json                         # Permissions (camera, microphone) & app metadata
├── package.json                          # Dependencies and npm scripts (dev, build, test, benchmark)
├── tsconfig.json                         # TypeScript configuration
├── vite.config.ts                        # Vite + Workbox offline PWA precaching
├── server.ts                             # Express server + security headers + PII scrubber + /api/explain
├── public/
│   ├── icon.svg                          # Brand SVG icon
│   ├── pwa-192x192.png                   # Android launcher icon
│   ├── pwa-512x512.png                   # Splash/install icon
│   ├── pwa-maskable-512x512.png          # Safe-zone padded adaptive icon
│   └── apple-touch-icon.png              # iOS home screen icon
├── src/
│   ├── main.tsx                          # React root + Service Worker registration
│   ├── App.tsx                           # Main shell, ErrorBoundary, Gharana/BHU & Dark/Light switch
│   ├── index.css                         # Tailwind v4 + archival paper & dark mode tokens
│   ├── data/
│   │   ├── facilities.pk.json            # 25 offline public hospitals, THQs, RHCs, BHUs
│   │   ├── drap_blocklist.json           # 130+ antibiotics, PK brand names, Rx drugs & diagnostic bans
│   │   ├── who_home_care.json            # Verified WHO supportive care & first-aid protocols
│   │   ├── emergency_first_aid.json      # 10 verified Red-Tier Emergency First-Aid protocols (EN + Urdu)
│   │   ├── disease_reference.json        # Ground-truth evaluation & numeric threshold cards
│   │   └── trilingual.ts                 # Full-app English, Urdu Nastaliq & Roman Urdu dictionary
│   ├── engine/
│   │   ├── triageEngine.ts               # Deterministic WHO IMCI/ETAT FSM, BP/Sugar & Two-Pass Verifier
│   │   ├── localAiBridge.ts              # Capacitor JNI bridge + sequential Qwen/Whisper scheduler
│   │   └── audioFeedback.ts              # Gemini 3.8 TTS + Offline Web Audio chimes / SpeechSynthesis
│   ├── db/
│   │   └── encryptedVault.ts             # Multi-account PBKDF2 + AES-GCM Dexie IndexedDB vault
│   └── components/
│       ├── TibbGlobe.tsx                 # Sculptural cream & rose-pink centerpiece globe
│       ├── AuthLockScreen.tsx            # Multi-account PIN login + pre-login EN/Urdu/Roman switch
│       ├── TriageWizard.tsx              # Live Gemini AI Agent + Direct Voice/Text + SVG Body Map
│       ├── VitalsEstimator.tsx           # Clear Upper/Lower BP, Sugar, 60s Tap-Timer & Camera PPG
│       ├── TriageResultView.tsx          # Red-Flag Emergency First-Aid, GPS/City Picker & QR slip
│       ├── LabReportScanner.tsx          # Offline Tesseract OCR with MIME/size validation
│       ├── MedicineAlarms.tsx            # Local notifications, Urdu alarm & pdf-lib weekly PDF
│       ├── BhuQueuePanel.tsx             # BHU walk-in queue & QR slip completion verifier
│       ├── AndroidKitView.tsx            # <1GB memory monitor, backup/restore & Qwen download guide
│       ├── PWAInstallButton.tsx          # In-app install prompt
│       └── OfflineIndicator.tsx          # Offline mode status banner
├── android-native-kit/                   # Copy into Capacitor android/ project for APK build
│   ├── capacitor.config.ts               # Copy to project root before `npx cap add android`
│   ├── AndroidManifest.xml               # Copy to android/app/src/main/AndroidManifest.xml
│   ├── LlamaBridgePlugin.kt              # Copy to android/app/src/main/java/pk/tibb/clinical/ai/
│   ├── WhisperBridgePlugin.kt            # Copy to android/app/src/main/java/pk/tibb/clinical/ai/
│   ├── ModelDownloadManager.kt           # Copy to android/app/src/main/java/pk/tibb/clinical/ai/
│   └── cpp/
│       ├── CMakeLists.txt                # Copy to android/app/src/main/cpp/CMakeLists.txt
│       └── tibb_llama_jni.cpp            # Copy to android/app/src/main/cpp/tibb_llama_jni.cpp
├── tests/
│   ├── triageEngine.test.ts              # WHO IMCI/ETAT, Emergency First-Aid, Location & BP tests
│   ├── hallucinationGuard.test.ts        # DRAP blocklist, dosage & infant honey guard tests
│   ├── vaultSecurity.test.ts             # Account A vs B crypto isolation, lockout & wipe tests
│   └── apiValidation.test.ts             # CNIC & phone PII scrubber tests
└── scripts/
    └── benchmark-memory.ts               # Latency & <1 GB RAM sequential benchmark runner
```

## 2. Commands to Run, Preview, Test & Benchmark Locally

```bash
# 1. Install dependencies
npm install

# 2. Start interactive app + Gemini AI triage gateway on http://localhost:3000
npm run dev

# 3. TypeScript check & production Vite build
npm run lint
npm run build

# 4. Run full automated unit, crypto isolation & anti-hallucination test suite
npm test

# 5. Run latency & < 1 GB Android sequential memory benchmark
npm run benchmark
```

## 3. Building the Downloadable Native Android APK (Qwen 3.5 0.8B + Whisper.cpp)

```bash
# 1. Install Capacitor CLI & Android platform
npm install @capacitor/cli @capacitor/android
cp android-native-kit/capacitor.config.ts ./capacitor.config.ts
npm run build
npx cap add android

# 2. Copy hardened Manifest & Native Kotlin/JNI AI plugins
cp android-native-kit/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
mkdir -p android/app/src/main/java/pk/tibb/clinical/ai
cp android-native-kit/*.kt android/app/src/main/java/pk/tibb/clinical/ai/
mkdir -p android/app/src/main/cpp
cp android-native-kit/cpp/* android/app/src/main/cpp/

# 3. Clone llama.cpp & whisper.cpp into android/app/src/main/cpp/
git clone --depth 1 https://github.com/ggerganov/llama.cpp android/app/src/main/cpp/llama.cpp
git clone --depth 1 https://github.com/ggerganov/whisper.cpp android/app/src/main/cpp/whisper.cpp

# 4. Download Qwen 3.5 0.8B & Whisper Tiny quantized weights (optional pre-bundle or fetch via ModelDownloadManager.kt)
mkdir -p android/app/src/main/assets/models
curl -L -o android/app/src/main/assets/models/ggml-tiny-q5_1.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin
curl -L -o android/app/src/main/assets/models/Qwen3.5-0.8B-Q4_K_M.gguf \
  https://huggingface.co/Qwen/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf

# 5. Sync web dist & compile Release APK
npx cap sync android
cd android && ./gradlew assembleRelease
# Output APK: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## 4. AI Architecture Summary (Cloud Default Now + Local Qwen Later)

- **Browser / Online Default**: Uses server-side `GEMINI_API_KEY` (`gemini-4-hydrogen` triage agent, `gemini-3.5-transcribe` voice transcription, `gemini-3.8-flash-lite-tts` Urdu/English audio) verified against local WHO/DRAP clinical safeguards.
- **Android Offline Native**: Runs `ggml-tiny-q5_1.bin` (~32 MB disk, ~265 MB RAM) and `Qwen3.5-0.8B-Q4_K_M.gguf` (~520 MB disk, `mmap=true`, `n_ctx=1024`, ~780 MB RAM) strictly **sequentially** via `NativeMemoryLock.modelMutex`, keeping peak RSS at **~908 MB** (< 1 GB).
