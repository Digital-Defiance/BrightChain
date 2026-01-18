import { MessageLogger, LogLevel } from './messageLogger';

describe('MessageLogger', () => {
  let logger: MessageLogger;
  let logSpy: jest.Mock;

  beforeEach(() => {
    logSpy = jest.fn();
    logger = new MessageLogger(LogLevel.INFO, logSpy);
  });

  it('should log message creation', () => {
    logger.logMessageCreated('msg1', 'sender1', 3);
    expect(logSpy).toHaveBeenCalledWith(
      LogLevel.INFO,
      'Message created',
      { messageId: 'msg1', senderId: 'sender1', recipientCount: 3 }
    );
  });

  it('should log routing decisions', () => {
    logger.logRoutingDecision('msg1', 'DIRECT', 2);
    expect(logSpy).not.toHaveBeenCalled(); // DEBUG level filtered out
  });

  it('should log delivery failures', () => {
    logger.logDeliveryFailure('msg1', 'recipient1', 'Network error');
    expect(logSpy).toHaveBeenCalledWith(
      LogLevel.ERROR,
      'Delivery failure',
      { messageId: 'msg1', recipientId: 'recipient1', error: 'Network error' }
    );
  });

  it('should log encryption failures', () => {
    logger.logEncryptionFailure('Invalid key');
    expect(logSpy).toHaveBeenCalledWith(
      LogLevel.ERROR,
      'Encryption failure',
      { error: 'Invalid key' }
    );
  });

  it('should log slow queries', () => {
    logger.logSlowQuery('getMessages', 5000);
    expect(logSpy).toHaveBeenCalledWith(
      LogLevel.WARN,
      'Slow query detected',
      { queryType: 'getMessages', durationMs: 5000 }
    );
  });

  it('should respect log level filtering', () => {
    const debugLogger = new MessageLogger(LogLevel.DEBUG, logSpy);
    debugLogger.logRoutingDecision('msg1', 'DIRECT', 2);
    expect(logSpy).toHaveBeenCalled();
  });
});
