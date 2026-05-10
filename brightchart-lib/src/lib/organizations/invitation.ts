/**
 * Invitation Interface
 *
 * Defines the IInvitation interface for time-limited, single-use tokens
 * used to onboard BrightChain members into an Organization with a
 * specified role code. Stored in the BrightDb `invitations` collection.
 *
 * @module organizations/invitation
 */

/**
 * Invitation record for controlled onboarding into an organization.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IInvitation<TID = string> {
  /** Unique identifier for the invitation */
  _id: TID;

  /** Unique, single-use invitation token */
  token: string;

  /** Organization this invitation is for */
  organizationId: string;

  /** SNOMED CT role code the invitee will receive */
  roleCode: string;

  /** Optional email address of the intended recipient */
  targetEmail?: string;

  /** Member ID of the invitation creator */
  createdBy: string;

  /** ISO timestamp when the invitation expires */
  expiresAt: string;

  /** Member ID of the member who redeemed the invitation */
  usedBy?: string;

  /** ISO timestamp when the invitation was redeemed */
  usedAt?: string;

  /** ISO timestamp of creation */
  createdAt: string;
}
