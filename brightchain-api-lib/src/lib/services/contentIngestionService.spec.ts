/**
 * @fileoverview Unit tests for ContentIngestionService.
 *
 * Tests:
 * - Valid content accepted (real, alias, anonymous modes)
 * - Each IdentityValidationErrorType rejection reason
 * - IdentitySealingPipeline called only after validation passes
 * - BrightTrustError sealing failures produce correct rejections
 *
 * @see Task 19.4
 */

import {
  BrightTrustError,
  BrightTrustErrorType,
  ContentWithIdentity,
  IdentityMode,
  IdentitySealingResult,
  IdentityValidationError,
  IdentityValidationErrorType,
  IdentityValidationResult,
  IIdentitySealingPipeline,
  IIdentityValidator,
} from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import { ContentIngestionService } from './contentIngestionService';

// ─── Test Helpers ───────────────────────────────────────────────────────────

const MOCK_CONTENT_ID = 'aabbccdd11223344aabbccdd11223344' as HexString;
const MOCK_MEMBER_ID = '11223344aabbccdd11223344aabbccdd' as HexString;
const MOCK_RECOVERY_ID = 'eeff00112233445566778899aabbccdd' as HexString;

function makeContent(
  overrides?: Partial<ContentWithIdentity<Uint8Array>>,
): ContentWithIdentity<Uint8Array> {
  return {
    creatorId: new Uint8Array([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]),
    contentId: MOCK_CONTENT_ID,
    contentType: 'block',
    signature: new Uint8Array([0xaa, 0xbb, 0xcc]),
    ...overrides,
  };
}

function makeValidationResult(
  overrides?: Partial<IdentityValidationResult>,
): IdentityValidationResult {
  return {
    valid: true,
    identityMode: IdentityMode.Real,
    resolvedMemberId: MOCK_MEMBER_ID,
    ...overrides,
  };
}

function makeSealingResult(
  content: ContentWithIdentity<Uint8Array>,
  overrides?: Partial<IdentitySealingResult<Uint8Array>>,
): IdentitySealingResult<Uint8Array> {
  return {
    modifiedContent: { ...content, identityRecoveryRecordId: MOCK_RECOVERY_ID },
    recoveryRecordId: MOCK_RECOVERY_ID,
    ...overrides,
  };
}

interface MockValidator extends IIdentityValidator<Uint8Array> {
  validateContent: jest.Mock;
}

interface MockSealingPipeline extends IIdentitySealingPipeline<Uint8Array> {
  sealIdentity: jest.Mock;
  recoverIdentity: jest.Mock;
}

function createMockValidator(): MockValidator {
  return {
    validateContent: jest.fn(),
  };
}

