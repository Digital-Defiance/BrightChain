/**
 * FHIR R4 Money Datatype
 *
 * Exported TypeScript interface for the Money datatype used across billing
 * resources (Coverage, Claim, ExplanationOfBenefit) for representing
 * monetary values with currency.
 *
 * @see https://build.fhir.org/datatypes.html#Money
 * @module billing/moneyType
 */

/**
 * FHIR R4 Money datatype.
 * An amount of economic utility in some recognized currency.
 * @see https://build.fhir.org/datatypes.html#Money
 */
export interface IMoney {
  /** Numerical value (with implicit precision) */
  value: number;
  /** ISO 4217 currency code (e.g. "USD", "EUR") */
  currency: string;
}
