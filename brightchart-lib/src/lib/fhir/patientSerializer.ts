/**
 * FHIR R4 Patient Serializer
 *
 * Implements `IPatientSerializer` for serializing `IPatientResource` objects
 * to FHIR-compliant JSON and deserializing FHIR JSON back to
 * `IPatientResource` objects.
 *
 * Key behaviors:
 * - Omits undefined/null fields from serialized output
 * - Formats Date objects as ISO 8601 dateTime strings with timezone
 * - Preserves FHIR R4 date strings (YYYY, YYYY-MM, YYYY-MM-DD) as-is
 * - Preserves unrecognized fields in extensions
 * - Returns descriptive errors for invalid JSON
 * - Round-trip: serialize → deserialize → serialize produces identical JSON
 *
 * @see https://build.fhir.org/patient.html
 * @see https://build.fhir.org/datatypes.html#date
 * @module fhir/patientSerializer
 */

import { IPatientResource } from './patientResource';

/**
 * Interface for patient serialization/deserialization.
 */
export interface IPatientSerializer {
  /** Serialize a Patient resource to FHIR-compliant JSON string */
  serialize(patient: IPatientResource): string;
  /** Deserialize a FHIR JSON string to a Patient resource */
  deserialize(json: string): IPatientResource;
}

/** Known top-level FHIR R4 Patient fields */
const KNOWN_PATIENT_FIELDS = new Set([
  'resourceType',
  'id',
  'meta',
  'text',
  'extension',
  'identifier',
  'active',
  'name',
  'telecom',
  'gender',
  'birthDate',
  'deceasedBoolean',
  'deceasedDateTime',
  'address',
  'maritalStatus',
  'multipleBirthBoolean',
  'multipleBirthInteger',
  'contact',
  'communication',
  'generalPractitioner',
  'managingOrganization',
  'link',
  'brightchainMetadata',
]);

/**
 * Custom JSON replacer that omits null/undefined values and
 * converts Date objects to ISO 8601 strings.
 */
function cleanReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined; // omit from JSON output
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return undefined;
    }
    return value.toISOString();
  }
  return value;
}

/**
 * Recursively strip null/undefined from a plain object,
 * converting Date objects to ISO strings.
 */
function stripNullish(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (obj instanceof Date) {
    if (isNaN(obj.getTime())) {
      return undefined; // omit invalid dates
    }
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj
      .map((item) => stripNullish(item))
      .filter((item) => item !== undefined);
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      const cleaned = stripNullish(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return obj;
}

/**
 * Recursively reconstruct Date objects from ISO 8601 dateTime strings
 * in brightchainMetadata fields (createdAt, updatedAt).
 */
function reconstructDates(obj: Record<string, unknown>): void {
  if (
    obj['brightchainMetadata'] &&
    typeof obj['brightchainMetadata'] === 'object'
  ) {
    const meta = obj['brightchainMetadata'] as Record<string, unknown>;
    if (typeof meta['createdAt'] === 'string') {
      meta['createdAt'] = new Date(meta['createdAt']);
    }
    if (typeof meta['updatedAt'] === 'string') {
      meta['updatedAt'] = new Date(meta['updatedAt']);
    }
  }
}

/**
 * Move unrecognized top-level fields into the extensions array.
 */
function preserveUnrecognizedAsExtensions(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const extraExtensions: Array<{ url: string; [key: string]: unknown }> = [];

  for (const [key, value] of Object.entries(obj)) {
    if (KNOWN_PATIENT_FIELDS.has(key)) {
      result[key] = value;
    } else {
      // Preserve as extension
      extraExtensions.push({
        url: `urn:brightchart:unrecognized:${key}`,
        valueString: typeof value === 'string' ? value : JSON.stringify(value),
      });
    }
  }

  if (extraExtensions.length > 0) {
    const existing = Array.isArray(result['extension'])
      ? (result['extension'] as Array<{ url: string; [key: string]: unknown }>)
      : [];
    result['extension'] = [...existing, ...extraExtensions];
  }

  return result;
}

/**
 * Default implementation of IPatientSerializer.
 */
export class PatientSerializer implements IPatientSerializer {
  /**
   * Serialize a Patient resource to FHIR-compliant JSON.
   *
   * - Omits undefined/null fields
   * - Converts Date objects to ISO 8601 strings
   * - Preserves FHIR date strings as-is
   */
  serialize(patient: IPatientResource): string {
    const cleaned = stripNullish(patient);
    return JSON.stringify(cleaned, cleanReplacer);
  }

  /**
   * Deserialize a FHIR JSON string to a Patient resource.
   *
   * - Validates required `resourceType` field
   * - Reconstructs Date objects for brightchainMetadata timestamps
   * - Moves unrecognized fields into extensions
   * - Returns descriptive errors for invalid JSON
   */
  deserialize(json: string): IPatientResource {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      const message =
        err instanceof SyntaxError ? err.message : 'Unknown parse error';
      throw new Error(`Invalid JSON: ${message}`);
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        'Invalid Patient resource: expected a JSON object, got ' +
          (Array.isArray(parsed) ? 'array' : typeof parsed),
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (obj['resourceType'] !== 'Patient') {
      throw new Error(
        `Invalid Patient resource: expected resourceType "Patient", got "${String(obj['resourceType'] ?? 'undefined')}"`,
      );
    }

    // Move unrecognized fields into extensions
    const normalized = preserveUnrecognizedAsExtensions(obj);

    // Reconstruct Date objects from ISO strings
    reconstructDates(normalized);

    return normalized as unknown as IPatientResource;
  }
}
