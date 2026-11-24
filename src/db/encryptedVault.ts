import Dexie, { Table } from 'dexie';
import { z } from 'zod';
import { PatientProfile, TriageTier } from '../engine/triageEngine';

export interface AccountRecord {
  accountId: string;
  displayName: string;
  role: 'GHARANA' | 'BHU';
  saltB64: string;
  verifierB64: string;
  failedAttempts: number;
  lockedUntilMs: number;
  createdAtIso: string;
}

export interface EncryptedBlobRow {
  id: string;
  accountId: string;
  kind: 'PROFILE' | 'EPISODE' | 'LAB' | 'ALARM' | 'THREAD' | 'REPORT' | 'WELLNESS';
  ivB64: string;
  cipherB64: string;
  updatedAtIso: string;
}

export interface TelemetryOutboxRow {
  eventId: string;
  cohortHash: string;
  districtCode: string;
  mode: 'GHARANA' | 'BHU';
  ageBracket: string;
  triageTier: TriageTier;
  symptomCategory: string;
  amrBlockTriggered: boolean;
  referralGenerated: boolean;
  referralCompleted: boolean;
  referralToken?: string;
  timestampHour: string;
  synced: number;
}

export interface AuditLogRow {
  id?: number;
  accountId: string;
  action: string;
  detail: string;
  timestampIso: string;
}

export interface StoredEpisode {
  id: string;
  patientId: string;
  patientName: string;
  ageMonths: number;
  createdAtIso: string;
  triageTier: TriageTier;
  redFlagCodes: string[];
  symptomCategory: string;
  respiratoryRate?: number;
  heartRate?: number;
  referralToken: string;
  facilityName: string;
  referralCompleted: boolean;
}

export interface StoredLabRecord {
  id: string;
  patientId: string;
  scannedAtIso: string;
  hemoglobin?: string;
  wbc?: string;
  platelets?: string;
  fastingGlucose?: string;
  hba1c?: string;
  creatinine?: string;
  cholesterol?: string;
  altSgpt?: string;
  sourceFileType?: 'IMAGE' | 'PDF' | 'MANUAL';
  excerpt: string;
}

export type ReminderKind = 'MEDICINE' | 'EXERCISE' | 'VITALS' | 'REPORT_FOLLOWUP' | 'DOCTOR_CHECKUP';

export interface StoredMedicineAlarm {
  id: string;
  patientId: string;
  patientName: string;
  kind?: ReminderKind;
  medicineLabel: string;
  notes?: string;
  time24h: string;
  secondTime24h?: string;
  frequency: 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'ONE_TIME';
  enabled: boolean;
  adherenceDates: string[];
}

export class TibbDatabase extends Dexie {
  accounts!: Table<AccountRecord, string>;
  vaultItems!: Table<EncryptedBlobRow, string>;
  telemetryOutbox!: Table<TelemetryOutboxRow, string>;
  auditLogs!: Table<AuditLogRow, number>;

  constructor() {
    super('TibbPrivateVaultDB');
    this.version(1).stores({
      accounts: 'accountId, role',
      vaultItems: 'id, accountId, kind, [accountId+kind]',
      telemetryOutbox: 'eventId, synced, districtCode, triageTier',
      auditLogs: '++id, accountId, timestampIso',
    });
  }
}

export const tibbDb = new TibbDatabase();

const PBKDF2_ITERATIONS = 600_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer;
}

