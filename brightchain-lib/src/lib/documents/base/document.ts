import {
  IHydrationSchema,
  IOperationalFactory,
  IPrivateDataProvider,
} from '../../interfaces/document/base';

/**
 * Base document class that handles conversion between storage, hydrated, and operational formats
 */
export class Document<TStorage> {
  private data: TStorage;

  constructor(data: TStorage) {
    this.data = data;
  }

  /**
   * Convert document to JSON string
   */
  public toJson(): string {
    return JSON.stringify(this.data);
  }

  /**
   * Convert JSON string to document
   */
  public static fromJson<T>(json: string): Document<T> {
    return new Document<T>(JSON.parse(json));
  }

  /**
   * Get raw data
   */
  public getData(): TStorage {
    return this.data;
  }

  /**
   * Set raw data
   */
  public setData(data: TStorage): void {
    this.data = data;
  }
}

/**
 * Document class that handles conversion between storage, hydrated, and operational formats
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

  /**
   * Convert from storage format to operational object
   */
  public fromStorage(storage: TStorage): TOperational {
    // First hydrate the data
    let hydrated = this.hydrationSchema.hydrate(storage);

    // Inject private data if available
    if (this.privateDataProvider) {
      hydrated = {
        ...hydrated,
        ...this.privateDataProvider.providePrivateData(hydrated),
      };
    }

    // Create operational object
    return this.operationalFactory.create(hydrated);
  }

  /**
   * Convert from operational object to storage format
   */
  public toStorage(operational: TOperational): TStorage {
    // Extract hydrated data
    const hydrated = this.operationalFactory.extract(operational);

    // Convert to storage format
    return this.hydrationSchema.dehydrate(hydrated);
  }

  /**
   * Set private data provider
   */
  public setPrivateDataProvider(
    provider: IPrivateDataProvider<THydrated>,
  ): void {
    this.privateDataProvider = provider;
  }

  /**
   * Clear private data provider
   */
  public clearPrivateDataProvider(): void {
    this.privateDataProvider = undefined;
  }

  /**
   * Save document to storage
   * To be implemented by subclasses
   */
  public async save(operational: TOperational): Promise<void> {
    throw new Error('Not implemented');
  }

  /**
   * Load document from storage
   * To be implemented by subclasses
   */
  public async load(): Promise<TOperational> {
    throw new Error('Not implemented');
  }

  /**
   * Delete document from storage
   * To be implemented by subclasses
   */
  public async delete(operational: TOperational): Promise<void> {
    throw new Error('Not implemented');
  }
}
