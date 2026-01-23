/**
 * ECIES Configuration Module
 *
 * Provides a ready-to-use ECIES configuration object for BrightChain.
 * This configuration implements IECIESConfig from @digitaldefiance/ecies-lib
 * and uses the standard ECIES constants.
 *
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for IECIESConfig interface
 * @module ecies-config
 */

import { ECIES, IECIESConfig } from '@digitaldefiance/ecies-lib';

/**
 * ECIES configuration for BrightChain.
 *
 * This configuration object implements IECIESConfig and provides all necessary
 * settings for ECIES encryption operations in BrightChain:
 *
 * - curveName: Elliptic curve to use (secp256k1)
 * - primaryKeyDerivationPath: BIP32 derivation path
 * - mnemonicStrength: Bits of entropy for mnemonic generation
 * - symmetricAlgorithm: Symmetric encryption algorithm (aes-256-gcm)
 * - symmetricKeyBits: Key size for symmetric encryption (256)
 * - symmetricKeyMode: Mode for symmetric encryption (gcm)
 *
 * @example
 * ```typescript
 * import { EciesConfig } from 'brightchain-lib';
 *
 * // Use in ECIES operations
 * const config = EciesConfig;
 * console.log(config.curveName);  // 'secp256k1'
 * ```
 *
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for IECIESConfig interface
 */
export const EciesConfig: IECIESConfig = {
  curveName: ECIES.CURVE_NAME,
  primaryKeyDerivationPath: ECIES.PRIMARY_KEY_DERIVATION_PATH,
  mnemonicStrength: ECIES.MNEMONIC_STRENGTH,
  symmetricAlgorithm: ECIES.SYMMETRIC.ALGORITHM,
  symmetricKeyBits: ECIES.SYMMETRIC.KEY_BITS,
  symmetricKeyMode: ECIES.SYMMETRIC.MODE,
};
