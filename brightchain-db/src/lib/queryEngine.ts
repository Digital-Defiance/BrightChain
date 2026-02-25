/**
 * Query engine – evaluates MongoDB-style filter queries against documents.
 *
 * Supports:
 *   - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
 *   - Set membership: $in, $nin
 *   - Pattern: $regex
 *   - Existence: $exists
 *   - Array: $elemMatch, $size, $all
 *   - Logical: $and, $or, $nor, $not
 *   - Type: $type
 *   - Text: $text / $search (full-text search across indexed fields)
 */

import { BsonDocument, FilterOperator, FilterQuery } from './types';

/** Reserved operator keys */
const LOGICAL_OPS = new Set(['$and', '$or', '$nor', '$not']);

/** Fields to search for $text queries – set by the collection before querying */
let textSearchFields: string[] = [];

/**
 * Configure which fields are included in $text search.
 * Call this before running a filter that contains $text.
 */
export function setTextSearchFields(fields: string[]): void {
  textSearchFields = fields;
}

/**
 * Get the currently configured text search fields.
 */
export function getTextSearchFields(): string[] {
  return textSearchFields;
}

/**
 * Resolve a potentially nested field path like "address.city" on a document.
 */
function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (!Number.isNaN(idx)) {
        current = current[idx];
      } else {
        // Array implicit iteration – match any element
        const results = current
          .map((item) =>
            typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>)[part]
              : undefined,
          )
          .filter((v) => v !== undefined);
        return results.length === 1
          ? results[0]
          : results.length > 0
            ? results
            : undefined;
      }
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Compare two values for ordering (like MongoDB's BSON comparison).
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  if (typeof a === 'boolean' && typeof b === 'boolean')
    return a === b ? 0 : a ? 1 : -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  // Fallback: stringify comparison
  return String(a).localeCompare(String(b));
}

/**
 * Check if a value matches a filter operator object.
 */
function matchOperator(value: unknown, op: FilterOperator<unknown>): boolean {
  for (const [key, operand] of Object.entries(op)) {
    switch (key) {
      case '$eq':
        if (!deepEquals(value, operand)) return false;
        break;
      case '$ne':
        if (deepEquals(value, operand)) return false;
        break;
      case '$gt':
        if (compareValues(value, operand) <= 0) return false;
        break;
      case '$gte':
        if (compareValues(value, operand) < 0) return false;
        break;
      case '$lt':
        if (compareValues(value, operand) >= 0) return false;
        break;
      case '$lte':
        if (compareValues(value, operand) > 0) return false;
        break;
      case '$in': {
        const arr = operand as unknown[];
        if (!arr.some((item) => deepEquals(value, item))) return false;
        break;
      }
      case '$nin': {
        const arr = operand as unknown[];
        if (arr.some((item) => deepEquals(value, item))) return false;
        break;
      }
      case '$regex': {
        if (typeof value !== 'string') return false;
        const re =
          operand instanceof RegExp ? operand : new RegExp(operand as string);
        if (!re.test(value)) return false;
        break;
      }
      case '$exists':
        if (operand && value === undefined) return false;
        if (!operand && value !== undefined) return false;
        break;
      case '$not':
        if (matchOperator(value, operand as FilterOperator<unknown>))
          return false;
        break;
      case '$elemMatch': {
        if (!Array.isArray(value)) return false;
        const subFilter = operand as Record<string, unknown>;
        if (
          !value.some((elem) =>
            matchesFilter(
              elem as BsonDocument,
              subFilter as FilterQuery<BsonDocument>,
            ),
          )
        ) {
          return false;
        }
        break;
      }
      case '$size':
        if (!Array.isArray(value) || value.length !== (operand as number))
          return false;
        break;
      case '$all': {
        if (!Array.isArray(value)) return false;
        const allItems = operand as unknown[];
        if (!allItems.every((item) => value.some((v) => deepEquals(v, item))))
          return false;
        break;
      }
      case '$type': {
        const expectedType = operand as string;
        if (!matchesType(value, expectedType)) return false;
        break;
      }
      default:
        // Unknown operator – ignore
        break;
    }
  }
  return true;
}

function matchesType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'int':
    case 'long':
    case 'double':
    case 'decimal':
      return typeof value === 'number';
    case 'bool':
      return typeof value === 'boolean';
    case 'object':
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    case 'array':
      return Array.isArray(value);
    case 'null':
      return value === null;
    case 'date':
      return value instanceof Date;
    case 'undefined':
      return value === undefined;
    default:
      return typeof value === expectedType;
  }
}

/**
 * Deep equality check (handles primitives, arrays, plain objects, Dates).
 */
