/**
 * Calculated strength of a connection based on interaction frequency
 */
export enum ConnectionStrength {
  /** High interaction frequency */
  Strong = 'strong',
  /** Moderate interaction frequency */
  Moderate = 'moderate',
  /** Low interaction frequency */
  Weak = 'weak',
  /** No recent interactions */
  Dormant = 'dormant',
}
