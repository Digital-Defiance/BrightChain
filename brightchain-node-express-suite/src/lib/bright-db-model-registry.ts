/**
 * @fileoverview BrightDB model registry — singleton for managing BrightDB
 * collection registrations. Parallel to upstream's ModelRegistry.
 *
 * @module bright-db-model-registry
 */

import type { CollectionSchema } from '@digitaldefiance/suite-core-lib';
import type { BrightDbCollection } from './services/bright-db-collection';

/**
 * Registration entry for a BrightDB collection.
 */
export interface BrightDbModelRegistration {
  collectionName: string;
  schema?: CollectionSchema;
  collection: BrightDbCollection;
}

/**
 * Singleton registry for BrightDB collections.
 * Manages collection registration and retrieval across the application.
 * Parallel to upstream's ModelRegistry for Mongoose models.
 */
export class BrightDbModelRegistry {
  private static _instance: BrightDbModelRegistry;
  private readonly _models = new Map<string, BrightDbModelRegistration>();

  private constructor() {}

  /**
   * Gets the singleton instance of BrightDbModelRegistry.
   */
  static get instance(): BrightDbModelRegistry {
    if (!BrightDbModelRegistry._instance) {
      BrightDbModelRegistry._instance = new BrightDbModelRegistry();
    }
    return BrightDbModelRegistry._instance;
  }

  /**
   * Creates an isolated registry instance (useful for testing).
   */
  static createIsolated(): BrightDbModelRegistry {
    return new BrightDbModelRegistry();
  }

  /**
   * Registers a collection with the registry.
   */
  register(registration: BrightDbModelRegistration): void {
    this._models.set(registration.collectionName, registration);
  }

  /**
   * Retrieves a collection registration by name.
   * @throws {Error} If the collection is not registered.
   */
  get(modelName: string): BrightDbModelRegistration {
    const reg = this._models.get(modelName);
    if (!reg) {
      throw new Error(
        `Model '${modelName}' is not registered in BrightDbModelRegistry.`,
      );
    }
    return reg;
  }

  /**
   * Checks if a collection is registered.
   */
  has(modelName: string): boolean {
    return this._models.has(modelName);
  }

  /**
   * Lists all registered collection names.
   */
  list(): string[] {
    return Array.from(this._models.keys());
  }

  /**
   * Clears all registrations (useful for testing).
   */
  clear(): void {
    this._models.clear();
  }
}
