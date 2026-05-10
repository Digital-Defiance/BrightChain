/**
 * @enum VaultVisibility
 * @description Controls who can discover and access a vault container or
 * individual file/folder without an explicit ACL entry.
 *
 * - private  : Only principals with an explicit ACL entry can access.
 * - unlisted : Accessible to anyone who holds the direct link (token), but
 *              not indexed in the public discovery feed.
 * - public   : Indexed in the public discovery feed and accessible without
 *              authentication. Eligible for network-driven popularity
 *              replication bonuses.
 */
export enum VaultVisibility {
  Private = 'private',
  Unlisted = 'unlisted',
  Public = 'public',
}
