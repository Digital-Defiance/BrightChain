import { ECIES } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EnhancedValidationError } from '../errors/enhancedValidationError';
import { Validator } from './validator';

describe('Validator', () => {
  describe('validateBlockSize', () => {
    it('should accept valid block sizes', () => {
      for (const size of validBlockSizes) {
        expect(() => Validator.validateBlockSize(size)).not.toThrow();
      }
    });

    it('should accept valid block sizes with context', () => {
      expect(() =>
        Validator.validateBlockSize(BlockSize.Medium, 'testContext'),
      ).not.toThrow();
    });

    it('should reject BlockSize.Unknown', () => {
      expect(() => Validator.validateBlockSize(BlockSize.Unknown)).toThrow(
        EnhancedValidationError,
      );
    });

    it('should reject invalid block size values', () => {
      expect(() => Validator.validateBlockSize(999 as BlockSize)).toThrow(
        EnhancedValidationError,
      );
    });

    it('should include field name in error', () => {
      try {
        Validator.validateBlockSize(999 as BlockSize);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).field).toBe('blockSize');
      }
    });

    it('should include context in error', () => {
      try {
        Validator.validateBlockSize(999 as BlockSize, 'calculateCapacity');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).context).toMatchObject({
          context: 'calculateCapacity',
        });
      }
    });

    it('should include valid sizes in error message', () => {
      try {
        Validator.validateBlockSize(999 as BlockSize);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).message).toContain(
          'Valid sizes are:',
        );
      }
    });
  });

  describe('validateBlockType', () => {
    it('should accept valid block types', () => {
      const validTypes = [
        BlockType.RawData,
        BlockType.Random,
        BlockType.FECData,
        BlockType.ConstituentBlockList,
        BlockType.ExtendedConstituentBlockListBlock,
        BlockType.EncryptedOwnedDataBlock,
        BlockType.EncryptedConstituentBlockListBlock,
        BlockType.EncryptedExtendedConstituentBlockListBlock,
        BlockType.MultiEncryptedBlock,
        BlockType.Handle,
        BlockType.EphemeralOwnedDataBlock,
        BlockType.OwnerFreeWhitenedBlock,
      ];

      for (const type of validTypes) {
        expect(() => Validator.validateBlockType(type)).not.toThrow();
      }
    });

    it('should accept valid block types with context', () => {
      expect(() =>
        Validator.validateBlockType(BlockType.RawData, 'testContext'),
      ).not.toThrow();
    });

    it('should reject BlockType.Unknown', () => {
      expect(() => Validator.validateBlockType(BlockType.Unknown)).toThrow(
        EnhancedValidationError,
      );
    });

    it('should reject invalid block type values', () => {
      expect(() => Validator.validateBlockType(999 as BlockType)).toThrow(
        EnhancedValidationError,
      );
    });

    it('should include field name in error', () => {
      try {
        Validator.validateBlockType(999 as BlockType);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).field).toBe('blockType');
      }
    });

    it('should include context in error', () => {
      try {
        Validator.validateBlockType(999 as BlockType, 'processBlock');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).context).toMatchObject({
          context: 'processBlock',
        });
      }
    });
  });

  describe('validateEncryptionType', () => {
    it('should accept valid encryption types', () => {
      const validTypes = [
        BlockEncryptionType.None,
        BlockEncryptionType.SingleRecipient,
        BlockEncryptionType.MultiRecipient,
      ];

      for (const type of validTypes) {
        expect(() => Validator.validateEncryptionType(type)).not.toThrow();
      }
    });

    it('should accept valid encryption types with context', () => {
      expect(() =>
        Validator.validateEncryptionType(
          BlockEncryptionType.SingleRecipient,
          'testContext',
        ),
      ).not.toThrow();
    });

    it('should reject invalid encryption type values', () => {
      expect(() =>
        Validator.validateEncryptionType(999 as BlockEncryptionType),
      ).toThrow(EnhancedValidationError);
    });

    it('should include field name in error', () => {
      try {
        Validator.validateEncryptionType(999 as BlockEncryptionType);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).field).toBe('encryptionType');
      }
    });

    it('should include context in error', () => {
      try {
        Validator.validateEncryptionType(999 as BlockEncryptionType, 'encrypt');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).context).toMatchObject({
          context: 'encrypt',
        });
      }
    });
  });

  describe('validateRecipientCount', () => {
    describe('for MultiRecipient encryption', () => {
      it('should accept valid recipient counts', () => {
        expect(() =>
          Validator.validateRecipientCount(
            1,
            BlockEncryptionType.MultiRecipient,
          ),
        ).not.toThrow();
        expect(() =>
          Validator.validateRecipientCount(
            5,
            BlockEncryptionType.MultiRecipient,
          ),
        ).not.toThrow();
        expect(() =>
          Validator.validateRecipientCount(
            ECIES.MULTIPLE.MAX_RECIPIENTS,
            BlockEncryptionType.MultiRecipient,
          ),
        ).not.toThrow();
      });

      it('should reject undefined recipient count', () => {
        expect(() =>
          Validator.validateRecipientCount(
            undefined,
            BlockEncryptionType.MultiRecipient,
          ),
        ).toThrow(EnhancedValidationError);
      });

      it('should reject zero recipient count', () => {
        expect(() =>
          Validator.validateRecipientCount(
            0,
            BlockEncryptionType.MultiRecipient,
          ),
        ).toThrow(EnhancedValidationError);
      });

      it('should reject negative recipient count', () => {
        expect(() =>
          Validator.validateRecipientCount(
            -1,
            BlockEncryptionType.MultiRecipient,
          ),
        ).toThrow(EnhancedValidationError);
      });

      it('should reject recipient count exceeding maximum', () => {
        expect(() =>
          Validator.validateRecipientCount(
            ECIES.MULTIPLE.MAX_RECIPIENTS + 1,
            BlockEncryptionType.MultiRecipient,
          ),
        ).toThrow(EnhancedValidationError);
      });

      it('should include field name in error for missing count', () => {
        try {
          Validator.validateRecipientCount(
            undefined,
            BlockEncryptionType.MultiRecipient,
          );
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(EnhancedValidationError);
          expect((error as EnhancedValidationError).field).toBe(
            'recipientCount',
          );
        }
      });

      it('should include max recipients in error for exceeding maximum', () => {
        try {
          Validator.validateRecipientCount(
            ECIES.MULTIPLE.MAX_RECIPIENTS + 1,
            BlockEncryptionType.MultiRecipient,
          );
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(EnhancedValidationError);
          expect((error as EnhancedValidationError).message).toContain(
            `${ECIES.MULTIPLE.MAX_RECIPIENTS}`,
          );
        }
      });

      it('should include context in error', () => {
        try {
          Validator.validateRecipientCount(
            undefined,
            BlockEncryptionType.MultiRecipient,
            'encrypt',
          );
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(EnhancedValidationError);
          expect((error as EnhancedValidationError).context).toMatchObject({
            context: 'encrypt',
          });
        }
      });
    });

    describe('for non-MultiRecipient encryption', () => {
      it('should accept undefined recipient count for None encryption', () => {
        expect(() =>
          Validator.validateRecipientCount(undefined, BlockEncryptionType.None),
        ).not.toThrow();
      });

      it('should accept undefined recipient count for SingleRecipient encryption', () => {
        expect(() =>
          Validator.validateRecipientCount(
            undefined,
            BlockEncryptionType.SingleRecipient,
          ),
        ).not.toThrow();
      });

      it('should accept any recipient count for None encryption', () => {
        expect(() =>
          Validator.validateRecipientCount(0, BlockEncryptionType.None),
        ).not.toThrow();
        expect(() =>
          Validator.validateRecipientCount(100, BlockEncryptionType.None),
        ).not.toThrow();
      });

      it('should accept any recipient count for SingleRecipient encryption', () => {
        expect(() =>
          Validator.validateRecipientCount(
            0,
            BlockEncryptionType.SingleRecipient,
          ),
        ).not.toThrow();
        expect(() =>
          Validator.validateRecipientCount(
            100,
            BlockEncryptionType.SingleRecipient,
          ),
        ).not.toThrow();
      });
    });
  });

  describe('validateRequired', () => {
    it('should accept non-null, non-undefined values', () => {
      expect(() => Validator.validateRequired('value', 'field')).not.toThrow();
      expect(() => Validator.validateRequired(0, 'field')).not.toThrow();
      expect(() => Validator.validateRequired(false, 'field')).not.toThrow();
      expect(() => Validator.validateRequired('', 'field')).not.toThrow();
      expect(() => Validator.validateRequired([], 'field')).not.toThrow();
      expect(() => Validator.validateRequired({}, 'field')).not.toThrow();
    });

    it('should accept values with context', () => {
      expect(() =>
        Validator.validateRequired('value', 'field', 'testContext'),
      ).not.toThrow();
    });

    it('should reject undefined', () => {
      expect(() => Validator.validateRequired(undefined, 'field')).toThrow(
        EnhancedValidationError,
      );
    });

    it('should reject null', () => {
      expect(() => Validator.validateRequired(null, 'field')).toThrow(
        EnhancedValidationError,
      );
    });

    it('should include field name in error message', () => {
      try {
        Validator.validateRequired(undefined, 'myField');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).field).toBe('myField');
        expect((error as EnhancedValidationError).message).toContain('myField');
      }
    });

    it('should include context in error', () => {
      try {
        Validator.validateRequired(undefined, 'field', 'initialize');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).context).toMatchObject({
          context: 'initialize',
        });
      }
    });

    it('should narrow type after validation', () => {
      const value: string | undefined = 'test';
      Validator.validateRequired(value, 'value');
      // TypeScript should now know value is string
      const length: number = value.length;
      expect(length).toBe(4);
    });
  });

  describe('validateNotEmpty', () => {
    it('should accept non-empty strings', () => {
      expect(() => Validator.validateNotEmpty('hello', 'field')).not.toThrow();
      expect(() => Validator.validateNotEmpty('a', 'field')).not.toThrow();
      expect(() =>
        Validator.validateNotEmpty('  hello  ', 'field'),
      ).not.toThrow();
    });

    it('should accept non-empty strings with context', () => {
      expect(() =>
        Validator.validateNotEmpty('hello', 'field', 'testContext'),
      ).not.toThrow();
    });

    it('should reject empty strings', () => {
      expect(() => Validator.validateNotEmpty('', 'field')).toThrow(
        EnhancedValidationError,
      );
    });

    it('should reject whitespace-only strings', () => {
      expect(() => Validator.validateNotEmpty('   ', 'field')).toThrow(
        EnhancedValidationError,
      );
      expect(() => Validator.validateNotEmpty('\t', 'field')).toThrow(
        EnhancedValidationError,
      );
      expect(() => Validator.validateNotEmpty('\n', 'field')).toThrow(
        EnhancedValidationError,
      );
      expect(() => Validator.validateNotEmpty(' \t\n ', 'field')).toThrow(
        EnhancedValidationError,
      );
    });

    it('should include field name in error message', () => {
      try {
        Validator.validateNotEmpty('', 'fileName');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).field).toBe('fileName');
        expect((error as EnhancedValidationError).message).toContain(
          'fileName',
        );
      }
    });

    it('should include context in error', () => {
      try {
        Validator.validateNotEmpty('', 'field', 'createFile');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EnhancedValidationError);
        expect((error as EnhancedValidationError).context).toMatchObject({
          context: 'createFile',
        });
      }
    });
  });
});
