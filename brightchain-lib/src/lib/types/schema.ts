/**
 * Schema type definitions for Document validation and serialization.
 * Extracted to avoid circular dependencies with Document class.
 */

export type ValidatorFunction = (value: unknown) => boolean;

export type SchemaType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor
  | DateConstructor
  | ValidatorFunction;

export type SerializedValue =
  | string
  | number
  | boolean
  | null
  | SerializedValue[]
  | { [key: string]: SerializedValue };

export type SchemaTypeOptions<T> = {
  type: SchemaType;
  required?: boolean;
  default?: T;
  serialize?: (value: T) => SerializedValue;
  hydrate?: (value: string) => T;
};

export type SchemaDefinition<T> = {
  [K in keyof T]:
    | SchemaTypeOptions<T[K]>
    | SchemaTypeOptions<T[K]>[]
    | SchemaDefinition<T[K]>;
};

// Forward declaration to avoid circular dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocumentType<T = any> = {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K] | undefined): void;
  getData(): T;
  setData(data: T): void;
  toJson(): string;
  save(): Promise<void>;
  load(): Promise<void>;
  delete(): Promise<void>;
  dirty: boolean;
  deleted: boolean;
};

export type InstanceMethods<T> = {
  [key: string]: (this: DocumentType<T>, ...args: unknown[]) => unknown;
};

export type StaticMethods<T> = {
  [key: string]: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this: any,
    ...args: unknown[]
  ) => DocumentType<T> | Promise<DocumentType<T>> | unknown;
};
