export type AppLocale = 'en' | 'ur' | 'roman';

export interface AppDictionary {
  appName: string;
  tagline: string;
  careMadeSimple: string;
  heroHeadline: string;
  heroSubline: string;
  oneQuestionLabel: string;
  yes: string;
  no: string;
  unsure: string;
  urduAudio: string;
  voiceInput: string;
  recordingStop: string;
  transcribingAudio: string;
  helpMeNow: string;
  gharanaMode: string;
  bhuMode: string;
  sosEmergency: string;
  lockVault: string;
  episodesCountLabel: string;
  navHome: string;
  navCheckup: string;
  navCoach: string;
  navTriage: string;
  navChat: string;
  navRecords: string;
  navVitals: string;
  navLabs: string;
  navAlarms: string;
  navAlarmsReports: string;
  navQueue: string;
  navKit: string;
  // Person Switcher & Onboarding
  addPersonBtn: string;
  activePersonLabel: string;
  editProfileBtn: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  setPinBtn: string;
  offlineEncryptedLabel: string;
  // Multimodal Chat & Calm / Stabilization
  newChatBtn: string;
  liveCameraBtn: string;
  uploadReportBtn: string;
  calmPacerTitle: string;
  calmPacerSubtitle: string;
  farHospitalTitle: string;
  farHospitalSubtitle: string;
  recordsTitle: string;
  recordsSubtitle: string;
  printSummaryBtn: string;
  // Auth
  authHeadline: string;
  authSubline: string;
  authFeature1: string;
  authFeature2: string;
  unlockVaultTitle: string;
  createVaultTitle: string;
  newAccountBtn: string;
  existingAccountsBtn: string;
  selectAccountLabel: string;
  workspaceRoleLabel: string;
  accountNameLabel: string;
  accountNamePlaceholderGharana: string;
  accountNamePlaceholderBhu: string;
  pinLabelCreate: string;
  pinLabelUnlock: string;
  pinPlaceholder: string;
  unlockBtn: string;
  createBtn: string;
  derivingKey: string;
  // Agent & Triage
  agentModeBtn: string;
  structuredCheckupBtn: string;
  agentPromptTitle: string;
  agentPromptPlaceholder: string;
  agentSendBtn: string;
  agentThinking: string;
  agentQuickChipsLabel: string;
  activeEngineCloud: string;
  activeEngineOffline: string;
  resetConversationBtn: string;
  // Result, Emergency First Aid & Location
  redBannerLabel: string;
  redHeadline: string;
  redSubline: string;
  firstAidDoNowTitle: string;
  firstAidDoNotTitle: string;
  firstAidTriggersTitle: string;
  amberBannerLabel: string;
  greenBannerLabel: string;
  homeCareStepsTitle: string;
  verifiedExplanationTitle: string;
  groundTruthVerified: string;
  amrGuardTriggered: string;
  qrSlipTitle: string;
  qrSlipSubline: string;
  locationRequiredTitle: string;
  locationRequiredBody: string;
  useGpsBtn: string;
  locatingGps: string;
  orChooseArea: string;
  allDistrictsOption: string;
  nearestFacilitiesTitle: string;
  callBtn: string;
  startNewCheckupBtn: string;
  followUpPlaceholder: string;
  followUpSubmitBtn: string;
  // Vitals
  vitalsTitle: string;
  vitalsSubtitle: string;
  vitalsTabBpSugar: string;
  vitalsTabTap: string;
  vitalsTabCamera: string;
  upperBpLabel: string;
  upperBpHint: string;
  lowerBpLabel: string;
  lowerBpHint: string;
  bpCombinedLabel: string;
  sugarLabel: string;
  sugarTypeFasting: string;
  sugarTypeRandom: string;
  vitalsSummaryTitle: string;
  analyzeVitalsBtn: string;
  saveVitalsBtn: string;
  vitalsSavedNotice: string;
  breathCounterLabel: string;
  pulseCounterLabel: string;
  tapCircleHint: string;
  resetCounterBtn: string;
  cameraDisclaimer: string;
  startCameraScanBtn: string;
  stopCameraScanBtn: string;
  // Labs, Alarms, Queue, Kit
  labsTitle: string;
  labsSubtitle: string;
  labsUploadLabel: string;
  labsSaveBtn: string;
  labsHistoryTitle: string;
  labsEmptyText: string;
  alarmsTitle: string;
  alarmsSubtitle: string;
  alarmsTestVoiceBtn: string;
  alarmsAddBtn: string;
  alarmsScheduledTitle: string;
  alarmsEmptyText: string;
  alarmsTakenToday: string;
  alarmsMarkTaken: string;
  weeklyDigestTitle: string;
  weeklyDigestSubtitle: string;
  exportPdfBtn: string;
  queueTitle: string;
  queueSubtitle: string;
  queueEpisodesTitle: string;
  queueEmptyText: string;
  queueVerifyTitle: string;
  queueVerifyBtn: string;
  kitTitle: string;
  kitSubtitle: string;
  kitMemoryTitle: string;
  kitBackupTitle: string;
  kitExportBtn: string;
  kitLoadBtn: string;
  kitRestoreBtn: string;
  kitWipeBtn: string;
  kitCommandsTitle: string;
}

