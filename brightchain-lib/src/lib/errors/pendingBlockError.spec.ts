import { AvailabilityState } from '../enumerations/availabilityState';
import { PendingBlockError } from './blockFetchError';

describe('PendingBlockError', () => {
  it('should store blockId, state, and knownLocations', () => {
    const error = new PendingBlockError('abc123', AvailabilityState.Remote, [
      'node-1',
      'node-2',
    ]);
    expect(error.blockId).toBe('abc123');
    expect(error.state).toBe(AvailabilityState.Remote);
    expect(error.knownLocations).toEqual(['node-1', 'node-2']);
  });

  it('should have the correct name', () => {
    const error = new PendingBlockError('abc123', AvailabilityState.Remote, []);
    expect(error.name).toBe('PendingBlockError');
  });

  it('should include blockId and state in the message', () => {
    const error = new PendingBlockError('block-xyz', AvailabilityState.Remote, [
      'node-a',
    ]);
    expect(error.message).toContain('block-xyz');
    expect(error.message).toContain(AvailabilityState.Remote);
  });

  it('should be an instance of Error', () => {
    const error = new PendingBlockError('abc', AvailabilityState.Unknown, []);
    expect(error).toBeInstanceOf(Error);
  });
});
