/**
 * In-memory index engine for fast document lookups.
 *
 * Supports single-field and compound indexes with optional uniqueness.
 * Indexes are stored as sorted maps from stringified key values to sets of document IDs.
 */

import { BsonDocument, DocumentId, IndexOptions, IndexSpec } from './types';

/**
 * Represents a single index on a collection.
 */
export class CollectionIndex {
  /** Name of the index */
  public readonly name: string;
  /** Fields and sort direction */
  public readonly spec: IndexSpec;
  /** Whether the index enforces uniqueness */
  public readonly unique: boolean;
  /** Whether to skip documents missing the indexed field */
  public readonly sparse: boolean;

  /**
   * Map from stringified key → Set of document IDs.
   * For unique indexes the set will have at most 1 entry.
   */
  private readonly entries = new Map<string, Set<DocumentId>>();

  constructor(spec: IndexSpec, options: IndexOptions = {}) {
    this.spec = spec;
    this.unique = options.unique ?? false;
    this.sparse = options.sparse ?? false;
    this.name =
      options.name ??
      Object.entries(spec)
        .map(([k, v]) => `${k}_${v}`)
        .join('_');
  }

  /**
   * Extract the index key from a document.
   * Returns `undefined` if the document is missing a required field (and the index is sparse).
   */
  private extractKey(doc: BsonDocument): string | undefined {
    const parts: unknown[] = [];
    for (const field of Object.keys(this.spec)) {
      const value = getNestedValue(doc as Record<string, unknown>, field);
      if (value === undefined && this.sparse) return undefined;
      parts.push(value ?? null);
    }
    return JSON.stringify(parts);
  }

  /**
   * Add a document to the index.
   * @throws Error if the index is unique and a duplicate key is found.
   */
  addDocument(doc: BsonDocument): void {
    const key = this.extractKey(doc);
    if (key === undefined) return; // sparse index – skip

    const docId = doc._id;
    if (!docId) return;

    if (this.unique) {
      const existing = this.entries.get(key);
      if (existing && existing.size > 0) {
        // Allow re-indexing the same document
        if (!existing.has(docId)) {
          throw new DuplicateKeyError(this.name, key);
        }
      }
    }

    if (!this.entries.has(key)) {
      this.entries.set(key, new Set());
    }
    this.entries.get(key)!.add(docId);
  }

  /**
   * Remove a document from the index.
   */
  removeDocument(doc: BsonDocument): void {
    const key = this.extractKey(doc);
    if (key === undefined) return;
    const docId = doc._id;
    if (!docId) return;

    const set = this.entries.get(key);
    if (set) {
      set.delete(docId);
      if (set.size === 0) this.entries.delete(key);
    }
  }

  /**
   * Look up document IDs by exact field values.
   * Returns `undefined` if the query cannot use this index.
   */
  lookup(query: Record<string, unknown>): Set<DocumentId> | undefined {
    const fields = Object.keys(this.spec);

    // Check that the query has exact equality on all index fields
    const parts: unknown[] = [];
    for (const field of fields) {
      if (!(field in query)) return undefined;
      const cond = query[field];
      // Only support exact match for index lookup (not operator queries)
      if (
        typeof cond === 'object' &&
        cond !== null &&
        !Array.isArray(cond) &&
        !(cond instanceof Date) &&
        !(cond instanceof RegExp)
      ) {
        // Check for $eq operator
        const condObj = cond as Record<string, unknown>;
        if ('$eq' in condObj) {
          parts.push(condObj['$eq'] ?? null);
          continue;
        }
        return undefined; // Complex operator – can't use this index
      }
      parts.push(cond ?? null);
    }

    const key = JSON.stringify(parts);
    return this.entries.get(key);
  }

  /**
   * Get all document IDs in the index.
   */
  allIds(): Set<DocumentId> {
    const all = new Set<DocumentId>();
    for (const set of this.entries.values()) {
      for (const id of set) all.add(id);
    }
    return all;
  }

