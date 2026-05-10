/**
 * SMART on FHIR v2 Scope Definitions
 *
 * Defines types and interfaces for SMART v2 scope syntax:
 * `context/ResourceType.actions`
 *
 * Where:
 * - context is `patient`, `user`, or `system`
 * - ResourceType is a FHIR resource type or `*` (wildcard)
 * - actions is a string of characters from {c, r, u, d, s} or `*` (all)
 *
 * @see https://www.hl7.org/fhir/us/core/scopes.html
 * @module scopes/smartScopes
 */

/**
 * SMART v2 scope string type.
 * Format: `context/ResourceType.actions`
 * Examples: `patient/Patient.rs`, `user/Patient.cruds`, `system/*.*`
 */
export type SmartScope = string;

/**
 * Scope context — determines whose data the scope applies to.
 */
export enum ScopeContext {
  /** Access to data in the context of the current patient */
  Patient = 'patient',
  /** Access to data the current user can access */
  User = 'user',
  /** System-level access (backend services) */
  System = 'system',
}

/**
 * Individual CRUDS actions for SMART v2 scopes.
 */
export enum ScopeAction {
  /** Create */
  Create = 'c',
  /** Read */
  Read = 'r',
  /** Update */
  Update = 'u',
  /** Delete */
  Delete = 'd',
  /** Search */
  Search = 's',
}

/**
 * Parsed representation of a SMART v2 scope string.
 */
export interface ISmartScopeDefinition {
  /** The scope context: patient, user, or system */
  context: ScopeContext;
  /** The FHIR resource type, or '*' for wildcard */
  resourceType: string;
  /** The set of granted actions, or '*' for all actions */
  actions: string;
}
