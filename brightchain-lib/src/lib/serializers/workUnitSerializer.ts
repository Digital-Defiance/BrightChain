/**
 * @fileoverview WorkUnitSerializer — JSON round-trip serialization for
 * IWorkUnit and IWorkResult payloads.
 *
 * Provides serialize/parse functions for transmitting work units and results
 * over HTTP as JSON strings. All required fields are validated on parse with
 * descriptive error messages indicating which field is invalid or missing.
 *
 * @see Design: Proof of Useful Work Rate Limiting — WorkUnitSerializer
 * @see Requirements 15.1–15.6
 */

import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { DifficultyTier } from '../enumerations/difficultyTier';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { IWorkResult, IWorkUnit, WorkUnitOperation } from '../interfaces/pouw';

// ── Valid enum value sets for runtime validation ────────────────────────

const VALID_WORK_UNIT_OPERATIONS = new Set<string>(
  Object.values(WorkUnitOperation),
);

const VALID_DIFFICULTY_TIERS = new Set<string>(Object.values(DifficultyTier));

// ── WorkUnit serialization ─────────────────────────────────────────────

/**
 * Serialize an IWorkUnit to a JSON string.
 *
 * Since `inputData` is already base64-encoded (it's a string), this is a
 * straightforward JSON.stringify. The function exists as a named entry point
 * to pair with `parseWorkUnit` and to keep the serialization contract explicit.
 */
export function serializeWorkUnit(workUnit: IWorkUnit): string {
  return JSON.stringify(workUnit);
}

/**
 * Parse a JSON string into an IWorkUnit, validating all required fields.
 *
 * @throws {TranslatableBrightChainError} with a descriptive message if the JSON is malformed or
 *   any required field is missing or has the wrong type.
 */
export function parseWorkUnit(json: string): IWorkUnit {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkUnit_InvalidJSONTemplate,
      { SNIPPET: json.length > 120 ? json.slice(0, 120) + '…' : json },
    );
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkUnit_ExpectedObject,
    );
  }

  const obj = raw as Record<string, unknown>;

  // Required string fields
  requireString(obj, 'id', 'WorkUnit');
  requireString(obj, 'treeId', 'WorkUnit');
  requireString(obj, 'inputData', 'WorkUnit');
  requireString(obj, 'challengeToken', 'WorkUnit');
  requireString(obj, 'createdAt', 'WorkUnit');
  requireString(obj, 'expiresAt', 'WorkUnit');

  // Required number fields
  requireNumber(obj, 'treeLevel', 'WorkUnit');
  requireNumber(obj, 'treeIndex', 'WorkUnit');
  requireNumber(obj, 'childCount', 'WorkUnit');

  // Enum: operation
  requireString(obj, 'operation', 'WorkUnit');
  if (!VALID_WORK_UNIT_OPERATIONS.has(obj['operation'] as string)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkUnit_InvalidOperationTemplate,
      {
        VALID_VALUES: [...VALID_WORK_UNIT_OPERATIONS].join(', '),
        VALUE: String(obj['operation']),
      },
    );
  }

  // Enum: difficulty
  requireString(obj, 'difficulty', 'WorkUnit');
  if (!VALID_DIFFICULTY_TIERS.has(obj['difficulty'] as string)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkUnit_InvalidDifficultyTemplate,
      {
        VALID_VALUES: [...VALID_DIFFICULTY_TIERS].join(', '),
        VALUE: String(obj['difficulty']),
      },
    );
  }

  return obj as unknown as IWorkUnit;
}

// ── WorkResult serialization ───────────────────────────────────────────

/**
 * Serialize an IWorkResult to a JSON string.
 */
export function serializeWorkResult(workResult: IWorkResult): string {
  return JSON.stringify(workResult);
}

/**
 * Parse a JSON string into an IWorkResult, validating all required fields.
 *
 * @throws {TranslatableBrightChainError} with a descriptive message if the JSON is malformed or
 *   any required field is missing or has the wrong type.
 */
export function parseWorkResult(json: string): IWorkResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkResult_InvalidJSONTemplate,
      { SNIPPET: json.length > 120 ? json.slice(0, 120) + '…' : json },
    );
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_PoUW_WorkResult_ExpectedObject,
    );
  }

  const obj = raw as Record<string, unknown>;

  // Required string fields
  requireString(obj, 'workUnitId', 'WorkResult');
  requireString(obj, 'resultHash', 'WorkResult');
  requireString(obj, 'challengeToken', 'WorkResult');
  requireString(obj, 'completedAt', 'WorkResult');

  // Required number fields
  requireNumber(obj, 'computeTimeMs', 'WorkResult');

  return obj as unknown as IWorkResult;
}

// ── Private validation helpers ─────────────────────────────────────────

/**
 * Validate that `obj[field]` exists and is a string.
 * @throws {TranslatableBrightChainError} with a descriptive message on failure.
 */
function requireString(
  obj: Record<string, unknown>,
  field: string,
  context: 'WorkUnit' | 'WorkResult',
): void {
  if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
    throw new TranslatableBrightChainError(
      context === 'WorkUnit'
        ? BrightChainStrings.Error_PoUW_WorkUnit_MissingFieldTemplate
        : BrightChainStrings.Error_PoUW_WorkResult_MissingFieldTemplate,
      { FIELD: field },
    );
  }
  if (typeof obj[field] !== 'string') {
    throw new TranslatableBrightChainError(
      context === 'WorkUnit'
        ? BrightChainStrings.Error_PoUW_WorkUnit_FieldTypeMismatchTemplate
        : BrightChainStrings.Error_PoUW_WorkResult_FieldTypeMismatchTemplate,
      { FIELD: field, EXPECTED_TYPE: 'string', ACTUAL_TYPE: typeof obj[field] },
    );
  }
}

/**
 * Validate that `obj[field]` exists and is a number.
 * @throws {TranslatableBrightChainError} with a descriptive message on failure.
 */
function requireNumber(
  obj: Record<string, unknown>,
  field: string,
  context: 'WorkUnit' | 'WorkResult',
): void {
  if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
    throw new TranslatableBrightChainError(
      context === 'WorkUnit'
        ? BrightChainStrings.Error_PoUW_WorkUnit_MissingFieldTemplate
        : BrightChainStrings.Error_PoUW_WorkResult_MissingFieldTemplate,
      { FIELD: field },
    );
  }
  if (typeof obj[field] !== 'number') {
    throw new TranslatableBrightChainError(
      context === 'WorkUnit'
        ? BrightChainStrings.Error_PoUW_WorkUnit_FieldTypeMismatchTemplate
        : BrightChainStrings.Error_PoUW_WorkResult_FieldTypeMismatchTemplate,
      { FIELD: field, EXPECTED_TYPE: 'number', ACTUAL_TYPE: typeof obj[field] },
    );
  }
}
