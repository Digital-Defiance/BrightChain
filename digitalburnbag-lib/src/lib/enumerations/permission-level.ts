import { PermissionFlag } from './permission-flag';

/**
 * @enum PermissionLevel
 * @description Built-in permission levels. Each maps to a predefined set
 * of {@link PermissionFlag} values via {@link PermissionLevelFlags}.
 *
 * Viewer  — Read + Preview + Download
 * Commenter — Read + Preview + Download + Comment
 * Editor  — Read + Write + Preview + Download + Comment + ManageVersions
 * Owner   — All flags
 */
export enum PermissionLevel {
  Viewer = 'viewer',
  Commenter = 'commenter',
  Editor = 'editor',
  Owner = 'owner',
}

/**
 * Maps each {@link PermissionLevel} to its predefined set of
 * {@link PermissionFlag} values. This is the canonical source of truth
 * for what each built-in level grants.
 */
export const PermissionLevelFlags: Readonly<
  Record<PermissionLevel, ReadonlySet<PermissionFlag>>
> = {
  [PermissionLevel.Viewer]: new Set<PermissionFlag>([
    PermissionFlag.Read,
    PermissionFlag.Preview,
    PermissionFlag.Download,
  ]),
  [PermissionLevel.Commenter]: new Set<PermissionFlag>([
    PermissionFlag.Read,
    PermissionFlag.Preview,
    PermissionFlag.Download,
    PermissionFlag.Comment,
  ]),
  [PermissionLevel.Editor]: new Set<PermissionFlag>([
    PermissionFlag.Read,
    PermissionFlag.Write,
    PermissionFlag.Preview,
    PermissionFlag.Download,
    PermissionFlag.Comment,
    PermissionFlag.ManageVersions,
  ]),
  [PermissionLevel.Owner]: new Set<PermissionFlag>(
    Object.values(PermissionFlag),
  ),
};
