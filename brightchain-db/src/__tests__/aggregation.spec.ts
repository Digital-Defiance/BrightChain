import { runAggregation } from '../lib/aggregation';
import { AggregationStage, BsonDocument } from '../lib/types';

describe('aggregation pipeline', () => {
  const docs: BsonDocument[] = [
    {
      _id: '1',
      name: 'Alice',
      department: 'eng',
      salary: 100,
      tags: ['a', 'b'],
    },
    { _id: '2', name: 'Bob', department: 'eng', salary: 120, tags: ['b'] },
    { _id: '3', name: 'Carol', department: 'sales', salary: 90, tags: ['a'] },
    {
      _id: '4',
      name: 'Dave',
      department: 'sales',
      salary: 110,
      tags: ['c', 'a'],
    },
  ];

  describe('$match', () => {
    it('should filter documents', async () => {
      const pipeline: AggregationStage[] = [{ $match: { department: 'eng' } }];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
    });
  });

  describe('$group', () => {
    it('should group and sum', async () => {
      const pipeline: AggregationStage[] = [
        { $group: { _id: '$department', total: { $sum: '$salary' } } },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
      const eng = result.find((r) => r['_id'] === 'eng');
      expect(eng?.['total']).toBe(220);
      const sales = result.find((r) => r['_id'] === 'sales');
      expect(sales?.['total']).toBe(200);
    });

    it('should group and avg', async () => {
      const pipeline: AggregationStage[] = [
        { $group: { _id: '$department', avg: { $avg: '$salary' } } },
      ];
      const result = await runAggregation(docs, pipeline);
      const eng = result.find((r) => r['_id'] === 'eng');
      expect(eng?.['avg']).toBe(110);
    });

    it('should count per group', async () => {
      const pipeline: AggregationStage[] = [
        { $group: { _id: '$department', count: { $count: {} } } },
      ];
      const result = await runAggregation(docs, pipeline);
      const eng = result.find((r) => r['_id'] === 'eng');
      expect(eng?.['count']).toBe(2);
    });

    it('should support $push accumulator', async () => {
      const pipeline: AggregationStage[] = [
        { $group: { _id: '$department', names: { $push: '$name' } } },
      ];
      const result = await runAggregation(docs, pipeline);
      const eng = result.find((r) => r['_id'] === 'eng');
      expect(eng?.['names']).toEqual(['Alice', 'Bob']);
    });
  });

  describe('$sort', () => {
    it('should sort ascending', async () => {
      const pipeline: AggregationStage[] = [{ $sort: { salary: 1 } }];
      const result = await runAggregation(docs, pipeline);
      expect(result[0]['name']).toBe('Carol');
      expect(result[3]['name']).toBe('Bob');
    });

    it('should sort descending', async () => {
      const pipeline: AggregationStage[] = [{ $sort: { salary: -1 } }];
      const result = await runAggregation(docs, pipeline);
      expect(result[0]['name']).toBe('Bob');
    });
  });

  describe('$limit and $skip', () => {
    it('should limit', async () => {
      const pipeline: AggregationStage[] = [
        { $sort: { name: 1 } },
        { $limit: 2 },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
    });

    it('should skip', async () => {
      const pipeline: AggregationStage[] = [
        { $sort: { name: 1 } },
        { $skip: 2 },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
    });
  });

  describe('$project', () => {
    it('should project fields', async () => {
      const pipeline: AggregationStage[] = [
        { $project: { name: 1, salary: 1 } },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('salary');
      expect(result[0]).not.toHaveProperty('department');
    });
  });

  describe('$count', () => {
    it('should count documents', async () => {
      const pipeline: AggregationStage[] = [
        { $match: { department: 'eng' } },
        { $count: 'total' },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(1);
      expect(result[0]['total']).toBe(2);
    });
  });

  describe('$unwind', () => {
    it('should unwind an array field', async () => {
      const pipeline: AggregationStage[] = [
        { $match: { _id: '1' } },
        { $unwind: '$tags' },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
      expect(result[0]['tags']).toBe('a');
      expect(result[1]['tags']).toBe('b');
    });
  });

  describe('$addFields', () => {
    it('should add computed fields', async () => {
      const pipeline: AggregationStage[] = [{ $addFields: { bonus: 10 } }];
      const result = await runAggregation(docs, pipeline);
      expect(result[0]['bonus']).toBe(10);
      expect(result[0]['name']).toBe('Alice');
    });
  });

  describe('$replaceRoot', () => {
    it('should replace root with nested doc', async () => {
      const nested: BsonDocument[] = [
        { _id: '1', profile: { name: 'Alice', age: 30 } },
      ];
      const pipeline: AggregationStage[] = [
        { $replaceRoot: { newRoot: '$profile' } },
      ];
      const result = await runAggregation(nested, pipeline);
      expect(result[0]['name']).toBe('Alice');
      expect(result[0]).not.toHaveProperty('profile');
    });
  });

  describe('$sample', () => {
    it('should sample documents', async () => {
      const pipeline: AggregationStage[] = [{ $sample: { size: 2 } }];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(2);
    });
  });

  describe('combined pipeline', () => {
    it('should run match, group, sort, limit together', async () => {
      const pipeline: AggregationStage[] = [
        { $match: { salary: { $gte: 100 } } },
        { $group: { _id: '$department', total: { $sum: '$salary' } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ];
      const result = await runAggregation(docs, pipeline);
      expect(result).toHaveLength(1);
      expect(result[0]['_id']).toBe('eng');
      expect(result[0]['total']).toBe(220);
    });
  });
});
