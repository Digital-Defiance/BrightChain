#!/usr/bin/env ts-node
/**
 * @fileoverview verify-attestation — CLI tool for verifying supply attestations.
 *
 * Usage:
 *   npx ts-node tools/asset-audit/verify-attestation.ts \
 *     --csv <path-to-audit.csv> \
 *     --asset-id <assetIdHex> \
 *     --issued <issuedTotal> \
 *     --burned <burnedTotal> \
 *     --state-hash <stateHashHex> \
 *     --claim-hash <onLedgerClaimHashHex>
 *
 * Alternatively, pass a JSON attestation file via --attestation <path>:
 *   {
 *     "assetId": "abc123...",
 *     "issuedTotal": "1000000",
 *     "burnedTotal": "50000",
 *     "stateHash": "deadbeef...",
 *     "claimHash": "...",
 *     "seq": 42
 *   }
 *
 * Exit codes:
 *   0 — computed claimHash matches on-ledger claimHash ✓
 *   1 — mismatch or verification error ✗
 *   2 — bad arguments / IO error
 *
 * @see Requirement 11.3
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── claimHash computation (mirrors SupplyAttestationService) ─────────────────

function buildSupplyClaimHash(
  assetIdHex: string,
  issuedTotal: bigint,
  burnedTotal: bigint,
  stateHashHex: string,
): Buffer {
  const h = createHash('sha256');
  h.update(`assetId:${assetIdHex}\x00`);
  h.update(`issued:${issuedTotal.toString()}\x00`);
  h.update(`burned:${burnedTotal.toString()}\x00`);
  h.update(`stateHash:${stateHashHex}\x00`);
  return h.digest();
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

/** Very small RFC 4180 compliant CSV parser (no external dependencies). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  const headers = splitCsvRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvRow(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field.
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      cells.push(field);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) {
        cells.push(line.slice(i));
        break;
      }
      cells.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return cells;
}

// ── Argument parsing ──────────────────────────────────────────────────────────

interface AttestationRecord {
  assetId: string;
  issuedTotal: bigint;
  burnedTotal: bigint;
  stateHash: string;
  claimHash: string;
  seq?: number;
}

function parseArgs(argv: string[]): AttestationRecord & { csvPath?: string } {
  const args = argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  // --attestation JSON file takes precedence.
  const attestationFile = get('--attestation');
  if (attestationFile) {
    const raw = JSON.parse(
      fs.readFileSync(path.resolve(attestationFile), 'utf8'),
    ) as {
      assetId: string;
      issuedTotal: string;
      burnedTotal: string;
      stateHash: string;
      claimHash: string;
      seq?: number;
    };

    return {
      assetId: raw.assetId,
      issuedTotal: BigInt(raw.issuedTotal),
      burnedTotal: BigInt(raw.burnedTotal),
      stateHash: raw.stateHash,
      claimHash: raw.claimHash,
      seq: raw.seq,
      csvPath: get('--csv'),
    };
  }

  // Individual flags.
  const assetId = get('--asset-id');
  const issued = get('--issued');
  const burned = get('--burned');
  const stateHash = get('--state-hash');
  const claimHash = get('--claim-hash');

  if (!assetId || !issued || !burned || !stateHash || !claimHash) {
    process.stderr.write(
      'Usage: verify-attestation [--csv <path>] --asset-id <hex> --issued <n> --burned <n> --state-hash <hex> --claim-hash <hex>\n' +
        '   or: verify-attestation [--csv <path>] --attestation <json-file>\n',
    );
    process.exit(2);
  }

  return {
    assetId,
    issuedTotal: BigInt(issued),
    burnedTotal: BigInt(burned),
    stateHash,
    claimHash,
    csvPath: get('--csv'),
  };
}

// ── CSV supply reconciliation ─────────────────────────────────────────────────

/**
 * Scan the audit CSV and sum all Mint/Burn amounts for `assetId`.
 * Returns `{ issuedTotal, burnedTotal }` derived from CSV rows.
 */
function reconcileFromCsv(
  csvRows: Record<string, string>[],
  assetId: string,
): { issuedTotal: bigint; burnedTotal: bigint } {
  let issuedTotal = 0n;
  let burnedTotal = 0n;

  for (const row of csvRows) {
    if (row['assetId'] !== assetId) continue;
    const kind = row['kind'];
    const amount = row['amount'] ? BigInt(row['amount']) : 0n;

    if (kind === 'Mint') {
      issuedTotal += amount;
    } else if (kind === 'Burn') {
      burnedTotal += amount;
    }
  }

  return { issuedTotal, burnedTotal };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const args = parseArgs(process.argv);

  // Optional CSV reconciliation.
  if (args.csvPath) {
    process.stdout.write(`Reading audit CSV: ${args.csvPath}\n`);
    const csvText = fs.readFileSync(path.resolve(args.csvPath), 'utf8');
    const rows = parseCsv(csvText);

    const { issuedTotal: csvIssued, burnedTotal: csvBurned } = reconcileFromCsv(
      rows,
      args.assetId,
    );

    let mismatch = false;

    if (csvIssued !== args.issuedTotal) {
      process.stderr.write(
        `MISMATCH: issuedTotal from CSV (${csvIssued}) ≠ attested (${args.issuedTotal})\n`,
      );
      mismatch = true;
    }
    if (csvBurned !== args.burnedTotal) {
      process.stderr.write(
        `MISMATCH: burnedTotal from CSV (${csvBurned}) ≠ attested (${args.burnedTotal})\n`,
      );
      mismatch = true;
    }

    if (mismatch) {
      process.exit(1);
    }

    process.stdout.write(
      `CSV reconciliation OK: issued=${csvIssued}, burned=${csvBurned}\n`,
    );
  }

  // Compute expected claimHash.
  const expected = buildSupplyClaimHash(
    args.assetId,
    args.issuedTotal,
    args.burnedTotal,
    args.stateHash,
  );

  const expectedHex = expected.toString('hex');
  const actualHex = args.claimHash.toLowerCase();

  if (expectedHex !== actualHex) {
    process.stderr.write(
      `MISMATCH:\n  expected claimHash: ${expectedHex}\n  on-ledger claimHash: ${actualHex}\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `✓ Attestation verified — claimHash matches for asset ${args.assetId}\n` +
      `  seq:         ${args.seq ?? 'n/a'}\n` +
      `  issuedTotal: ${args.issuedTotal}\n` +
      `  burnedTotal: ${args.burnedTotal}\n` +
      `  stateHash:   ${args.stateHash}\n`,
  );

  process.exit(0);
}

main();