export function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined)
    return a === b;
  if (typeof a !== typeof b) return false;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEquals(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) =>
      deepEquals(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

/**
 * Check if a document matches a filter query.
 */
export function matchesFilter<T extends BsonDocument>(
  doc: T,
  filter: FilterQuery<T>,
): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    // Handle logical operators at the top level
    if (key === '$and') {
      const clauses = condition as FilterQuery<T>[];
      if (!clauses.every((clause) => matchesFilter(doc, clause))) return false;
      continue;
    }
    if (key === '$or') {
      const clauses = condition as FilterQuery<T>[];
      if (!clauses.some((clause) => matchesFilter(doc, clause))) return false;
      continue;
    }
    if (key === '$nor') {
      const clauses = condition as FilterQuery<T>[];
      if (clauses.some((clause) => matchesFilter(doc, clause))) return false;
      continue;
    }
    if (key === '$not') {
      if (matchesFilter(doc, condition as FilterQuery<T>)) return false;
      continue;
    }
    if (key === '$text') {
      const textSpec = condition as Record<string, unknown>;
      const searchStr = (textSpec['$search'] as string) ?? '';
      if (!matchesTextSearch(doc, searchStr)) return false;
      continue;
    }

    if (LOGICAL_OPS.has(key)) continue;

    const value = getNestedValue(doc as Record<string, unknown>, key);

    if (
      condition !== null &&
      typeof condition === 'object' &&
      !Array.isArray(condition) &&
      !(condition instanceof RegExp) &&
      !(condition instanceof Date)
    ) {
      // Check if any keys look like operators
      const condObj = condition as Record<string, unknown>;
      const hasOps = Object.keys(condObj).some((k) => k.startsWith('$'));
      if (hasOps) {
        if (!matchOperator(value, condObj as FilterOperator<unknown>))
          return false;
        continue;
      }
    }

    // Exact match – if the value is in an array, match against array elements (MongoDB behavior)
    if (Array.isArray(value)) {
      if (
        !value.some((v) => deepEquals(v, condition)) &&
        !deepEquals(value, condition)
      ) {
        return false;
      }
    } else {
      if (!deepEquals(value, condition)) return false;
    }
  }
  return true;
}

/**
 * Apply projection to a document.
 */
export function applyProjection<T extends BsonDocument>(
  doc: T,
  projection: Record<string, 0 | 1>,
): Partial<T> {
  const keys = Object.keys(projection);
  if (keys.length === 0) return { ...doc };

  const isInclusion = Object.values(projection).some((v) => v === 1);
  const result: Record<string, unknown> = {};

  if (isInclusion) {
    // Always include _id unless explicitly excluded
    if (projection['_id'] !== 0) {
      result['_id'] = doc._id;
    }
    for (const key of keys) {
      if (key === '_id') continue;
      if (projection[key] === 1) {
        result[key] = getNestedValue(doc as Record<string, unknown>, key);
      }
    }
  } else {
    // Exclusion mode – include everything except excluded fields
    for (const [k, v] of Object.entries(doc)) {
      if (projection[k] === 0) continue;
      result[k] = v;
    }
  }
  return result as Partial<T>;
}

/**
 * Sort an array of documents by a sort specification.
 */
export function sortDocuments<T extends BsonDocument>(
  docs: T[],
  sort: Record<string, 1 | -1>,
): T[] {
  const sortEntries = Object.entries(sort);
  if (sortEntries.length === 0) return docs;

  return [...docs].sort((a, b) => {
    for (const [field, direction] of sortEntries) {
      const va = getNestedValue(a as Record<string, unknown>, field);
      const vb = getNestedValue(b as Record<string, unknown>, field);
      const cmp = compareValues(va, vb);
      if (cmp !== 0) return cmp * direction;
    }
    return 0;
  });
}

// ── Text search ──

/**
 * Tokenize a string into lowercase words (basic whitespace + punctuation split).
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Check whether a document matches a `$text: { $search: ... }` query.
 *
 * When `textSearchFields` is configured, only those fields are searched.
 * Otherwise falls back to searching all string fields in the document.
 *
 * Supports:
 *   - Multiple search terms (OR semantics – any token match)
 *   - Quoted phrases for exact substring matching: `"hello world"`
 *   - Negation with minus prefix: `-unwanted`
 */
function matchesTextSearch(doc: BsonDocument, search: string): boolean {
  if (!search) return true;

  // Collect text from document
  const fieldsToSearch = textSearchFields.length > 0 ? textSearchFields : null;
  const docText = extractText(
    doc as Record<string, unknown>,
    fieldsToSearch,
  ).toLowerCase();

  // Parse search string: quoted phrases, negated terms, and regular terms
  const phrases: string[] = [];
  const negated: string[] = [];
  const tokens: string[] = [];

  // Extract quoted phrases
  const quoteRegex = /"([^"]+)"/g;
  let cleaned = search;
  let match;
  while ((match = quoteRegex.exec(search)) !== null) {
    phrases.push(match[1].toLowerCase());
  }
  cleaned = cleaned.replace(quoteRegex, '').trim();

  // Split remaining into tokens
  for (const word of cleaned.split(/\s+/).filter(Boolean)) {
    if (word.startsWith('-') && word.length > 1) {
      negated.push(word.slice(1).toLowerCase());
    } else {
      tokens.push(word.toLowerCase());
    }
  }

  // Check negated terms (must NOT appear)
  for (const neg of negated) {
    if (docText.includes(neg)) return false;
  }

  // Check quoted phrases (must appear as substring)
  for (const phrase of phrases) {
    if (!docText.includes(phrase)) return false;
  }

  // Check tokens (at least one must match, or if no tokens – phrases already matched)
  if (tokens.length > 0) {
    const docTokens = new Set(tokenize(docText));
    if (!tokens.some((t) => docTokens.has(t))) return false;
  }

  return true;
}

/**
 * Extract all text content from a document for full-text search.
 */
function extractText(
  obj: Record<string, unknown>,
  fields: string[] | null,
  prefix = '',
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      fields &&
      !fields.some((f) => path.startsWith(f) || f.startsWith(path))
    ) {
      continue;
    }

    if (typeof value === 'string') {
      parts.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') parts.push(item);
        else if (typeof item === 'object' && item !== null) {
          parts.push(
            extractText(item as Record<string, unknown>, fields, path),
          );
        }
      }
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !(value instanceof Date)
    ) {
      parts.push(extractText(value as Record<string, unknown>, fields, path));
    }
  }

  return parts.join(' ');
}