export async function deriveAesKeyFromPin(pin: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<{
  aesKey: CryptoKey;
  verifierB64: string;
}> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits', 'deriveKey']);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    512
  );

  const rawBytes = new Uint8Array(bits);
  const aesRaw = rawBytes.slice(0, 32);
  const verifierRaw = rawBytes.slice(32, 64);

  const aesKey = await crypto.subtle.importKey('raw', toArrayBuffer(aesRaw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  return {
    aesKey,
    verifierB64: bytesToBase64(verifierRaw),
  };
}

export interface UnlockedVaultSession {
  accountId: string;
  displayName: string;
  role: 'GHARANA' | 'BHU';
  aesKey: CryptoKey;
  unlockedAtMs: number;
}

const PinSchema = z.string().regex(/^\d{4,8}$/, 'PIN must be 4 to 8 numeric digits');

export async function createAccount(params: {
  displayName: string;
  role: 'GHARANA' | 'BHU';
  pin: string;
  iterations?: number;
}): Promise<UnlockedVaultSession> {
  PinSchema.parse(params.pin);
  const cleanName = params.displayName.trim();
  if (!cleanName || cleanName.length > 60) {
    throw new Error('Account name must be between 1 and 60 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const { aesKey, verifierB64 } = await deriveAesKeyFromPin(params.pin, salt, params.iterations ?? PBKDF2_ITERATIONS);
  const accountId = `acc_${crypto.randomUUID().slice(0, 12)}`;

  const record: AccountRecord = {
    accountId,
    displayName: cleanName,
    role: params.role,
    saltB64: bytesToBase64(salt),
    verifierB64,
    failedAttempts: 0,
    lockedUntilMs: 0,
    createdAtIso: new Date().toISOString(),
  };

  await tibbDb.accounts.put(record);
  await logAuditEvent(accountId, 'ACCOUNT_CREATED', `Role=${params.role}`);

  return {
    accountId,
    displayName: cleanName,
    role: params.role,
    aesKey,
    unlockedAtMs: Date.now(),
  };
}

export async function unlockAccount(accountId: string, pin: string, iterations = PBKDF2_ITERATIONS): Promise<UnlockedVaultSession> {
  PinSchema.parse(pin);
  const account = await tibbDb.accounts.get(accountId);
  if (!account) {
    throw new Error('Account not found.');
  }
  const now = Date.now();
  if (account.lockedUntilMs > now) {
    const waitSec = Math.ceil((account.lockedUntilMs - now) / 1000);
    throw new Error(`Account temporarily locked. Try again in ${waitSec}s.`);
  }

  const salt = base64ToBytes(account.saltB64);
  const { aesKey, verifierB64 } = await deriveAesKeyFromPin(pin, salt, iterations);

  if (verifierB64 !== account.verifierB64) {
    const nextFailed = account.failedAttempts + 1;
    const lockoutMs = nextFailed >= 5 ? Math.min(300_000, 15_000 * Math.pow(2, nextFailed - 5)) : 0;
    await tibbDb.accounts.update(accountId, {
      failedAttempts: nextFailed,
      lockedUntilMs: lockoutMs > 0 ? now + lockoutMs : 0,
    });
    await logAuditEvent(accountId, 'UNLOCK_FAILED', `Attempts=${nextFailed}`);
    throw new Error(lockoutMs > 0 ? 'Too many failed PIN attempts. Account temporarily locked.' : 'Incorrect PIN.');
  }

  await tibbDb.accounts.update(accountId, { failedAttempts: 0, lockedUntilMs: 0 });
  await logAuditEvent(accountId, 'VAULT_UNLOCKED', 'OK');

  return {
    accountId: account.accountId,
    displayName: account.displayName,
    role: account.role,
    aesKey,
    unlockedAtMs: now,
  };
}

const DEFAULT_DEVICE_PIN = '0000';
const DEFAULT_LOCAL_ACCOUNT_ID = 'acc_local_family_default';

/**
 * Provides immediate non-blocking offline app launch on first visit when no PIN-locked account exists yet.
 * Still derives an AES-GCM-256 key and encrypts all Dexie blobs locally; user can set a custom PIN or add accounts anytime.
 */
export async function ensureQuickLocalSession(role: 'GHARANA' | 'BHU' = 'GHARANA'): Promise<{
  session: UnlockedVaultSession | null;
  requiresPinUnlock: boolean;
}> {
  const existing = await tibbDb.accounts.toArray();
  const customAccounts = existing.filter((a) => a.accountId !== DEFAULT_LOCAL_ACCOUNT_ID);
  if (customAccounts.length > 0) {
    return { session: null, requiresPinUnlock: true };
  }

  let defaultAcc = existing.find((a) => a.accountId === DEFAULT_LOCAL_ACCOUNT_ID);
  if (!defaultAcc) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { aesKey, verifierB64 } = await deriveAesKeyFromPin(DEFAULT_DEVICE_PIN, salt, 50_000);
    defaultAcc = {
      accountId: DEFAULT_LOCAL_ACCOUNT_ID,
      displayName: role === 'BHU' ? 'BHU Local Station' : 'My Gharana Vault',
      role,
      saltB64: bytesToBase64(salt),
      verifierB64,
      failedAttempts: 0,
      lockedUntilMs: 0,
      createdAtIso: new Date().toISOString(),
    };
    await tibbDb.accounts.put(defaultAcc);
    return {
      session: {
        accountId: defaultAcc.accountId,
        displayName: defaultAcc.displayName,
        role: defaultAcc.role,
        aesKey,
        unlockedAtMs: Date.now(),
      },
      requiresPinUnlock: false,
    };
  }

  const salt = base64ToBytes(defaultAcc.saltB64);
  const { aesKey } = await deriveAesKeyFromPin(DEFAULT_DEVICE_PIN, salt, 50_000);
  return {
    session: {
      accountId: defaultAcc.accountId,
      displayName: defaultAcc.displayName,
      role: defaultAcc.role,
      aesKey,
      unlockedAtMs: Date.now(),
    },
    requiresPinUnlock: false,
  };
}

export async function encryptPayloadForSession<T>(
  session: UnlockedVaultSession,
  id: string,
  kind: EncryptedBlobRow['kind'],
  payload: T
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(payload));
  // Bind accountId + kind into AES-GCM Additional Authenticated Data so cross-account tampering or decryption fails
  const aad = enc.encode(`${session.accountId}:${kind}:${id}`);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
    session.aesKey,
    toArrayBuffer(plaintext)
  );

  const row: EncryptedBlobRow = {
    id,
    accountId: session.accountId,
    kind,
    ivB64: bytesToBase64(iv),
    cipherB64: bytesToBase64(new Uint8Array(cipherBuf)),
    updatedAtIso: new Date().toISOString(),
  };

  await tibbDb.vaultItems.put(row);
}

