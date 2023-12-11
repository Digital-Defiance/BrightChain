# Asset Ledger — Operator Runbook

This runbook covers day-to-day operation of the BrightChain programmable asset ledger
(`brightledger-assets-*` packages). Read this before making any configuration changes.

---

## 1. Enabling the capability

The asset ledger is **disabled by default**. To enable it, set the environment variable:

```
BRIGHTCHAIN_ASSETS_ENABLED=true
```

**Do not** set this flag in any environment until the following pre-conditions are met:

- A system quorum policy has been configured (see §2).
- At least two operators hold distinct signing keys in the system signer set.
- The database migrations for `brightchain-db` have been applied.
- The Joule asset class has been bootstrapped (see §3).

Setting `BRIGHTCHAIN_ASSETS_ENABLED=false` (or leaving it unset) produces **zero behavioral
change** versus the main-branch baseline — no routes are registered, no projector starts, and no
metrics are emitted. This is the safe fallback at all times.

---

## 2. Configuring the system quorum

`OperatorFreezeAction` and `ProcessKeyCertAction`/`ProcessKeyRevokeAction` require a
_system signer set_ — a deployment-wide quorum independent of any asset's issuer set.

Configure via the `AssetsSubsystemPlugin` constructor option `systemSignerSet`, which must be
an `AuthorizedSignerSet` instance:

```typescript
new AssetsSubsystemPlugin({
  systemSignerSet: new AuthorizedSignerSet(
    [
      { publicKey: opKeyA, role: SignerRole.Admin, status: SignerStatus.Active, metadata: new Map() },
      { publicKey: opKeyB, role: SignerRole.Admin, status: SignerStatus.Active, metadata: new Map() },
    ],
    { type: QuorumType.Threshold, threshold: 2 }, // 2-of-2
  ),
});
```

**Hard rules:**

- The plugin **refuses to initialize** if `systemSignerSet` is absent or has no active signers.
- Use `QuorumType.Threshold` with `threshold >= 2` in production.
- Rotate the system signer set via `RotateIssuerSetAction` on the asset's issuer set, _not_ by
  redeploying — each change produces an on-ledger record.

---

## 3. Bootstrapping the Joule asset

Joule (`J`, smallest unit `µJ`, `decimals: 6`) is the canonical pilot asset. Bootstrap sequence:

1. Submit an `IssueAssetAction` from the operator system quorum at service start-up:

   ```json
   { "kind": "IssueAsset", "symbol": "J", "displayName": "Joule", "decimals": 6,
     "supplyPolicy": "mintable", "transferPolicy": "open",
     "freezable": true, "burnable": true,
     "initialIssuerSet": [<operator key entries>],
     "initialBrightTrustPolicy": { "type": "Threshold", "threshold": 2 } }
   ```

2. Record the `derivedAssetId` from the ledger entry hash — this becomes the canonical
   `JOULE_ASSET_ID` for all subsequent operations.
3. Update the `assetId` default in `brightchain-azure-store` / `brightchain-s3-store`
   `AssetAccountStore` configuration.

---

## 4. Redaction procedure

To redact an entry (e.g., to comply with a legal order):

1. Submit an `AttestationAction` with `attestationType: 'redact'` and `entryHash` of the
   entry to redact. This requires **operator system quorum**.
2. Add the entry hash to the redaction list via the operator API:

   ```
   POST /admin/redact  { "entryHash": "<hex>" }
   ```

3. Subsequent `GET /entries/<hash>` requests return `HTTP 451 Unavailable For Legal Reasons`.
4. The attestation entry itself is permanent and unredactable — it forms the audit trail
   proving that redaction occurred and who authorized it.
5. Redaction does **not** reverse balances. If a fraudulent entry requires balance correction,
   follow the dispute/retroactive-revocation flow (see §7).

---

## 5. Audit export

Use `AuditExportService` to stream a CSV of all ledger entries for a given asset:

```typescript
const svc = new AuditExportService(ledgerReader);
const stream = svc.exportCsv(assetId);
stream.pipe(fs.createWriteStream('export.csv'));
```

Column order is fixed (`AUDIT_CSV_COLUMNS`):

```
seq, entryHash, kind, assetId, shardId, fromSeq, toSeq, tipHash, itemsRoot,
deltaCount, from, to, amount, acceptedAt
```

**Notes:**

- The stream iterates the raw ledger, never the projection — it is safe to run during live operation.
- `BatchSettlement` rows have no `assetId` column value (settlement is shard-scoped, not asset-scoped).
- For compliance archiving, run weekly and store in immutable object storage with object-lock.

