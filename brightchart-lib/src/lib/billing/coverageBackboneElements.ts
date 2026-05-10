/**
 * FHIR R4 Coverage Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by the
 * Coverage resource: CoverageClass, CoverageCostToBeneficiary,
 * and CoverageException.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/coverage.html
 * @module billing/coverageBackboneElements
 */

import type { IQuantity } from '../clinical/datatypes';
import type { ICodeableConcept, IPeriod } from '../fhir/datatypes';
import type { IMoney } from './moneyType';

/**
 * FHIR R4 Coverage.class backbone element
 * A suite of underwriter-specific classifiers (group, plan, subplan, class, subclass).
 * Generic on TID for consistency with other backbone elements.
 * @see https://build.fhir.org/coverage-definitions.html#Coverage.class
 */
export interface CoverageClass<_TID = string> {
  /** Type of class such as group, plan, or subplan (required) */
  type: ICodeableConcept;
  /** Value associated with the type (required) */
  value: string;
  /** Human-readable label for the class */
  name?: string;
}

/**
 * FHIR R4 Coverage.costToBeneficiary backbone element
 * A suite of codes indicating the cost category and associated amount
 * which have been detailed in the policy and may have been included
 * on the health card (e.g. copay, deductible).
 * Generic on TID for consistency with other backbone elements.
 * @see https://build.fhir.org/coverage-definitions.html#Coverage.costToBeneficiary
 */
export interface CoverageCostToBeneficiary<_TID = string> {
  /** Cost category (e.g. copay, deductible) */
  type?: ICodeableConcept;
  /** The amount due from the beneficiary — as a simple quantity */
  valueQuantity?: IQuantity;
  /** The amount due from the beneficiary — as a monetary amount */
  valueMoney?: IMoney;
  /** Exceptions for patient payments */
  exception?: CoverageException[];
}

/**
 * FHIR R4 Coverage.costToBeneficiary.exception backbone element
 * Exceptions to the cost-to-beneficiary terms.
 * @see https://build.fhir.org/coverage-definitions.html#Coverage.costToBeneficiary.exception
 */
export interface CoverageException {
  /** Exception category (required) */
  type: ICodeableConcept;
  /** The effective period of the exception */
  period?: IPeriod;
}
