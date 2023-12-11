import { StaticHelpersElliptic } from './staticHelpers.elliptic';
import { StaticHelpersKeyPair } from './staticHelpers.keypair';

describe('brightchain staticHelpers.signing', () => {
  // TODO determine which of these methods to support, or both
  it('should sign and verify a message using StaticHelpersKeyPair.verifyWithSigningKey', () => {
    const keyPair = StaticHelpersKeyPair.generateSigningKeyPair();
    const message = Buffer.from('hello world', 'utf8');
    const signature = StaticHelpersKeyPair.signWithSigningKey(
      keyPair.keyPair,
      message
    );
    const verified = StaticHelpersKeyPair.verifyWithSigningKey(
      keyPair.keyPair,
      signature,
      message
    );
    expect(verified).toBeTruthy();
    expect(
      StaticHelpersKeyPair.verifyWithSigningKey(
        keyPair.keyPair,
        signature,
        Buffer.from('hello worldx', 'utf8')
      )
    ).toBeFalsy();
  });
  it('should sign and recover ec signature from hex der to verify a signature using StaticHelpersElliptic.verifySignature', () => {
    const keyPair = StaticHelpersKeyPair.generateSigningKeyPair();
    const message = Buffer.from('hello world', 'utf8');
    const signature = StaticHelpersKeyPair.signWithSigningKey(
      keyPair.keyPair,
      message
    );
    const testVerify = StaticHelpersElliptic.verifySignature(
      message,
      signature,
      keyPair.publicKey
    );
    expect(testVerify).toBeTruthy();
  });
});
