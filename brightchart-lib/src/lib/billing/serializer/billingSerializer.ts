/**
 * Billing Serializer Interfaces
 *
 * Individual serializer interfaces for each billing resource type
 * and a bundle serializer for billing export/import.
 * Follows the clinicalSerializer.ts pattern from Module 2.
 *
 * @see Requirements 15.1, 15.2, 15.3, 19.3
 * @module billing/serializer/billingSerializer
 */

import type { IClaimResource } from '../claimResource';
import type { ICoverageResource } from '../coverageResource';
import type {
  ICoverageEligibilityRequestResource,
  ICoverageEligibilityResponseResource,
} from '../eligibilityResources';
import type { IExplanationOfBenefitResource } from '../eobResource';
import type { IBillingExportBundle } from '../portability/billingPortability';

/**
 * Serializer for Coverage resources.
 * Guarantees round-trip fidelity: serialize → deserialize → serialize
 * produces byte-identical JSON output.
 */
export interface ICoverageSerializer<TID = string> {
  serialize(resource: ICoverageResource<TID>): string;
  deserialize(json: string): ICoverageResource<TID>;
}

/**
 * Serializer for Claim resources.
 */
export interface IClaimSerializer<TID = string> {
  serialize(resource: IClaimResource<TID>): string;
  deserialize(json: string): IClaimResource<TID>;
}

/**
 * Serializer for ExplanationOfBenefit resources.
 */
export interface IEOBSerializer<TID = string> {
  serialize(resource: IExplanationOfBenefitResource<TID>): string;
  deserialize(json: string): IExplanationOfBenefitResource<TID>;
}

/**
 * Serializer for CoverageEligibilityRequest resources.
 */
export interface ICoverageEligibilityRequestSerializer<TID = string> {
  serialize(resource: ICoverageEligibilityRequestResource<TID>): string;
  deserialize(json: string): ICoverageEligibilityRequestResource<TID>;
}

/**
 * Serializer for CoverageEligibilityResponse resources.
 */
export interface ICoverageEligibilityResponseSerializer<TID = string> {
  serialize(resource: ICoverageEligibilityResponseResource<TID>): string;
  deserialize(json: string): ICoverageEligibilityResponseResource<TID>;
}

/**
 * Serializer for billing export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle.
 */
export interface IBillingBundleSerializer<TID = string> {
  serialize(bundle: IBillingExportBundle<TID>): string;
  deserialize(json: string): IBillingExportBundle<TID>;
}
