/**
 * Pool summary information for pool listings.
 *
 * @see Requirements 4.1, 4.2, 10.1
 */
export interface IPoolInfo<TID = string> {
  poolId: string; // PoolId is always string
  blockCount: number;
  totalSize: number; // bytes
  memberCount: number;
  encrypted: boolean;
  publicRead: boolean;
  publicWrite: boolean;
  hostingNodes: TID[]; // nodes known to host this pool
}

/**
 * Detailed pool information including ACL summary.
 *
 * @see Requirements 4.2, 10.1
 */
export interface IPoolDetail<TID = string> extends IPoolInfo<TID> {
  owner: TID;
  aclSummary: IPoolAclSummary<TID>;
}

/**
 * Summary of a pool's access control list.
 *
 * @see Requirements 4.2, 10.1
 */
export interface IPoolAclSummary<_TID = string> {
  memberCount: number;
  adminCount: number;
  publicRead: boolean;
  publicWrite: boolean;
  currentUserPermissions: string[]; // PoolPermission values for the requesting member
}
