/**
 * Re-export FontAwesome icons from the kit for use across the monorepo.
 * This allows other packages to import icons from @brightchain/brighthub-lib
 * instead of adding @awesome.me/kit-a20d532681 as a direct dependency.
 *
 * Usage in other packages:
 * ```ts
 * import { faHeart, faStar } from '@brightchain/brighthub-lib/icons/classic/solid';
 * // or
 * import { allIcons, byPrefixAndName } from '@brightchain/brighthub-lib/icons';
 * ```
 */

// Re-export the main icons index with all icons and utilities
export * from '@awesome.me/kit-a20d532681/icons';

// Re-export icon type definitions
export type {
  IconDefinition,
  IconName,
  IconPack,
  IconPrefix,
} from '@awesome.me/kit-a20d532681/icons';