export async function listDecryptedForSession<T>(
  session: UnlockedVaultSession,
  kind: EncryptedBlobRow['kind']
): Promise<T[]> {
  const rows = await tibbDb.vaultItems.where('[accountId+kind]').equals([session.accountId, kind]).toArray();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const results: T[] = [];

  for (const row of rows) {
    if (row.accountId !== session.accountId) continue;
    const iv = base64ToBytes(row.ivB64);
    const cipher = base64ToBytes(row.cipherB64);
    const aad = enc.encode(`${session.accountId}:${row.kind}:${row.id}`);
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
      session.aesKey,
      toArrayBuffer(cipher)
    );
    results.push(JSON.parse(dec.decode(plainBuf)) as T);
  }
  return results;
}

export async function decryptSingleRowWithSession<T>(session: UnlockedVaultSession, rowId: string): Promise<T> {
  const row = await tibbDb.vaultItems.get(rowId);
  if (!row || row.accountId !== session.accountId) {
    throw new Error('Access denied: record does not belong to active account.');
  }
  const iv = base64ToBytes(row.ivB64);
  const cipher = base64ToBytes(row.cipherB64);
  const aad = new TextEncoder().encode(`${session.accountId}:${row.kind}:${row.id}`);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), additionalData: toArrayBuffer(aad) },
    session.aesKey,
    toArrayBuffer(cipher)
  );
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
}

export async function exportEncryptedBackup(session: UnlockedVaultSession, passphrase: string): Promise<string> {
  if (passphrase.length < 6) {
    throw new Error('Backup passphrase must be at least 6 characters.');
  }
  const profiles = await listDecryptedForSession<PatientProfile>(session, 'PROFILE');
  const episodes = await listDecryptedForSession<StoredEpisode>(session, 'EPISODE');
  const labs = await listDecryptedForSession<StoredLabRecord>(session, 'LAB');
  const alarms = await listDecryptedForSession<StoredMedicineAlarm>(session, 'ALARM');
  const threads = await listDecryptedForSession<Record<string, unknown>>(session, 'THREAD');
  const reports = await listDecryptedForSession<Record<string, unknown>>(session, 'REPORT');
  const wellness = await listDecryptedForSession<Record<string, unknown>>(session, 'WELLNESS');

  const bundle = {
    format: 'tibb-encrypted-backup-v1',
    exportedAtIso: new Date().toISOString(),
    accountMeta: { displayName: session.displayName, role: session.role },
    data: { profiles, episodes, labs, alarms, threads, reports, wellness },
  };

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { aesKey } = await deriveAesKeyFromPin(passphrase, salt, 200_000);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(new TextEncoder().encode(JSON.stringify(bundle)))
  );

  await logAuditEvent(
    session.accountId,
    'BACKUP_EXPORTED',
    `Items=${profiles.length + episodes.length + labs.length + alarms.length + threads.length + reports.length + wellness.length}`
  );

  return JSON.stringify({
    version: 1,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    cipherB64: bytesToBase64(new Uint8Array(cipher)),
  });
}

