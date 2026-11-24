import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAccount,
  decryptSingleRowWithSession,
  encryptPayloadForSession,
  exportEncryptedBackup,
  listDecryptedForSession,
  restoreEncryptedBackup,
  tibbDb,
  unlockAccount,
  wipeAccountData,
} from '../src/db/encryptedVault';

describe('Multi-Account Cryptographic Vault Isolation & Recovery', () => {
  beforeEach(async () => {
    await tibbDb.accounts.clear();
    await tibbDb.vaultItems.clear();
    await tibbDb.auditLogs.clear();
  });

  it('isolates Account A records from Account B even at the decryption layer', async () => {
    const accA = await createAccount({ displayName: 'Household A', role: 'GHARANA', pin: '1234', iterations: 10_000 });
    const accB = await createAccount({ displayName: 'Household B', role: 'GHARANA', pin: '5678', iterations: 10_000 });

    await encryptPayloadForSession(accA, 'prof_a1', 'PROFILE', {
      id: 'prof_a1',
      accountId: accA.accountId,
      name: 'Secret Patient A',
      ageMonths: 240,
      sex: 'F',
    });

    const listB = await listDecryptedForSession(accB, 'PROFILE');
    expect(listB.length).toBe(0);

    await expect(decryptSingleRowWithSession(accB, 'prof_a1')).rejects.toThrow(/Access denied/);
  });

  it('locks account after repeated wrong PIN attempts', async () => {
    const acc = await createAccount({ displayName: 'Lock Test', role: 'BHU', pin: '2468', iterations: 10_000 });

    for (let i = 0; i < 5; i++) {
      await expect(unlockAccount(acc.accountId, '9999', 10_000)).rejects.toThrow();
    }
    await expect(unlockAccount(acc.accountId, '2468', 10_000)).rejects.toThrow(/locked/);
  });

  it('exports an encrypted backup, restores into vault, and wipes cleanly on deletion', async () => {
    const acc = await createAccount({ displayName: 'Backup Family', role: 'GHARANA', pin: '4321', iterations: 10_000 });
    await encryptPayloadForSession(acc, 'prof_b1', 'PROFILE', {
      id: 'prof_b1',
      accountId: acc.accountId,
      name: 'Ammi',
      ageMonths: 680,
      sex: 'F',
    });
    await encryptPayloadForSession(acc, 'thr_b1', 'THREAD', {
      id: 'thr_b1',
      personId: 'prof_b1',
      title: 'BP Check',
      messages: [],
    });
    await encryptPayloadForSession(acc, 'rep_b1', 'REPORT', {
      id: 'rep_b1',
      personId: 'prof_b1',
      kind: 'REPORT_PHOTO',
      title: 'CBC Slip',
      notes: 'Clean EXIF-stripped',
    });

    const archive = await exportEncryptedBackup(acc, 'strong-pass-2026');
    expect(archive).not.toContain('Ammi');
    expect(archive).not.toContain('CBC Slip');

    await tibbDb.vaultItems.clear();
    const restoredCount = await restoreEncryptedBackup(acc, archive, 'strong-pass-2026');
    expect(restoredCount).toBe(3);

    const profiles = await listDecryptedForSession<{ name: string }>(acc, 'PROFILE');
    expect(profiles[0].name).toBe('Ammi');
    const threads = await listDecryptedForSession<{ id: string }>(acc, 'THREAD');
    expect(threads[0].id).toBe('thr_b1');
    const reports = await listDecryptedForSession<{ title: string }>(acc, 'REPORT');
    expect(reports[0].title).toBe('CBC Slip');

    await wipeAccountData(acc.accountId);
    expect(await tibbDb.accounts.get(acc.accountId)).toBeUndefined();
    expect(await tibbDb.vaultItems.where('accountId').equals(acc.accountId).count()).toBe(0);
  });
});
