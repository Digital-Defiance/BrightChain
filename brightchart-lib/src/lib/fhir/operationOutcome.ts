/**
 * FHIR R4 OperationOutcome Resource
 *
 * Defines interfaces for FHIR R4 OperationOutcome, used to convey
 * error, warning, and informational messages from operations.
 *
 * @see https://build.fhir.org/operationoutcome.html
 * @module fhir/operationOutcome
 */

import { ICodeableConcept, IExtension, IMeta, INarrative } from './datatypes';

/**
 * Severity levels for OperationOutcome issues
 * @see https://build.fhir.org/valueset-issue-severity.html
 */
export type IssueSeverity = 'fatal' | 'error' | 'warning' | 'information';

/**
 * Issue type codes for OperationOutcome issues
 * @see https://build.fhir.org/valueset-issue-type.html
 */
export type IssueCode =
  | 'invalid'
  | 'structure'
  | 'required'
  | 'value'
  | 'invariant'
  | 'security'
  | 'login'
  | 'unknown'
  | 'expired'
  | 'forbidden'
  | 'suppressed'
  | 'processing'
  | 'not-supported'
  | 'duplicate'
  | 'multiple-matches'
  | 'not-found'
  | 'deleted'
  | 'too-long'
  | 'code-invalid'
  | 'extension'
  | 'too-costly'
  | 'business-rule'
  | 'conflict'
  | 'transient'
  | 'lock-error'
  | 'no-store'
  | 'exception'
  | 'timeout'
  | 'incomplete'
  | 'throttled'
  | 'informational';

/**
 * FHIR R4 OperationOutcome.issue backbone element
 * @see https://build.fhir.org/operationoutcome-definitions.html#OperationOutcome.issue
 */
export interface IOperationOutcomeIssue {
  /** fatal | error | warning | information */
  severity: IssueSeverity;
  /** Error or warning code */
  code: IssueCode;
  /** Additional details about the error */
  details?: ICodeableConcept;
  /** Additional diagnostic information about the issue */
  diagnostics?: string;
  /** Deprecated: Path of element(s) related to issue */
  location?: string[];
  /** FHIRPath of element(s) related to issue */
  expression?: string[];
}

/**
 * FHIR R4 OperationOutcome resource
 * @see https://build.fhir.org/operationoutcome.html
 */
export interface IOperationOutcome {
  /** Fixed value: 'OperationOutcome' */
  resourceType: 'OperationOutcome';
  /** Logical id of this artifact */
  id?: string;
  /** Metadata about the resource */
  meta?: IMeta;
  /** Text summary of the resource */
  text?: INarrative;
  /** Additional content defined by implementations */
  extension?: IExtension[];
  /** A single issue associated with the action */
  issue: IOperationOutcomeIssue[];
}