function createMockSealingPipeline(): MockSealingPipeline {
  return {
    sealIdentity: jest.fn(),
    recoverIdentity: jest.fn(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ContentIngestionService', () => {
  let validator: MockValidator;
  let sealingPipeline: MockSealingPipeline;
  let service: ContentIngestionService<Uint8Array>;

  beforeEach(() => {
    validator = createMockValidator();
    sealingPipeline = createMockSealingPipeline();
    service = new ContentIngestionService(validator, sealingPipeline);
  });

  describe('processContent — valid content accepted', () => {
    it('should accept content with real identity mode', async () => {
      const content = makeContent();
      const valResult = makeValidationResult({
        identityMode: IdentityMode.Real,
      });
      validator.validateContent.mockResolvedValue(valResult);
      sealingPipeline.sealIdentity.mockResolvedValue(
        makeSealingResult(content),
      );

      const result = await service.processContent(content);

      expect(result.accepted).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Real);
      expect(result.resolvedMemberId).toBe(MOCK_MEMBER_ID);
      expect(result.recoveryRecordId).toBe(MOCK_RECOVERY_ID);
      expect(result.processedContent.identityRecoveryRecordId).toBe(
        MOCK_RECOVERY_ID,
      );
    });

    it('should accept content with alias identity mode', async () => {
      const content = makeContent();
      const valResult = makeValidationResult({
        identityMode: IdentityMode.Alias,
        resolvedMemberId: MOCK_MEMBER_ID,
      });
      validator.validateContent.mockResolvedValue(valResult);
      sealingPipeline.sealIdentity.mockResolvedValue(
        makeSealingResult(content),
      );

      const result = await service.processContent(content);

      expect(result.accepted).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Alias);
      expect(result.resolvedMemberId).toBe(MOCK_MEMBER_ID);
    });

    it('should accept content with anonymous identity mode', async () => {
      const content = makeContent({
        creatorId: new Uint8Array(16), // all zeroes = anonymous
        membershipProof: new Uint8Array([0xde, 0xad]),
      });
      const valResult = makeValidationResult({
        identityMode: IdentityMode.Anonymous,
        resolvedMemberId: undefined,
      });
      validator.validateContent.mockResolvedValue(valResult);
      sealingPipeline.sealIdentity.mockResolvedValue(
        makeSealingResult(content),
      );

      const result = await service.processContent(content);

      expect(result.accepted).toBe(true);
      expect(result.identityMode).toBe(IdentityMode.Anonymous);
      expect(result.resolvedMemberId).toBeUndefined();
    });
  });

  describe('processContent — IdentitySealingPipeline called after validation', () => {
    it('should call sealIdentity only after validateContent succeeds', async () => {
      const content = makeContent();
      const valResult = makeValidationResult();
      validator.validateContent.mockResolvedValue(valResult);
      sealingPipeline.sealIdentity.mockResolvedValue(
        makeSealingResult(content),
      );

      await service.processContent(content);

      // Verify call order: validateContent first, then sealIdentity
      expect(validator.validateContent).toHaveBeenCalledTimes(1);
      expect(validator.validateContent).toHaveBeenCalledWith(content);
      expect(sealingPipeline.sealIdentity).toHaveBeenCalledTimes(1);
      expect(sealingPipeline.sealIdentity).toHaveBeenCalledWith(
        content,
        IdentityMode.Real,
        undefined,
      );
    });

    it('should not call sealIdentity when validation throws', async () => {
      const content = makeContent();
      validator.validateContent.mockRejectedValue(
        new IdentityValidationError(
          IdentityValidationErrorType.InvalidSignature,
        ),
      );

      await expect(service.processContent(content)).rejects.toThrow(
        IdentityValidationError,
      );

      expect(sealingPipeline.sealIdentity).not.toHaveBeenCalled();
    });
  });

  describe('processContent — validation error propagation', () => {
    const errorTypes: IdentityValidationErrorType[] = [
      IdentityValidationErrorType.InvalidSignature,
      IdentityValidationErrorType.UnregisteredAlias,
      IdentityValidationErrorType.InactiveAlias,
      IdentityValidationErrorType.InvalidMembershipProof,
      IdentityValidationErrorType.MissingMembershipProof,
      IdentityValidationErrorType.BannedUser,
      IdentityValidationErrorType.SuspendedUser,
      IdentityValidationErrorType.ShardVerificationFailed,
    ];

    it.each(errorTypes)(
      'should propagate IdentityValidationError with type %s',
      async (errorType) => {
        const content = makeContent();
        validator.validateContent.mockRejectedValue(
          new IdentityValidationError(errorType),
        );

        await expect(service.processContent(content)).rejects.toThrow(
          IdentityValidationError,
        );

        expect(sealingPipeline.sealIdentity).not.toHaveBeenCalled();
      },
    );
  });

  describe('processContent — sealing error propagation', () => {
    it('should propagate BrightTrustError when sealing fails', async () => {
      const content = makeContent();
      validator.validateContent.mockResolvedValue(makeValidationResult());
      sealingPipeline.sealIdentity.mockRejectedValue(
        new BrightTrustError(BrightTrustErrorType.IdentitySealingFailed),
      );

      await expect(service.processContent(content)).rejects.toThrow(
        BrightTrustError,
      );
    });

    it('should propagate BrightTrustError when shard verification fails', async () => {
      const content = makeContent();
      validator.validateContent.mockResolvedValue(makeValidationResult());
      sealingPipeline.sealIdentity.mockRejectedValue(
        new BrightTrustError(BrightTrustErrorType.ShardVerificationFailed),
      );

      await expect(service.processContent(content)).rejects.toThrow(
        BrightTrustError,
      );
    });
  });

  describe('createRejection — descriptive error messages', () => {
    it.each([
      [
        IdentityValidationErrorType.InvalidSignature,
        'Content signature does not match the claimed identity public key',
      ],
      [
        IdentityValidationErrorType.UnregisteredAlias,
        'The alias used for content publication is not registered',
      ],
      [
        IdentityValidationErrorType.InactiveAlias,
        'The alias used for content publication has been deactivated',
      ],
      [
        IdentityValidationErrorType.InvalidMembershipProof,
        'The membership proof for anonymous content is invalid',
      ],
      [
        IdentityValidationErrorType.MissingMembershipProof,
        'Anonymous content must include a valid membership proof',
      ],
      [
        IdentityValidationErrorType.BannedUser,
        'The content creator has been banned from the network',
      ],
      [
        IdentityValidationErrorType.SuspendedUser,
        'The content creator is currently suspended',
      ],
      [
        IdentityValidationErrorType.ShardVerificationFailed,
        'Identity shard verification failed during sealing',
      ],
    ] as [IdentityValidationErrorType, string][])(
      'should produce descriptive rejection for %s',
      (errorType, expectedMessage) => {
        const error = new IdentityValidationError(errorType);
        const rejection = ContentIngestionService.createRejection(error);

        expect(rejection.accepted).toBe(false);
        expect(rejection.errorType).toBe(errorType);
        expect(rejection.reason).toBe(expectedMessage);
      },
    );
  });

  describe('createSealingRejection — sealing error messages', () => {
    it('should produce rejection for IdentitySealingFailed', () => {
      const error = new BrightTrustError(
        BrightTrustErrorType.IdentitySealingFailed,
      );
      const rejection = ContentIngestionService.createSealingRejection(error);

      expect(rejection.accepted).toBe(false);
      expect(rejection.errorType).toBe('IDENTITY_SEALING_FAILED');
      expect(rejection.reason).toContain('shard generation or distribution');
    });

    it('should produce rejection for ShardVerificationFailed', () => {
      const error = new BrightTrustError(
        BrightTrustErrorType.ShardVerificationFailed,
      );
      const rejection = ContentIngestionService.createSealingRejection(error);

      expect(rejection.accepted).toBe(false);
      expect(rejection.errorType).toBe('IDENTITY_SEALING_FAILED');
      expect(rejection.reason).toContain('do not reconstruct correctly');
    });

    it('should produce generic rejection for other BrightTrustErrors', () => {
      const error = new BrightTrustError(
        BrightTrustErrorType.TransactionFailed,
      );
      const rejection = ContentIngestionService.createSealingRejection(error);

      expect(rejection.accepted).toBe(false);
      expect(rejection.errorType).toBe('IDENTITY_SEALING_FAILED');
      expect(rejection.reason).toContain('TRANSACTION_FAILED');
    });
  });

  describe('type guard helpers', () => {
    it('isValidationError should return true for IdentityValidationError', () => {
      const error = new IdentityValidationError(
        IdentityValidationErrorType.BannedUser,
      );
      expect(ContentIngestionService.isValidationError(error)).toBe(true);
    });

    it('isValidationError should return false for other errors', () => {
      expect(ContentIngestionService.isValidationError(new Error('nope'))).toBe(
        false,
      );
    });

    it('isBrightTrustError should return true for BrightTrustError', () => {
      const error = new BrightTrustError(
        BrightTrustErrorType.IdentitySealingFailed,
      );
      expect(ContentIngestionService.isBrightTrustError(error)).toBe(true);
    });

    it('isBrightTrustError should return false for other errors', () => {
      expect(
        ContentIngestionService.isBrightTrustError(new Error('nope')),
      ).toBe(false);
    });
  });
});
