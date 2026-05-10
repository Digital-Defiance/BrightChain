export type DefaultFrontEndIdType = string;

/**
 * Access restrictions
 */
export type AccessBy = 'public' | 'password' | 'restricted' | 'self' | 'none';

/**
 * Threshold unit for time-based restrictions
 */
export type ThresholdUnit = 'months' | 'days' | 'hours' | 'minutes' | 'events';

/**
 * Phone number regex to validate phone numbers
 */
export const PhoneNumberRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/; // Matches international phone numbers with optional country code
