/**
 * Re-export IRequestUserDTO from the upstream suite-core-lib.
 * This ensures brightchain-lib's IRequestUserDTO is structurally identical
 * to the upstream version, avoiding type conflicts in consuming projects
 * (e.g. brightchain-api) that import from both packages.
 */
export type { IRequestUserDTO } from '@digitaldefiance/suite-core-lib';
