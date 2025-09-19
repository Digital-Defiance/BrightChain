export class MockMongooseQuery {
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

export class MockMongooseDocument {
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

export class MockMongooseModel {
  private mockData: any;

  constructor(mockData: any = null) {
    this.mockData = mockData;
  }

  // Static model methods
  find = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData)
        ? this.mockData
        : [this.mockData].filter(Boolean),
    );
  findOne = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findById = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findOneAndUpdate = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findOneAndDelete = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findByIdAndUpdate = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );
  findByIdAndDelete = () =>
    new MockMongooseQuery(
      Array.isArray(this.mockData) ? this.mockData[0] : this.mockData,
    );

  create = () => Promise.resolve(new MockMongooseDocument(this.mockData));
  insertMany = () => Promise.resolve([new MockMongooseDocument(this.mockData)]);

  updateOne = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });
  updateMany = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });
  replaceOne = () => Promise.resolve({ modifiedCount: 1, matchedCount: 1 });

  deleteOne = () => Promise.resolve({ deletedCount: 1 });
  deleteMany = () => Promise.resolve({ deletedCount: 1 });

  countDocuments = () => Promise.resolve(1);
  estimatedDocumentCount = () => Promise.resolve(1);

  aggregate = () => new MockMongooseQuery([]);
  distinct = () => new MockMongooseQuery([]);

  exists = () => Promise.resolve({ _id: 'mock-id' });

  // Utility methods
  watch = () => {};
  startSession = () => {};
}

export function makeMockDocument<T = any>(
  data: T | null = null,
): MockMongooseDocument & T {
  const mockDoc = new MockMongooseDocument(data);
  return mockDoc as MockMongooseDocument & T;
}

export function makeMockModel<T = any>(
  mockData: T | T[] | null = null,
): MockMongooseModel {
  return new MockMongooseModel(mockData);
}
