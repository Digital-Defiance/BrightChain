import * as argon2 from 'argon2';
import type { BackendMember } from './backendMember';
import { BackupCode } from './backupCode';
import { ApiConstants } from './constants';
import { InvalidBackupCodeVersionError } from './errors/invalid-backup-code-version';
import { SymmetricService } from './services/symmetric';

// TypeScript imports
import {
  AppConstants,
  InvalidBackupCodeError,
  MemberType,
  PrivateKeyRequiredError,
} from '@brightchain/brightchain-lib';

// Mock argon2 at the module level
jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

describe('BackupCode.generateBackupCodes', () => {
  it('generates the configured number of unique codes with valid format', () => {
    const list = BackupCode.generateBackupCodes();

    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(AppConstants.BACKUP_CODES.Count);

    const normalizedSet = new Set<string>();
    for (const bc of list) {
      expect(bc).toBeInstanceOf(BackupCode);
      const raw = bc.value!;
      const normalized = BackupCode.normalizeCode(raw);
      const displayOk = AppConstants.BACKUP_CODES.DisplayRegex.test(raw);
      const normalizedOk =
        AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalized);
      expect(displayOk || normalizedOk).toBe(true);
      normalizedSet.add(normalized);
    }
    expect(normalizedSet.size).toBe(list.length);
  });
});

describe('BackupCode.hkdfSha256', () => {
  it('matches RFC 5869 test vector (SHA-256, case 1)', () => {
    // RFC 5869 test case 1
    const ikm = Buffer.alloc(22, 0x0b);
    const salt = Buffer.from([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0x0c,
    ]);
    const info = Buffer.from([
      0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9,
    ]);
    const okm = BackupCode.hkdfSha256(ikm, salt, info, 42);
    const expectedHex =
      '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865';
    expect(okm.toString('hex')).toBe(expectedHex);
  });

  it('returns empty buffer when length is 0', () => {
    const out = BackupCode.hkdfSha256(
      Buffer.alloc(1),
      Buffer.alloc(0),
      Buffer.alloc(0),
      0,
    );
    expect(out.equals(Buffer.alloc(0))).toBe(true);
  });
});

describe('BackupCode.getBackupKeyV1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws InvalidBackupCodeError for invalid normalized code', async () => {
    await expect(
      BackupCode.getBackupKeyV1('00', 'not-a-valid-code'),
    ).rejects.toBeInstanceOf(InvalidBackupCodeError);
  });

  it('derives key via argon2.hash with provided salt and normalized code', async () => {
    const codeStr = BackupCode.generateBackupCode();
    const normalized = BackupCode.normalizeCode(codeStr);
    const salt = Buffer.from('a1b2c3', 'hex');
    const fakeKey = Buffer.alloc(32, 7);

    const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
    mockHash.mockClear(); // Clear any previous calls
    mockHash.mockResolvedValueOnce(fakeKey as any);

    const key = await BackupCode.getBackupKeyV1(
      salt.toString('hex'),
      normalized,
    );
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key).toHaveLength(32);
    expect(key.equals(fakeKey)).toBe(true);

    expect(mockHash).toHaveBeenCalledTimes(1);
    const [pwdBytes, opts] = mockHash.mock.calls[0] as [Buffer, any];
    expect(Buffer.isBuffer(pwdBytes)).toBe(true);
    // The buffer should contain the normalized code before it gets zeroed
    expect(opts.salt?.equals(salt)).toBe(true);
  });
});

describe('BackupCode.encrypt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeUsers = () => {
    const backupUser = {
      hasPrivateKey: true,
      privateKey: { value: Buffer.from('super-secret-private-key') },
    } as unknown as BackendMember;

    const systemUser = {
      type: MemberType.System,
      encryptData: (buf: Buffer) => buf,
    } as unknown as BackendMember;

    return { backupUser, systemUser };
  };

  it('throws PrivateKeyRequiredError when backup user has no private key', async () => {
    const badBackupUser = {
      hasPrivateKey: false,
    } as unknown as BackendMember;
    const systemUser = {
      type: MemberType.System,
      encryptData: (b: Buffer) => b,
    } as unknown as BackendMember;
    const code = new BackupCode(BackupCode.generateBackupCode());

    await expect(
      code.encrypt(badBackupUser, systemUser),
    ).rejects.toBeInstanceOf(PrivateKeyRequiredError);
  });

  it('throws when system user type is not MemberType.System', async () => {
    const backupUser = {
      hasPrivateKey: true,
      privateKey: { value: Buffer.from('k') },
    } as unknown as BackendMember;
    const notSystem = {
      type: MemberType.User,
      encryptData: (b: Buffer) => b,
    } as unknown as BackendMember;

    const code = new BackupCode(BackupCode.generateBackupCode());
    await expect(code.encrypt(backupUser, notSystem)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('throws InvalidBackupCodeError for malformed code input', async () => {
    const { backupUser, systemUser } = makeUsers();

    // The constructor itself should throw for invalid codes
    expect(() => {
      new BackupCode('INVALID-CODE-###');
    }).toThrow(InvalidBackupCodeError);
  });

  it('encrypts and wraps correctly (using mocked crypto)', async () => {
    const { backupUser, systemUser } = makeUsers();
    const code = new BackupCode(BackupCode.generateBackupCode());

    const fakeKey = Buffer.alloc(32, 0x11);
    const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
    mockHash.mockResolvedValueOnce(fakeKey as any);

    const encryptedData = Buffer.from('enc-blob');
    const encSpy = jest
      .spyOn(SymmetricService, 'encryptBuffer')
      .mockReturnValueOnce({
        encryptedData,
        key: Buffer.alloc(32, 0), // added key
      });

    const result = await code.encrypt(backupUser, systemUser);

    expect(result.version).toBe(BackupCode.BackupCodeVersion);
    expect(typeof result.checksumSalt).toBe('string');
    expect(typeof result.checksum).toBe('string');
    expect(typeof result.encrypted).toBe('string');

    expect(result.checksum).toHaveLength(64);
    expect(result.checksumSalt).toHaveLength(
      ApiConstants.PBKDF2.SALT_BYTES * 2,
    );
    expect(result.encrypted).toBe(encryptedData.toString('hex'));

    expect(encSpy).toHaveBeenCalledTimes(1);
  });
});

describe('BackupCode.encryptBackupCodesV1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encrypts a list of codes and returns IBackupCode array', async () => {
    const backupUser = {
      hasPrivateKey: true,
      privateKey: { value: Buffer.from('k') },
    } as unknown as BackendMember;
    const systemUser = {
      type: MemberType.System,
      encryptData: (b: Buffer) => b,
    } as unknown as BackendMember;

    // Prepare 3 codes
    const codes = Array.from(
      { length: 3 },
      () => new BackupCode(BackupCode.generateBackupCode()),
    );

    // Mock argon2 and symmetric encryption to be deterministic
    const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
    mockHash.mockResolvedValue(Buffer.alloc(32, 3) as any);
    jest
      .spyOn(SymmetricService, 'encryptBuffer')
      .mockImplementation((data: Buffer) => ({
        encryptedData: Buffer.concat([Buffer.from('x'), data]),
        key: Buffer.alloc(32, 1), // added key
      }));

    const results = await BackupCode.encryptBackupCodesV1(
      backupUser,
      systemUser,
      codes,
    );

    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.version).toBe(BackupCode.BackupCodeVersion);
      expect(r.checksum).toHaveLength(64);
      expect(r.checksumSalt).toHaveLength(ApiConstants.PBKDF2.SALT_BYTES * 2);
      expect(typeof r.encrypted).toBe('string');
      expect(r.encrypted.length).toBeGreaterThan(0);
    }
  });
});

