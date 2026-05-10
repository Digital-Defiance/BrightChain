import {
  BurnBagError,
  ChainVerificationError,
  CustodialKeyReleaseError,
  DecryptionError,
  DeserializationError,
  LedgerWriteError,
  SealLedgerInconsistencyError,
  SerializationError,
  SignatureVerificationError,
  TimestampError,
  TreeDepthError,
  VaultDestroyedError,
} from '../errors';

describe('BurnBagError hierarchy', () => {
  describe('BurnBagError (base)', () => {
    it('sets message, code, and name', () => {
      const err = new BurnBagError('test message', 'TEST_CODE');
      expect(err.message).toBe('test message');
      expect(err.code).toBe('TEST_CODE');
      expect(err.name).toBe('BurnBagError');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('VaultDestroyedError', () => {
    it('has fixed message and code', () => {
      const err = new VaultDestroyedError();
      expect(err.message).toBe('Vault has been destroyed');
      expect(err.code).toBe('VAULT_DESTROYED');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('DecryptionError', () => {
    it('formats message without detail', () => {
      const err = new DecryptionError();
      expect(err.message).toBe('Decryption failed');
      expect(err.code).toBe('DECRYPTION_FAILED');
    });

    it('formats message with detail', () => {
      const err = new DecryptionError('bad ciphertext');
      expect(err.message).toBe('Decryption failed: bad ciphertext');
    });

    it('extends BurnBagError', () => {
      expect(new DecryptionError()).toBeInstanceOf(BurnBagError);
    });
  });

  describe('ChainVerificationError', () => {
    it('uses detail as message', () => {
      const err = new ChainVerificationError('root mismatch');
      expect(err.message).toBe('root mismatch');
      expect(err.code).toBe('TREE_VERIFICATION_FAILED');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('TreeDepthError', () => {
    it('includes depth in message', () => {
      const err = new TreeDepthError(5);
      expect(err.message).toBe('Tree depth 5 is below minimum of 8');
      expect(err.code).toBe('TREE_DEPTH_INVALID');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('SignatureVerificationError', () => {
    it('has fixed message and code', () => {
      const err = new SignatureVerificationError();
      expect(err.message).toBe('Invalid signature');
      expect(err.code).toBe('SIGNATURE_INVALID');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('SerializationError', () => {
    it('uses detail as message', () => {
      const err = new SerializationError('buffer overflow');
      expect(err.message).toBe('buffer overflow');
      expect(err.code).toBe('SERIALIZATION_FAILED');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('DeserializationError', () => {
    it('uses detail as message', () => {
      const err = new DeserializationError('truncated input');
      expect(err.message).toBe('truncated input');
      expect(err.code).toBe('DESERIALIZATION_FAILED');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('TimestampError', () => {
    it('has fixed message and code', () => {
      const err = new TimestampError();
      expect(err.message).toBe('Destruction proof timestamp is in the future');
      expect(err.code).toBe('TIMESTAMP_FUTURE');
      expect(err).toBeInstanceOf(BurnBagError);
    });
  });

  describe('LedgerWriteError', () => {
    it('formats message without detail', () => {
      const err = new LedgerWriteError();
      expect(err.message).toBe('Ledger write failed');
      expect(err.code).toBe('LEDGER_WRITE_FAILED');
    });

    it('formats message with detail', () => {
      const err = new LedgerWriteError('connection timeout');
      expect(err.message).toBe('Ledger write failed: connection timeout');
    });

    it('extends BurnBagError', () => {
      expect(new LedgerWriteError()).toBeInstanceOf(BurnBagError);
    });
  });

  describe('CustodialKeyReleaseError', () => {
    it('formats message without detail', () => {
      const err = new CustodialKeyReleaseError();
      expect(err.message).toBe('Custodial key release failed');
      expect(err.code).toBe('CUSTODIAL_KEY_RELEASE_FAILED');
    });

    it('formats message with detail', () => {
      const err = new CustodialKeyReleaseError('quorum not met');
      expect(err.message).toBe('Custodial key release failed: quorum not met');
    });

    it('extends BurnBagError', () => {
      expect(new CustodialKeyReleaseError()).toBeInstanceOf(BurnBagError);
    });
  });

  describe('SealLedgerInconsistencyError', () => {
    it('formats message without detail', () => {
      const err = new SealLedgerInconsistencyError();
      expect(err.message).toBe(
        'Seal and ledger are inconsistent — possible tampering',
      );
      expect(err.code).toBe('SEAL_LEDGER_INCONSISTENCY');
    });

    it('formats message with detail', () => {
      const err = new SealLedgerInconsistencyError('read entries found');
      expect(err.message).toBe(
        'Seal and ledger are inconsistent — possible tampering: read entries found',
      );
    });

    it('extends BurnBagError', () => {
      expect(new SealLedgerInconsistencyError()).toBeInstanceOf(BurnBagError);
    });
  });

  describe('sensitive material never leaks', () => {
    it('no error message contains placeholder sensitive terms', () => {
      const errors = [
        new VaultDestroyedError(),
        new DecryptionError(),
        new DecryptionError('bad ciphertext'),
        new ChainVerificationError('root mismatch'),
        new TreeDepthError(3),
        new SignatureVerificationError(),
        new SerializationError('overflow'),
        new DeserializationError('truncated'),
        new TimestampError(),
        new LedgerWriteError(),
        new LedgerWriteError('timeout'),
        new CustodialKeyReleaseError(),
        new CustodialKeyReleaseError('denied'),
        new SealLedgerInconsistencyError(),
        new SealLedgerInconsistencyError('mismatch'),
      ];

      for (const err of errors) {
        // Messages must not contain raw key/seed material patterns
        expect(err.message).not.toMatch(/[0-9a-f]{64}/i);
        expect(err.stack).toBeDefined();
      }
    });
  });
});
