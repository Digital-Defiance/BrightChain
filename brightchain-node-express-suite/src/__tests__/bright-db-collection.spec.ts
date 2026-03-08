import { BrightDbCollection } from '../lib/services/bright-db-collection';

/**
 * Creates a mock @brightchain/db Collection with spies for all methods.
 */
function createMockCollection() {
  return {
    insertOne: jest.fn().mockResolvedValue({ acknowledged: true, insertedId: '1' }),
    insertMany: jest.fn().mockResolvedValue({ acknowledged: true, insertedCount: 2, insertedIds: { 0: '1', 1: '2' } }),
    findOne: jest.fn().mockResolvedValue({ _id: '1', name: 'test' }),
    find: jest.fn().mockResolvedValue([{ _id: '1' }]),
    findById: jest.fn().mockResolvedValue({ _id: '1' }),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 2, modifiedCount: 2, upsertedCount: 0 }),
    deleteOne: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 3 }),
    replaceOne: jest.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 }),
    countDocuments: jest.fn().mockResolvedValue(5),
    estimatedDocumentCount: jest.fn().mockResolvedValue(5),
    distinct: jest.fn().mockResolvedValue(['a', 'b']),
    aggregate: jest.fn().mockResolvedValue([{ count: 5 }]),
    createIndex: jest.fn().mockResolvedValue('idx_name'),
    dropIndex: jest.fn().mockResolvedValue(undefined),
    listIndexes: jest.fn().mockReturnValue(['_id_']),
    bulkWrite: jest.fn().mockResolvedValue({ acknowledged: true, insertedCount: 1, matchedCount: 0, modifiedCount: 0, deletedCount: 0, upsertedCount: 0, insertedIds: {}, upsertedIds: {} }),
    watch: jest.fn().mockReturnValue(() => { /* unsubscribe */ }),
    setSchema: jest.fn(),
    getSchema: jest.fn().mockReturnValue(undefined),
    removeSchema: jest.fn(),
    validateDoc: jest.fn().mockReturnValue([]),
    getWriteConcern: jest.fn().mockReturnValue({ w: 1 }),
    setWriteConcern: jest.fn(),
    getReadPreference: jest.fn().mockReturnValue('primary'),
    setReadPreference: jest.fn(),
    createTextIndex: jest.fn().mockReturnValue('text_idx'),
    dropTextIndex: jest.fn(),
    hasTextIndex: jest.fn().mockReturnValue(false),
    drop: jest.fn().mockResolvedValue(undefined),
  };
}

describe('BrightDbCollection', () => {
  let mockColl: ReturnType<typeof createMockCollection>;
  let adapter: BrightDbCollection;

  beforeEach(() => {
    mockColl = createMockCollection();
    adapter = new BrightDbCollection(mockColl as any);
  });

  it('delegates insertOne to underlying collection', async () => {
    const doc = { _id: '1', name: 'test' };
    const result = await adapter.insertOne(doc);
    expect(mockColl.insertOne).toHaveBeenCalledWith(doc, undefined);
    expect(result.acknowledged).toBe(true);
  });

  it('delegates insertMany to underlying collection', async () => {
    const docs = [{ _id: '1' }, { _id: '2' }];
    const result = await adapter.insertMany(docs);
    expect(mockColl.insertMany).toHaveBeenCalledWith(docs, undefined);
    expect(result.insertedCount).toBe(2);
  });

  it('delegates findOne to underlying collection', async () => {
    const result = await adapter.findOne({ name: 'test' } as any);
    expect(mockColl.findOne).toHaveBeenCalled();
    expect(result).toEqual({ _id: '1', name: 'test' });
  });

  it('delegates find to underlying collection', async () => {
    const result = await adapter.find();
    expect(mockColl.find).toHaveBeenCalled();
    expect(result).toEqual([{ _id: '1' }]);
  });

  it('delegates findById to underlying collection', async () => {
    const result = await adapter.findById('1');
    expect(mockColl.findById).toHaveBeenCalledWith('1');
    expect(result).toEqual({ _id: '1' });
  });

  it('delegates updateOne to underlying collection', async () => {
    const result = await adapter.updateOne({ _id: '1' } as any, { $set: { name: 'updated' } } as any);
    expect(mockColl.updateOne).toHaveBeenCalled();
    expect(result.modifiedCount).toBe(1);
  });

  it('delegates deleteOne to underlying collection', async () => {
    const result = await adapter.deleteOne({ _id: '1' } as any);
    expect(mockColl.deleteOne).toHaveBeenCalled();
    expect(result.deletedCount).toBe(1);
  });

  it('delegates countDocuments to underlying collection', async () => {
    const result = await adapter.countDocuments();
    expect(mockColl.countDocuments).toHaveBeenCalled();
    expect(result).toBe(5);
  });

  it('delegates estimatedDocumentCount to underlying collection', async () => {
    const result = await adapter.estimatedDocumentCount();
    expect(mockColl.estimatedDocumentCount).toHaveBeenCalled();
    expect(result).toBe(5);
  });

  it('delegates aggregate to underlying collection', async () => {
    const pipeline = [{ $match: { active: true } }] as any;
    const result = await adapter.aggregate(pipeline);
    expect(mockColl.aggregate).toHaveBeenCalledWith(pipeline);
    expect(result).toEqual([{ count: 5 }]);
  });

  it('delegates createIndex to underlying collection', async () => {
    const result = await adapter.createIndex({ name: 1 });
    expect(mockColl.createIndex).toHaveBeenCalled();
    expect(result).toBe('idx_name');
  });

  it('delegates listIndexes to underlying collection', () => {
    const result = adapter.listIndexes();
    expect(mockColl.listIndexes).toHaveBeenCalled();
    expect(result).toEqual(['_id_']);
  });

  it('delegates watch to underlying collection', () => {
    const listener = jest.fn();
    const unsub = adapter.watch(listener);
    expect(mockColl.watch).toHaveBeenCalledWith(listener);
    expect(typeof unsub).toBe('function');
  });

  it('delegates schema operations', () => {
    adapter.setSchema({ properties: {} });
    expect(mockColl.setSchema).toHaveBeenCalled();

    adapter.getSchema();
    expect(mockColl.getSchema).toHaveBeenCalled();

    adapter.removeSchema();
    expect(mockColl.removeSchema).toHaveBeenCalled();
  });

  it('delegates write/read concern operations', () => {
    adapter.setWriteConcern({ w: 'majority' });
    expect(mockColl.setWriteConcern).toHaveBeenCalledWith({ w: 'majority' });

    const wc = adapter.getWriteConcern();
    expect(wc).toEqual({ w: 1 });

    adapter.setReadPreference('secondary');
    expect(mockColl.setReadPreference).toHaveBeenCalledWith('secondary');

    const rp = adapter.getReadPreference();
    expect(rp).toBe('primary');
  });

  it('delegates drop to underlying collection', async () => {
    await adapter.drop();
    expect(mockColl.drop).toHaveBeenCalled();
  });
});
