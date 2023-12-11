/**
 * Aggregation pipeline engine.
 *
 * Supports stages:
 *   $match, $group, $sort, $limit, $skip, $project,
 *   $unwind, $count, $addFields, $lookup, $replaceRoot, $sample
 */

import { matchesFilter, sortDocuments } from './queryEngine';
import { AggregationStage, BsonDocument, FilterQuery } from './types';

type LookupResolver = (collectionName: string) => Promise<BsonDocument[]>;

/**
 * Run an aggregation pipeline over an array of documents.
 *
 * @param docs - Input documents
 * @param pipeline - Array of aggregation stages
 * @param lookupResolver - Optional resolver for $lookup stages (fetches docs from another collection)
 */
export async function runAggregation(
  docs: BsonDocument[],
  pipeline: AggregationStage[],
  lookupResolver?: LookupResolver,
): Promise<BsonDocument[]> {
  let result = [...docs];

  for (const stage of pipeline) {
    const [op] = Object.keys(stage);
    switch (op) {
      case '$match':
        result = stageMatch(
          result,
          (stage as { $match: Record<string, unknown> }).$match,
        );
        break;
      case '$group':
        result = stageGroup(
          result,
          (stage as { $group: Record<string, unknown> }).$group,
        );
        break;
      case '$sort':
        result = stageSort(
          result,
          (stage as { $sort: Record<string, 1 | -1> }).$sort,
        );
        break;
      case '$limit':
        result = stageLimit(result, (stage as { $limit: number }).$limit);
        break;
      case '$skip':
        result = stageSkip(result, (stage as { $skip: number }).$skip);
        break;
      case '$project':
        result = stageProject(
          result,
          (stage as { $project: Record<string, unknown> }).$project,
        );
        break;
      case '$unwind':
        result = stageUnwind(
          result,
          (
            stage as {
              $unwind:
                | string
                | { path: string; preserveNullAndEmptyArrays?: boolean };
            }
          ).$unwind,
        );
        break;
      case '$count':
        result = stageCount(result, (stage as { $count: string }).$count);
        break;
      case '$addFields':
        result = stageAddFields(
          result,
          (stage as { $addFields: Record<string, unknown> }).$addFields,
        );
        break;
      case '$lookup':
        result = await stageLookup(
          result,
          (
            stage as {
              $lookup: {
                from: string;
                localField: string;
                foreignField: string;
                as: string;
              };
            }
          ).$lookup,
          lookupResolver,
        );
        break;
      case '$replaceRoot':
        result = stageReplaceRoot(
          result,
          (
            stage as {
              $replaceRoot: { newRoot: string | Record<string, unknown> };
            }
          ).$replaceRoot,
        );
        break;
      case '$sample':
        result = stageSample(
          result,
          (stage as { $sample: { size: number } }).$sample,
        );
        break;
      case '$facet':
        result = await stageFacet(
          result,
          (stage as { $facet: Record<string, AggregationStage[]> }).$facet,
          lookupResolver,
        );
        break;
      default:
        // Unknown stage – skip
        break;
    }
  }

  return result;
}

// ── Stage implementations ──

function stageMatch(
  docs: BsonDocument[],
  filter: Record<string, unknown>,
): BsonDocument[] {
  return docs.filter((doc) =>
    matchesFilter(doc, filter as FilterQuery<BsonDocument>),
  );
}

function stageSort(
  docs: BsonDocument[],
  sort: Record<string, 1 | -1>,
): BsonDocument[] {
  return sortDocuments(docs, sort);
}

function stageLimit(docs: BsonDocument[], limit: number): BsonDocument[] {
  return docs.slice(0, limit);
}

function stageSkip(docs: BsonDocument[], skip: number): BsonDocument[] {
  return docs.slice(skip);
}

function stageProject(
  docs: BsonDocument[],
  projection: Record<string, unknown>,
): BsonDocument[] {
  return docs.map((doc) => {
    const result: BsonDocument = {};
    const isInclusion = Object.values(projection).some(
      (v) =>
        v === 1 ||
        v === true ||
        (typeof v === 'object' && v !== null) ||
        (typeof v === 'string' && (v as string).startsWith('$')),
    );

    if (isInclusion) {
      if (projection['_id'] !== 0) result['_id'] = doc['_id'];
      for (const [key, spec] of Object.entries(projection)) {
        if (key === '_id') continue;
        if (spec === 1 || spec === true) {
          result[key] = getNestedValue(doc, key);
        } else if (typeof spec === 'string' && spec.startsWith('$')) {
          // Field reference: $fieldName
          result[key] = getNestedValue(doc, spec.slice(1));
        } else if (typeof spec === 'object' && spec !== null) {
          // Expression object – basic support
          result[key] = evaluateExpression(
            spec as Record<string, unknown>,
            doc,
          );
        }
      }
    } else {
      // Exclusion mode
      for (const [k, v] of Object.entries(doc)) {
        if (projection[k] === 0 || projection[k] === false) continue;
        result[k] = v;
      }
    }
    return result;
  });
}

