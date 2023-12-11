import { BsonDocument } from '../lib/types';
import { applyUpdate, isOperatorUpdate } from '../lib/updateEngine';

describe('updateEngine', () => {
  describe('isOperatorUpdate', () => {
    it('should detect operator updates', () => {
      expect(isOperatorUpdate({ $set: { name: 'Bob' } })).toBe(true);
      expect(isOperatorUpdate({ $inc: { count: 1 } })).toBe(true);
    });

    it('should detect replacement updates', () => {
      expect(isOperatorUpdate({ name: 'Bob' })).toBe(false);
    });
  });

  describe('applyUpdate', () => {
    const doc: BsonDocument = {
      _id: '1',
      name: 'Alice',
      age: 30,
      tags: ['admin'],
      address: { city: 'NYC' },
    };

    it('should apply $set', () => {
      const result = applyUpdate(doc, { $set: { name: 'Bob' } });
      expect(result['name']).toBe('Bob');
      expect(result['_id']).toBe('1');
      expect(result['age']).toBe(30);
    });

    it('should apply nested $set', () => {
      const result = applyUpdate(doc, { $set: { 'address.city': 'LA' } });
      expect((result['address'] as Record<string, unknown>)['city']).toBe('LA');
    });

    it('should apply $unset', () => {
      const result = applyUpdate(doc, { $unset: { age: 1 } });
      expect('age' in result).toBe(false);
    });

    it('should apply $inc', () => {
      const result = applyUpdate(doc, { $inc: { age: 5 } });
      expect(result['age']).toBe(35);
    });

    it('should apply $inc on missing field', () => {
      const result = applyUpdate(doc, { $inc: { score: 10 } } as Record<
        string,
        unknown
      >);
      expect(result['score']).toBe(10);
    });

    it('should apply $mul', () => {
      const result = applyUpdate(doc, { $mul: { age: 2 } });
      expect(result['age']).toBe(60);
    });

    it('should apply $min', () => {
      const result = applyUpdate(doc, { $min: { age: 25 } });
      expect(result['age']).toBe(25);
    });

    it('should not apply $min if current is smaller', () => {
      const result = applyUpdate(doc, { $min: { age: 35 } });
      expect(result['age']).toBe(30);
    });

    it('should apply $max', () => {
      const result = applyUpdate(doc, { $max: { age: 35 } });
      expect(result['age']).toBe(35);
    });

    it('should apply $push', () => {
      const result = applyUpdate(doc, { $push: { tags: 'user' } });
      expect(result['tags']).toEqual(['admin', 'user']);
    });

    it('should apply $pull', () => {
      const result = applyUpdate(doc, { $pull: { tags: 'admin' } });
      expect(result['tags']).toEqual([]);
    });

    it('should apply $addToSet (no duplicate)', () => {
      const result = applyUpdate(doc, { $addToSet: { tags: 'admin' } });
      expect(result['tags']).toEqual(['admin']);
    });

    it('should apply $addToSet (new value)', () => {
      const result = applyUpdate(doc, { $addToSet: { tags: 'user' } });
      expect(result['tags']).toEqual(['admin', 'user']);
    });

    it('should apply $pop (last)', () => {
      const d: BsonDocument = { _id: '1', arr: [1, 2, 3] };
      const result = applyUpdate(d, { $pop: { arr: 1 } });
      expect(result['arr']).toEqual([1, 2]);
    });

    it('should apply $pop (first)', () => {
      const d: BsonDocument = { _id: '1', arr: [1, 2, 3] };
      const result = applyUpdate(d, { $pop: { arr: -1 } });
      expect(result['arr']).toEqual([2, 3]);
    });

    it('should apply $rename', () => {
      const result = applyUpdate(doc, { $rename: { name: 'fullName' } });
      expect(result['fullName']).toBe('Alice');
      expect('name' in result).toBe(false);
    });

    it('should apply $currentDate', () => {
      const result = applyUpdate(doc, {
        $currentDate: { updatedAt: true },
      } as Record<string, unknown>);
      expect(typeof result['updatedAt']).toBe('string');
    });

    it('should do replacement update', () => {
      const result = applyUpdate(doc, { name: 'Bob', email: 'bob@x.com' });
      expect(result['_id']).toBe('1');
      expect(result['name']).toBe('Bob');
      expect(result['email']).toBe('bob@x.com');
      expect('age' in result).toBe(false);
    });
  });
});
