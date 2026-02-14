/**
 * Challenge-response authentication for node identity verification.
 * Interface in brightchain-lib; ECDSA implementation in brightchain-api-lib.
 *
 * All binary parameters use Uint8Array for browser compatibility.
 *
 * @see Requirements 9.1, 9.2, 9.4
 */
export interface INodeAuthenticator {
  /** Generate a random challenge nonce */
  createChallenge(): Uint8Array;

  /** Sign a challenge with the node's private key */
  signChallenge(
    challenge: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array>;

  /** Verify a signature against a public key */
  verifySignature(
    challenge: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean>;

  /** Get the node ID derived from a public key */
  deriveNodeId(publicKey: Uint8Array): string;
}
