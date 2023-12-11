/**
 * Represents a symmetric friendship between two members.
 * `memberIdA` is always the lexicographically smaller ID.
 */
export interface IBaseFriendship<TId> {
  _id: TId;
  memberIdA: TId;
  memberIdB: TId;
  createdAt: TId extends string ? string : Date;
}
