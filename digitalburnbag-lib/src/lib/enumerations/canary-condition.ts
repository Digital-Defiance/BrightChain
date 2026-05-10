/**
 * @enum CanaryCondition
 * @description Conditions for which a canary protocol is enacted
 */
export enum CanaryCondition {
  /**
   * The signal is present
   */
  PRESENCE = 'presence',
  /**
   * The signal indicates duress
   */
  DURESS = 'duress',
  /**
   * The signal is not present
   */
  ABSENCE = 'absense',
}
