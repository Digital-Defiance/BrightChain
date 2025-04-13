/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Generic database-agnostic mock classes for document and model operations.
 * These replace Mongoose-specific mocks with a simpler, DB-independent abstraction.
 */

export class MockQuery {
  private result: any;

  constructor(result: any) {
    this.result = result;
  }

  // Query methods that return this for chaining
  select = () => this;
  populate = () => this;
  sort = () => this;
  limit = () => this;
  skip = () => this;
  lean = () => this;
  collation = () => this;
  session = () => this;
  where = () => this;
  distinct = () => this;

  // Terminal methods
  exec = () => Promise.resolve(this.result);
  then = (resolve: (value: any) => void) => resolve(this.result);
  catch = () => this;
}

export class MockDocument {
  private data: any;

  constructor(data: any = {}) {
    this.data = { ...data };
    Object.assign(this, data);
  }

  // Document instance methods
  save = () => Promise.resolve(this);
  remove = () => Promise.resolve(this);
  deleteOne = () => Promise.resolve({ deletedCount: 1 });
  validate = () => Promise.resolve();
  validateSync = () => undefined;
  toObject = () => this.data;
  toJSON = () => this.data;
  isModified = () => false;
  markModified = () => {};
  populate = () => Promise.resolve(this);
  depopulate = () => this;
  equals = () => true;
  get = (path: string) => this.data[path];
  set = (path: string, value: any) => {
    this.data[path] = value;
  };
  unset = () => {};
  increment = () => this;
  model = () => {};
}

export class MockModel {
  private mockData: any;

  constructor(mockData: any = null) {
    this.mockData = mockData;
  }

  // Static model methods
  find = () =>
    new MockQuery(
      Array.isArray(this.mockData)
        ? this.mockData
        : [this.mockData].filter(Boolean),
    );
  findOne = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findById = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findOneAndUpdate = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findOneAndDelete = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findByIdAndUpdate = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findByIdAndDelete = () =>
    new MockQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );

  create = () => Promise.resolve(new MockDocument(this.mockData));
  insertMany = () => Promise.resolve([new MockDocument(this.mockData)]);

  updateOne = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });
  updateMany = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });
  replaceOne = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });

  deleteOne = () => Promise.resolve({ deletedCount: 1 });
  deleteMany = () => Promise.resolve({ deletedCount: 1 });

  countDocuments = () => Promise.resolve(1);
  estimatedDocumentCount = () => Promise.resolve(1);

  aggregate = () => new MockQuery([]);
  distinct = () => new MockQuery([]);

  exists = () => Promise.resolve({ _id: 'mock-id' });

  // Utility methods
  watch = () => {};
  startSession = () => {};
}

export function makeMockDocument<T = any>(
  data: T | null = null,
): MockDocument & T {
  const mockDoc = new MockDocument(data);
  return mockDoc as MockDocument & T;
}

export function makeMockModel<T = any>(
  mockData: T | T[] | null = null,
): MockModel {
  return new MockModel(mockData);
}

// Legacy aliases for backward compatibility during migration
export const MockMongooseQuery = MockQuery;
export const MockMongooseDocument = MockDocument;
export const MockMongooseModel = MockModel;