  /**
   * Clear the index.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get the number of entries in the index.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Serialize the index metadata for persistence.
   */
  toJSON(): {
    name: string;
    spec: IndexSpec;
    unique: boolean;
    sparse: boolean;
  } {
    return {
      name: this.name,
      spec: this.spec,
      unique: this.unique,
      sparse: this.sparse,
    };
  }
}

/**
 * Manages multiple indexes for a collection.
 */
export class IndexManager {
  private readonly indexes = new Map<string, CollectionIndex>();

  /**
   * Create a new index.
   * @returns The name of the created index.
   * @throws Error if an index with the same name already exists with different options.
   */
  createIndex(spec: IndexSpec, options: IndexOptions = {}): string {
    const index = new CollectionIndex(spec, options);

    if (this.indexes.has(index.name)) {
      const existing = this.indexes.get(index.name)!;
      if (JSON.stringify(existing.spec) !== JSON.stringify(spec)) {
        throw new Error(
          `Index "${index.name}" already exists with a different spec`,
        );
      }
      return index.name;
    }

    this.indexes.set(index.name, index);
    return index.name;
  }

  /**
   * Drop an index by name.
   */
  dropIndex(name: string): boolean {
    return this.indexes.delete(name);
  }

  /**
   * Get all index names.
   */
  listIndexes(): string[] {
    return Array.from(this.indexes.keys());
  }

  /**
   * Get an index by name.
   */
  getIndex(name: string): CollectionIndex | undefined {
    return this.indexes.get(name);
  }

  /**
   * Index a document in all indexes.
   * @throws DuplicateKeyError if a unique constraint is violated.
   */
  addDocument(doc: BsonDocument): void {
    // Validate first (so we don't partially index if one fails)
    const toAdd: CollectionIndex[] = [];
    for (const index of this.indexes.values()) {
      toAdd.push(index);
    }
    // Add to all
    for (const index of toAdd) {
      index.addDocument(doc);
    }
  }

  /**
   * Remove a document from all indexes.
   */
  removeDocument(doc: BsonDocument): void {
    for (const index of this.indexes.values()) {
      index.removeDocument(doc);
    }
  }

  /**
   * Rebuild all indexes from a set of documents.
   */
  rebuildAll(docs: BsonDocument[]): void {
    for (const index of this.indexes.values()) {
      index.clear();
      for (const doc of docs) {
        index.addDocument(doc);
      }
    }
  }

  /**
   * Try to find an index that can serve the given query filter.
   * Returns the set of matching document IDs if an index applies, otherwise undefined.
   */
  findCandidates(filter: Record<string, unknown>): Set<DocumentId> | undefined {
    for (const index of this.indexes.values()) {
      const ids = index.lookup(filter);
      if (ids !== undefined) return ids;
    }
    return undefined;
  }

  /**
   * Serialize all index metadata for persistence.
   */
  toJSON(): Array<{
    name: string;
    spec: IndexSpec;
    unique: boolean;
    sparse: boolean;
  }> {
    return Array.from(this.indexes.values()).map((idx) => idx.toJSON());
  }

  /**
   * Restore indexes from serialized metadata and rebuild from docs.
   */
  restoreFromJSON(
    metadata: Array<{
      name: string;
      spec: IndexSpec;
      unique: boolean;
      sparse: boolean;
    }>,
    docs: BsonDocument[],
  ): void {
    for (const meta of metadata) {
      this.createIndex(meta.spec, {
        name: meta.name,
        unique: meta.unique,
        sparse: meta.sparse,
      });
    }
    this.rebuildAll(docs);
  }
}

// ── Errors ──

export class DuplicateKeyError extends Error {
  public readonly indexName: string;
  public readonly keyValue: string;

  constructor(indexName: string, keyValue: string) {
    super(
      `E11000 duplicate key error collection: index "${indexName}" dup key: ${keyValue}`,
    );
    this.name = 'DuplicateKeyError';
    this.indexName = indexName;
    this.keyValue = keyValue;
  }
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
