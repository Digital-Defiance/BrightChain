/**
 * Ethereum wallet interfaces for the BrightChain identity system.
 *
 * Defines the data structures for Ethereum address derivation,
 * message signing, and transaction signing. All interfaces are
 * generic over TId for frontend/backend DTO compatibility.
 *
 * Requirements: 6.1
 */

/**
 * Represents a derived Ethereum wallet address and its associated metadata.
 *
 * @example
 * ```typescript
 * const wallet: IEthereumWallet = {
 *   memberId: 'member-xyz',
 *   address: '0x1234...abcd',
 *   publicKeyHex: '04abcdef...',
 *   derivationPath: "m/44'/60'/0'/0/0",
 *   createdAt: new Date(),
 * };
 * ```
 */
export interface IEthereumWallet<TId = string> {
  /** The member this wallet belongs to */
  memberId: TId;

  /** EIP-55 checksummed Ethereum address */
  address: string;

  /** Uncompressed SECP256k1 public key (65 bytes, hex-encoded) */
  publicKeyHex: string;

  /** BIP44 derivation path used to derive this wallet */
  derivationPath: string;

  /** When the wallet was first derived */
  createdAt: Date;

  /** Optional label for the wallet */
  label?: string;
}

/**
 * Represents a signed Ethereum message with recovery information.
 */
export interface IEthereumSignedMessage<TId = string> {
  /** The member who signed the message */
  memberId: TId;

  /** The original message that was signed */
  message: string;

  /** ECDSA signature (hex-encoded, 65 bytes: r + s + v) */
  signature: string;

  /** Recovery parameter (0 or 1) */
  recoveryParam: number;

  /** When the message was signed */
  signedAt: Date;
}

/**
 * Represents an Ethereum transaction signing request.
 */
export interface IEthereumTransactionRequest {
  /** Destination address */
  to: string;

  /** Value in wei (as string to avoid precision loss) */
  value: string;

  /** Transaction data (hex-encoded) */
  data?: string;

  /** Gas limit */
  gasLimit?: string;

  /** Gas price in wei (as string) */
  gasPrice?: string;

  /** Transaction nonce */
  nonce?: number;

  /** Chain ID (1 = mainnet, 5 = goerli, etc.) */
  chainId: number;
}
