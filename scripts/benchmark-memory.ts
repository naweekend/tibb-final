import { performance } from 'perf_hooks';
import { getMemorySnapshot } from '../src/engine/localAiBridge';
import {
  EpisodeInput,
  evaluateCareEpisode,
  verifyAgainstClinicalGroundTruth,
} from '../src/engine/triageEngine';
import whoHomeCare from '../src/data/who_home_care.json';
import diseaseReference from '../src/data/disease_reference.json';
import { DiseaseReferenceCard, HomeCareProtocol } from '../src/engine/triageEngine';

const sampleInput: EpisodeInput = {
  patient: {
    id: 'bench_pat',
    accountId: 'bench_acc',
    name: 'Benchmark Child',
    ageMonths: 24,
    sex: 'M',
    isPregnantOrLactating: false,
    chronicConditions: [],
    allergies: [],
    workspace: 'BHU',
  },
  bodyRegion: 'CHEST',
  durationHours: 24,
  temperatureBand: 'MILD_FEVER',
  hydrationStatus: 'NORMAL',
  vitals: { respiratoryRate: 44, measurementMethod: 'TAP_TIMER' },
  answers: {
    unableToDrink: false,
    vomitsEverything: false,
    convulsions: false,
    lethargicOrUnconscious: false,
    chestIndrawingOrStridor: false,
    crushingChestPain: false,
    strokeFastSigns: false,
    severeShortnessOfBreath: false,
    uncontrolledBleeding: false,
    stiffNeckOrPetechialRash: false,
    pregnancyDangerSigns: false,
    moderateDehydration: false,
    bloodInStoolOrVomit: false,
    burnOrDeepWound: false,
    heatExhaustionSigns: false,
    persistentCoughOver14Days: false,
    primaryComplaint: 'COUGH_COLD',
  },
};

function runBenchmarks() {
  const iterations = 1000;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    evaluateCareEpisode(sampleInput);
  }
  const triageMs = (performance.now() - t0) / iterations;

  const hc = (whoHomeCare as HomeCareProtocol[])[0];
  const ref = (diseaseReference as DiseaseReferenceCard[])[0];
  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    verifyAgainstClinicalGroundTruth('Keep hydrated with clean water and seek care if fever exceeds 48 hours.', {
      ageMonths: 24,
      homeCare: hc,
      diseaseRef: ref,
      triageTier: 'GREEN',
    });
  }
  const auditMs = (performance.now() - t1) / iterations;

  const phases = ['IDLE', 'WHISPER_ACTIVE', 'OCR_ACTIVE', 'QWEN_ACTIVE'] as const;
  const memReport = phases.map((p) => getMemorySnapshot(p));
  const maxRss = Math.max(...memReport.map((m) => m.totalEstimatedRssMb));

  console.log('=== Tibb Clinical & Android <1GB Memory Benchmark ===');
  console.log(`Deterministic Triage Avg Latency (${iterations} runs): ${triageMs.toFixed(4)} ms (Target < 15 ms)`);
  console.log(`Two-Pass Grounding Audit Avg Latency (${iterations} runs): ${auditMs.toFixed(4)} ms`);
  console.log('Android Sequential Memory Phases:');
  for (const m of memReport) {
    console.log(`  - ${m.phase.padEnd(16)} : ${m.totalEstimatedRssMb} MB / ${m.budgetCeilingMb} MB (${m.withinBudget ? 'PASS' : 'OVER'})`);
  }
  console.log(`Peak Sequential RSS: ${maxRss} MB (< 1024 MB budget: ${maxRss < 1024 ? 'PASS' : 'FAIL'})`);

  if (maxRss >= 1024) {
    process.exit(1);
  }
}

runBenchmarks();