describe('BackupCode.validateBackupCodeV1 and validateBackupCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true for a known encrypted code and false otherwise', async () => {
    const backupUser = {
      hasPrivateKey: true,
      privateKey: { value: Buffer.from('k') },
    } as unknown as BackendMember;
    const systemUser = {
      type: MemberType.System,
      encryptData: (b: Buffer) => b,
    } as unknown as BackendMember;

    const codeObj = new BackupCode(BackupCode.generateBackupCode());
    const otherCode = new BackupCode(BackupCode.generateBackupCode());

    // mock argon2 and symmetric encryption (deterministic)
    const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
    mockHash.mockResolvedValue(Buffer.alloc(32, 9) as any);
    jest.spyOn(SymmetricService, 'encryptBuffer').mockReturnValue({
      encryptedData: Buffer.from('xx'),
      key: Buffer.alloc(32, 2), // added key
    });

    const encrypted = await codeObj.encrypt(backupUser, systemUser);

    expect(BackupCode.validateBackupCodeV1([encrypted], codeObj.value!)).toBe(
      true,
    );
    expect(BackupCode.validateBackupCodeV1([encrypted], otherCode.value!)).toBe(
      false,
    );

    // validateBackupCode forwards to V1 when present
    expect(BackupCode.validateBackupCode([encrypted], codeObj.value!)).toBe(
      true,
    );
  });

  it('returns false immediately for malformed input', () => {
    const res = BackupCode.validateBackupCode([], 'not-a-valid-code');
    expect(res).toBe(false);
  });
});

describe('BackupCode.detectBackupCodeVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the matching version for a known code', async () => {
    const backupUser = {
      hasPrivateKey: true,
      privateKey: { value: Buffer.from('k') },
    } as unknown as BackendMember;
    const systemUser = {
      type: MemberType.System,
      encryptData: (b: Buffer) => b,
    } as unknown as BackendMember;

    const codeObj = new BackupCode(BackupCode.generateBackupCode());
    const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
    mockHash.mockResolvedValue(Buffer.alloc(32, 5) as any);
    jest.spyOn(SymmetricService, 'encryptBuffer').mockReturnValue({
      encryptedData: Buffer.from('yy'),
      key: Buffer.alloc(32, 3), // added key
    });

    const encrypted = await codeObj.encrypt(backupUser, systemUser);
    const version = BackupCode.detectBackupCodeVersion(
      [encrypted],
      codeObj.value!,
    );
    expect(version).toBe(BackupCode.BackupCodeVersion);
  });

  it('throws InvalidBackupCodeVersionError when only unsupported versions are present', () => {
    const badList = [
      {
        version: '2.0.0',
        checksumSalt: '00',
        checksum: '00',
        encrypted: '00',
      },
    ];
    const codeStr = BackupCode.generateBackupCode();
    const normalized = BackupCode.normalizeCode(codeStr);

    expect(() =>
      BackupCode.detectBackupCodeVersion(badList as any, normalized),
    ).toThrow(InvalidBackupCodeVersionError);
  });

  it('throws InvalidBackupCodeError for malformed input', () => {
    expect(() => BackupCode.detectBackupCodeVersion([], 'malformed')).toThrow(
      InvalidBackupCodeError,
    );
  });
});

describe('BackupCode.normalizeCode usage parity', () => {
  it('normalized code matches regex for a generated display code', () => {
    const display = BackupCode.generateBackupCode();
    const normalized = BackupCode.normalizeCode(display);
    expect(AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalized)).toBe(
      true,
    );
  });
});
