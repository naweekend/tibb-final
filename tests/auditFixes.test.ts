import { describe, expect, it } from 'vitest';
import {
  VERIFIED_HOME_REMEDIES,
  buildPersonalizedPlanOffline,
} from '../src/data/remediesAndPlans';
import { getAvailableDistricts, sortFacilities } from '../src/engine/triageEngine';
import { normalizePersonProfile } from '../src/types/clinical';
import {
  PpgSampleFrame,
  analyzePpgSamples,
  cmToFtIn,
  computeDailyReadinessScore,
  computeSleepDurationHours,
  createStepDetectorState,
  extractBiomarkers,
  formatHeightDisplay,
  formatTime12h,
  formatWeightDisplay,
  ftInToCm,
  getLocalDateKey,
  kgToLbs,
  lbsToKg,
  parse24hTo12h,
  processMotionSample,
  safePercent,
  sanitizeSleepHours,
  sleepHoursToQuality,
  to24hTime,
} from '../src/utils/healthMath';

describe('Tibb 10-Point Audit Fixes Verification', () => {
  it('1. converts weight & height bidirectionally between metric and imperial without rounding drift', () => {
    const startKg = 70;
    const lbs = kgToLbs(startKg);
    expect(lbs).toBeCloseTo(154.3, 1);
    expect(lbsToKg(lbs)).toBeCloseTo(70, 1);
    expect(formatWeightDisplay(70, 'IMPERIAL')).toBe('154.3 lbs');
    expect(formatWeightDisplay(70, 'METRIC')).toBe('70 kg');

    const { feet, inches } = cmToFtIn(175);
    expect(feet).toBe(5);
    expect(inches).toBe(9);
    expect(ftInToCm(5, 9)).toBeCloseTo(175.3, 1);
    expect(formatHeightDisplay(175, 'IMPERIAL')).toBe(`5'9"`);
    expect(formatHeightDisplay(175, 'METRIC')).toBe('175 cm');
  });

  it('2. extracts expanded lab biomarkers cleanly from digital/OCR PDF text', () => {
    const sampleReport = `
      Chughtai Lab Report — Complete Blood Count & Metabolic Panel
      Hemoglobin (Hb): 13.4 g/dL
      Total Leukocyte Count (TLC): 8,200 /uL
      Platelets: 210,000 /uL
      Fasting Blood Sugar: 108 mg/dL
      HbA1c: 6.1 %
      Serum Creatinine: 0.95 mg/dL
      Total Cholesterol: 188 mg/dL
      ALT (SGPT): 32 U/L
    `;
    const parsed = extractBiomarkers(sampleReport);
    expect(parsed.hb).toBe('13.4');
    expect(parsed.wbc).toBe('8200');
    expect(parsed.plt).toBe('210000');
    expect(parsed.fbs).toBe('108');
    expect(parsed.hba1c).toBe('6.1');
    expect(parsed.creatinine).toBe('0.95');
    expect(parsed.cholesterol).toBe('188');
    expect(parsed.altSgpt).toBe('32');

    const unitAnnotated = extractBiomarkers('Hemoglobin g/dL : 12.8   Hb A1c % 6.4');
    expect(unitAnnotated.hb).toBe('12.8');
    expect(unitAnnotated.hba1c).toBe('6.4');
  });

  it('3. exposes broad Pakistani cities/districts & matches custom city or tehsil queries', () => {
    const districts = getAvailableDistricts();
    expect(districts.length).toBeGreaterThanOrEqual(20);
    expect(districts).toContain('Lahore');
    expect(districts).toContain('Karachi');
    expect(districts).toContain('Multan');
    expect(districts).toContain('Quetta');
    expect(districts).toContain('Skardu');

    const sorted = sortFacilities('GREEN', false, undefined, 'Swat');
    expect(sorted.locationRequired).toBe(false);
    expect(sorted.facilities.length).toBeGreaterThanOrEqual(1);
    expect(sorted.facilities[0].district).toBe('Swat');
  });

  it('4. calculates sleep duration across midnight rollovers without garbage on 7h', () => {
    expect(computeSleepDurationHours('23:30', '06:30')).toBe(7);
    expect(computeSleepDurationHours('22:15', '05:45')).toBe(7.5);
    expect(sanitizeSleepHours(7)).toBe(7);
    expect(sanitizeSleepHours(-3)).toBe(0);
    expect(sanitizeSleepHours(29)).toBe(16);
    expect(sanitizeSleepHours('NaN')).toBe(0);
    expect(sleepHoursToQuality(7)).toBe(4);
  });

  it('5. filters stationary drift & drop shocks while counting genuine walking steps', () => {
    const state = createStepDetectorState();
    let steps = 0;

    // 40 samples of stationary phone on desk (1g = 9.81 m/s^2 + small jitter)
    for (let i = 0; i < 40; i++) {
      const jitter = Math.sin(i * 0.7) * 0.08;
      const res = processMotionSample(state, 0.1, 0.2, 9.81 + jitter, 1000 + i * 50, 'NORMAL');
      if (res.stepDetected) steps++;
    }
    expect(steps).toBe(0);

    // Phone drop shock (40 m/s^2 spike) must be rejected
    const dropRes = processMotionSample(state, 20, 25, 25, 4000, 'NORMAL');
    expect(dropRes.stepDetected).toBe(false);

    // Simulate 5 human walking strides (~550ms cadence: peak +2.6 m/s^2 then valley -1.2 m/s^2)
    let t = 5000;
    let counted = 0;
    for (let stride = 0; stride < 5; stride++) {
      // Peak phase
      for (let k = 0; k < 4; k++) {
        t += 65;
        if (processMotionSample(state, 0, 0, 9.81 + 2.8, t, 'NORMAL').stepDetected) counted++;
      }
      // Valley phase
      for (let k = 0; k < 4; k++) {
        t += 65;
        if (processMotionSample(state, 0, 0, 9.81 - 1.5, t, 'NORMAL').stepDetected) counted++;
      }
    }
    expect(counted).toBeGreaterThanOrEqual(4);
    expect(counted).toBeLessThanOrEqual(5);
  });

  it('6 & 7. computes honest 0-100% readiness scores without 40/99 artificial clamping & guards 0/0', () => {
    expect(safePercent(0, 0)).toBe(0);
    expect(safePercent(150, 100)).toBe(100);

    const zeroDay = computeDailyReadinessScore({
      waterMl: 0,
      waterGoalMl: 2500,
      steps: 0,
      stepGoal: 6000,
      sleepHours: 0,
      activeAlarmsCount: 0,
      dueAlarmsCount: 0,
    });
    expect(zeroDay.score).toBe(0);

    const perfectDay = computeDailyReadinessScore({
      waterMl: 2500,
      waterGoalMl: 2500,
      steps: 6500,
      stepGoal: 6000,
      sleepHours: 7.5,
      activeAlarmsCount: 2,
      dueAlarmsCount: 0,
    });
    expect(perfectDay.score).toBe(100);
  });

  it('8. builds diet plans with 3 selectable Desi alternatives per meal slot', () => {
    const profile = normalizePersonProfile(
      {
        id: 'p_diet',
        accountId: 'acc',
        name: 'Ayesha',
        ageMonths: 360,
        sex: 'F',
        isPregnantOrLactating: false,
        chronicConditions: [],
        allergies: [],
        workspace: 'GHARANA',
      },
      'acc'
    );
    const plan = buildPersonalizedPlanOffline(profile, 'WEIGHT_LOSS');
    expect(plan.dietMeals.length).toBeGreaterThanOrEqual(4);
    for (const slot of plan.dietMeals) {
      expect(slot.alternatives?.length).toBe(3);
    }
  });

  it('9. rejects open-air ambient PPG noise (no false 140-180 BPM) and reads Red pulse under flash', () => {
    // Open-air room noise with balanced RGB should be rejected as NO_FINGER
    const roomFrames: PpgSampleFrame[] = Array.from({ length: 300 }, (_, i) => ({
      t: i / 25,
      r: 110 + Math.sin(i * 0.65) * 4, // noisy 155 BPM-like oscillation in room light
      g: 108 + Math.sin(i * 0.65) * 4,
      b: 105 + Math.sin(i * 0.65) * 4,
    }));
    const airResult = analyzePpgSamples(roomFrames);
    expect(airResult.status).toBe('REJECTED');
    if (airResult.status === 'REJECTED') {
      expect(airResult.reason).toBe('NO_FINGER');
    }

    // Valid fingertip under flash: Red carries 72 BPM (1.2 Hz) wave while Green is flat/absorbed by hemoglobin
    const validFrames: PpgSampleFrame[] = Array.from({ length: 450 }, (_, i) => {
      const t = i / 25;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 1.2 + Math.sin(4 * Math.PI * 1.2 * t) * 0.35;
      return {
        t,
        r: 185 + pulse,
        g: 18, // flat absorbed green
        b: 12,
      };
    });
    const validResult = analyzePpgSamples(validFrames);
    expect(validResult.status).toBe('OK');
    if (validResult.status === 'OK') {
      expect(validResult.channelUsed).toBe('RED');
      expect(validResult.bpm).toBeGreaterThanOrEqual(70);
      expect(validResult.bpm).toBeLessThanOrEqual(74);
      expect(validResult.sqi).toBeGreaterThanOrEqual(70);
    }
  });

  it('10. provides comprehensive safety-vetted remedies & lossless 12-hour AM/PM alarm formatting', () => {
    expect(VERIFIED_HOME_REMEDIES.length).toBeGreaterThanOrEqual(12);
    const categories = new Set(VERIFIED_HOME_REMEDIES.map((r) => r.category));
    expect(categories.has('HEAT_SKIN')).toBe(true);
    expect(categories.has('PAIN_RECOVERY')).toBe(true);

    expect(formatTime12h('00:05')).toBe('12:05 AM');
    expect(formatTime12h('12:30')).toBe('12:30 PM');
    expect(formatTime12h('20:15')).toBe('8:15 PM');

    const p = parse24hTo12h('20:15');
    expect(p).toEqual({ hour12: 8, minute: 15, period: 'PM' });
    expect(to24hTime(12, 0, 'AM')).toBe('00:00');
    expect(to24hTime(12, 0, 'PM')).toBe('12:00');
    expect(to24hTime(8, 15, 'PM')).toBe('20:15');
    expect(getLocalDateKey(new Date(2026, 10, 24, 0, 30, 0))).toBe('2026-11-24');
  });
});
