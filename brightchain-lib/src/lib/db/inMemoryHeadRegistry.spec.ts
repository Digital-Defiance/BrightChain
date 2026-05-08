/**
 * Unit tests for InMemoryHeadRegistry LWW merge logic.
 *
 * Validates that last-writer-wins conflict resolution uses BrightDateTimestamp
 * (numeric decimal days since J2000.0) for comparisons.
 */
import { InMemoryHeadRegistry } from './inMemoryHeadRegistry';
import { brightDateNow } from '../utils/brightDateConversions';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

describe('InMemoryHeadRegistry — LWW merge', () => {
  let registry: InMemoryHeadRegistry;

  beforeEach(() => {
    registry = InMemoryHeadRegistry.createIsolated();
  });

  it('applies a remote update with a higher BrightDateTimestamp', async () => {
    const localTs: BrightDateTimestamp = brightDateNow() - 1; // 1 day ago
    const remoteTs: BrightDateTimestamp = brightDateNow();    // now (higher)

    // Seed a local head with an older timestamp
    await registry.mergeHeadUpdate('db', 'col', 'block-local', localTs);
    expect(registry.getHead('db', 'col')).toBe('block-local');

    // Remote update with a newer timestamp should win
    const applied = await registry.mergeHeadUpdate('db', 'col', 'block-remote', remoteTs);
    expect(applied).toBe(true);
    expect(registry.getHead('db', 'col')).toBe('block-remote');
    expect(registry.getHeadTimestamp('db', 'col')).toBe(remoteTs);
  });

  it('rejects a remote update with a lower BrightDateTimestamp', async () => {
    const localTs: BrightDateTimestamp = brightDateNow();     // now (higher)
    const remoteTs: BrightDateTimestamp = brightDateNow() - 1; // 1 day ago (lower)

    // Seed a local head with a newer timestamp
    await registry.mergeHeadUpdate('db', 'col', 'block-local', localTs);
    expect(registry.getHead('db', 'col')).toBe('block-local');

    // Remote update with an older timestamp should be rejected
    const applied = await registry.mergeHeadUpdate('db', 'col', 'block-remote', remoteTs);
    expect(applied).toBe(false);
    expect(registry.getHead('db', 'col')).toBe('block-local');
    expect(registry.getHeadTimestamp('db', 'col')).toBe(localTs);
  });

  it('rejects a remote update with an equal BrightDateTimestamp (local wins)', async () => {
    const ts: BrightDateTimestamp = brightDateNow();

    // Seed a local head with the same timestamp
    await registry.mergeHeadUpdate('db', 'col', 'block-local', ts);
    expect(registry.getHead('db', 'col')).toBe('block-local');

    // Remote update with the same timestamp should be rejected (local wins)
    const applied = await registry.mergeHeadUpdate('db', 'col', 'block-remote', ts);
    expect(applied).toBe(false);
    expect(registry.getHead('db', 'col')).toBe('block-local');
  });

  it('applies a remote update when no local head exists', async () => {
    const ts: BrightDateTimestamp = brightDateNow();

    const applied = await registry.mergeHeadUpdate('db', 'col', 'block-first', ts);
    expect(applied).toBe(true);
    expect(registry.getHead('db', 'col')).toBe('block-first');
    expect(registry.getHeadTimestamp('db', 'col')).toBe(ts);
  });

  it('exportSnapshot uses numeric BrightDateTimestamp (not ISO string)', async () => {
    const ts: BrightDateTimestamp = brightDateNow();
    await registry.mergeHeadUpdate('db', 'col', 'block-a', ts);

    const snapshot = registry.exportSnapshot();
    const record = snapshot.get('db:col');
    expect(record).toBeDefined();
    expect(typeof record!.timestamp).toBe('number');
    expect(record!.timestamp).toBe(ts);
  });

  it('mergeSnapshot round-trips numeric timestamps correctly', async () => {
    const ts: BrightDateTimestamp = brightDateNow();
    await registry.mergeHeadUpdate('db', 'col', 'block-a', ts);

    const snapshot = registry.exportSnapshot();

    // Merge into a fresh registry
    const registry2 = InMemoryHeadRegistry.createIsolated();
    const { merged, skipped } = await registry2.mergeSnapshot(snapshot);

    expect(merged).toBe(1);
    expect(skipped).toBe(0);
    expect(registry2.getHead('db', 'col')).toBe('block-a');
    expect(registry2.getHeadTimestamp('db', 'col')).toBe(ts);
  });

  it('setHead records a BrightDateTimestamp (number)', async () => {
    await registry.setHead('db', 'col', 'block-set');
    const ts = registry.getHeadTimestamp('db', 'col');
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(0); // J2000 epoch is 0; current time is positive
  });
});
