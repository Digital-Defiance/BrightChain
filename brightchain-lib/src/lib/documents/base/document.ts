import { TUPLE } from '../../constants';
import { BrightChainStrings } from '../../enumerations';
import { DocumentErrorType } from '../../enumerations/documentErrorType';
import { DocumentError } from '../../errors/document';
import { NotImplementedError } from '../../errors/notImplemented';
import { TranslatableBrightChainError } from '../../errors/translatableBrightChainError';
import {
  IHydrationSchema,
  IOperationalFactory,
  IPrivateDataProvider,
} from '../../interfaces/document/base';
import { BlockService } from '../../services/blockService';
import { MemberCblService } from '../../services/member/memberCblService';
import { ServiceLocator } from '../../services/serviceLocator';
import { XorService } from '../../services/xor';
import {
  InstanceMethods,
  SchemaDefinition,
  SchemaType,
  SerializedValue,
  StaticMethods,
  ValidatorFunction,
} from '../../types/schema';

/**
 * Unified Document base class combining schema validation, serialization, and convertible patterns
 * Built for BrightChain's owner-free filesystem blockstore
 */
export class Document<T> {
  private data: T;
  private schema?: SchemaDefinition<T>;
  private instanceMethods: InstanceMethods<T>;
  private staticMethods: StaticMethods<T> = {};
  protected static blockService: BlockService | undefined = undefined;
  private _dirty = false;
  private _deleted = false;

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
    _memberService?: MemberCblService,
  ): void {
    if (Document.blockService) {
      throw new DocumentError(DocumentErrorType.AlreadyInitialized);
    }
    Document.blockService = blockService;
  }

  // Schema and validation methods
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
      if (type.length === 1) {
        return (type as ValidatorFunction)(value);
      }
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
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate,
            { FIELD: key },
          );
        }
        for (const item of value) {
          if (!this.validateType(item, schemaDef[0].type)) {
            throw new TranslatableBrightChainError(
              BrightChainStrings.Error_Document_InvalidValueInArrayTemplate,
              { KEY: key },
            );
          }
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (schemaDef.required && value === undefined) {
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_FieldIsRequiredTemplate,
            { FIELD: key },
          );
        }
        if (value !== undefined && !this.validateType(value, schemaDef.type)) {
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_FieldIsInvalidTemplate,
            { FIELD: key },
          );
        }
      } else if (typeof schemaDef === 'object' && value !== undefined) {
        this.validateSchema(value as Partial<T>);
      }
    }
  }

  // Data access methods
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
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_InvalidValueTemplate,
            { FIELD: String(key) },
          );
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (value !== undefined && !this.validateType(value, schemaDef.type)) {
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_InvalidValueTemplate,
            { FIELD: String(key) },
          );
        }
        if (schemaDef.required && value === undefined) {
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_Document_FieldIsRequiredTemplate,
            { FIELD: String(key) },
          );
        }
      } else if (typeof schemaDef === 'object' && value !== undefined) {
        this.validateSchema(value as Partial<T>);
      }
    }

    const oldValue = this.data[key];
    const valueChanged =
      value &&
      typeof value === 'object' &&
      'equals' in value &&
      typeof value.equals === 'function'
        ? !value.equals(oldValue)
        : oldValue !== value;

    if (valueChanged) {
      this._dirty = true;
    }
    this.data[key] = value as T[K];
  }

  public getData(): T {
    return this.data;
  }

  public setData(data: T): void {
    this.data = data;
    this._dirty = true;
  }

  // Serialization methods
  public hydrateData(data: Partial<T>): void {
    if (!this.schema) return;

    for (const key in this.schema) {
      if (!Object.prototype.hasOwnProperty.call(this.schema, key)) continue;

      const schemaDef = this.schema[key];
      const value = data[key];

      if (value === undefined) continue;

      if (typeof schemaDef === 'object' && !Array.isArray(schemaDef)) {
        if ('hydrate' in schemaDef && schemaDef.hydrate) {
          this.data[key as keyof T] = schemaDef.hydrate(
            value as string,
          ) as T[keyof T];
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

  // Persistence methods for BrightChain blockstore
  public async save(): Promise<void> {
    if (!Document.blockService) {
      throw new DocumentError(DocumentErrorType.Uninitialized);
    }

    this._dirty = false;
    const json = new TextEncoder().encode(this.toJson());
    const blockSize =
      ServiceLocator.getServiceProvider().blockService.getBlockSizeForData(
        json.length,
      );
    const xorResult = new Uint8Array(blockSize as number);
    let firstBlock = true;

    await ServiceLocator.getServiceProvider().blockService.processFileInChunks(
      json,
      false,
      TUPLE.SIZE,
      async (chunkDatas: Uint8Array[]) => {
        if (firstBlock) {
          xorResult.set(chunkDatas[0].subarray(0, blockSize as number), 0);
          firstBlock = false;
          // XOR remaining chunks if any
          if (chunkDatas.length > 1) {
            const remaining = chunkDatas.slice(1);
            const xored = XorService.xorMultiple([xorResult, ...remaining]);
            xorResult.set(xored);
          }
        } else {
          // XOR all chunks with current result
          const xored = XorService.xorMultiple([xorResult, ...chunkDatas]);
          xorResult.set(xored);
        }
      },
    );
  }

  public async load(): Promise<void> {
    throw new NotImplementedError();
  }

  public async delete(): Promise<void> {
    this._deleted = true;
  }

  // State properties
  public get dirty(): boolean {
    return this._dirty;
  }

  public get deleted(): boolean {
    return this._deleted;
  }

  // Factory method
  static new<U>(
    data: Partial<U>,
    schema?: SchemaDefinition<U>,
    instanceMethods: InstanceMethods<U> = {},
    staticMethods: StaticMethods<U> = {},
  ): Document<U> {
    return new Document<U>(data, schema, instanceMethods, staticMethods);
  }
}

/**
 * Convertible Document class for advanced transformation patterns
 */
export class ConvertibleDocument<TStorage, THydrated, TOperational> {
  private privateDataProvider?: IPrivateDataProvider<THydrated>;

  constructor(
    protected readonly hydrationSchema: IHydrationSchema<TStorage, THydrated>,
    protected readonly operationalFactory: IOperationalFactory<
      THydrated,
      TOperational
    >,
  ) {}

  public fromStorage(storage: TStorage): TOperational {
    let hydrated = this.hydrationSchema.hydrate(storage);

    if (this.privateDataProvider) {
      hydrated = {
        ...hydrated,
        ...this.privateDataProvider.providePrivateData(hydrated),
      };
    }

    return this.operationalFactory.create(hydrated);
  }

  public toStorage(operational: TOperational): TStorage {
    const hydrated = this.operationalFactory.extract(operational);
    return this.hydrationSchema.dehydrate(hydrated);
  }

  public setPrivateDataProvider(
    provider: IPrivateDataProvider<THydrated>,
  ): void {
    this.privateDataProvider = provider;
  }

  public clearPrivateDataProvider(): void {
    this.privateDataProvider = undefined;
  }

  public async save(_operational?: TOperational): Promise<void> {
    throw new NotImplementedError();
  }

  public async load(): Promise<TOperational> {
    throw new NotImplementedError();
  }

  public async delete(_operational: TOperational): Promise<void> {
    throw new NotImplementedError();
  }
}
