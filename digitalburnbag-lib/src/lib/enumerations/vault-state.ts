/**
 * @enum VaultState
 * @description The three states of a Vault's lifecycle.
 * Sealed → Accessed → Destroyed (irreversible transitions).
 */
export enum VaultState {
  Sealed = 'sealed',
  Accessed = 'accessed',
  Destroyed = 'destroyed',
}