---

## 6. Process_Key rotation

Process Keys (Ed25519 keypairs) are certified by the operator quorum and authorize batch
settlements from the metering-log layer.

**Rotation cadence:**

- **Recommended:** rotate every 2–4 days.
- **Hard cap:** `notAfter - notBefore` must be **≤ 7 days** (`PROCESS_KEY_MAX_VALIDITY_MS`).
  Certificates exceeding this are rejected at validation time with `PROCESS_KEY_TTL_EXCEEDED`.
- A new `ProcessKeyCertAction` may be submitted before the current key expires; both coexist
  until the old key's `notAfter` passes.

**Rotation procedure:**

1. Generate a new Ed25519 keypair.
2. Submit a `ProcessKeyCertAction` signed by the operator system quorum:

   ```json
   { "kind": "ProcessKeyCert",
     "processPublicKey": "<32-byte pubkey hex>",
     "notBefore": <now_ms>,
     "notAfter": <now_ms + 4 * 86400000>,
     "shardIds": ["energy-shard", "..."] }
   ```

3. The metering-log layer switches to signing with the new private key.
4. The old key becomes unused but remains valid until its `notAfter`.

**Monitor TTL remaining** via the `processKeyTtlMs` gauge in the metrics endpoint.

---

## 7. Compromise response and retroactive revocation

If a Process Key is suspected compromised:

1. **Immediately revoke** with `effectiveAtSeq` pointing to the first settlement that may have
   been fraudulently signed:

   ```json
   { "kind": "ProcessKeyRevoke",
     "processKeyFingerprint": "<hex>",
     "reason": "compromise",
     "effectiveAtSeq": 1234 }
   ```

   Requires operator system quorum.

2. The validator automatically:
   - Marks all settlements from that key with `fromSeq >= effectiveAtSeq` as `DISPUTED_RETROACTIVE`.
   - Reverses their balance deltas in the projection.
   - Emits a `SettlementDisputed` alert event.

3. Audit which accounts were affected:

   ```
   GET /shards/<shardId>/settlement
   ```

4. Resubmit corrected settlements signed by the replacement Process Key once the metering-log
   records have been independently verified.

5. Record findings in an `AttestationAction` with `attestationType: 'compromise-response'`.

---

## 8. Dispute window guidance

Each `BatchSettlement` enters a **dispute window** (default 24 h, min 6 h, max 7 d) during which
a `BatchChallengeAction` may reverse its deltas.

| State | Meaning |
|---|---|
| `PENDING` | Within dispute window; deltas applied but challengeable |
| `FINAL` | Window closed with no challenge; deltas permanent |
| `DISPUTED` | Challenge accepted; deltas reversed |
| `DISPUTED_RETROACTIVE` | Retroactive revocation applied |
| `RESOLVED_FINAL` | Dispute resolved; original deltas reinstated |
| `RESOLVED_REPLACED` | Dispute resolved; corrected deltas applied |

**Operational rules:**

- Never treat a `PENDING` settlement balance as spendable in downstream systems.
- Set `disputeWindowMs` to ≥ the time needed for independent log verification.
- `BatchChallengeAction` requires the full `itemsRoot` recomputation — ensure metering-log
  archives are retained for at least `disputeWindowMs + 48 h` after each settlement.

---

## 9. Vocabulary discipline

All asset ledger code, documentation, API responses, UI copy, and operator communications
**must** avoid the following terms:

| Forbidden | Approved alternative |
|---|---|
| coin | asset, unit |
| holder | account |
| tokenomics | supply policy |
| airdrop | issuance, distribution |
| staking | — (no equivalent concept) |
| marketCap | — (no equivalent concept) |
| wallet | account |

The ESLint rule `no-restricted-syntax` in `brightledger-assets-*` packages enforces this
automatically for identifiers and string literals. Markdown lint runs the same regex on `*.md`
files. Ops staff should apply the same discipline in tickets, runbooks, and incident reports.

The word `mint` is permitted only as the `ActionKind.Mint` discriminator constant.

---

## 10. Key contacts and escalation

| Role | Responsibility |
|---|---|
| Asset Ledger On-Call | First responder for all settlement disputes and Process_Key issues |
| Security Lead | Authorize retroactive revocations; sign compromise-response attestations |
| Compliance Officer | Authorize redaction orders; receive weekly audit export archives |
