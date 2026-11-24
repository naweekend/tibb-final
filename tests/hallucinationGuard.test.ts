import { describe, expect, it } from 'vitest';
import whoHomeCare from '../src/data/who_home_care.json';
import diseaseReference from '../src/data/disease_reference.json';
import {
  DiseaseReferenceCard,
  HomeCareProtocol,
  verifyAgainstClinicalGroundTruth,
} from '../src/engine/triageEngine';

const feverHomeCare = (whoHomeCare as HomeCareProtocol[]).find((h) => h.id === 'mild_fever')!;
const coughHomeCare = (whoHomeCare as HomeCareProtocol[]).find((h) => h.id === 'mild_cough_cold')!;
const feverRef = (diseaseReference as DiseaseReferenceCard[]).find((d) => d.id === 'fever_dengue_typhoid')!;

describe('Two-Pass Anti-Hallucination Clinical Verifier', () => {
  it('blocks generic antibiotics and Pakistani brand names (DRAP guard)', () => {
    const res1 = verifyAgainstClinicalGroundTruth(
      'Give Amoxicillin 500mg twice daily to clear the fever.',
      { ageMonths: 240, homeCare: feverHomeCare, diseaseRef: feverRef, triageTier: 'GREEN' }
    );
    expect(res1.passed).toBe(false);
    expect(res1.amrBlocked).toBe(true);

    const res2 = verifyAgainstClinicalGroundTruth(
      'Consider Augmentin or Flagyl syrup if fever continues.',
      { ageMonths: 48, homeCare: feverHomeCare, diseaseRef: feverRef, triageTier: 'GREEN' }
    );
    expect(res2.passed).toBe(false);
    expect(res2.amrBlocked).toBe(true);
  });

  it('rejects ungrounded hallucinated numbers or dosages not present in retrieved protocol', () => {
    const res = verifyAgainstClinicalGroundTruth(
      'Drink clean water every 7 hours for 9 days straight.',
      { ageMonths: 240, homeCare: feverHomeCare, diseaseRef: feverRef, triageTier: 'GREEN' }
    );
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.startsWith('UNGROUNDED_NUMBER'))).toBe(true);
  });

  it('blocks honey advice when patient is an infant under 12 months', () => {
    const res = verifyAgainstClinicalGroundTruth(
      'Offer warm liquids and half a teaspoon of honey to soothe the throat.',
      { ageMonths: 8, homeCare: coughHomeCare, diseaseRef: feverRef, triageTier: 'GREEN' }
    );
    expect(res.passed).toBe(false);
    expect(res.violations).toContain('INFANT_HONEY_CONTRAINDICATION');
  });

  it('blocks absolute diagnostic claims like "you have typhoid"', () => {
    const res = verifyAgainstClinicalGroundTruth(
      'Based on your mild fever, you have typhoid fever.',
      { ageMonths: 240, homeCare: feverHomeCare, diseaseRef: feverRef, triageTier: 'AMBER' }
    );
    expect(res.passed).toBe(false);
    expect(res.violations.some((v) => v.startsWith('DIAGNOSTIC_OR_DOSAGE_CLAIM'))).toBe(true);
  });

  it('strips Unicode BiDi override characters and HTML tags while passing grounded guidance', () => {
    const res = verifyAgainstClinicalGroundTruth(
      '<b>Keep hydrated</b> with clean boiled water and stop home care if fever lasts over 48 hours.\u202E',
      { ageMonths: 240, homeCare: feverHomeCare, diseaseRef: feverRef, triageTier: 'GREEN' }
    );
    expect(res.passed).toBe(true);
    expect(res.sanitizedText).not.toContain('<b>');
    expect(res.sanitizedText).not.toContain('\u202E');
  });
});
