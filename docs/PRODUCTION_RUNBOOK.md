# Tibb — Production Operations, Security & Privacy Runbook

## 1. Environment Variables (Names Only — Zero Secrets in Code)

| Variable Name | Purpose | Required |
| :--- | :--- | :--- |
| `PORT` | Express server listen port (default `3000`) | Optional |
| `APP_URL` | Allowed HTTPS origin for CORS allowlist | Production |
| `GROQ_API_KEY` | Optional server-side Qwen proxy key (never exposed to browser/APK) | Optional |
| `HF_TOKEN` | Optional Hugging Face fallback inference token | Optional |

## 2. Data Collection, Access, Retention & Deletion Policy

- **Private Health Data (Vault A — Local Only)**: Patient names, ages, conditions, episodes, lab OCR text, and medicine alarms are encrypted client-side using per-account `PBKDF2-HMAC-SHA256` (600,000 iterations) + `AES-GCM-256` with `accountId` bound into AAD. Neither servers nor other local accounts can decrypt another user's vault.
- **Anonymous Epidemiological Telemetry (Vault B — Optional Sync)**: Strips all names, CNICs, phone numbers, and exact dates, transmitting only `{ eventId, cohortHash, districtCode, mode, ageBracket, triageTier, symptomCategory, amrBlockTriggered, referralGenerated, timestampHour }`. Reporting enforces `k >= 10` cohort suppression.
- **Retention & Erasure**: Local records remain until user-initiated deletion. Users can export an encrypted `.tibb-backup` archive or permanently wipe all account records, vaults, and audit logs via **Android Kit -> Permanently Delete This Account & Data**.

## 3. API Contracts

- `GET /api/health`: Returns `{ status: "ok", service: "tibb-clinical-gateway", timestamp }`.
- `POST /api/explain`: Accepts Zod-validated `{ ageMonths, triageTier, homeCareId, diseaseRefId, userConcern? }`. Rate-limited (`30 req/min/IP`), rejects CNIC/phone PII (`400`), and verifies every response through `verifyAgainstClinicalGroundTruth()`.
- `POST /api/telemetry`: Accepts Zod-validated de-identified `TelemetryEventSchema`. Deduplicates by `eventId` for safe idempotent retries.
- `GET /api/telemetry/summary`: Returns district aggregates strictly where `total >= 10` (`k`-anonymity).

## 4. Backup, Restore & Rollback Procedure

- **Backup & Restore Test**: Export `.tibb-backup` using a strong passphrase, delete vault items, and restore via **Android Kit -> Load .tibb-backup**. Recovery Time Objective (RTO): `< 30 seconds`; Recovery Point Objective (RPO): time since last backup export.
- **Deployment Rollback**: Keep previous signed `.apk` build and tagged `dist/` release in version control. If `/api/health` fails or error rate spikes, revert to previous release tag and re-run `npm run build && npm start`.

## 5. Incident Response & Monitoring Checklist

1. **Uptime & Error Alerts**: Poll `GET /api/health` every 60s from external uptime monitor alerting the on-call engineer.
2. **Audit Logs**: Security events (`ACCOUNT_CREATED`, `UNLOCK_FAILED`, `BACKUP_EXPORTED`, `BACKUP_RESTORED`) are stored locally without PINs, passwords, keys, or patient names.
3. **Secret Rotation**: If `GROQ_API_KEY` or `HF_TOKEN` is suspected exposed, revoke immediately in provider console, issue a new secret in server environment variables, and restart the gateway.
