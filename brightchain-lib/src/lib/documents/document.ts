import { TUPLE } from '../constants';
import { DocumentErrorType } from '../enumerations/documentErrorType';
import { DocumentError } from '../errors/document';
import { BlockService } from '../services/blockService';
import { MemberCblService } from '../services/member/memberCblService';
import { ServiceLocator } from '../services/serviceLocator';
import {
  InstanceMethods,
  SchemaDefinition,
  SchemaType,
  SerializedValue,
  StaticMethods,
  ValidatorFunction,
} from '../sharedTypes';

export class Document<T> {
  private data: T;
  private schema?: SchemaDefinition<T>;
  private instanceMethods: InstanceMethods<T>;
  private staticMethods: StaticMethods<T> = {};
  protected static blockService: BlockService | undefined = undefined;

  constructor(
    data: Partial<T>,
    schema?: SchemaDefinition<T>,
    instanceMethods: InstanceMethods<T> = {},
    staticMethods: StaticMethods<T> = {},
  ) {
    this.schema = schema;
    this.data = schema ? this.applyDefaults(data) : (data as T);
    if (schema) {
      this.validateSchema(this.data);
    }
    this.instanceMethods = instanceMethods;
    this.staticMethods = staticMethods;
    Object.assign(this, instanceMethods);
    Object.assign(Document, staticMethods);
  }

  public static initialize(
    blockService: BlockService,
    memberService?: MemberCblService,
  ): void {
    if (Document.blockService) {
      throw new DocumentError(DocumentErrorType.AlreadyInitialized);
    }
    Document.blockService = blockService;
  }

  public applyDefaults(data: Partial<T>): T {
    const defaults: Partial<T> = {};
    for (const key in this.schema) {
      const schemaDef = this.schema[key];
      if (typeof schemaDef === 'object' && 'default' in schemaDef) {
        defaults[key] = data[key] === undefined ? schemaDef.default : data[key];
      } else {
        defaults[key] = data[key];
      }
    }
    return defaults as T;
  }

  public validateType(value: unknown, type: SchemaType): boolean {
    if (type === String) return typeof value === 'string';
    if (type === Number) return typeof value === 'number';
    if (type === Boolean) return typeof value === 'boolean';
    if (type === Object)
      return typeof value === 'object' && !Array.isArray(value);
    if (type === Array) return Array.isArray(value);
    if (type === Date) return value instanceof Date;
    if (typeof type === 'function') {
      // Handle custom validator functions
      if (type.length === 1) {
        return (type as ValidatorFunction)(value);
      }
      // Handle constructor functions
      return value instanceof type;
    }
    return false;
  }

