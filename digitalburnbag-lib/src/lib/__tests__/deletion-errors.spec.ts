import {
  BurnBagError,
  CertificateNotFoundError,
  DeletionAlreadyScheduledError,
  DisownRequiresPublicVisibilityError,
  InvalidStateTransitionError,
  VaultAlreadyDisownedError,
} from '../errors';

describe('Deletion-related error classes', () => {
  describe('InvalidStateTransitionError', () => {
    it('includes current and requested states in message', () => {
      const err = new InvalidStateTransitionError('active', 'disowned');
      expect(err.message).toBe(
        "INVALID_STATE_TRANSITION: cannot transition from 'active' to 'disowned'",
      );
    });

    it('has INVALID_STATE_TRANSITION code', () => {
      const err = new InvalidStateTransitionError('sealed', 'active');
      expect(err.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('extends BurnBagError', () => {
      const err = new InvalidStateTransitionError('destroyed', 'active');
      expect(err).toBeInstanceOf(BurnBagError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('VaultAlreadyDisownedError', () => {
    it('includes container ID in message', () => {
      const err = new VaultAlreadyDisownedError('container-123');
      expect(err.message).toBe(
        "VAULT_ALREADY_DISOWNED: vault 'container-123' has already been disowned",
      );
    });

    it('has VAULT_ALREADY_DISOWNED code', () => {
      const err = new VaultAlreadyDisownedError('abc');
      expect(err.code).toBe('VAULT_ALREADY_DISOWNED');
    });

    it('extends BurnBagError', () => {
      const err = new VaultAlreadyDisownedError('xyz');
      expect(err).toBeInstanceOf(BurnBagError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('DisownRequiresPublicVisibilityError', () => {
    it('includes container ID in message', () => {
      const err = new DisownRequiresPublicVisibilityError('container-456');
      expect(err.message).toBe(
        "DISOWN_REQUIRES_PUBLIC_VISIBILITY: vault 'container-456' is not public",
      );
    });

    it('has DISOWN_REQUIRES_PUBLIC_VISIBILITY code', () => {
      const err = new DisownRequiresPublicVisibilityError('abc');
      expect(err.code).toBe('DISOWN_REQUIRES_PUBLIC_VISIBILITY');
    });

    it('extends BurnBagError', () => {
      const err = new DisownRequiresPublicVisibilityError('xyz');
      expect(err).toBeInstanceOf(BurnBagError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('DeletionAlreadyScheduledError', () => {
    const timestamp = '2025-02-15T12:00:00.000Z';

    it('includes container ID and timestamp in message', () => {
      const err = new DeletionAlreadyScheduledError('container-789', timestamp);
      expect(err.message).toBe(
        `DELETION_ALREADY_SCHEDULED: vault 'container-789' already has pending deletion at ${timestamp}`,
      );
    });

    it('has DELETION_ALREADY_SCHEDULED code', () => {
      const err = new DeletionAlreadyScheduledError('abc', timestamp);
      expect(err.code).toBe('DELETION_ALREADY_SCHEDULED');
    });

    it('exposes pendingDeletionAt as a public property', () => {
      const err = new DeletionAlreadyScheduledError('abc', timestamp);
      expect(err.pendingDeletionAt).toBe(timestamp);
    });

    it('extends BurnBagError', () => {
      const err = new DeletionAlreadyScheduledError('xyz', timestamp);
      expect(err).toBeInstanceOf(BurnBagError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('CertificateNotFoundError', () => {
    it('includes container ID in message', () => {
      const err = new CertificateNotFoundError('container-abc');
      expect(err.message).toBe(
        "CERTIFICATE_NOT_FOUND: no certificate exists for vault 'container-abc'",
      );
    });

    it('has CERTIFICATE_NOT_FOUND code', () => {
      const err = new CertificateNotFoundError('abc');
      expect(err.code).toBe('CERTIFICATE_NOT_FOUND');
    });

    it('extends BurnBagError', () => {
      const err = new CertificateNotFoundError('xyz');
      expect(err).toBeInstanceOf(BurnBagError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('sensitive material never leaks', () => {
    it('no deletion error message contains raw key/seed material', () => {
      const errors = [
        new InvalidStateTransitionError('active', 'destroyed'),
        new VaultAlreadyDisownedError('container-1'),
        new DisownRequiresPublicVisibilityError('container-2'),
        new DeletionAlreadyScheduledError(
          'container-3',
          '2025-01-01T00:00:00Z',
        ),
        new CertificateNotFoundError('container-4'),
      ];

      for (const err of errors) {
        expect(err.message).not.toMatch(/[0-9a-f]{64}/i);
        expect(err.stack).toBeDefined();
      }
    });
  });
});
