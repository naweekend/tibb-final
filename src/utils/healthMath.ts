export type UnitSystem = 'METRIC' | 'IMPERIAL';

/**
 * Returns local calendar YYYY-MM-DD (avoids PKT 12AM-5AM UTC rollover mismatch).
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const KG_TO_LBS = 2.20462262185;
const CM_PER_INCH = 2.54;

/**
 * Lossless-friendly weight conversions:
 * Canonical storage is always kg. Display uses 1 decimal place; lbs->kg retains 2 decimal places
 * so toggling units repeatedly does not introduce rounding drift.
 */
export function kgToLbs(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return Math.round(kg * KG_TO_LBS * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  if (!Number.isFinite(lbs) || lbs <= 0) return 0;
  return Math.round((lbs / KG_TO_LBS) * 100) / 100;
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  if (!Number.isFinite(cm) || cm <= 0) return { feet: 0, inches: 0 };
  const totalInches = Math.max(0, Math.round(cm / CM_PER_INCH));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

export function ftInToCm(feet: number, inches: number): number {
  const safeFt = Number.isFinite(feet) ? Math.max(0, feet) : 0;
  const safeIn = Number.isFinite(inches) ? Math.max(0, inches) : 0;
  const totalInches = safeFt * 12 + safeIn;
  if (totalInches <= 0) return 0;
  return Math.round(totalInches * CM_PER_INCH * 10) / 10;
}

export function formatWeightDisplay(weightKg: number | undefined, unit: UnitSystem): string {
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg) || weightKg <= 0) return '--';
  if (unit === 'IMPERIAL') return `${kgToLbs(weightKg)} lbs`;
  return `${Math.round(weightKg * 10) / 10} kg`;
}

