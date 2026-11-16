/**
 * Comparing a step's actual value to its expectation. Adapters normalize
 * representation only; all semantic comparison happens here, so the rules
 * are identical for every runtime.
 */
import type { Json, Ordering } from './types';

const GENERATED_ID = /^[0-9a-f]{32}$/u;
/** `"$id:name"` and `"$bind:name"`: a value tied to every other use of `name`. */
const CAPTURE = /^\$(id|bind):([A-Za-z_][\w-]*)$/u;

/** The values captured so far in one case, by name, as canonical JSON. */
export type Captures = Map<string, string>;

/** A stable string for any JSON value, with object keys sorted. */
export function canonicalJson(value: Json | undefined): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

/**
 * Describe the first difference between `actual` and `expected`, or return
 * null when they match. Wildcards in `expected`: `"$any"`, `"$id"`, and an
 * object with `"$partial": true`. A capture, `"$id:name"` or `"$bind:name"`,
 * binds `name` to the actual value the first time it is seen and requires the
 * same value everywhere else; pass one `captures` map for a whole case to tie
 * its steps together. With `unordered`, only the value being
 * compared is treated as a result set: when it is an array, its items match
 * as a multiset. Everything nested inside an item (array fields of a
 * document, the field list of an index) is compared in order, because only
 * result sets are unordered (requirement 18.2).
 */
export function diff(
  actual: Json | undefined,
  expected: Json,
  ordering: Ordering,
  path = '$',
  captures: Captures = new Map(),
): string | null {
  if (expected === '$any') return null;
  if (expected === '$id') {
    return typeof actual === 'string' && GENERATED_ID.test(actual)
      ? null
      : `${path}: expected a generated 32-hex id, got ${canonicalJson(actual)}`;
  }
  const capture = typeof expected === 'string' ? CAPTURE.exec(expected) : null;
  if (capture) {
    const [, kind, name] = capture;
    if (
      kind === 'id' &&
      !(typeof actual === 'string' && GENERATED_ID.test(actual))
    ) {
      return `${path}: expected a generated 32-hex id for ${name}, got ${canonicalJson(actual)}`;
    }
    const seen = canonicalJson(actual);
    const bound = captures.get(name);
    if (bound === undefined) {
      captures.set(name, seen);
      return null;
    }
    return bound === seen
      ? null
      : `${path}: expected the value captured as ${name} (${bound}), got ${seen}`;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return `${path}: expected an array, got ${canonicalJson(actual)}`;
    }
    if (actual.length !== expected.length) {
      return `${path}: expected ${expected.length} items, got ${actual.length} (${canonicalJson(actual)})`;
    }
    if (ordering === 'unordered') {
      return diffMultiset(actual, expected, path, captures);
    }
    for (const [index, item] of expected.entries()) {
      const found = diff(
        actual[index],
        item,
        'strict',
        `${path}[${index}]`,
        captures,
      );
      if (found) return found;
    }
    return null;
  }
  if (expected !== null && typeof expected === 'object') {
    if (
      actual === null ||
      typeof actual !== 'object' ||
      Array.isArray(actual)
    ) {
      return `${path}: expected an object, got ${canonicalJson(actual)}`;
    }
    const { $partial: partial, ...rest } = expected as { [key: string]: Json };
    const expectedKeys = Object.keys(rest);
    if (partial !== true) {
      const extra = Object.keys(actual).filter((key) => !(key in rest));
      if (extra.length > 0) {
        return `${path}: unexpected keys ${extra.join(', ')} in ${canonicalJson(actual)}`;
      }
    }
    for (const key of expectedKeys) {
      if (!(key in actual))
        return `${path}.${key}: missing in ${canonicalJson(actual)}`;
      const found = diff(
        actual[key],
        rest[key],
        'strict',
        `${path}.${key}`,
        captures,
      );
      if (found) return found;
    }
    return null;
  }
  return canonicalJson(actual) === canonicalJson(expected)
    ? null
    : `${path}: expected ${canonicalJson(expected)}, got ${canonicalJson(actual)}`;
}

/** Match each expected item to a distinct actual item, in any order. */
function diffMultiset(
  actual: Json[],
  expected: Json[],
  path: string,
  captures: Captures,
): string | null {
  const remaining = [...actual];
  for (const [index, item] of expected.entries()) {
    let matched = -1;
    for (const [at, candidate] of remaining.entries()) {
      // Bind captures on a copy, so a candidate that fails binds nothing.
      const trial = new Map(captures);
      if (diff(candidate, item, 'strict', path, trial) === null) {
        for (const [name, value] of trial) captures.set(name, value);
        matched = at;
        break;
      }
    }
    if (matched < 0) {
      return `${path}[${index}]: no unmatched item equals ${canonicalJson(item)} in ${canonicalJson(actual)}`;
    }
    remaining.splice(matched, 1);
  }
  return null;
}
