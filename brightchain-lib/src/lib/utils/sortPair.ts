/**
 * Lexicographically sort two member IDs for symmetric friendship storage.
 * Ensures the same pair always produces the same (memberIdA, memberIdB) order.
 */
export function sortPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}
