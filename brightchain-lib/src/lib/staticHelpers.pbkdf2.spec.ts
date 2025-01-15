import { StaticHelpersPbkdf2 } from './staticHelpers.pbkdf2';

describe('brightchain staticHelpers.pbkdf2', () => {
  it('should derive the same password twice', () => {
    const password = Buffer.from('password');
    const derivedKey = StaticHelpersPbkdf2.deriveKeyFromPassword(password);
    const derivedKey2 = StaticHelpersPbkdf2.deriveKeyFromPassword(
      password,
      derivedKey.salt,
      derivedKey.iterations,
    );
    expect(derivedKey.hash).toEqual(derivedKey2.hash);
  });
});
