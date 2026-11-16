/**
 * The BrightDB v2.5 capability matrix. A capability is advertised by an
 * adapter and required by corpus cases. The inventory test fails when an
 * advertised capability has no positive, boundary, and error case.
 *
 * Phase 1 lists what v2 does today. Later phases append their capabilities
 * here in the same commit that adds the feature, so the matrix never claims
 * something that is not built.
 */
import type { CapabilityDef } from './types';

export const CAPABILITIES: readonly CapabilityDef[] = [
  {
    id: 'lifecycle.reopen',
    family: 'lifecycle',
    description: 'Close and reopen a database and see the same state',
  },
  {
    id: 'collection.lifecycle',
    family: 'docs',
    description: 'Create and drop collections, including recreate after drop',
  },
  {
    id: 'docs.insert',
    family: 'docs',
    description: 'insertOne and insertMany with generated or explicit _id',
  },
  {
    id: 'docs.replaceById',
    family: 'docs',
    description: 'Replace a document by _id; _id is immutable',
  },
  {
    id: 'docs.deleteById',
    family: 'docs',
    description: 'Delete a document by _id',
  },
  {
    id: 'docs.read',
    family: 'docs',
    description: 'findById, findOne and find with the current filter subset',
  },
  {
    id: 'batch.atomic',
    family: 'bulk-tx',
    description: 'writeBatch publishes all operations as one commit or none',
  },
  {
    id: 'index.basic',
    family: 'index-agg',
    description:
      'Create, drop, list and query ordered indexes, kept current by writes',
  },
  {
    id: 'history.snapshot',
    family: 'history-files',
    description: 'Save a root and read the database as it was at that root',
  },
  {
    id: 'replication.merge',
    family: 'replication',
    description: 'Fork a replica, write on both sides, merge to equal roots',
  },
];

export function capabilityIds(): string[] {
  return CAPABILITIES.map((capability) => capability.id);
}
