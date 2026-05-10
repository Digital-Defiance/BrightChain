/**
 * Billing & Claims Module — barrel export
 *
 * Re-exports all billing enumerations, backbone elements, resource
 * interfaces, service interfaces, and the Money datatype.
 *
 * @module billing
 */

export * from './access/index';
export * from './audit/index';
export * from './claimBackboneElements';
export * from './claimResource';
export * from './coverageBackboneElements';
export * from './coverageResource';
export * from './eligibility/index';
export * from './eligibilityResources';
export * from './enumerations';
export * from './eobResource';
export * from './feeSchedule/index';
export * from './ledger/index';
export * from './lifecycle/index';
export * from './moneyType';
export * from './portability/index';
export * from './search/index';
export * from './serializer/index';
export * from './specialty/index';
export * from './store/index';
export * from './superbill/index';
