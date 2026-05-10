/**
 * Order-to-Result Linking Interfaces
 *
 * Defines `IOrderResultLink<TID>` for bidirectional linking between
 * orders (ServiceRequest / MedicationRequest) and their fulfilling
 * results (DiagnosticReport / Observation). Also defines the
 * `IOrderResultLinkStore<TID>` persistence interface.
 *
 * @see https://build.fhir.org/servicerequest.html
 * @see https://build.fhir.org/diagnosticreport.html
 * @module orders/linking/orderResultLink
 */

/**
 * Represents a link between an order and its fulfilling result.
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 7.1
 */
export interface IOrderResultLink<TID = string> {
  /** Identifier of the originating order */
  orderId: string;

  /** FHIR resource type of the order */
  orderType: 'ServiceRequest' | 'MedicationRequest';

  /** Identifier of the fulfilling result */
  resultId: string;

  /** FHIR resource type of the result */
  resultType: 'DiagnosticReport' | 'Observation';

  /** Timestamp when the link was created */
  linkedAt: Date;

  /** Member who created the link */
  linkedBy: TID;
}

/**
 * Persistence interface for order-result links.
 *
 * Provides bidirectional lookup: order → results and result → order.
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 7.2
 */
export interface IOrderResultLinkStore<TID = string> {
  /**
   * Create a link between an order and a result.
   *
   * @param orderId    - Identifier of the order
   * @param orderType  - FHIR resource type of the order
   * @param resultId   - Identifier of the result
   * @param resultType - FHIR resource type of the result
   * @param memberId   - Member creating the link
   *
   * @see Requirement 7.2
   */
  linkResult(
    orderId: string,
    orderType: 'ServiceRequest' | 'MedicationRequest',
    resultId: string,
    resultType: 'DiagnosticReport' | 'Observation',
    memberId: TID,
  ): Promise<void>;

  /**
   * Retrieve all results linked to a given order.
   *
   * @param orderId - Identifier of the order
   * @returns Array of order-result links
   *
   * @see Requirement 7.2
   */
  getResultsForOrder(orderId: string): Promise<IOrderResultLink<TID>[]>;

  /**
   * Retrieve the order linked to a given result, if any.
   *
   * @param resultId - Identifier of the result
   * @returns The order-result link, or `null` if none exists
   *
   * @see Requirement 7.2
   */
  getOrderForResult(resultId: string): Promise<IOrderResultLink<TID> | null>;
}