function stageUnwind(
  docs: BsonDocument[],
  unwindSpec: string | { path: string; preserveNullAndEmptyArrays?: boolean },
): BsonDocument[] {
  const path = typeof unwindSpec === 'string' ? unwindSpec : unwindSpec.path;
  const preserveNulls =
    typeof unwindSpec === 'object' && unwindSpec.preserveNullAndEmptyArrays;
  const fieldPath = path.startsWith('$') ? path.slice(1) : path;

  const result: BsonDocument[] = [];
  for (const doc of docs) {
    const value = getNestedValue(doc, fieldPath);
    if (Array.isArray(value)) {
      if (value.length === 0 && preserveNulls) {
        const unwound = { ...doc };
        setNestedValue(unwound, fieldPath, null);
        result.push(unwound);
      } else {
        for (const item of value) {
          const unwound = { ...doc };
          setNestedValue(unwound, fieldPath, item);
          result.push(unwound);
        }
      }
    } else if (value === undefined || value === null) {
      if (preserveNulls) {
        result.push({ ...doc });
      }
    } else {
      result.push({ ...doc });
    }
  }
  return result;
}

function stageCount(docs: BsonDocument[], countField: string): BsonDocument[] {
  return [{ [countField]: docs.length }];
}

function stageAddFields(
  docs: BsonDocument[],
  fields: Record<string, unknown>,
): BsonDocument[] {
  return docs.map((doc) => {
    const result = { ...doc };
    for (const [key, spec] of Object.entries(fields)) {
      if (typeof spec === 'string' && spec.startsWith('$')) {
        result[key] = getNestedValue(doc, spec.slice(1));
      } else if (typeof spec === 'object' && spec !== null) {
        result[key] = evaluateExpression(spec as Record<string, unknown>, doc);
      } else {
        result[key] = spec;
      }
    }
    return result;
  });
}

async function stageLookup(
  docs: BsonDocument[],
  lookup: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  },
  resolver?: LookupResolver,
): Promise<BsonDocument[]> {
  if (!resolver) {
    // Without a resolver, $lookup is a no-op
    return docs.map((doc) => ({ ...doc, [lookup.as]: [] }));
  }

  const foreignDocs = await resolver(lookup.from);

  return docs.map((doc) => {
    const localVal = getNestedValue(doc, lookup.localField);
    const matched = foreignDocs.filter((fd) => {
      const foreignVal = getNestedValue(fd, lookup.foreignField);
      return deepEq(localVal, foreignVal);
    });
    return { ...doc, [lookup.as]: matched };
  });
}

function stageReplaceRoot(
  docs: BsonDocument[],
  spec: { newRoot: string | Record<string, unknown> },
): BsonDocument[] {
  return docs.map((doc) => {
    if (typeof spec.newRoot === 'string' && spec.newRoot.startsWith('$')) {
      const val = getNestedValue(doc, spec.newRoot.slice(1));
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return val as BsonDocument;
      }
      return doc;
    }
    // TODO: expression evaluation
    return doc;
  });
}

async function stageFacet(
  docs: BsonDocument[],
  facets: Record<string, AggregationStage[]>,
  lookupResolver?: LookupResolver,
): Promise<BsonDocument[]> {
  const result: BsonDocument = {};
  for (const [name, pipeline] of Object.entries(facets)) {
    result[name] = await runAggregation([...docs], pipeline, lookupResolver);
  }
  return [result];
}

function stageSample(
  docs: BsonDocument[],
  spec: { size: number },
): BsonDocument[] {
  const shuffled = [...docs];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, spec.size);
}

function stageGroup(
  docs: BsonDocument[],
  spec: Record<string, unknown>,
): BsonDocument[] {
  const idExpr = spec['_id'];
  const groups = new Map<string, BsonDocument[]>();

  for (const doc of docs) {
    const groupKey = resolveGroupId(doc, idExpr);
    const keyStr = JSON.stringify(groupKey);
    if (!groups.has(keyStr)) {
      groups.set(keyStr, []);
    }
    groups.get(keyStr)!.push(doc);
  }

  const result: BsonDocument[] = [];
  for (const [keyStr, groupDocs] of groups.entries()) {
    const groupId = JSON.parse(keyStr);
    const outputDoc: BsonDocument = { _id: groupId };

    for (const [field, accumulator] of Object.entries(spec)) {
      if (field === '_id') continue;
      if (typeof accumulator === 'object' && accumulator !== null) {
        const accObj = accumulator as Record<string, unknown>;
        const [accOp, accExpr] = Object.entries(accObj)[0] ?? [];
        outputDoc[field] = applyAccumulator(accOp, accExpr, groupDocs);
      }
    }

    result.push(outputDoc);
  }

  return result;
}