export async function restoreEncryptedBackup(
  session: UnlockedVaultSession,
  backupJson: string,
  passphrase: string
): Promise<number> {
  const parsed = z
    .object({
      version: z.literal(1),
      saltB64: z.string(),
      ivB64: z.string(),
      cipherB64: z.string(),
    })
    .parse(JSON.parse(backupJson));

  const salt = base64ToBytes(parsed.saltB64);
  const iv = base64ToBytes(parsed.ivB64);
  const cipher = base64ToBytes(parsed.cipherB64);
  const { aesKey } = await deriveAesKeyFromPin(passphrase, salt, 200_000);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(cipher)
  );
  const bundle = JSON.parse(new TextDecoder().decode(plainBuf)) as {
    format: string;
    data: {
      profiles: PatientProfile[];
      episodes: StoredEpisode[];
      labs: StoredLabRecord[];
      alarms: StoredMedicineAlarm[];
      threads?: Array<{ id: string }>;
      reports?: Array<{ id: string }>;
      wellness?: Array<{ id: string }>;
    };
  };
  if (bundle.format !== 'tibb-encrypted-backup-v1') {
    throw new Error('Invalid backup archive format.');
  }

  let restoredCount = 0;
  for (const p of bundle.data.profiles) {
    await encryptPayloadForSession(session, p.id, 'PROFILE', { ...p, accountId: session.accountId });
    restoredCount++;
  }
  for (const e of bundle.data.episodes) {
    await encryptPayloadForSession(session, e.id, 'EPISODE', e);
    restoredCount++;
  }
  for (const l of bundle.data.labs) {
    await encryptPayloadForSession(session, l.id, 'LAB', l);
    restoredCount++;
  }
  for (const a of bundle.data.alarms) {
    await encryptPayloadForSession(session, a.id, 'ALARM', a);
    restoredCount++;
  }
  for (const th of bundle.data.threads ?? []) {
    await encryptPayloadForSession(session, th.id, 'THREAD', th);
    restoredCount++;
  }
  for (const rp of bundle.data.reports ?? []) {
    await encryptPayloadForSession(session, rp.id, 'REPORT', rp);
    restoredCount++;
  }
  for (const wl of bundle.data.wellness ?? []) {
    await encryptPayloadForSession(session, wl.id, 'WELLNESS', wl);
    restoredCount++;
  }
  await logAuditEvent(session.accountId, 'BACKUP_RESTORED', `Items=${restoredCount}`);
  return restoredCount;
}

export async function wipeAccountData(accountId: string): Promise<void> {
  await tibbDb.transaction('rw', tibbDb.accounts, tibbDb.vaultItems, tibbDb.auditLogs, async () => {
    await tibbDb.vaultItems.where('accountId').equals(accountId).delete();
    await tibbDb.auditLogs.where('accountId').equals(accountId).delete();
    await tibbDb.accounts.delete(accountId);
  });
}

export async function logAuditEvent(accountId: string, action: string, detail: string): Promise<void> {
  await tibbDb.auditLogs.add({
    accountId,
    action,
    detail: detail.slice(0, 120),
    timestampIso: new Date().toISOString(),
  });
}

export async function queueAnonymousTelemetry(params: {
  districtCode: string;
  mode: 'GHARANA' | 'BHU';
  ageBracket: string;
  triageTier: TriageTier;
  symptomCategory: string;
  amrBlockTriggered: boolean;
  referralGenerated: boolean;
  referralToken?: string;
}): Promise<TelemetryOutboxRow> {
  const weekTag = new Date().toISOString().slice(0, 10);
  const hashBuf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${params.districtCode}:${weekTag}:tibb-cohort`)
  );
  const cohortHash = Array.from(new Uint8Array(hashBuf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const row: TelemetryOutboxRow = {
    eventId: crypto.randomUUID(),
    cohortHash,
    districtCode: params.districtCode,
    mode: params.mode,
    ageBracket: params.ageBracket,
    triageTier: params.triageTier,
    symptomCategory: params.symptomCategory,
    amrBlockTriggered: params.amrBlockTriggered,
    referralGenerated: params.referralGenerated,
    referralCompleted: false,
    referralToken: params.referralToken,
    timestampHour: `${new Date().toISOString().slice(0, 13)}:00:00Z`,
    synced: 0,
  };
  await tibbDb.telemetryOutbox.put(row);
  return row;
}
