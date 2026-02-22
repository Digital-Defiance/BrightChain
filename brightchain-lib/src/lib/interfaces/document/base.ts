/**
 * @fileoverview Base document interface for BrightChain models.
 * Provides common document structure for all database models.
 * @module documents/base
 */

import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { Document } from '../../documents';

/**
 * Schema for converting between storage and hydrated formats
 */
export interface IHydrationSchema<TStorage, THydrated> {
  /**
   * Convert from storage format to hydrated format
   */
  hydrate: (storage: TStorage) => THydrated;

  /**
   * Convert from hydrated format back to storage format
   */
  dehydrate: (hydrated: THydrated) => TStorage;
}

/**
 * Factory for converting between hydrated and operational formats
 */
export interface IOperationalFactory<THydrated, TOperational> {
  /**
   * Create operational object from hydrated data
   */
  create: (hydrated: THydrated) => TOperational;

  /**
   * Extract hydrated data from operational object
   */
  extract: (operational: TOperational) => THydrated;
}

/**
 * Provider for injecting private data during hydration
 */
export interface IPrivateDataProvider<T> {
  /**
   * Provide private data to be merged with hydrated data
   */
  providePrivateData: (hydrated: T) => Partial<T>;
}

/**
 * Base document interface
 */
export interface IDocument<TStorage, _THydrated, TOperational> {
  /**
   * Convert from storage format to operational object
   */
  fromStorage: (storage: TStorage) => TOperational;

  /**
   * Convert from operational object to storage format
   */
  toStorage: (operational: TOperational) => TStorage;

  /**
   * Save document to storage
   */
  save: (operational: TOperational) => Promise<void>;

  /**
   * Load document from storage
   */
  load: () => Promise<TOperational>;

  /**
   * Delete document from storage
   */
  delete: (operational: TOperational) => Promise<void>;
}

/**
 * Document with private data support
 */
export interface IPrivateDocument<
  TStorage,
  THydrated,
  TOperational,
> extends IDocument<TStorage, THydrated, TOperational> {
  /**
   * Set private data provider
   */
  setPrivateDataProvider: (provider: IPrivateDataProvider<THydrated>) => void;

  /**
   * Clear private data provider
   */
  clearPrivateDataProvider: () => void;
}

/**
 * Base document interface combining Mongoose Document with custom type.
 * @template T - Document data type
 * @template TID - Platform ID type (defaults to Buffer)
 * @typedef {Document<I> & T} BaseDocument
 */
export type BaseDocument<
  T,
  TID extends PlatformID = Uint8Array,
> = Document<TID> & T;