// ── Helpers ──

function resolveGroupId(doc: BsonDocument, idExpr: unknown): unknown {
  if (idExpr === null) return null;
  if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
    return getNestedValue(doc, idExpr.slice(1));
  }
  if (typeof idExpr === 'object' && idExpr !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, expr] of Object.entries(
      idExpr as Record<string, unknown>,
    )) {
      if (typeof expr === 'string' && expr.startsWith('$')) {
        result[key] = getNestedValue(doc, expr.slice(1));
      } else {
        result[key] = expr;
      }
    }
    return result;
  }
  return idExpr;
}

function applyAccumulator(
  op: string,
  expr: unknown,
  docs: BsonDocument[],
): unknown {
  const values = docs.map((d) => resolveFieldRef(d, expr));

  switch (op) {
    case '$sum': {
      if (typeof expr === 'number') return expr * docs.length;
      return values.reduce(
        (acc: number, v) => acc + (typeof v === 'number' ? v : 0),
        0,
      );
    }
    case '$avg': {
      const nums = values.filter((v) => typeof v === 'number') as number[];
      return nums.length > 0
        ? nums.reduce((a, b) => a + b, 0) / nums.length
        : null;
    }
    case '$min': {
      const nums = values.filter((v) => v !== undefined && v !== null);
      return nums.length > 0
        ? nums.reduce((a, b) => (a !== undefined && a < b ? a : b))
        : null;
    }
    case '$max': {
      const nums = values.filter((v) => v !== undefined && v !== null);
      return nums.length > 0
        ? nums.reduce((a, b) => (a !== undefined && a > b ? a : b))
        : null;
    }
    case '$first':
      return values.length > 0 ? values[0] : null;
    case '$last':
      return values.length > 0 ? values[values.length - 1] : null;
    case '$push':
      return values;
    case '$addToSet':
      return [...new Set(values.map((v) => JSON.stringify(v)))].map((s) =>
        JSON.parse(s),
      );
    case '$count':
      return docs.length;
    default:
      return null;
  }
}

function resolveFieldRef(doc: BsonDocument, expr: unknown): unknown {
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getNestedValue(doc, expr.slice(1));
  }
  if (typeof expr === 'number') return expr;
  return expr;
}

function evaluateExpression(
  expr: Record<string, unknown>,
  doc: BsonDocument,
): unknown {
  // Basic expression support
  if ('$concat' in expr) {
    const parts = expr['$concat'] as unknown[];
    return parts
      .map((p) => {
        if (typeof p === 'string' && p.startsWith('$'))
          return String(getNestedValue(doc, p.slice(1)) ?? '');
        return String(p);
      })
      .join('');
  }
  if ('$toLower' in expr) {
    const val = resolveFieldRef(doc, expr['$toLower']);
    return typeof val === 'string' ? val.toLowerCase() : val;
  }
  if ('$toUpper' in expr) {
    const val = resolveFieldRef(doc, expr['$toUpper']);
    return typeof val === 'string' ? val.toUpperCase() : val;
  }
  if ('$add' in expr) {
    const parts = expr['$add'] as unknown[];
    return parts.reduce((acc: number, p) => {
      const v = typeof p === 'number' ? p : Number(resolveFieldRef(doc, p));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  }
  if ('$subtract' in expr) {
    const [a, b] = expr['$subtract'] as unknown[];
    const va = typeof a === 'number' ? a : Number(resolveFieldRef(doc, a));
    const vb = typeof b === 'number' ? b : Number(resolveFieldRef(doc, b));
    return va - vb;
  }
  if ('$multiply' in expr) {
    const parts = expr['$multiply'] as unknown[];
    return parts.reduce((acc: number, p) => {
      const v = typeof p === 'number' ? p : Number(resolveFieldRef(doc, p));
      return acc * (isNaN(v) ? 0 : v);
    }, 1);
  }
  if ('$divide' in expr) {
    const [a, b] = expr['$divide'] as unknown[];
    const va = typeof a === 'number' ? a : Number(resolveFieldRef(doc, a));
    const vb = typeof b === 'number' ? b : Number(resolveFieldRef(doc, b));
    return vb !== 0 ? va / vb : null;
  }
  if ('$cond' in expr) {
    const cond = expr['$cond'];
    if (Array.isArray(cond) && cond.length === 3) {
      const [ifExpr, thenExpr, elseExpr] = cond;
      const test = resolveFieldRef(doc, ifExpr);
      return test
        ? resolveFieldRef(doc, thenExpr)
        : resolveFieldRef(doc, elseExpr);
    }
  }
  return expr;
}

function getNestedValue(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = doc;
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

function deepEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined)
    return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}
