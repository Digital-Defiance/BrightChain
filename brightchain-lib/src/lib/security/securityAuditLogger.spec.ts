import { SecurityAuditLogger } from './securityAuditLogger';
import { SecurityEventSeverity, SecurityEventType } from './securityEvent';

describe('SecurityAuditLogger', () => {
  let logger: SecurityAuditLogger;

  beforeEach(() => {
    logger = SecurityAuditLogger.getInstance();
    logger.clear();
  });

  it('should log security events', () => {
    logger.log(
      SecurityEventType.SignatureValidationSuccess,
      SecurityEventSeverity.Info,
      'Test event',
    );

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.SignatureValidationSuccess);
    expect(events[0].message).toBe('Test event');
  });

  it('should log signature validation', () => {
    logger.logSignatureValidation(true, 'block123', 'user456');

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.SignatureValidationSuccess);
    expect(events[0].blockId).toBe('block123');
    expect(events[0].userId).toBe('user456');
  });

  it('should log block creation', () => {
    logger.logBlockCreated('block789', 'user123');

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.BlockCreated);
    expect(events[0].blockId).toBe('block789');
  });

  it('should log encryption operations', () => {
    logger.logEncryption('block456', 3);

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.EncryptionPerformed);
    expect(events[0].metadata?.['recipientCount']).toBe(3);
  });

  it('should log decryption operations', () => {
    logger.logDecryption(true, 'block999', 'user111');

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.DecryptionPerformed);
  });

  it('should log access denied', () => {
    logger.logAccessDenied('sensitive-resource', 'user222');

    const events = logger.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(SecurityEventType.AccessDenied);
    expect(events[0].severity).toBe(SecurityEventSeverity.Warning);
  });

  it('should limit stored events', () => {
    // Log more than max events
    for (let i = 0; i < 11000; i++) {
      logger.log(
        SecurityEventType.BlockCreated,
        SecurityEventSeverity.Info,
        `Event ${i}`,
      );
    }

    const events = logger.getEvents();
    expect(events.length).toBeLessThanOrEqual(10000);
  });

  it('should get limited events', () => {
    for (let i = 0; i < 100; i++) {
      logger.log(
        SecurityEventType.BlockCreated,
        SecurityEventSeverity.Info,
        `Event ${i}`,
      );
    }

    const events = logger.getEvents(10);
    expect(events).toHaveLength(10);
  });

  it('should clear events', () => {
    logger.log(
      SecurityEventType.BlockCreated,
      SecurityEventSeverity.Info,
      'Test',
    );
    expect(logger.getEvents()).toHaveLength(1);

    logger.clear();
    expect(logger.getEvents()).toHaveLength(0);
  });

  it('should include timestamp in events', () => {
    const before = new Date();
    logger.log(
      SecurityEventType.BlockCreated,
      SecurityEventSeverity.Info,
      'Test',
    );
    const after = new Date();

    const events = logger.getEvents();
    expect(events[0].timestamp.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(events[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