export const I18N: Record<AppLocale, AppDictionary> = {
  en: {
    appName: 'Tibb',
    tagline: 'A calmer way to understand yourself.',
    careMadeSimple: 'CARE, MADE SIMPLE.',
    heroHeadline: 'How are you feeling today?',
    heroSubline:
      'Speak or type an emergency immediately for instant first aid, or answer calmly one question at a time.',
    oneQuestionLabel: 'ONE QUESTION AT A TIME',
    yes: 'Yes',
    no: 'No',
    unsure: 'Not Sure',
    urduAudio: 'Urdu audio',
    voiceInput: 'Speak Symptom',
    recordingStop: 'Stop & Transcribe',
    transcribingAudio: 'Transcribing voice...',
    helpMeNow: 'Help Me Now',
    gharanaMode: 'Gharana',
    bhuMode: 'BHU / LHW',
    sosEmergency: 'SOS Emergency',
    lockVault: 'Lock Vault',
    episodesCountLabel: 'Episodes',
    navHome: 'Home',
    navCheckup: 'Checkup & Chat',
    navCoach: 'Diet & Remedies',
    navTriage: 'Guided Form',
    navChat: 'AI Chat',
    navRecords: 'Saved Reports',
    navVitals: 'Vitals & ECG',
    navLabs: 'Lab OCR',
    navAlarms: 'Alarms',
    navAlarmsReports: 'Alarms & Labs',
    navQueue: 'Queue',
    navKit: 'Android Kit',
    addPersonBtn: '+ Add Member / Patient',
    activePersonLabel: 'Active Person',
    editProfileBtn: 'Edit Profile',
    onboardingTitle: 'Add Family Member or Patient',
    onboardingSubtitle:
      'Every member gets strictly separated chats, saved reports, vitals, and medicine logs stored locally on your device.',
    setPinBtn: 'PIN Lock',
    offlineEncryptedLabel: 'Encrypted Local Vault',
    newChatBtn: '+ New Chat',
    liveCameraBtn: 'Live Camera / Video',
    uploadReportBtn: 'Upload Photo / Report',
    calmPacerTitle: 'Cyclic Sighing Breathing Pacer',
    calmPacerSubtitle:
      'Double inhale through nose, then one long slow exhale through mouth to steady heart rate and anxiety.',
    farHospitalTitle: 'Hospital Is Far Away · Stabilization Mode',
    farHospitalSubtitle:
      'Live clinical timers & en-route safety checklists while transport or rescue arrives.',
    recordsTitle: 'Saved Reports, Vitals & Daily Logs',
    recordsSubtitle: 'Strictly scoped to the selected person. Photos strip EXIF GPS tags locally.',
    printSummaryBtn: 'Print / Save PDF Summary',
    authHeadline: 'A calmer way to understand yourself.',
    authSubline:
      'Private health triage for Pakistani households and Basic Health Units. Your profiles, vitals, and lab scans remain encrypted on your device.',
    authFeature1: 'Per-account cryptographic isolation (PBKDF2 600k + AES-GCM-256).',
    authFeature2: 'Instant offline WHO Red-Flag protection plus live Gemini triage agent.',
    unlockVaultTitle: 'Open Local Vault',
    createVaultTitle: 'Create Private Vault',
    newAccountBtn: 'New Account',
    existingAccountsBtn: 'Existing Accounts',
    selectAccountLabel: 'Select Isolated Account',
    workspaceRoleLabel: 'Workspace Role',
    accountNameLabel: 'Account Name',
    accountNamePlaceholderGharana: 'e.g. Khan Family Vault',
    accountNamePlaceholderBhu: 'e.g. Tarnol BHU Station 1',
    pinLabelCreate: 'Create 4 to 8 Digit Vault PIN',
    pinLabelUnlock: 'Enter Vault PIN',
    pinPlaceholder: '4 to 8 digits',
    unlockBtn: 'Access Encrypted Vault',
    createBtn: 'Create & Open Vault',
    derivingKey: 'Deriving AES-256 Key...',
    agentModeBtn: 'Live AI Checkup',
    structuredCheckupBtn: 'Guided Body Map & Form',
    agentPromptTitle: 'Describe symptoms or an emergency directly (Text or Voice)',
    agentPromptPlaceholder:
      'Example: Father has severe chest pain and sweating, or child has fever for 3 days...',
    agentSendBtn: 'Analyze',
    agentThinking: 'Checking WHO safety rules & analyzing...',
    agentQuickChipsLabel: 'Quick check-in',
    activeEngineCloud: 'Live AI Agent: Gemini + WHO Safety Core (Qwen 0.8B ready for Android)',
    activeEngineOffline: 'Offline Mode: WHO Deterministic Safety Core Active',
    resetConversationBtn: 'New Conversation',
    redBannerLabel: 'RED EMERGENCY OVERRIDE · IMMEDIATE ACTION REQUIRED',
    redHeadline: 'Call Emergency Services & Start First Aid Now',
    redSubline: 'Danger signs detected. Follow these verified first-aid steps while going to the hospital.',
    firstAidDoNowTitle: 'Immediate First Aid · What To Do Right Now',
    firstAidDoNotTitle: 'Critical Safety · What NOT To Do',
    firstAidTriggersTitle: 'Triggered Emergency Signs',
    amberBannerLabel: 'AMBER · SAME-DAY CLINIC EVALUATION RECOMMENDED',
    greenBannerLabel: 'GREEN · VERIFIED WHO SUPPORTIVE HOME CARE',
    homeCareStepsTitle: 'Verified Supportive Care & First-Aid Steps',
    verifiedExplanationTitle: 'Double-Checked Explanation (DRAP & WHO Guarded)',
    groundTruthVerified: 'Ground-Truth Verified',
    amrGuardTriggered: 'DRAP Rx Guard Triggered',
    qrSlipTitle: 'Offline QR Referral Slip',
    qrSlipSubline: 'Scannable at receiving BHU, THQ, or hospital emergency desk. Zero PII encoded.',
    locationRequiredTitle: 'Choose location to view nearest hospitals',
    locationRequiredBody:
      'Tibb never uses hardcoded or assumed coordinates. Allow GPS access or choose your district below.',
    useGpsBtn: 'Use My Current Location (GPS)',
    locatingGps: 'Requesting GPS permission...',
    orChooseArea: 'Or choose your city / district:',
    allDistrictsOption: 'Select district / area...',
    nearestFacilitiesTitle: 'Verified Public Hospitals & BHUs',
    callBtn: 'Call',
    startNewCheckupBtn: 'Start New Checkup',
    followUpPlaceholder: 'Ask a follow-up question (medication requests are safely blocked)',
    followUpSubmitBtn: 'Verify & Answer',
    vitalsTitle: 'Easy Vitals & Readings Checker',
    vitalsSubtitle:
      'Clear Upper vs Lower Blood Pressure, Fasting/Random Blood Sugar, guided Breath/Pulse tap counter, and camera pulse.',
    vitalsTabBpSugar: 'BP & Blood Sugar',
    vitalsTabTap: 'Breath & Pulse Counter',
    vitalsTabCamera: 'Camera Finger Pulse',
    upperBpLabel: 'Upper BP (Systolic, top number)',
    upperBpHint: 'Heart pumping pressure (normal ~110 to 120 mmHg)',
    lowerBpLabel: 'Lower BP (Diastolic, bottom number)',
    lowerBpHint: 'Heart resting pressure (normal ~70 to 80 mmHg)',
    bpCombinedLabel: 'Combined Reading',
    sugarLabel: 'Blood Sugar (mg/dL)',
    sugarTypeFasting: 'Fasting (Empty Stomach)',
    sugarTypeRandom: 'Random (After Meal)',
    vitalsSummaryTitle: 'Clear Interpretation Result',
    analyzeVitalsBtn: 'Evaluate Vitals Now',
    saveVitalsBtn: 'Attach Vitals to Checkup',
    vitalsSavedNotice: 'Vitals saved and attached to active checkup.',
    breathCounterLabel: 'Count Breaths (Chest Rise)',
    pulseCounterLabel: 'Count Pulse (Wrist)',
    tapCircleHint: 'Tap once on each breath or heartbeat',
    resetCounterBtn: 'Reset Counter',
    cameraDisclaimer:
      'Wellness & triage estimate only: gently place fingertip over the rear camera and flashlight for 20 seconds without pressing hard.',
    startCameraScanBtn: 'Start 20s Camera Pulse Scan',
    stopCameraScanBtn: 'Stop Scan',
    labsTitle: 'Offline Lab Report OCR',
    labsSubtitle:
      'Printed CBC and blood sugar reports are read locally on your device, with zero photo uploads.',
    labsUploadLabel: 'Select or Capture Lab Slip (PNG/JPG/WebP, max 10 MB)',
    labsSaveBtn: 'Save Lab Values to Encrypted Vault',
    labsHistoryTitle: 'Saved Lab History',
    labsEmptyText: 'No lab reports saved in this account yet.',
    alarmsTitle: 'Medicine Alarms & Weekly Digest',
    alarmsSubtitle:
      'Schedule daily medicine reminders with Urdu voice alerts and export a client-side PDF digest.',
    alarmsTestVoiceBtn: 'Test Urdu Alarm',
    alarmsAddBtn: 'Add Offline Alarm',
    alarmsScheduledTitle: 'Scheduled Reminders & Adherence',
    alarmsEmptyText: 'No medicine reminders added yet.',
    alarmsTakenToday: 'Taken Today',
    alarmsMarkTaken: 'Mark Taken',
    weeklyDigestTitle: 'Weekly Family Health Digest',
    weeklyDigestSubtitle: 'Client-side PDF generated cleanly from your decrypted vault. Zero server upload.',
    exportPdfBtn: 'Export Weekly PDF',
    queueTitle: 'BHU / LHW Walk-In Triage Queue',
    queueSubtitle: 'Active station episodes sorted by urgency with closed-loop QR referral verification.',
    queueEpisodesTitle: 'Triage Episodes',
    queueEmptyText: 'No triage episodes recorded for this filter yet.',
    queueVerifyTitle: 'Verify QR Referral Slip',
    queueVerifyBtn: 'Verify & Complete Referral',
    kitTitle: 'Android APK, Qwen 3.5 0.8B / Whisper Setup & Recovery',
    kitSubtitle:
      'Sequential < 1 GB RAM scheduler for Qwen 3.5 0.8B + Whisper.cpp on Android, encrypted backup, and model download commands.',
    kitMemoryTitle: 'Sequential Model Memory Guard (< 1 GB RAM)',
    kitBackupTitle: 'Encrypted Backup, Restore & Data Wipe',
    kitExportBtn: 'Export Encrypted Backup',
    kitLoadBtn: 'Load .tibb-backup',
    kitRestoreBtn: 'Restore Now',
    kitWipeBtn: 'Permanently Delete Account & Data',
    kitCommandsTitle: 'Download Qwen 3.5 0.8B & Whisper Models + Build Android APK',
  },
  ur: {
    appName: 'طب',
    tagline: 'اپنی صحت کو سمجھنے کا ایک پُرسکون طریقہ۔',
    careMadeSimple: 'صحت کی دیکھ بھال، اب آسان۔',
    heroHeadline: 'آج آپ کی طبیعت کیسی ہے؟',
    heroSubline:
      'ہنگامی حالت میں فوراً آواز یا تحریر کے ذریعے بتائیں تاکہ فوری ابتدائی امداد ملے، یا ایک وقت میں ایک سوال کے ساتھ اطمینان سے معائنہ کریں۔',
    oneQuestionLabel: 'ایک وقت میں ایک سوال',
    yes: 'جی ہاں',
    no: 'نہیں',
    unsure: 'معلوم نہیں',
    urduAudio: 'اُردو آواز',
    voiceInput: 'بول کر بتائیں',
    recordingStop: 'روکیں اور لکھیں',
    transcribingAudio: 'آواز سمجھی جا رہی ہے...',
    helpMeNow: 'فوری مدد حاصل کریں',
    gharanaMode: 'گھرانہ',
    bhuMode: 'مرکزِ صحت',
    sosEmergency: 'ہنگامی مدد',
    lockVault: 'والٹ لاک',
    episodesCountLabel: 'معائنے',
    navHome: 'ہوم',
    navCheckup: 'معائنہ و چیٹ',
    navCoach: 'غذا و ورزش',
    navTriage: 'تفصیلی فارم',
    navChat: 'اے آئی چیٹ',
    navRecords: 'محفوظ ریکارڈ',
    navVitals: 'نبض و بی پی',
    navLabs: 'لیب رپورٹ',
    navAlarms: 'دوا الارم',
    navAlarmsReports: 'الارم و رپورٹس',
    navQueue: 'مریض قطار',
    navKit: 'اینڈرائیڈ کٹ',
    addPersonBtn: '+ نیا فرد / مریض',
    activePersonLabel: 'منتخب فرد',
    editProfileBtn: 'پروفائل ترمیم',
    onboardingTitle: 'خاندان کا فرد یا مریض شامل کریں',
    onboardingSubtitle:
      'ہر فرد کی چیٹ، لیب رپورٹس، دوائیں اور بلڈ پریشر کا ریکارڈ الگ اور مکمل طور پر محفوظ رکھا جاتا ہے۔',
    setPinBtn: 'پِن لاک',
    offlineEncryptedLabel: 'محفوظ آف لائن والٹ',
    newChatBtn: '+ نئی چیٹ',
    liveCameraBtn: 'لائیو کیمرہ / ویڈیو',
    uploadReportBtn: 'رپورٹ یا تصویر لگائیں',
    calmPacerTitle: 'پُرسکون سانس کی مشق (Cyclic Sighing)',
    calmPacerSubtitle:
      'ناک سے دو بار گہرا سانس اندر لیں اور منہ سے آہستہ لمبا سانس باہر نکالیں تاکہ گھبراہٹ کم ہو۔',
    farHospitalTitle: 'ہسپتال دور ہونے کی صورت میں فوری سنبھالنے کا موڈ',
    farHospitalSubtitle:
      'ایمبولینس یا ہسپتال پہنچنے تک لائیو ٹائمرز اور حفاظتی چیک لسٹ کا استعمال کریں۔',
    recordsTitle: 'محفوظ رپورٹس، بلڈ پریشر اور روزانہ ریکارڈ',
    recordsSubtitle: 'صرف منتخب فرد کا ذاتی ریکارڈ۔ تمام تصاویر سے GPS معلومات فون پر ہی حذف کی جاتی ہیں۔',
    printSummaryBtn: 'پرنٹ / پی ڈی ایف خلاصہ',
    authHeadline: 'اپنی صحت کو سمجھنے کا ایک پُرسکون طریقہ۔',
    authSubline:
      'پاکستانی گھروں اور بنیادی مراکزِ صحت کے لیے محفوظ طبی رہنمائی۔ آپ کا تمام ریکارڈ صرف آپ کے فون میں انکرپٹ ہو کر محفوظ رہتا ہے۔',
    authFeature1: 'ہر اکاؤنٹ کے لیے علیحدہ انکرپشن (PBKDF2 + AES-GCM-256)۔',
    authFeature2: 'فوری آف لائن خطرے کی شناخت اور جیمنائی لائیو طبی ایجنٹ۔',
    unlockVaultTitle: 'محفوظ والٹ کھولیں',
    createVaultTitle: 'نیا محفوظ والٹ بنائیں',
    newAccountBtn: 'نیا اکاؤنٹ',
    existingAccountsBtn: 'موجودہ اکاؤنٹس',
    selectAccountLabel: 'اپنا اکاؤنٹ منتخب کریں',
    workspaceRoleLabel: 'استعمال کی نوعیت',
    accountNameLabel: 'اکاؤنٹ کا نام',
    accountNamePlaceholderGharana: 'مثلاً خان فیملی والٹ',
    accountNamePlaceholderBhu: 'مثلاً ترنول بی ایچ یو سٹیشن',
    pinLabelCreate: '4 سے 8 ہندسوں کا پِن کوڈ بنائیں',
    pinLabelUnlock: 'اپنا پِن کوڈ درج کریں',
    pinPlaceholder: '4 سے 8 ہندسے',
    unlockBtn: 'والٹ کھولیں',
    createBtn: 'والٹ بنائیں اور کھولیں',
    derivingKey: 'والٹ کھولا جا رہا ہے...',
    agentModeBtn: 'لائیو اے آئی معائنہ',
    structuredCheckupBtn: 'جسمانی نقشہ اور فارم',
    agentPromptTitle: 'تکلیف یا ہنگامی حالت فوراً لکھیں یا بول کر بتائیں',
    agentPromptPlaceholder:
      'مثال: والد کے سینے میں شدید درد اور پسینہ آ رہا ہے، یا بچے کو 3 دن سے بخار ہے...',
    agentSendBtn: 'فوری تجزیہ',
    agentThinking: 'طبی اصولوں اور علامات کا تجزیہ جاری ہے...',
    agentQuickChipsLabel: 'فوری انتخاب',
    activeEngineCloud: 'لائیو ایجنٹ: جیمنائی + ڈبلیو ایچ او حفاظتی نظام (اینڈرائیڈ پر Qwen 0.8B تیار)',
    activeEngineOffline: 'آف لائن نظام: مستند ڈبلیو ایچ او حفاظتی اصول فعال',
    resetConversationBtn: 'نئی گفتگو شروع کریں',
    redBannerLabel: 'انتہائی ہنگامی انتباہ · فوری عمل درکار',
    redHeadline: 'فوری ایمرجنسی کال کریں اور نیچے دی گئی ابتدائی امداد شروع کریں',
    redSubline: 'خطرے کی علامات ظاہر ہوئی ہیں۔ ہسپتال پہنچنے تک فوری احتیاطی اور امدادی اقدامات کریں۔',
    firstAidDoNowTitle: 'فوری ابتدائی طبی امداد — ابھی کیا کریں',
    firstAidDoNotTitle: 'اہم احتیاط — ہرگز یہ نہ کریں',
    firstAidTriggersTitle: 'ظاہر ہونے والی خطرناک علامات',
    amberBannerLabel: 'نارنجی الرٹ · آج ہی ڈاکٹر یا کلینک سے معائنہ کروائیں',
    greenBannerLabel: 'سبز درجہ · گھر پر مستند ڈبلیو ایچ او حفاظتی دیکھ بھال',
    homeCareStepsTitle: 'مستند گھریلو دیکھ بھال اور ابتدائی امداد کے مراحل',
    verifiedExplanationTitle: 'دوہری جانچ شدہ وضاحت (بغیر کسی اندازے کے)',
    groundTruthVerified: 'طبی حقائق سے تصدیق شدہ',
    amrGuardTriggered: 'غیر ضروری دوا کی تجویز روک دی گئی',
    qrSlipTitle: 'آف لائن کیو آر ریفرل سلپ',
    qrSlipSubline: 'قریبی ہسپتال یا بی ایچ یو پر انٹرنیٹ کے بغیر سکین کی جا سکتی ہے۔',
    locationRequiredTitle: 'قریبی ہسپتال دیکھنے کے لیے اپنی لوکیشن بتائیں',
    locationRequiredBody:
      'ہم آپ کی اجازت کے بغیر کوئی فرضی لوکیشن استعمال نہیں کرتے۔ جی پی ایس کی اجازت دیں یا اپنا ضلع منتخب کریں۔',
    useGpsBtn: 'میری موجودہ لوکیشن (GPS) استعمال کریں',
    locatingGps: 'لوکیشن حاصل کی جا رہی ہے...',
    orChooseArea: 'یا اپنا شہر / ضلع منتخب کریں:',
    allDistrictsOption: 'ضلع یا علاقہ منتخب کریں...',
    nearestFacilitiesTitle: 'مستند سرکاری ہسپتال اور مراکزِ صحت',
    callBtn: 'کال کریں',
    startNewCheckupBtn: 'نیا معائنہ شروع کریں',
    followUpPlaceholder: 'مزید سوال پوچھیں (اینٹی بائیوٹک کی تجویز خودکار طور پر روکی جاتی ہے)',
    followUpSubmitBtn: 'تصدیق اور جواب',
    vitalsTitle: 'آسان بلڈ پریشر، شوگر اور نبض چیکر',
    vitalsSubtitle:
      'اوپر اور نیچے والے بلڈ پریشر، نہار منہ/کھانے کے بعد شوگر، سانس گننے اور کیمرہ نبض کی واضح جانچ۔',
    vitalsTabBpSugar: 'بلڈ پریشر اور شوگر',
    vitalsTabTap: 'سانس اور نبض گنیں',
    vitalsTabCamera: 'کیمرہ سے نبض چیک',
    upperBpLabel: 'اوپر والا بلڈ پریشر (Systolic — بڑا نمبر)',
    upperBpHint: 'دل کے پمپ کرنے کا دباؤ (نارمل تقریباً 110 تا 120)',
    lowerBpLabel: 'نیچے والا بلڈ پریشر (Diastolic — چھوٹا نمبر)',
    lowerBpHint: 'دل کے آرام کی حالت کا دباؤ (نارمل تقریباً 70 تا 80)',
    bpCombinedLabel: 'مکمل ریڈنگ',
    sugarLabel: 'خون میں شوگر (mg/dL)',
    sugarTypeFasting: 'نہار منہ (Fasting)',
    sugarTypeRandom: 'کھانے کے بعد (Random)',
    vitalsSummaryTitle: 'آپ کی جانچ کا واضح نتیجہ',
    analyzeVitalsBtn: 'ان ریڈنگز کا طبی تجزیہ کریں',
    saveVitalsBtn: 'ریڈنگز معائنے میں شامل کریں',
    vitalsSavedNotice: 'ریڈنگز محفوظ ہو گئیں اور معائنے میں شامل کر دی گئیں۔',
    breathCounterLabel: 'سانس گنیں (سینے کا اُٹھنا)',
    pulseCounterLabel: 'نبض گنیں (کلائی پر)',
    tapCircleHint: 'ہر سانس یا دھڑکن پر دائرے کو دبائیں',
    resetCounterBtn: 'دوبارہ گنیں',
    cameraDisclaimer:
      'صرف اندازے کے لیے: پیچھے والے کیمرے اور فلیش پر انگلی نرمی سے 20 سیکنڈ تک رکھیں۔ زیادہ دباؤ نہ ڈالیں۔',
    startCameraScanBtn: '20 سیکنڈ کیمرہ نبض سکین شروع کریں',
    stopCameraScanBtn: 'سکین روکیں',
    labsTitle: 'آف لائن لیب رپورٹ سکینر',
    labsSubtitle: 'سی بی سی اور شوگر کی رپورٹ فون کے اندر ہی پڑھی جاتی ہے—کوئی تصویر سرور پر نہیں جاتی۔',
    labsUploadLabel: 'لیب رپورٹ کی تصویر منتخب کریں (PNG/JPG/WebP، زیادہ سے زیادہ 10 ایم بی)',
    labsSaveBtn: 'لیب ریکارڈ محفوظ والٹ میں شامل کریں',
    labsHistoryTitle: 'محفوظ لیب ریکارڈ',
    labsEmptyText: 'اس اکاؤنٹ میں ابھی کوئی لیب رپورٹ محفوظ نہیں ہے۔',
    alarmsTitle: 'دوا کے الارم اور ہفتہ وار رپورٹ',
    alarmsSubtitle: 'اُردو آواز کے ساتھ دوا کی یاددہانی لگائیں اور ہفتہ وار پی ڈی ایف بنائیں۔',
    alarmsTestVoiceBtn: 'اُردو آواز چیک کریں',
    alarmsAddBtn: 'نیا آف لائن الارم لگائیں',
    alarmsScheduledTitle: 'مقررہ الارم اور پابندی',
    alarmsEmptyText: 'ابھی تک کوئی دوا کا الارم شامل نہیں کیا گیا۔',
    alarmsTakenToday: 'آج لے لی',
    alarmsMarkTaken: 'لی گئی نشان لگائیں',
    weeklyDigestTitle: 'ہفتہ وار خاندانی صحت رپورٹ',
    weeklyDigestSubtitle: 'آپ کے فون میں محفوظ ڈیٹا سے فوری پی ڈی ایف تیار ہوتی ہے۔',
    exportPdfBtn: 'ہفتہ وار پی ڈی ایف بنائیں',
    queueTitle: 'بنیادی مرکزِ صحت (BHU) مریض قطار',
    queueSubtitle: 'ہنگامی ترجیح کے لحاظ سے مریضوں کی فہرست اور کیو آر ریفرل تصدیق۔',
    queueEpisodesTitle: 'معائنے کا ریکارڈ',
    queueEmptyText: 'اس درجے میں ابھی کوئی مریض موجود نہیں۔',
    queueVerifyTitle: 'کیو آر ریفرل سلپ کی تصدیق',
    queueVerifyBtn: 'ریفرل مکمل کریں',
    kitTitle: 'اینڈرائیڈ ایپ، Qwen 3.5 0.8B / Whisper ماڈلز اور بیک اپ',
    kitSubtitle:
      '2 سے 4 جی بی ریم والے اینڈرائیڈ فونز میں 1 جی بی سے کم میموری میں چلانے کا مکمل نظام اور بیک اپ۔',
    kitMemoryTitle: '1 جی بی سے کم ریم میموری کنٹرول',
    kitBackupTitle: 'انکرپٹڈ بیک اپ، بحالی اور مکمل صفائی',
    kitExportBtn: 'محفوظ بیک اپ ڈاؤن لوڈ کریں',
    kitLoadBtn: 'بیک اپ فائل منتخب کریں',
    kitRestoreBtn: 'بحال کریں',
    kitWipeBtn: 'اکاؤنٹ اور ڈیٹا مستقل حذف کریں',
    kitCommandsTitle: 'Qwen 3.5 0.8B اور Whisper ماڈلز ڈاؤن لوڈ اور اینڈرائیڈ APK بنانے کی کمانڈز',
  },
  roman: {
    appName: 'Tibb',
    tagline: 'Apni sehat ko samajhnay ka aik pur-sukoon tariqa.',
    careMadeSimple: 'SEHAT KI HIFAZAT, ASAAN.',
    heroHeadline: 'Aaj aap kaisa mehsoos kar rahay hain?',
    heroSubline:
      'Emergency mein foran bol kar ya likh kar batayein taake ibtidai imdad mile, ya aik waqt mein aik sawal se checkup karein.',
    oneQuestionLabel: 'AIK WAQT MEIN AIK SAWAL',
    yes: 'Jee Haan',
    no: 'Nahi',
    unsure: 'Maloom Nahi',
    urduAudio: 'Urdu audio',
    voiceInput: 'Bol Kar Batayein',
    recordingStop: 'Rokein aur Likhein',
    transcribingAudio: 'Awaaz samjhi ja rahi hai...',
    helpMeNow: 'Fori Madad Lein',
    gharanaMode: 'Gharana',
    bhuMode: 'BHU / LHW',
    sosEmergency: 'Hangami Madad',
    lockVault: 'Vault Lock',
    episodesCountLabel: 'Checkups',
    navHome: 'Home',
    navCheckup: 'Checkup & Chat',
    navCoach: 'Ghaza & Fit',
    navTriage: 'Guided Form',
    navChat: 'AI Chat',
    navRecords: 'Saved Reports',
    navVitals: 'Vitals & ECG',
    navLabs: 'Lab OCR',
    navAlarms: 'Alarms',
    navAlarmsReports: 'Alarms & Labs',
    navQueue: 'Queue',
    navKit: 'Android Kit',
    addPersonBtn: '+ Naya Fard / Mareez',
    activePersonLabel: 'Active Fard',
    editProfileBtn: 'Profile Badlein',
    onboardingTitle: 'Khandan Ka Fard Ya Mareez Shamil Karein',
    onboardingSubtitle:
      'Har fard ki chat, saved reports, BP/sugar aur dawaon ka record alag aur encrypted rakha jata hai.',
    setPinBtn: 'PIN Lock',
    offlineEncryptedLabel: 'Mehfooz Offline Vault',
    newChatBtn: '+ Nayi Chat',
    liveCameraBtn: 'Live Camera / Video',
    uploadReportBtn: 'Photo / Report Lagayein',
    calmPacerTitle: 'Pur-Sukoon Saans Ki Mashq (Cyclic Sighing)',
    calmPacerSubtitle:
      'Naak se do baar gehra saans andar lein aur munh se aahista lamba saans bahar nikalein.',
    farHospitalTitle: 'Haspatal Door Hai — En-Route Stabilization Mode',
    farHospitalSubtitle:
      'Ambulance ya haspatal pohanchnay tak live timers aur hifazati steps follow karein.',
    recordsTitle: 'Mehfooz Reports, BP/Sugar Aur Daily Logs',
    recordsSubtitle: 'Sirf is fard ka alag record. Tasweeron se GPS location tag phone par hi remove hota hai.',
    printSummaryBtn: 'Print / PDF Summary',
    authHeadline: 'Apni sehat ko samajhnay ka pur-sukoon tariqa.',
    authSubline:
      'Pakistani gharon aur BHUs ke liye offline tibbi rehnumai. Tamam data sirf aap ke phone mein encrypted rehta hai.',
    authFeature1: 'Har account ke liye alag PBKDF2 + AES-GCM-256 encryption.',
    authFeature2: 'Fori offline Red-Flag hifazat aur Gemini live triage agent.',
    unlockVaultTitle: 'Mehfooz Vault Kholein',
    createVaultTitle: 'Naya Vault Banayein',
    newAccountBtn: 'Naya Account',
    existingAccountsBtn: 'Maujooda Accounts',
    selectAccountLabel: 'Account Chunein',
    workspaceRoleLabel: 'Workspace Role',
    accountNameLabel: 'Account Ka Naam',
    accountNamePlaceholderGharana: 'Maslan Khan Family Vault',
    accountNamePlaceholderBhu: 'Maslan Tarnol BHU Station 1',
    pinLabelCreate: '4–8 Hindson Ka PIN Banayein',
    pinLabelUnlock: 'Vault PIN Darj Karein',
    pinPlaceholder: '4 se 8 hindse',
    unlockBtn: 'Vault Kholein',
    createBtn: 'Vault Banayein',
    derivingKey: 'Vault Khul Raha Hai...',
    agentModeBtn: 'Live AI Checkup',
    structuredCheckupBtn: 'Body Map Aur Form',
    agentPromptTitle: 'Apni takleef ya emergency seedha likhein ya bolein',
    agentPromptPlaceholder: 'Maslan: Walid ke seenay mein tez dard hai aur paseena aa raha hai...',
    agentSendBtn: 'Fori Check',
    agentThinking: 'WHO rules aur alamat check ho rahi hain...',
    agentQuickChipsLabel: 'Fori Intikhab',
    activeEngineCloud: 'Live AI Agent: Gemini + WHO Safety Core (Android par Qwen 0.8B ready)',
    activeEngineOffline: 'Offline Mode: WHO Rules Active',
    resetConversationBtn: 'Nayi Guftugu Shuru Karein',
    redBannerLabel: 'RED EMERGENCY OVERRIDE · FORI AMAL KAREIN',
    redHeadline: 'Fori 1122 Call Karein Aur Ibtidai Imdad Shuru Karein',
    redSubline: 'Khatray ki alamat mili hain. Haspatal janay ke sath neechay diye gaye steps follow karein.',
    firstAidDoNowTitle: 'Fori Ibtidai Imdad — Abhi Kya Karein',
    firstAidDoNotTitle: 'Zaroori Ehtiyat — Yeh Hargiz Na Karein',
    firstAidTriggersTitle: 'Zahir Honay Wali Khatarnak Alamat',
    amberBannerLabel: 'AMBER · AAJ HI DOCTOR YA CLINIC DIKHAYEIN',
    greenBannerLabel: 'GREEN · GHAR PAR WHO HIFAZATI DEKHBHAL',
    homeCareStepsTitle: 'Mustanad Gharelu Dekhbhal Aur Ibtidai Imdad',
    verifiedExplanationTitle: 'Dohri Tasdeeq Shuda Wazahat',
    groundTruthVerified: 'Tasdeeq Shuda',
    amrGuardTriggered: 'Ghair Zaroori Dawa Block Ki Gayi',
    qrSlipTitle: 'Offline QR Referral Slip',
    qrSlipSubline: 'BHU ya haspatal desk par internet ke baghair scan ho sakti hai.',
    locationRequiredTitle: 'Qareebi haspatal dekhnay ke liye location dein',
    locationRequiredBody: 'Baghair ijazat location istemal nahi hoti. GPS allow karein ya apna zila chunein.',
    useGpsBtn: 'Meri Maujooda Location (GPS) Lein',
    locatingGps: 'GPS location li ja rahi hai...',
    orChooseArea: 'Ya apna shehar / zila chunein:',
    allDistrictsOption: 'Zila ya ilaka chunein...',
    nearestFacilitiesTitle: 'Qareebi Sarkari Haspatal',
    callBtn: 'Call',
    startNewCheckupBtn: 'Naya Muaina Shuru Karein',
    followUpPlaceholder: 'Mazeed sawal poochein (antibiotics tajweez nahi ki jaati)',
    followUpSubmitBtn: 'Tasdeeq Aur Jawab',
    vitalsTitle: 'Asaan BP, Sugar Aur Nabz Checker',
    vitalsSubtitle: 'Oopar aur neechay wala BP, sugar, saans ginti aur camera pulse.',
    vitalsTabBpSugar: 'BP aur Sugar',
    vitalsTabTap: 'Saans / Nabz Counter',
    vitalsTabCamera: 'Camera Pulse',
    upperBpLabel: 'Oopar Wala BP (Systolic — bara number)',
    upperBpHint: 'Dil ke pump karnay ka dabao (normal 110–120)',
    lowerBpLabel: 'Neechay Wala BP (Diastolic — chota number)',
    lowerBpHint: 'Dil ke aaram ka dabao (normal 70–80)',
    bpCombinedLabel: 'Mukammal Reading',
    sugarLabel: 'Blood Sugar (mg/dL)',
    sugarTypeFasting: 'Nehaar Munh (Fasting)',
    sugarTypeRandom: 'Khaanay Ke Baad (Random)',
    vitalsSummaryTitle: 'Aap Ki Readings Ka Natija',
    analyzeVitalsBtn: 'In Readings Ko Check Karein',
    saveVitalsBtn: 'Checkup Mein Shamil Karein',
    vitalsSavedNotice: 'Readings mehfooz kar li gayi hain.',
    breathCounterLabel: 'Saans Ginein (Seena Uthna)',
    pulseCounterLabel: 'Nabz Ginein (Kalai Par)',
    tapCircleHint: 'Har saans ya dhadkan par tap karein',
    resetCounterBtn: 'Dobara Ginein',
    cameraDisclaimer: 'Sirf andazay ke liye: Ungli narmi se camera aur flash par 20 second rakhein.',
    startCameraScanBtn: '20s Camera Pulse Shuru Karein',
    stopCameraScanBtn: 'Scan Rokein',
    labsTitle: 'Offline Lab Report OCR',
    labsSubtitle: 'Printed lab slip phone ke andar hi scan karein—upload nahi hoti.',
    labsUploadLabel: 'Lab Report Image Chunein (PNG/JPG/WebP, max 10 MB)',
    labsSaveBtn: 'Lab Values Vault Mein Save Karein',
    labsHistoryTitle: 'Mehfooz Lab History',
    labsEmptyText: 'Abhi koi lab report save nahi hai.',
    alarmsTitle: 'Dawa Alarms Aur Weekly Report',
    alarmsSubtitle: 'Urdu awaaz alarm lagayein aur weekly PDF export karein.',
    alarmsTestVoiceBtn: 'Urdu Awaaz Check Karein',
    alarmsAddBtn: 'Naya Offline Alarm Lagayein',
    alarmsScheduledTitle: 'Muqarrar Alarms Aur Record',
    alarmsEmptyText: 'Abhi koi alarm nahi lagaya gaya.',
    alarmsTakenToday: 'Aaj Le Li',
    alarmsMarkTaken: 'Le Li Mark Karein',
    weeklyDigestTitle: 'Weekly Family Health Digest',
    weeklyDigestSubtitle: 'Encrypted vault se seedha PDF tayar hoti hai.',
    exportPdfBtn: 'Weekly PDF Banayein',
    queueTitle: 'BHU / LHW Walk-In Triage Queue',
    queueSubtitle: 'Urgency ke mutabiq mareezon ki list aur QR referral verify karein.',
    queueEpisodesTitle: 'Triage Episodes',
    queueEmptyText: 'Is filter mein koi mareez nahi.',
    queueVerifyTitle: 'Verify QR Referral Slip',
    queueVerifyBtn: 'Referral Complete Karein',
    kitTitle: 'Android APK, Qwen 3.5 0.8B / Whisper Aur Backup',
    kitSubtitle: '1 GB se kam RAM mein chalnay wala Android system aur encrypted backup.',
    kitMemoryTitle: 'Sequential Model Memory Guard (< 1 GB RAM)',
    kitBackupTitle: 'Encrypted Backup, Restore Aur Data Wipe',
    kitExportBtn: 'Encrypted Backup Download Karein',
    kitLoadBtn: '.tibb-backup Load Karein',
    kitRestoreBtn: 'Restore Karein',
    kitWipeBtn: 'Account Hamesha Ke Liye Delete Karein',
    kitCommandsTitle: 'Qwen 3.5 0.8B / Whisper Download Aur Android APK Commands',
  },
};

export const UI_STRINGS = I18N;

export const URDU_AUDIO_SCRIPTS = {
  medicineReminder: 'دوا کا وقت ہو گیا ہے۔ براہِ کرم مقررہ وقت پر دوا لیں۔',
  emergencyRedirect:
    'خطرے کی علامت ظاہر ہوئی ہے۔ فوری طور پر قریبی ہسپتال جائیں یا 1122 پر کال کریں۔ دی گئی ابتدائی امداد پر عمل کریں۔',
  greenHomeCare: 'کوئی فوری خطرہ نہیں پایا گیا۔ دی گئی حفاظتی ہدایات پر عمل کریں۔',
};
