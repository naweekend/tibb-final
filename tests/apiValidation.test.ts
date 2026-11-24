import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { containsPii, createApp } from '../server';

describe('Server PII Scrubber, Security Headers & Clinical Gateway Endpoints', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(() => {
    server?.close();
  });

  it('detects Pakistani CNIC, mobile phone, and email patterns before external AI routing', () => {
    expect(containsPii('My CNIC is 61101-1234567-1')).toBe(true);
    expect(containsPii('Call me at 0300-1234567')).toBe(true);
    expect(containsPii('Call me at +923211234567')).toBe(true);
    expect(containsPii('Email patient@example.com')).toBe(true);
    expect(containsPii('Mild fever for 12 hours')).toBe(false);
  });

  it('serves /api/health with CSP allowing AI Studio preview framing and nosniff header', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://aistudio.google.com');
    expect(res.headers.get('x-frame-options')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('tibb-clinical-gateway');
  });

  it('handles emergency red flags and PII rejection deterministically on /api/agent/chat', async () => {
    const piiRes = await fetch(`${baseUrl}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'My CNIC is 61101-1234567-1 and I have fever',
        locale: 'en',
        personContext: { relationship: 'Self', ageMonths: 300, sex: 'F' },
      }),
    });
    expect(piiRes.status).toBe(400);

    const redRes = await fetch(`${baseUrl}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Severe crushing chest pain radiating to arm',
        locale: 'en',
        personContext: { relationship: 'Father', ageMonths: 660, sex: 'M' },
      }),
    });
    expect(redRes.status).toBe(200);
    const redJson = (await redRes.json()) as {
      status: string;
      triageTier: string;
      engineUsed: string;
      firstAid?: { do_now_en: string[] };
    };
    expect(redJson.status).toBe('EMERGENCY_RED');
    expect(redJson.triageTier).toBe('RED');
    expect(redJson.engineUsed).toBe('DETERMINISTIC_WHO_RED_FLAG');
    expect(redJson.firstAid?.do_now_en.length).toBeGreaterThan(2);
  });

  it('enforces DRAP AMR block & red-flag guard on /api/agent/triage without waiting on LLM', async () => {
    const amrRes = await fetch(`${baseUrl}/api/agent/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can I take Augmentin 625mg for my sore throat?',
        ageMonths: 320,
        sex: 'M',
        locale: 'en',
      }),
    });
    expect(amrRes.status).toBe(200);
    const amrJson = (await amrRes.json()) as { amrBlocked: boolean; engineUsed: string };
    expect(amrJson.amrBlocked).toBe(true);
    expect(amrJson.engineUsed).toBe('DRAP_AMR_GUARD');
  });

  it('returns grounded clinical truths on /api/explain and enforces k-anonymity on /api/telemetry/summary', async () => {
    const explainRes = await fetch(`${baseUrl}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ageMonths: 24,
        triageTier: 'RED',
        homeCareId: null,
        diseaseRefId: 'fever_dengue_typhoid',
      }),
    });
    expect(explainRes.status).toBe(200);
    const explainJson = (await explainRes.json()) as { safety_verified: boolean; explanation_ur: string };
    expect(explainJson.safety_verified).toBe(true);
    expect(explainJson.explanation_ur.length).toBeGreaterThan(5);

    const badWellnessRes = await fetch(`${baseUrl}/api/wellness/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'INVALID_GOAL' }),
    });
    expect(badWellnessRes.status).toBe(400);

    const evtId = '11111111-1111-4111-8111-111111111111';
    const telPost = await fetch(`${baseUrl}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: evtId,
        cohortHash: 'cohort_test_hash_123',
        districtCode: 'Lahore',
        mode: 'GHARANA',
        ageBracket: '18-45y',
        triageTier: 'GREEN',
        symptomCategory: 'FEVER',
        amrBlockTriggered: false,
        referralGenerated: false,
        timestampHour: '2026-11-24T12:00:00Z',
      }),
    });
    expect(telPost.status).toBe(202);

    const telSummary = await fetch(`${baseUrl}/api/telemetry/summary`);
    expect(telSummary.status).toBe(200);
    const summaryJson = (await telSummary.json()) as { kAnonymityThreshold: number; cohorts: unknown[] };
    expect(summaryJson.kAnonymityThreshold).toBe(10);
    expect(summaryJson.cohorts).toEqual([]);
  });
});

