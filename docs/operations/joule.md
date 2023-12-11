# Joule Resource-Credit Operations Runbook

> **Classification**: Internal operator guide — not for member-facing distribution.

---

## Table of Contents

1. [What Joule IS and IS NOT](#1-what-joule-is-and-is-not)
2. [Architecture Overview](#2-architecture-overview)
3. [Granting Credits to Members](#3-granting-credits-to-members)
4. [Scheduling Rate-Table Updates](#4-scheduling-rate-table-updates)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Retry-Buffer Alarm Response](#6-retry-buffer-alarm-response)
7. [Dispute Escalation](#7-dispute-escalation)
8. [Incident Response Checklist](#8-incident-response-checklist)
9. [Vocabulary Discipline](#9-vocabulary-discipline)

---

## 1. What Joule IS and IS NOT

### Joule IS

- A **metering unit** for platform resource consumption (compute, storage, I/O, etc.).
- An **internal accounting token** that controls access to rate-limited API operations.
- Issued and denominated in **micro-joules (µJ)**: 1 J = 1,000,000 µJ.
- Granted to members by operators through a governance-gated action.
- Earned by members through platform participation (content contributions, referrals, etc.)
  as defined in `JouleEarnService`.

### Joule IS NOT

- ❌ A cryptocurrency or tradable digital asset.
- ❌ A store of monetary value.
- ❌ Redeemable for cash, goods, or services outside the BrightChain platform.
- ❌ Transferable between members (no peer-to-peer transfers).
- ❌ Subject to speculative mechanics: no staking, no airdrops, no yield.

> **Vocabulary discipline**: Never use terms `coin`, `holder`, `airdrop`, `staking`,
> `marketCap`, `tokenomics`, `hodl`, or `whale` in operator communications or code
> comments. The ESLint `joule/vocabulary` rule enforces this in source files.
> Violations should be treated as blocking PR feedback.

---

## 2. Architecture Overview

```
Request arrives
    │
    ▼
CaptureMiddleware (attaches RequestCostAccumulator to req.joule)
    │ on res.finish
    ▼
priceMicroJoules() → Resource_Event → MeteringLogShard
    │                                        │
    │                                  (retry buffer if shard fails)
    ▼
DebitAuthorizationService
  authorize() → reserve() in AssetAccountStore (Layer 1 only)
  capture()  → settle()   + Resource_Event to metering log
  release()  → release()  (no ledger entry)
    │
    ▼
ReservationReaper (sweeps expired holds every TTL interval)
    │
    ▼
JouleRateTableCache (in-memory, event-driven; updates from RateTableUpdateAction)
```

**Key invariant**: `available + reserved + spent === total_granted` at all times.
Conservation violations are bugs and should trigger a P0 incident.

---

## 3. Granting Credits to Members

### Prerequisites

- Caller must hold an operator JWT with scope `joule:operator`.
- Multi-operator quorum signature is required (configured in `operatorQuorum` service).

### API endpoint

```http
POST /operator/joule/grant
Authorization: Bearer <OPERATOR_TOKEN>
Content-Type: application/json

{
  "memberId": "<member-uuid>",
  "microJoules": "10000000000",
  "reason": "monthly-allocation-2025-07"
}
```

**Response (202 Accepted)**:

```json
{ "txId": "<ledger-tx-uuid>", "queued": true }
```

### Via CLI (internal tooling)

```bash
# Grant 10,000 J to a member (10_000 * 1_000_000 µJ)
yarn ts-node scripts/joule-grant.ts \
  --member-id "<uuid>" \
  --micro-joules 10000000000 \
  --reason "pilot-grant"
```

### Notes

- Grants are Layer 3 ledger entries and are **irreversible**.
- Use `reason` to create an audit trail; it appears in event logs.
- Batch grants should be issued one-at-a-time (the endpoint is idempotent per
  `txId`, not per `memberId + amount`).

---

## 4. Scheduling Rate-Table Updates

Rate tables control the µJ cost per resource-class unit.  Changes take effect at
`effectiveAt`, which should be set at least 24 hours in the future to give members
time to adjust usage patterns.

### API endpoint

```http
POST /operator/joule/rate-table
Authorization: Bearer <OPERATOR_TOKEN>
Content-Type: application/json

{
  "effectiveAt": 1750000000000,
  "entries": [
    { "resourceClass": "COMPUTE",  "microJoulesPerUnit": "500000" },
    { "resourceClass": "STORAGE",  "microJoulesPerUnit": "100000" },
    { "resourceClass": "IO",       "microJoulesPerUnit": "50000"  },
    { "resourceClass": "NETWORK",  "microJoulesPerUnit": "25000"  }
  ]
}
```

**Response (202 Accepted)**:

```json
{ "txId": "<ledger-tx-uuid>", "queued": true }
```

### Best practices

- Always announce rate changes at least 72 hours in advance via platform notifications.
- Use the `/joule/rate-table/history` endpoint to audit past tables before publishing
  a new one.
- Avoid increasing rates for more than one resource class at a time.
- Test with a shadow rate table on staging before production.

---

## 5. Monitoring & Alerting

All metrics are exposed by `JouleMetrics.getInstance().snapshot()` and should be
scraped by your metrics adapter (Prometheus, DataDog, etc.).

| Metric                              | Type      | Alert threshold                  |
|-------------------------------------|-----------|----------------------------------|
| `joule_capture_emits_total{class}`  | counter   | —                                |
| `joule_authorize_failures_total`    | counter   | > 100/min → page on-call         |
| `joule_reservation_age_seconds`     | histogram | p99 > 240 s → investigate reaper |
| `joule_retry_buffer_depth`          | gauge     | > 500 → warning; > 1000 → alarm  |
| `joule_rate_table_version`          | gauge     | unchanged after rate update → alert |

### Recommended Grafana panels

1. **Capture throughput** — `rate(joule_capture_emits_total[5m])` by class.
2. **Authorization failure rate** — `rate(joule_authorize_failures_total[1m])` by reason.
3. **Reservation age p99** — histogram quantile.
4. **Retry buffer depth** — single-stat with red threshold at 1000.

---

## 6. Retry-Buffer Alarm Response

The retry buffer accumulates failed metering-log emit attempts.  If it exceeds
`JOULE_RETRY_BUFFER_MAX_DEFAULT` (1,000 entries) the `captureEvents` emitter fires
a `'retry-buffer-alarm'` event.

### Runbook

1. **Identify root cause**: is the metering-log shard unavailable?

   ```bash
   curl -s http://localhost:4000/api/health | jq '.services.meteringLog'
   ```

2. **Check shard logs** for write errors.

3. **If shard is recovering**: the retry buffer will drain automatically via
   background `tryFlushOne()` calls.  Monitor `joule_retry_buffer_depth`.

4. **If shard is permanently down**: escalate to infra; halt metered endpoints
   by setting `JOULE_ENABLED=false` in the environment and restarting the API.

5. **If buffer is > 5,000 and growing**: take a snapshot of the retry buffer
   contents (via `GET /api/admin/joule/retry-buffer-snapshot` if implemented),
   drain manually, then file a post-mortem.

---

## 7. Dispute Escalation

Members may view disputes via `GET /me/joule/disputes`.  Operators can inspect and
resolve disputes through admin tooling.

### Dispute states

| State                | Meaning                                              |
|----------------------|------------------------------------------------------|
| `DISPUTED`           | Member has flagged an unexpected charge.             |
| `RESOLVED_FINAL`     | Dispute closed; original charge confirmed correct.   |
| `RESOLVED_REPLACED`  | Dispute resolved; a corrected charge was issued.     |

### Escalation path

1. **Member raises dispute** — reflected via Layer 3 projection; visible in
   `DisputeNotice` React component with state `DISPUTED`.
2. **Operator reviews** `GET /operator/joule/disputes/:id` (v2 feature).
3. **Resolution**:
   - **Confirm charge**: update dispute state to `RESOLVED_FINAL`.
   - **Issue correction**: credit the member the disputed amount, update state to
     `RESOLVED_REPLACED`, and record a corrective ledger entry.
4. **SLA**: Disputes should be acknowledged within 48 hours and resolved within 7 days.

---

## 8. Incident Response Checklist

### Conservation violation (available + reserved + spent ≠ granted)

- [ ] Halt write traffic to affected member accounts.
- [ ] Snapshot `AssetAccountStore` state to a file.
- [ ] Identify the last successful balance reconciliation.
- [ ] Check for double-capture race (should be prevented by `active` Map, but verify).
- [ ] File P0 incident; do not modify balances without audit sign-off.

### Runaway reservation growth

- [ ] Check `ReservationReaper` is running (`joule_reservation_age_seconds` p99).
- [ ] Inspect `DebitAuthorizationService.active` map size via health endpoint.
- [ ] If reaper is stuck, restart the API instance (reaper auto-restarts with the process).

### Rate-table rollback

If a rate table was published in error:

```bash
# Publish a corrected table with the same effectiveAt (idempotent replay)
POST /operator/joule/rate-table
{ "effectiveAt": <same-timestamp>, "entries": [...corrected...] }
```

The cache replaces entries with the same version number.  Requests in-flight
use their pinned table and are unaffected.

---

## 9. Vocabulary Discipline

BrightChain Joule credits are a **metering utility**, not a financial instrument.
All operator communications, code comments, UI copy, and documentation must avoid
financial or crypto-asset framing.

### Forbidden terms

| Term          | Use instead                              |
|---------------|------------------------------------------|
| coin          | credit, joule                            |
| holder        | member, account                          |
| airdrop       | grant, operator credit                   |
| staking       | (not applicable — remove entirely)       |
| marketCap     | (not applicable — remove entirely)       |
| tokenomics    | resource pricing, rate table             |
| hodl          | (not applicable — remove entirely)       |
| whale         | high-volume member (if necessary at all) |

The ESLint rule `joule/vocabulary` (configured in `eslint.config.mjs`) enforces
these restrictions in all files under `brightchain-react-components/src/lib/joule/`.
Violations block CI.

---

*Last updated: 2025-07 — Task 5.3 of the joule-resource-credits spec.*
