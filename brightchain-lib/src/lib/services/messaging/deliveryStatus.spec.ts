import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';

/**
 * Unit tests for DeliveryStatus enum values.
 * Validates: Requirements 2.1
 */
describe('DeliveryStatus enum', () => {
  it('should have exactly 6 states', () => {
    const values = Object.values(DeliveryStatus);
    expect(values).toHaveLength(6);
  });

  it('should have Pending with string value "pending"', () => {
    expect(DeliveryStatus.Pending).toBe('pending');
  });

  it('should have Announced with string value "announced"', () => {
    expect(DeliveryStatus.Announced).toBe('announced');
  });

  it('should have Delivered with string value "delivered"', () => {
    expect(DeliveryStatus.Delivered).toBe('delivered');
  });

  it('should have Read with string value "read"', () => {
    expect(DeliveryStatus.Read).toBe('read');
  });

  it('should have Failed with string value "failed"', () => {
    expect(DeliveryStatus.Failed).toBe('failed');
  });

  it('should have Bounced with string value "bounced"', () => {
    expect(DeliveryStatus.Bounced).toBe('bounced');
  });

  it('should contain exactly the expected set of string values', () => {
    const expectedValues = [
      'pending',
      'announced',
      'delivered',
      'read',
      'failed',
      'bounced',
    ];
    const actualValues = Object.values(DeliveryStatus).sort();
    expect(actualValues).toEqual(expectedValues.sort());
  });

  it('should contain exactly the expected set of keys', () => {
    const expectedKeys = [
      'Pending',
      'Announced',
      'Delivered',
      'Read',
      'Failed',
      'Bounced',
    ];
    const actualKeys = Object.keys(DeliveryStatus).sort();
    expect(actualKeys).toEqual(expectedKeys.sort());
  });
});
