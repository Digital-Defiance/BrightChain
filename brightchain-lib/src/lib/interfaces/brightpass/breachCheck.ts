/**
 * Result of checking a password against the breach database.
 */
export interface IBreachCheckResult {
  /** Whether the password was found in known data breaches. */
  breached: boolean;
  /** Approximate number of times the password appeared in breaches. */
  count: number;
}
