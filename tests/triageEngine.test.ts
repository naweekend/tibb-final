import { describe, expect, it } from 'vitest';
import { computeBmiAssessment } from '../src/data/remediesAndPlans';
import {
  EpisodeInput,
  detectEmergencyFromText,
  evaluateCareEpisode,
  evaluateStayHomeVsHospital,
  getEmergencyFirstAid,
  getFacilityAreaAnchors,
  getFastBreathingThreshold,
  interpretBloodPressure,
  interpretBloodSugar,
  sortFacilities,
} from '../src/engine/triageEngine';

function baseInput(ageMonths = 36): EpisodeInput {
  return {
    patient: {
      id: 'pat_test',
      accountId: 'acc_test',
      name: 'Test Patient',
      ageMonths,
      sex: 'F',
      isPregnantOrLactating: false,
      chronicConditions: [],
      allergies: [],
      workspace: 'GHARANA',
    },
    bodyRegion: 'GENERAL_FEVER',
    durationHours: 18,
    temperatureBand: 'MILD_FEVER',
    hydrationStatus: 'NORMAL',
    vitals: { measurementMethod: 'NONE' },
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
      primaryComplaint: 'FEVER',
    },
  };
}

describe('WHO IMCI & ETAT Deterministic Triage Engine', () => {
  it('enforces exact WHO IMCI fast-breathing thresholds by age', () => {
    expect(getFastBreathingThreshold(1)).toBe(60);
    expect(getFastBreathingThreshold(6)).toBe(50);
    expect(getFastBreathingThreshold(36)).toBe(40);
    expect(getFastBreathingThreshold(120)).toBe(30);
  });

  it('triggers RED emergency override with tailored First-Aid on fast breathing in a 3-year-old', () => {
    const input = baseInput(36);
    input.vitals = { respiratoryRate: 44, measurementMethod: 'TAP_TIMER' };
    const result = evaluateCareEpisode(input);
    expect(result.tier).toBe('RED');
    expect(result.matchedHomeCare).toBeNull();
    expect(result.emergencyFirstAid?.id).toBe('BREATHING_DISTRESS');
    expect(result.emergencyFirstAid?.do_now_en.length).toBeGreaterThan(2);
    expect(result.redFlags.some((r) => r.code === 'IMCI_FAST_BREATHING')).toBe(true);
  });

  it('triggers RED override + Cardiac First-Aid on adult crushing chest pain', () => {
    const input = baseInput(480);
    input.answers.crushingChestPain = true;
    const result = evaluateCareEpisode(input);
    expect(result.tier).toBe('RED');
    expect(result.emergencyFirstAid?.id).toBe('CHEST_PAIN');
    expect(result.redFlags.some((r) => r.code === 'ETAT_CHEST_PAIN')).toBe(true);
  });

  it('detects direct text/voice emergencies in English, Urdu, and Roman Urdu', () => {
    expect(detectEmergencyFromText('My father has severe chest pain').category).toBe('CHEST_PAIN');
    expect(detectEmergencyFromText('سینے میں درد اور پسینہ آ رہا ہے').category).toBe('CHEST_PAIN');
    expect(detectEmergencyFromText('Bachay ko jhatkay lag rahay hain').category).toBe('SEIZURE_CONVULSIONS');
    expect(detectEmergencyFromText('Mild runny nose for 1 day').isEmergency).toBe(false);
    expect(getEmergencyFirstAid('CHOKING').do_now_ur.length).toBeGreaterThan(2);
  });

  it('requires explicit user coordinates or district selection before listing hospitals', () => {
    const withoutLocation = sortFacilities('RED', false);
    expect(withoutLocation.locationRequired).toBe(true);
    expect(withoutLocation.facilities).toEqual([]);

    const withDistrict = sortFacilities('RED', false, undefined, 'Rawalpindi');
    expect(withDistrict.locationRequired).toBe(false);
    expect(withDistrict.facilities.length).toBeGreaterThan(0);
    expect(withDistrict.facilities[0].district).toBe('Rawalpindi');

    const withGps = sortFacilities('RED', false, { lat: 33.7, lng: 73.05 });
    expect(withGps.locationRequired).toBe(false);
    expect(typeof withGps.facilities[0].distanceKm).toBe('number');
  });

  it('provides unique offline facility area anchors matching dataset coordinates', () => {
    const anchors = getFacilityAreaAnchors();
    expect(anchors.length).toBeGreaterThan(5);
    const keys = new Set(anchors.map((a) => `${a.district}:${a.tehsil}`));
    expect(keys.size).toBe(anchors.length);
    for (const anchor of anchors) {
      expect(typeof anchor.lat).toBe('number');
      expect(typeof anchor.lng).toBe('number');
      const matched = sortFacilities('RED', false, { lat: anchor.lat, lng: anchor.lng }, anchor.district);
      expect(matched.locationRequired).toBe(false);
      expect(matched.facilities.length).toBeGreaterThan(0);
    }
  });

  it('clearly interprets Upper vs Lower Blood Pressure and Fasting vs Random Blood Sugar', () => {
    expect(interpretBloodPressure(118, 76).status).toBe('NORMAL');
    expect(interpretBloodPressure(186, 112).status).toBe('CRISIS');
    expect(interpretBloodPressure(82, 54).status).toBe('LOW');

    expect(interpretBloodSugar(90, 'FASTING').status).toBe('NORMAL');
    expect(interpretBloodSugar(135, 'FASTING').status).toBe('HIGH');
    expect(interpretBloodSugar(135, 'RANDOM').status).toBe('NORMAL');
    expect(interpretBloodSugar(50, 'RANDOM').status).toBe('LOW');
  });

  it('classifies persistent fever > 48h as AMBER without Red Flags', () => {
    const input = baseInput(120);
    input.durationHours = 72;
    const result = evaluateCareEpisode(input);
    expect(result.tier).toBe('AMBER');
    expect(result.amberReasons.length).toBeGreaterThan(0);
  });

  it('removes honey guidance from mild cough protocol for infants under 12 months', () => {
    const input = baseInput(6);
    input.answers.primaryComplaint = 'COUGH_COLD';
    const result = evaluateCareEpisode(input);
    expect(result.tier).toBe('GREEN');
    const joined = result.matchedHomeCare?.steps_en.join(' ').toLowerCase() ?? '';
    expect(joined.includes('honey')).toBe(false);
  });

  it('evaluates Stay Home vs Hospital thresholds accurately for High BP, Low BP, and Low Sugar', () => {
    const highBpWithOrgan = evaluateStayHomeVsHospital({ bpSystolic: 190, bpDiastolic: 122, hasOrganWarningSigns: true });
    expect(highBpWithOrgan.verdict).toBe('EMERGENCY_1122');

    const highBpNoOrgan = evaluateStayHomeVsHospital({ bpSystolic: 184, bpDiastolic: 112, hasOrganWarningSigns: false });
    expect(highBpNoOrgan.verdict).toBe('RECHECK_AND_CLINIC');

    const lowBpShock = evaluateStayHomeVsHospital({ bpSystolic: 82, bpDiastolic: 50, hasShockSigns: true });
    expect(lowBpShock.verdict).toBe('EMERGENCY_1122');

    const lowBpMild = evaluateStayHomeVsHospital({ bpSystolic: 86, bpDiastolic: 56, hasShockSigns: false });
    expect(lowBpMild.verdict).toBe('STAY_HOME');

    const lowSugarConscious = evaluateStayHomeVsHospital({ bloodGlucoseMgDl: 62, isConsciousAbleToSwallow: true });
    expect(lowSugarConscious.verdict).toBe('RECHECK_AND_CLINIC');
    expect(lowSugarConscious.actionSteps_en.join(' ')).toContain('15g');

    const lowSugarUnconscious = evaluateStayHomeVsHospital({ bloodGlucoseMgDl: 52, isConsciousAbleToSwallow: false });
    expect(lowSugarUnconscious.verdict).toBe('EMERGENCY_1122');
    expect(lowSugarUnconscious.actionSteps_en.join(' ')).toContain('DO NOT force');
  });

  it('computes South Asian BMI & body-mass advice accurately and guards pediatric cases', () => {
    const underweight = computeBmiAssessment(48, 170, 300);
    expect(underweight.category).toBe('UNDERWEIGHT');
    expect(underweight.recommendedDeltaKg).toBeGreaterThan(0);
    expect(underweight.recommendedGoal).toBe('MUSCLE_GAIN');

    const optimal = computeBmiAssessment(62, 170, 300);
    expect(optimal.category).toBe('OPTIMAL');
    expect(optimal.recommendedDeltaKg).toBe(0);
    expect(optimal.recommendedGoal).toBe('BALANCED');

    const overweight = computeBmiAssessment(70, 170, 300);
    expect(overweight.category).toBe('OVERWEIGHT');
    expect(overweight.recommendedDeltaKg).toBeLessThan(0);
    expect(overweight.recommendedGoal).toBe('WEIGHT_LOSS');

    const obese = computeBmiAssessment(82, 170, 300);
    expect(obese.category).toBe('OBESE');
    expect(obese.recommendedDeltaKg).toBeLessThan(0);
    expect(obese.recommendedGoal).toBe('WEIGHT_LOSS');

    const pediatric = computeBmiAssessment(14, 95, 36);
    expect(pediatric.bmi).toBeNull();
    expect(pediatric.category).toBe('UNAVAILABLE');
  });
});
