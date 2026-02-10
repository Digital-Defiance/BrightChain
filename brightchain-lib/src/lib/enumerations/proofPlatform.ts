/**
 * Proof platform enumeration for the BrightChain identity system.
 * Defines the supported platforms for social identity proofs.
 *
 * Identity proofs link a BrightChain identity to an external platform
 * account, allowing others to verify ownership across services.
 *
 * Requirements: 4.1, 4.5
 */

export enum ProofPlatform {
  /** Twitter / X social media platform */
  TWITTER = 'twitter',

  /** GitHub code hosting platform */
  GITHUB = 'github',

  /** Reddit social media platform */
  REDDIT = 'reddit',

  /** Personal or organisational website */
  WEBSITE = 'website',

  /** Bitcoin blockchain address */
  BITCOIN = 'bitcoin',

  /** Ethereum blockchain address */
  ETHEREUM = 'ethereum',
}
