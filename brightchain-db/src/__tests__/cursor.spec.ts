import { Cursor } from '../lib/cursor';
import { BsonDocument } from '../lib/types';

describe('Cursor', () => {
  const docs: BsonDocument[] = [
    { _id: '1', name: 'Alice', age: 30 },
    { _id: '2', name: 'Bob', age: 25 },
    { _id: '3', name: 'Carol', age: 35 },
    { _id: '4', name: 'Dave', age: 28 },
  ];

  const makeCursor = () => new Cursor<BsonDocument>(async () => docs);

  it('should convert to array', async () => {
    const result = await makeCursor().toArray();
    expect(result).toHaveLength(4);
  });

  it('should sort ascending', async () => {
    const result = await makeCursor().sort({ age: 1 }).toArray();
    expect(result[0]['name']).toBe('Bob');
    expect(result[3]['name']).toBe('Carol');
  });

  it('should sort descending', async () => {
    const result = await makeCursor().sort({ age: -1 }).toArray();
    expect(result[0]['name']).toBe('Carol');
  });

  it('should skip', async () => {
    const result = await makeCursor().sort({ name: 1 }).skip(2).toArray();
    expect(result).toHaveLength(2);
    expect(result[0]['name']).toBe('Carol');
  });

  it('should limit', async () => {
    const result = await makeCursor().sort({ name: 1 }).limit(2).toArray();
    expect(result).toHaveLength(2);
  });

  it('should project fields', async () => {
    const result = await makeCursor().project({ name: 1 }).toArray();
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('_id');
    expect(result[0]).not.toHaveProperty('age');
  });

  it('should chain sort, skip, limit, project', async () => {
    const result = await makeCursor()
      .sort({ age: 1 })
      .skip(1)
      .limit(2)
      .project({ name: 1, age: 1 })
      .toArray();
    expect(result).toHaveLength(2);
    expect(result[0]['name']).toBe('Dave');
    expect(result[1]['name']).toBe('Alice');
  });

  it('should count', async () => {
    const count = await makeCursor().count();
    expect(count).toBe(4);
  });

  it('should count with sort/skip/limit', async () => {
    const count = await makeCursor().skip(1).limit(2).count();
    expect(count).toBe(2);
  });

  it('should get first result with next()', async () => {
    const cursor = makeCursor().sort({ name: 1 }).limit(2);
    const first = await cursor.next();
    expect(first?.['name']).toBe('Alice');
  });

  it('should report hasNext correctly', async () => {
    const cursor = makeCursor().sort({ name: 1 }).limit(2);
    expect(await cursor.hasNext()).toBe(true);

    const emptyCursor = makeCursor().sort({ name: 1 }).limit(0);
    expect(await emptyCursor.hasNext()).toBe(false);
  });

  it('should return null from next() on empty cursor', async () => {
    const cursor = makeCursor().limit(0);
    const result = await cursor.next();
    expect(result).toBeNull();
  });

  it('should forEach', async () => {
    const names: string[] = [];
    await makeCursor()
      .limit(2)
      .sort({ name: 1 })
      .forEach((doc) => {
        names.push(doc['name'] as string);
      });
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('should map', async () => {
    const names = await makeCursor()
      .sort({ name: 1 })
      .limit(2)
      .map((doc) => doc['name'] as string);
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('should be thenable', async () => {
    const result = await makeCursor().limit(1);
    expect(result).toHaveLength(1);
  });
});