export function formatHeightDisplay(heightCm: number | undefined, unit: UnitSystem): string {
  if (typeof heightCm !== 'number' || !Number.isFinite(heightCm) || heightCm <= 0) return '--';
  if (unit === 'IMPERIAL') {
    const { feet, inches } = cmToFtIn(heightCm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(heightCm * 10) / 10} cm`;
}

/**
 * Clamped, division-by-zero-safe percentage helper (0-100 inclusive).
 */
export function safePercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  const pct = Math.round((numerator / denominator) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Sleep duration validation & midnight rollover arithmetic.
 */
export function sanitizeSleepHours(raw: unknown): number {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return 0;
  const clamped = Math.max(0, Math.min(16, num));
  return Math.round(clamped * 10) / 10;
}

export function computeSleepDurationHours(bedTime24: string, wakeTime24: string): number {
  const parseMinutes = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  };

  const bed = parseMinutes(bedTime24);
  const wake = parseMinutes(wakeTime24);
  if (bed === null || wake === null) return 7;
  let diffMin = wake - bed;
  if (diffMin <= 0) diffMin += 24 * 60; // midnight rollover (e.g. 23:30 -> 06:30 = 420m)
  if (diffMin >= 24 * 60) diffMin -= 24 * 60;
  const hrs = Math.min(16, diffMin / 60);
  return Math.round(hrs * 10) / 10;
}

export function sleepHoursToQuality(hours: number): 1 | 2 | 3 | 4 | 5 {
  const h = sanitizeSleepHours(hours);
  if (h < 4.5) return 1;
  if (h < 6) return 2;
  if (h < 6.8) return 3;
  if (h <= 8.5) return 4;
  return 5;
}

export interface ReadinessBreakdown {
  score: number;
  hydrationPct: number;
  stepsPct: number;
  sleepPct: number;
  adherencePct: number;
  hasScheduledAlarms: boolean;
}

/**
 * Honest 0-100% readiness score without artificial 40% floors or 99% caps.
 */
export function computeDailyReadinessScore(input: {
  waterMl: number;
  waterGoalMl: number;
  steps: number;
  stepGoal: number;
  sleepHours: number;
  activeAlarmsCount: number;
  dueAlarmsCount: number;
}): ReadinessBreakdown {
  const hydrationPct = safePercent(Math.max(0, input.waterMl), Math.max(500, input.waterGoalMl));
  const stepsPct = safePercent(Math.max(0, input.steps), Math.max(1000, input.stepGoal));

  const s = sanitizeSleepHours(input.sleepHours);
  let sleepPct = 0;
  if (s >= 7 && s <= 9) {
    sleepPct = 100;
  } else if (s > 0 && s < 7) {
    sleepPct = safePercent(s, 7);
  } else if (s > 9) {
    // Gently penalize oversleeping beyond 9h
    sleepPct = Math.max(55, Math.round(100 - (s - 9) * 10));
  }

  const hasScheduledAlarms = input.activeAlarmsCount > 0;
  const completedAlarms = Math.max(0, input.activeAlarmsCount - Math.max(0, input.dueAlarmsCount));
  const adherencePct = hasScheduledAlarms
    ? safePercent(completedAlarms, input.activeAlarmsCount)
    : 100;

  const weighted = hasScheduledAlarms
    ? hydrationPct * 0.28 + stepsPct * 0.28 + sleepPct * 0.24 + adherencePct * 0.2
    : hydrationPct * 0.35 + stepsPct * 0.35 + sleepPct * 0.3;

  return {
    score: Math.max(0, Math.min(100, Math.round(weighted))),
    hydrationPct,
    stepsPct,
    sleepPct,
    adherencePct,
    hasScheduledAlarms,
  };
}

/**
 * 12-hour AM/PM <-> 24-hour canonical time formatting & conversion.
 */
export function parse24hTo12h(time24h: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time24h || '08:00').trim());
  const hh = m ? Math.max(0, Math.min(23, Number(m[1]))) : 8;
  const mm = m ? Math.max(0, Math.min(59, Number(m[2]))) : 0;
  const period: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return { hour12, minute: mm, period };
}

export function to24hTime(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  const h12 = Math.max(1, Math.min(12, Math.floor(hour12)));
  const min = Math.max(0, Math.min(59, Math.floor(minute)));
  let hh = h12 % 12;
  if (period === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function formatTime12h(time24h: string): string {
  const { hour12, minute, period } = parse24hTo12h(time24h);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * High-pass gravity-filtered peak/valley step detector.
 * Rejects pocket jitter, device tilt, stationary sensor drift, and drop shocks.
 */
export interface StepDetectorState {
  gravityEstimate: number | null;
  smoothBuffer: number[];
  peakArmed: boolean;
  peakValue: number;
  lastStepAtMs: number;
}

export function createStepDetectorState(): StepDetectorState {
  return {
    gravityEstimate: null,
    smoothBuffer: [],
    peakArmed: false,
    peakValue: 0,
    lastStepAtMs: 0,
  };
}

export function processMotionSample(
  state: StepDetectorState,
  x: number,
  y: number,
  z: number,
  nowMs: number,
  sensitivity: 'NORMAL' | 'SENSITIVE' = 'NORMAL'
): { stepDetected: boolean; filteredAcc: number } {
  const mag = Math.sqrt(x * x + y * y + z * z);
  if (!Number.isFinite(mag)) return { stepDetected: false, filteredAcc: 0 };

  if (state.gravityEstimate === null) {
    state.gravityEstimate = mag;
  } else {
    // Slow adaptive gravity baseline tracks phone orientation smoothly
    state.gravityEstimate = state.gravityEstimate * 0.88 + mag * 0.12;
  }

  const linearAcc = mag - state.gravityEstimate;
  state.smoothBuffer.push(linearAcc);
  if (state.smoothBuffer.length > 3) state.smoothBuffer.shift();
  const filteredAcc =
    state.smoothBuffer.reduce((sum, v) => sum + v, 0) / state.smoothBuffer.length;

  const peakThreshold = sensitivity === 'SENSITIVE' ? 1.15 : 1.55;
  const valleyThreshold = sensitivity === 'SENSITIVE' ? -0.35 : -0.5;
  const maxHumanSpike = 24; // Rejects phone drops / violent shaking

  if (Math.abs(filteredAcc) > maxHumanSpike) {
    state.peakArmed = false;
    state.peakValue = 0;
    return { stepDetected: false, filteredAcc };
  }

  if (filteredAcc >= peakThreshold) {
    state.peakArmed = true;
    if (filteredAcc > state.peakValue) state.peakValue = filteredAcc;
    return { stepDetected: false, filteredAcc };
  }

  if (state.peakArmed && filteredAcc <= valleyThreshold) {
    state.peakArmed = false;
    state.peakValue = 0;
    const elapsed = nowMs - state.lastStepAtMs;
    if (state.lastStepAtMs === 0 || (elapsed >= 320 && elapsed <= 1800)) {
      state.lastStepAtMs = nowMs;
      return { stepDetected: true, filteredAcc };
    }
    // Reset cadence anchor after long pause without falsely firing on the first half-shake
    state.lastStepAtMs = nowMs;
  }

  return { stepDetected: false, filteredAcc };
}

/**
 * Optical Camera PPG signal validator & analyzer.
 * Fixes ambient/no-finger 140-180 BPM noise spikes AND torch-darkened green channel rejection.
 */
export interface PpgSampleFrame {
  t: number;
  r: number;
  g: number;
  b: number;
}

export type PpgFrameStatus = 'GOOD_FINGER' | 'NO_FINGER' | 'TOO_DARK' | 'OVEREXPOSED';

export function assessPpgFrameQuality(
  meanR: number,
  meanG: number,
  meanB: number
): PpgFrameStatus {
  if (meanR < 20 && meanG < 15 && meanB < 15) return 'TOO_DARK';
  // Room air / scene without fingertip has substantial blue & balanced green
  if (meanB > 65 && meanR < meanG * 1.2) return 'NO_FINGER';
  if (meanR < meanG * 1.15 && meanR < 95) return 'NO_FINGER';
  if (meanR > 253 && meanG > 250 && meanB > 250) return 'OVEREXPOSED';
  return 'GOOD_FINGER';
}

export type PpgAnalysisOutput =
  | {
      status: 'OK';
      bpm: number;
      sqi: number;
      hrvMs: number;
      channelUsed: 'RED' | 'BLEND';
    }
  | {
      status: 'REJECTED';
      reason: 'TOO_SHORT' | 'NO_FINGER' | 'TOO_DARK' | 'LOW_SIGNAL' | 'NOISY_RHYTHM';
      message: string;
    };

export function analyzePpgSamples(raw: PpgSampleFrame[]): PpgAnalysisOutput {
  if (raw.length < 90) {
    return {
      status: 'REJECTED',
      reason: 'TOO_SHORT',
      message: 'Hold fingertip steadily for at least 15–30 seconds.',
    };
  }

  const totalDur = raw[raw.length - 1].t - raw[0].t;
  if (totalDur < 10) {
    return {
      status: 'REJECTED',
      reason: 'TOO_SHORT',
      message: 'Recording too short. Hold finger gently over rear camera for a full scan.',
    };
  }

  // Reject unplaced / room-air recordings cleanly
  let goodFrames = 0;
  let darkFrames = 0;
  let noFingerFrames = 0;
  for (const frame of raw) {
    const q = assessPpgFrameQuality(frame.r, frame.g, frame.b);
    if (q === 'GOOD_FINGER') goodFrames++;
    else if (q === 'TOO_DARK') darkFrames++;
    else noFingerFrames++;
  }

  if (darkFrames > raw.length * 0.45) {
    return {
      status: 'REJECTED',
      reason: 'TOO_DARK',
      message: 'Lighting too dark. Turn on phone flash/torch or move to brighter light.',
    };
  }
  if (goodFrames < raw.length * 0.65 || noFingerFrames > raw.length * 0.35) {
    return {
      status: 'REJECTED',
      reason: 'NO_FINGER',
      message: 'No steady fingertip contact detected on lens. Gently cover lens & flash without pressing hard.',
    };
  }

  // Uniformly resample at 25 Hz to normalize variable browser requestAnimationFrame jitter
  const targetHz = 25;
  const startT = raw[0].t;
  const numUniform = Math.floor(totalDur * targetHz);
  if (numUniform < 200) {
    return {
      status: 'REJECTED',
      reason: 'TOO_SHORT',
      message: 'Insufficient uniform frames captured. Please retry.',
    };
  }

  const uniformR: number[] = [];
  const uniformG: number[] = [];
  let srcIdx = 0;
  for (let i = 0; i < numUniform; i++) {
    const tTarget = startT + i / targetHz;
    while (srcIdx < raw.length - 2 && raw[srcIdx + 1].t < tTarget) {
      srcIdx++;
    }
    const a = raw[srcIdx];
    const b = raw[Math.min(raw.length - 1, srcIdx + 1)];
    const span = Math.max(1e-6, b.t - a.t);
    const frac = Math.max(0, Math.min(1, (tTarget - a.t) / span));
    uniformR.push(a.r + (b.r - a.r) * frac);
    uniformG.push(a.g + (b.g - a.g) * frac);
  }

  // Pick Red when hemoglobin absorption flattens Green (common under phone flash)
  const calcStats = (arr: number[]) => {
    const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
    const variance = arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length;
    return { mean, variance };
  };
  const rStats = calcStats(uniformR);
  const gStats = calcStats(uniformG);

  const channelUsed: 'RED' | 'BLEND' = gStats.variance < 0.015 || rStats.mean > gStats.mean * 1.4 ? 'RED' : 'BLEND';
  const primarySignal =
    channelUsed === 'RED'
      ? uniformR
      : uniformR.map((rv, i) => rv * 0.65 + uniformG[i] * 0.35);

  // Zero-phase bandpass: remove slow <0.6 Hz drift (win=17 -> 0.68s) & smooth >3 Hz jitter (win=2 -> 0.16s)
  const movingAvg = (arr: number[], halfWin: number): number[] =>
    arr.map((_, idx) => {
      let sum = 0;
      let cnt = 0;
      for (let j = Math.max(0, idx - halfWin); j <= Math.min(arr.length - 1, idx + halfWin); j++) {
        sum += arr[j];
        cnt++;
      }
      return sum / cnt;
    });

  const dcBaseline = movingAvg(primarySignal, 17);
  const detrended = primarySignal.map((v, i) => v - dcBaseline[i]);
  const bandpassed = movingAvg(detrended, 2);

  // Trim 1.0s warmup/settling edges
  const trim = Math.min(25, Math.floor(bandpassed.length * 0.1));
  const clean = bandpassed.slice(trim, bandpassed.length - trim);

  const cleanMean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const cleanStd = Math.sqrt(clean.reduce((acc, v) => acc + (v - cleanMean) ** 2, 0) / clean.length);

  if (cleanStd < 0.008 || cleanStd > 25) {
    return {
      status: 'REJECTED',
      reason: 'LOW_SIGNAL',
      message:
        cleanStd < 0.008
          ? 'Pulse wave too faint. Avoid pressing too hard (which pinches blood flow) and rest finger lightly.'
          : 'Too much finger movement during scan. Rest hand flat on a table and retry.',
    };
  }

  // Adaptive prominence threshold rejects quantization ripple that previously caused 140-180 BPM spikes
  const minAmp = Math.max(0.015, cleanStd * 0.42);
  const minPeakGapSec = 0.38; // max 157 BPM resting optical bound
  const peaks: number[] = [];

  for (let i = 2; i < clean.length - 2; i++) {
    if (
      clean[i] > clean[i - 1] &&
      clean[i] >= clean[i + 1] &&
      clean[i] > clean[i - 2] &&
      clean[i] >= clean[i + 2] &&
      clean[i] > minAmp
    ) {
      const tSec = i / targetHz;
      if (peaks.length === 0 || tSec - peaks[peaks.length - 1] >= minPeakGapSec) {
        peaks.push(tSec);
      } else if (clean[i] > clean[Math.round(peaks[peaks.length - 1] * targetHz)]) {
        // Keep higher peak inside refractory window
        peaks[peaks.length - 1] = tSec;
      }
    }
  }

  if (peaks.length < 6) {
    return {
      status: 'REJECTED',
      reason: 'LOW_SIGNAL',
      message: 'Could not detect 6 clear heartbeats. Keep fingertip still and warm.',
    };
  }

  const rawIbis: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const ibi = peaks[i] - peaks[i - 1];
    if (ibi >= 0.38 && ibi <= 1.45) rawIbis.push(ibi);
  }
  if (rawIbis.length < 4) {
    return {
      status: 'REJECTED',
      reason: 'NOISY_RHYTHM',
      message: 'Irregular motion noise during scan. Try again resting hand steady.',
    };
  }

  // Median-IBI outlier rejection prevents single missed/extra peaks from skewing BPM
  const sortedIbis = [...rawIbis].sort((a, b) => a - b);
  const medianIbi = sortedIbis[Math.floor(sortedIbis.length / 2)];
  const consistentIbis = rawIbis.filter((v) => Math.abs(v - medianIbi) / medianIbi <= 0.25);

  if (consistentIbis.length < Math.max(4, Math.floor(rawIbis.length * 0.55))) {
    return {
      status: 'REJECTED',
      reason: 'NOISY_RHYTHM',
      message: 'Pulse rhythm had motion artifacts. Hold steady or use manual Breath & Pulse Counter.',
    };
  }

  const meanIbi = consistentIbis.reduce((a, b) => a + b, 0) / consistentIbis.length;
  const bpm = Math.round(60 / meanIbi);
  if (bpm < 42 || bpm > 158) {
    return {
      status: 'REJECTED',
      reason: 'NOISY_RHYTHM',
      message: 'Reading outside reliable optical range. Recheck manually with tap counter.',
    };
  }

  const ibiStd = Math.sqrt(
    consistentIbis.reduce((acc, v) => acc + (v - meanIbi) ** 2, 0) / consistentIbis.length
  );
  const consistencyRatio = consistentIbis.length / rawIbis.length;
  const rawSqi = Math.round(consistencyRatio * 100 - (ibiStd / meanIbi) * 115);
  const sqi = Math.max(30, Math.min(98, rawSqi));
  if (sqi < 50) {
    return {
      status: 'REJECTED',
      reason: 'NOISY_RHYTHM',
      message: 'Signal quality too low after motion check. Keep finger lighter over lens.',
    };
  }

  const hrvMs = Math.max(12, Math.min(140, Math.round(ibiStd * 1000)));
  return { status: 'OK', bpm, sqi, hrvMs, channelUsed };
}

export interface ExtractedBiomarkers {
  hb?: string;
  wbc?: string;
  plt?: string;
  fbs?: string;
  hba1c?: string;
  creatinine?: string;
  cholesterol?: string;
  altSgpt?: string;
}

/**
 * Regex-based lab report biomarker extractor supporting CBC, Sugar, HbA1c, KFT, Lipid, and LFT fields.
 */
export function extractBiomarkers(text: string): ExtractedBiomarkers {
  const unitOpt = String.raw`(?:\s*(?:g\/dL|mg\/dL|%|\/uL|\/cmm|U\/L|IU\/L))?`;
  const sep = String.raw`(?:\s*\([^)]+\))?${unitOpt}\s*[:=\-]?\s*`;
  const hbMatch = text.match(
    new RegExp(String.raw`(?:haemoglobin|hemoglobin|hgb|\bhb\b)${sep}(\d{1,2}(?:\.\d{1,2})?)`, 'i')
  );
  const wbcMatch = text.match(
    new RegExp(String.raw`(?:wbc(?:\s*count)?|total\s+leukocyte(?:\s*count)?|\btlc\b)${sep}(\d[\d,]{2,6})`, 'i')
  );
  const pltMatch = text.match(
    new RegExp(String.raw`(?:platelets?(?:\s*count)?|\bplt\b)${sep}(\d[\d,]{3,7})`, 'i')
  );
  const fbsMatch = text.match(
    new RegExp(
      String.raw`(?:fasting\s+(?:blood\s+)?(?:glucose|sugar)|random\s+(?:blood\s+)?(?:glucose|sugar)|\bfbs\b|\brbs\b|blood\s+sugar|glucose)${sep}(\d{2,3}(?:\.\d)?)`,
      'i'
    )
  );
  const hba1cMatch = text.match(
    new RegExp(String.raw`(?:hb\s*a1c|glycated\s+hemoglobin|\ba1c\b)${sep}(\d{1,2}(?:\.\d{1,2})?)`, 'i')
  );
  const creatMatch = text.match(
    new RegExp(String.raw`(?:serum\s+creatinine|creatinine)${sep}(\d(?:\.\d{1,2})?)`, 'i')
  );
  const cholMatch = text.match(
    new RegExp(String.raw`(?:total\s+cholesterol|cholesterol)${sep}(\d{2,3}(?:\.\d)?)`, 'i')
  );
  const altMatch = text.match(
    new RegExp(String.raw`(?:\bsgpt\b|\balt\b|alanine\s+aminotransferase)${sep}(\d{1,4}(?:\.\d)?)`, 'i')
  );

  return {
    hb: hbMatch?.[1],
    wbc: wbcMatch?.[1]?.replace(/,/g, ''),
    plt: pltMatch?.[1]?.replace(/,/g, ''),
    fbs: fbsMatch?.[1],
    hba1c: hba1cMatch?.[1],
    creatinine: creatMatch?.[1],
    cholesterol: cholMatch?.[1],
    altSgpt: altMatch?.[1],
  };
}
