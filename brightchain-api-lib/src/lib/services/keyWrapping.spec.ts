import {
  InvalidNewPasswordError,
  InvalidPasswordError,
  SecureBuffer,
  SecureString,
} from '@brightchain/brightchain-lib';
import { KeyWrappingService } from './keyWrapping';

describe('KeyWrappingService', () => {
  const validPwd1 = 'A1!aaaaa';
  const validPwd2 = 'B2@bbbbb';
  const invalidPwd = 'short';

  it('wraps and unwraps a new master key (sync)', () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(pwd);

    const unwrapped = svc.unwrapMasterKey(wrappedKey, pwd);
    expect(Buffer.compare(unwrapped.value, masterKey.value)).toBe(0);

    // cleanup
    unwrapped.dispose();
    masterKey.dispose();
  });

  it('throws InvalidPasswordError when unwrapping with wrong password (sync)', () => {
    const svc = new KeyWrappingService();
    const correct = new SecureString(validPwd1);
    const wrong = new SecureString(validPwd2);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(correct);
    expect(() => svc.unwrapMasterKey(wrappedKey, wrong)).toThrow(
      InvalidPasswordError,
    );
    masterKey.dispose();
  });

  it('wrapMasterKey enforces password regex and throws InvalidNewPasswordError', () => {
    const svc = new KeyWrappingService();
    const master = new SecureBuffer(Buffer.alloc(32, 7));
    const badPwd = new SecureString(invalidPwd);
    expect(() => svc.wrapMasterKey(master, badPwd)).toThrow(
      InvalidNewPasswordError,
    );
    master.dispose();
  });

  it('changePassword re-wraps and validates old vs new password', () => {
    const svc = new KeyWrappingService();
    const oldPwd = new SecureString(validPwd1);
    const newPwd = new SecureString(validPwd2);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(oldPwd);

    const rewrapped = svc.changePassword(wrappedKey, oldPwd, newPwd);

    // New password unwraps
    const mkNew = svc.unwrapMasterKey(rewrapped, newPwd);
    expect(Buffer.compare(mkNew.value, masterKey.value)).toBe(0);
    mkNew.dispose();

    // Old password fails
    expect(() => svc.unwrapMasterKey(rewrapped, oldPwd)).toThrow(
      InvalidPasswordError,
    );
    masterKey.dispose();
  });

  it('unwrapMasterKeyAsync matches sync unwrap', async () => {
    const svc = new KeyWrappingService();
    const pwd = new SecureString(validPwd1);
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(pwd);

    const mkSync = svc.unwrapMasterKey(wrappedKey, pwd);
    const mkAsync = await svc.unwrapMasterKeyAsync(wrappedKey, pwd);

    expect(Buffer.compare(mkAsync.value, mkSync.value)).toBe(0);
    mkSync.dispose();
    mkAsync.dispose();
    masterKey.dispose();
  });

  it('unwrapMasterKeyAsyncDedup coalesces concurrent identical unwraps', async () => {
    const svc = new KeyWrappingService();
    const pwd = validPwd1; // accept string path to avoid SecureString overhead
    const { masterKey, wrappedKey } = svc.wrapNewMasterKey(
      new SecureString(pwd),
    );

    const spy = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      svc as any,
      'unwrapMasterKeyAsync',
    );

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        svc.unwrapMasterKeyAsyncDedup(wrappedKey, pwd),
      ),
    );
    // All results equal original master key
    for (const mk of results) {
      expect(Buffer.compare(mk.value, masterKey.value)).toBe(0);
      mk.dispose();
    }
    // Only one underlying unwrap call should have occurred due to deduplication
    expect(spy).toHaveBeenCalledTimes(1);

    masterKey.dispose();
    spy.mockRestore();
  });
});
