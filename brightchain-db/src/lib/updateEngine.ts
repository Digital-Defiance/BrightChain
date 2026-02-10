/**
 * Update engine – applies MongoDB-style update operators to documents.
 *
 * Supports:
 *   $set, $unset, $inc, $push, $pull, $addToSet,
 *   $min, $max, $rename, $currentDate, $mul, $pop
 */

import { deepEquals } from './queryEngine';
import { BsonDocument, UpdateQuery } from './types';

/**
 * Check whether an update document uses operators ($set, $inc, etc.)
 * vs. being a plain replacement document.
 */
export function isOperatorUpdate<T>(update: UpdateQuery<T>): boolean {
  return Object.keys(update).some((k) => k.startsWith('$'));
}

/**
 * Apply update operators to a document and return the mutated copy.
 * The original document is not modified.
 */
export function applyUpdate<T extends BsonDocument>(
  doc: T,
  update: UpdateQuery<T>,
): T {
  const result = structuredClone(doc) as Record<string, unknown>;

  if (!isOperatorUpdate(update)) {
    // Replacement document – keep _id from original
    const replacement = { ...update } as Record<string, unknown>;
    replacement['_id'] = doc._id;
    return replacement as T;
  }

  const ops = update as Record<string, Record<string, unknown>>;

  // $set
  if (ops['$set']) {
    for (const [key, value] of Object.entries(ops['$set'])) {
      setNestedValue(result, key, value);
    }
  }

  // $unset
  if (ops['$unset']) {
    for (const key of Object.keys(ops['$unset'])) {
      deleteNestedValue(result, key);
    }
  }

  // $inc
  if (ops['$inc']) {
    for (const [key, amount] of Object.entries(ops['$inc'])) {
      const current = getNestedValue(result, key);
      const currentNum = typeof current === 'number' ? current : 0;
      setNestedValue(result, key, currentNum + (amount as number));
    }
  }

  // $mul
  if (ops['$mul']) {
    for (const [key, factor] of Object.entries(ops['$mul'])) {
      const current = getNestedValue(result, key);
      const currentNum = typeof current === 'number' ? current : 0;
      setNestedValue(result, key, currentNum * (factor as number));
    }
  }

  // $min
  if (ops['$min']) {
    for (const [key, value] of Object.entries(ops['$min'])) {
      const current = getNestedValue(result, key);
      if (current === undefined || compareBasic(value, current) < 0) {
        setNestedValue(result, key, value);
      }
    }
  }

  // $max
  if (ops['$max']) {
    for (const [key, value] of Object.entries(ops['$max'])) {
      const current = getNestedValue(result, key);
      if (current === undefined || compareBasic(value, current) > 0) {
        setNestedValue(result, key, value);
      }
    }
  }

  // $push
  if (ops['$push']) {
    for (const [key, value] of Object.entries(ops['$push'])) {
      const current = getNestedValue(result, key);
      const arr = Array.isArray(current) ? [...current] : [];
      arr.push(value);
      setNestedValue(result, key, arr);
    }
  }

  // $pop
  if (ops['$pop']) {
    for (const [key, direction] of Object.entries(ops['$pop'])) {
      const current = getNestedValue(result, key);
      if (Array.isArray(current)) {
        const arr = [...current];
        if ((direction as number) === -1) {
          arr.shift();
        } else {
          arr.pop();
        }
        setNestedValue(result, key, arr);
      }
    }
  }

  // $pull
  if (ops['$pull']) {
    for (const [key, condition] of Object.entries(ops['$pull'])) {
      const current = getNestedValue(result, key);
      if (Array.isArray(current)) {
        const arr = current.filter((item) => !deepEquals(item, condition));
        setNestedValue(result, key, arr);
      }
    }
  }

  // $addToSet
  if (ops['$addToSet']) {
    for (const [key, value] of Object.entries(ops['$addToSet'])) {
      const current = getNestedValue(result, key);
      const arr = Array.isArray(current) ? [...current] : [];
      if (!arr.some((item) => deepEquals(item, value))) {
        arr.push(value);
      }
      setNestedValue(result, key, arr);
    }
  }

  // $rename
  if (ops['$rename']) {
    for (const [oldKey, newKey] of Object.entries(ops['$rename'])) {
      const value = getNestedValue(result, oldKey);
      if (value !== undefined) {
        deleteNestedValue(result, oldKey);
        setNestedValue(result, newKey as string, value);
      }
    }
  }

  // $currentDate
  if (ops['$currentDate']) {
    for (const key of Object.keys(ops['$currentDate'])) {
      setNestedValue(result, key, new Date().toISOString());
    }
  }

  return result as T;
}

// ── Helpers ──

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      !(part in current) ||
      typeof current[part] !== 'object' ||
      current[part] === null
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== 'object' || current[part] === null) return;
    current = current[part] as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]];
}

function compareBasic(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return String(a).localeCompare(String(b));
}
