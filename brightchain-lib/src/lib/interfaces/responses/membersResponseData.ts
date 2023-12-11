/**
 * Platform-agnostic base data interface for members operation responses.
 * Used by both frontend and backend consumers.
 */
export interface IMembersResponseData {
  success: boolean;
  memberId?: string;
  blockId?: string;
  publicKey?: string;
  votingPublicKey?: string;
  type?: string;
  name?: string;
}