  public validateSchema(data: Partial<T> | undefined): void {
    if (!data) return;
    for (const key in this.schema) {
      const schemaDef = this.schema[key];
      const value = data[key];
      if (Array.isArray(schemaDef)) {
        if (!Array.isArray(value)) {
          throw new Error(`Field ${key} should be an array.`);
        }
        for (const item of value) {
          if (!this.validateType(item, schemaDef[0].type)) {
            throw new Error(`Invalid value in array for ${key}`);
          }
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (schemaDef.required && value === undefined) {
          throw new Error(`Field ${key} is required.`);
        }
        if (value !== undefined && !this.validateType(value, schemaDef.type)) {
          throw new Error(`Field ${key} is invalid.`);
        }
      } else if (typeof schemaDef === 'object' && value !== undefined) {
        this.validateSchema(value as Partial<T>);
      }
    }
  }

  public hydrateData(data: Partial<T>): void {
    if (!this.schema) return;

    for (const key in this.schema) {
      if (!Object.prototype.hasOwnProperty.call(this.schema, key)) continue;

      const schemaDef = this.schema[key];
      const value = data[key];

      if (value === undefined) continue;

      if (typeof schemaDef === 'object' && !Array.isArray(schemaDef)) {
        if ('hydrate' in schemaDef && schemaDef.hydrate) {
          this.data[key as keyof T] = schemaDef.hydrate(value) as T[keyof T];
        } else if ('type' in schemaDef) {
          this.data[key as keyof T] = value as T[keyof T];
        }
      } else if (Array.isArray(schemaDef) && Array.isArray(value)) {
        const hydratedArray = value.map((item) =>
          schemaDef[0].hydrate ? schemaDef[0].hydrate(item) : item,
        );
        this.data[key as keyof T] = hydratedArray as T[keyof T];
      } else {
        this.data[key as keyof T] = value as T[keyof T];
      }
    }
  }

  public static fromJson<U>(
    json: string,
    schema?: SchemaDefinition<U>,
    instanceMethods: InstanceMethods<U> = {},
    staticMethods: StaticMethods<U> = {},
  ): Document<U> {
    const data = JSON.parse(json);
    const document = new Document<U>(
      data,
      schema,
      instanceMethods,
      staticMethods,
    );
    if (schema) {
      document.hydrateData(data);
    }
    return document;
  }

  public toJson(): string {
    const serializedData: Record<string, SerializedValue> = {};

    for (const key in this.data) {
      if (!Object.prototype.hasOwnProperty.call(this.data, key)) continue;

      const value = this.data[key];
      const schemaDef = this.schema?.[key];

      if (value === undefined) continue;

      if (
        schemaDef &&
        typeof schemaDef === 'object' &&
        'serialize' in schemaDef &&
        schemaDef.serialize
      ) {
        serializedData[key] = schemaDef.serialize(value);
      } else if (
        value &&
        typeof value === 'object' &&
        'toJson' in value &&
        typeof value.toJson === 'function'
      ) {
        serializedData[key] = JSON.parse(value.toJson());
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        Array.isArray(value) ||
        (typeof value === 'object' && value !== null)
      ) {
        serializedData[key] = value as SerializedValue;
      }
    }

    return JSON.stringify(serializedData);
  }

  static new<U>(
    data: Partial<U>,
    schema?: SchemaDefinition<U>,
    instanceMethods: InstanceMethods<U> = {},
    staticMethods: StaticMethods<U> = {},
  ): Document<U> {
    return new Document<U>(data, schema, instanceMethods, staticMethods);
  }

  public get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  public set<K extends keyof T>(key: K, value: T[K] | undefined): void {
    if (this.schema) {
      const schemaDef = this.schema[key];
      if (Array.isArray(schemaDef)) {
        if (
          value !== undefined &&
          (!Array.isArray(value) ||
            !value.every((item) => this.validateType(item, schemaDef[0].type)))
        ) {
          throw new Error(`Invalid value for ${String(key)}`);
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (value !== undefined && !this.validateType(value, schemaDef.type)) {
          throw new Error(`Invalid value for ${String(key)}`);
        }
        if (schemaDef.required && value === undefined) {
          throw new Error(`Field ${String(key)} is required.`);
        }
      } else if (typeof schemaDef === 'object' && value !== undefined) {
        this.validateSchema(value as Partial<T>);
      }
    }
    const oldValue = this.data[key];
    const valueChanged =
      // Handle objects with custom equality
      value &&
      typeof value === 'object' &&
      'equals' in value &&
      typeof value.equals === 'function'
        ? !value.equals(oldValue)
        : // Handle all other cases with strict equality
          oldValue !== value;

    if (valueChanged) {
      this._dirty = true;
    }
    this.data[key] = value as T[K];
  }

  /**
   * Saves the document to the database.
   */
  public async save(): Promise<void> {
    if (!Document.blockService) {
      throw new DocumentError(DocumentErrorType.Uninitialized);
    }
    // to be overridden by subclasses
    this._dirty = false;
    const json = Buffer.from(this.toJson());
    const blockSize = ServiceLocator.getServiceProvider().blockService.getBlockSizeForData(json.length);
    const xorResult = Buffer.alloc(blockSize as number);
    let firstBlock = true;
    await ServiceLocator.getServiceProvider().blockService.processFileInChunks(
      json,
      false,
      TUPLE.SIZE,
      async (chunkDatas: Buffer[]) => {
        if (firstBlock) {
          chunkDatas[0].copy(xorResult, 0, 0, blockSize as number);
        }
        for (let i = firstBlock ? 1 : 0; i < chunkDatas.length; i++) {
          for (let j = 0; j < blockSize; j++) {
            xorResult[j] ^= chunkDatas[i][j];
          }
        }
        firstBlock = false;
      },
    );
  }

  /**
   * Deletes the document from the database.
   */
  public async delete(): Promise<void> {
    // to be overridden by subclasses
    this._deleted = true;
  }

  /**
   * Loads the document from the database.
   */
  public async load(): Promise<void> {
    // to be overridden by subclasses
    this._dirty = false;
  }

  /**
   * Returns true if the document has been modified since it was last saved.
   */
  private _dirty = false;
  /**
   * Returns true if the document has been modified since it was last saved.
   */
  public get dirty(): boolean {
    return this._dirty;
  }
  /**
   * Returns true if the document has been deleted.
   */
  private _deleted = false;
  /**
   * Returns true if the document has been deleted.
   */
  public get deleted(): boolean {
    return this._deleted;
  }
}
